import express from "express";
import { z } from "zod";
import { pool } from "../db.js";
export const sensorsRouter = express.Router();
sensorsRouter.get("/latest", async (req, res) => {
    const deviceId = typeof req.query.device_id === "string" ? req.query.device_id : undefined;
    const result = await pool.query(`SELECT
       sd.device_id,
       d.device_name,
       d.ip_address::text as ip_address,
       sd.temperature,
       sd.humidity,
       sd.light,
       sd.timestamp
     FROM sensor_data sd
     JOIN devices d ON d.device_id = sd.device_id
     WHERE ($1::text IS NULL OR sd.device_id = $1)
     ORDER BY sd.timestamp DESC
     LIMIT 1`, [deviceId ?? null]);
    return res.json({ latest: result.rows[0] ?? null });
});
const historyQuerySchema = z.object({
    device_id: z.string().min(1),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    limit: z.coerce.number().int().positive().max(5000).optional().default(500)
});
sensorsRouter.get("/history", async (req, res) => {
    const parsed = historyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid query" });
    }
    const { device_id, from, to, limit } = parsed.data;
    const result = await pool.query(`SELECT device_id, temperature, humidity, light, timestamp
     FROM sensor_data
     WHERE device_id = $1
       AND ($2::timestamptz IS NULL OR timestamp >= $2::timestamptz)
       AND ($3::timestamptz IS NULL OR timestamp <= $3::timestamptz)
     ORDER BY timestamp ASC
     LIMIT $4`, [device_id, from ?? null, to ?? null, limit]);
    return res.json({ rows: result.rows });
});
