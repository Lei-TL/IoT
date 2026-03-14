import express from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { stringify } from "csv-stringify/sync";
import ExcelJS from "exceljs";

export const logsRouter = express.Router();

const logsFilterSchema = z.object({
  q: z.string().trim().min(1).optional(),
  device_id: z.string().min(1).optional(),
  sensor_name: z.enum(["temperature", "humidity", "light"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

const logsQuerySchema = logsFilterSchema.extend({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(200).optional().default(20)
});

function buildWhere(filters: z.infer<typeof logsFilterSchema>) {
  const where: string[] = [];
  const params: Array<string | null | number> = [];

  if (filters.q) {
    params.push(`%${filters.q}%`);
    where.push(
      `(device_id ILIKE $${params.length} OR device_name ILIKE $${params.length} OR COALESCE(ip_address::text, '') ILIKE $${params.length} OR sensor_name ILIKE $${params.length})`
    );
  }
  if (filters.device_id) {
    params.push(filters.device_id);
    where.push(`device_id = $${params.length}`);
  }
  if (filters.sensor_name) {
    params.push(filters.sensor_name);
    where.push(`sensor_name = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    where.push(`timestamp >= $${params.length}::timestamptz`);
  }
  if (filters.to) {
    params.push(filters.to);
    where.push(`timestamp <= $${params.length}::timestamptz`);
  }

  return { whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

logsRouter.get("/", async (req, res) => {
  const parsed = logsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query" });
  }

  const { page, pageSize } = parsed.data;
  const { whereSql, params } = buildWhere(parsed.data);

  const offset = (page - 1) * pageSize;
  const countResult = await pool.query(`SELECT COUNT(*)::int as count FROM logs ${whereSql}`, params);
  const total = (countResult.rows[0] as { count: number }).count;

  const listParams = [...params, pageSize, offset];
  const listResult = await pool.query(
    `SELECT
       device_id,
       device_name,
       ip_address::text as ip_address,
       sensor_name as sensor_type,
       sensor_value,
       timestamp
     FROM logs
     ${whereSql}
     ORDER BY timestamp DESC
     LIMIT $${params.length + 1}
     OFFSET $${params.length + 2}`,
    listParams
  );

  return res.json({ rows: listResult.rows, total, page, pageSize });
});

const exportQuerySchema = logsFilterSchema
  .extend({ format: z.enum(["csv", "xlsx"]) })
  .extend({ limit: z.coerce.number().int().positive().max(50000).optional().default(10000) });

logsRouter.get("/export", async (req, res) => {
  const parsed = exportQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query" });
  }

  const { format, limit } = parsed.data;
  const { whereSql, params } = buildWhere(parsed.data);

  const result = await pool.query(
    `SELECT
       device_id,
       device_name,
       ip_address::text as ip_address,
       sensor_name as sensor_type,
       sensor_value,
       timestamp
     FROM logs
     ${whereSql}
     ORDER BY timestamp DESC
     LIMIT $${params.length + 1}`,
    [...params, limit]
  );

  const rows = result.rows as Array<Record<string, unknown>>;
  const fileBase = `logs_${new Date().toISOString().replace(/[:.]/g, "-")}`;

  if (format === "csv") {
    const csv = stringify(rows, { header: true, columns: ["device_id", "device_name", "ip_address", "sensor_type", "sensor_value", "timestamp"] });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileBase}.csv"`);
    return res.send(csv);
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Logs");
  sheet.columns = [
    { header: "device_id", key: "device_id", width: 20 },
    { header: "device_name", key: "device_name", width: 20 },
    { header: "ip_address", key: "ip_address", width: 18 },
    { header: "sensor_type", key: "sensor_type", width: 14 },
    { header: "sensor_value", key: "sensor_value", width: 14 },
    { header: "timestamp", key: "timestamp", width: 28 }
  ];
  sheet.addRows(rows);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileBase}.xlsx"`);
  const buffer = await workbook.xlsx.writeBuffer();
  return res.send(buffer);
});
