export type Device = {
  device_id: string;
  device_name: string;
  last_seen: string | null;
  status: "online" | "offline";
  ip_address: string | null;
};

export type SensorUpdate = {
  device_id: string;
  device_name?: string;
  ip_address?: string;
  temperature?: number;
  humidity?: number;
  light?: number;
  timestamp: string;
};

export type LatestSensorRow = {
  device_id: string;
  device_name: string;
  ip_address: string | null;
  temperature: number | null;
  humidity: number | null;
  light: number | null;
  timestamp: string;
};

export type LogRow = {
  device_id: string;
  device_name: string;
  ip_address: string | null;
  sensor_type: "temperature" | "humidity" | "light";
  sensor_value: number;
  timestamp: string;
};
