import express from "express";
import { pool } from "../db.js";

export const devicesRouter = express.Router();

devicesRouter.get("/", async (_req, res) => {
  const result = await pool.query(
    `SELECT
       device_id,
       device_name,
       last_seen,
       (CASE WHEN last_seen IS NULL OR last_seen < NOW() - INTERVAL '30 seconds' THEN 'offline' ELSE 'online' END) AS status,
       ip_address::text as ip_address
     FROM devices
     ORDER BY device_name ASC`
  );

  return res.json({ devices: result.rows });
});
