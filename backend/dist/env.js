import process from "node:process";
import { z } from "zod";
export const env = z
    .object({
    NODE_ENV: z.enum(["development", "test", "production"]).optional(),
    PORT: z.coerce.number().int().positive().optional().default(4000),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(16),
    JWT_EXPIRES_IN: z.string().optional().default("12h"),
    FRONTEND_ORIGIN: z.string().optional().default("http://localhost:5173"),
    MQTT_URL: z.string().optional().default("mqtt://localhost:1883"),
    MQTT_USERNAME: z.string().optional(),
    MQTT_PASSWORD: z.string().optional(),
    MQTT_CLIENT_ID: z.string().optional().default("iot-web-backend"),
    MQTT_SENSOR_TOPIC: z.string().optional().default("sensor/data"),
    MQTT_LED1_TOPIC: z.string().optional().default("led/n1"),
    MQTT_LED2_TOPIC: z.string().optional().default("led/n2")
})
    .parse(process.env);
