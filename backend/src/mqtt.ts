import mqtt from "mqtt";
import { z } from "zod";
import { env } from "./env.js";
import { pool } from "./db.js";

const sensorPayloadSchema = z.object({
  device_id: z.string().min(1),
  device_name: z.string().min(1).optional(),
  ip_address: z.string().min(1).optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  light: z.number().optional()
});

export type SensorUpdate = z.infer<typeof sensorPayloadSchema> & { timestamp: string };

export function startMqtt(opts: { onSensorUpdate: (update: SensorUpdate) => void; onLogRow: (row: unknown) => void }) {
  const client = mqtt.connect(env.MQTT_URL, {
    username: env.MQTT_USERNAME,
    password: env.MQTT_PASSWORD,
    clientId: env.MQTT_CLIENT_ID
  });

  client.on("connect", () => {
    client.subscribe(env.MQTT_SENSOR_TOPIC);
  });

  client.on("message", async (topic, payload) => {
    if (topic !== env.MQTT_SENSOR_TOPIC) return;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(payload.toString("utf8"));
    } catch {
      return;
    }

    const parsed = sensorPayloadSchema.safeParse(parsedJson);
    if (!parsed.success) return;

    const msg = parsed.data;
    const timestamp = new Date().toISOString();
    const deviceName = msg.device_name ?? msg.device_id;

    const conn = await pool.connect();
    try {
      await conn.query("BEGIN");

      await conn.query(
        `INSERT INTO devices (device_id, device_name, last_seen, status, ip_address)
         VALUES ($1, $2, NOW(), 'online', $3::inet)
         ON CONFLICT (device_id) DO UPDATE SET
           device_name = EXCLUDED.device_name,
           last_seen = NOW(),
           status = 'online',
           ip_address = COALESCE(EXCLUDED.ip_address, devices.ip_address)`,
        [msg.device_id, deviceName, msg.ip_address ?? null]
      );

      await conn.query(
        `INSERT INTO sensor_data (device_id, temperature, humidity, light, timestamp)
         VALUES ($1, $2, $3, $4, NOW())`,
        [msg.device_id, msg.temperature ?? null, msg.humidity ?? null, msg.light ?? null]
      );

      const logRows: Array<{
        device_id: string;
        device_name: string;
        ip_address: string | null;
        sensor_type: string;
        sensor_value: number;
        timestamp: string;
      }> = [];

      const ip = msg.ip_address ?? null;
      for (const [sensorName, sensorValue] of [
        ["temperature", msg.temperature],
        ["humidity", msg.humidity],
        ["light", msg.light]
      ] as const) {
        if (typeof sensorValue !== "number") continue;
        const result = await conn.query(
          `INSERT INTO logs (device_id, device_name, ip_address, sensor_name, sensor_value, timestamp)
           VALUES ($1, $2, $3::inet, $4, $5, NOW())
           RETURNING device_id, device_name, ip_address::text as ip_address, sensor_name as sensor_type, sensor_value, timestamp`,
          [msg.device_id, deviceName, ip, sensorName, sensorValue]
        );
        logRows.push(result.rows[0]);
      }

      await conn.query("COMMIT");

      opts.onSensorUpdate({ ...msg, timestamp, device_name: deviceName, ip_address: msg.ip_address });
      for (const row of logRows) {
        opts.onLogRow(row);
      }
    } catch {
      try {
        await conn.query("ROLLBACK");
      } catch {
        void 0;
      }
    } finally {
      conn.release();
    }
  });

  function publishLed(led: "n1" | "n2", state: "ON" | "OFF") {
    const topic = led === "n1" ? env.MQTT_LED1_TOPIC : env.MQTT_LED2_TOPIC;
    client.publish(topic, state, { qos: 0, retain: false });
  }

  return { client, publishLed };
}
