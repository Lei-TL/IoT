import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./env.js";
import { requireAuth } from "./auth.js";
import { authRouter } from "./routes/auth.js";
import { devicesRouter } from "./routes/devices.js";
import { sensorsRouter } from "./routes/sensors.js";
import { logsRouter } from "./routes/logs.js";
import { createControlRouter } from "./routes/control.js";
import { setupSocket } from "./socket.js";
import { startMqtt } from "./mqtt.js";
import { pool } from "./db.js";

const app = express();
app.disable("x-powered-by");

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);

const api = express.Router();
api.use(requireAuth);
api.use("/devices", devicesRouter);
api.use("/sensors", sensorsRouter);
api.use("/logs", logsRouter);

const server = http.createServer(app);
const io = setupSocket(server);

const mqttSvc = startMqtt({
  onSensorUpdate: (update) => {
    io.emit("sensor_update", update);
    void broadcastDevices();
  },
  onLogRow: (row) => {
    io.emit("log_update", row);
  }
});

api.use("/control", createControlRouter(mqttSvc.publishLed));
app.use("/api", api);

async function broadcastDevices() {
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
  io.emit("devices_update", { devices: result.rows });
}

setInterval(() => {
  void broadcastDevices();
}, 5000);

server.listen(env.PORT, () => {
  process.stdout.write(`Backend listening on http://localhost:${env.PORT}\n`);
});
