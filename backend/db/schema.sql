CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL,
  last_seen TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'offline',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensor_data (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id) ON UPDATE CASCADE ON DELETE CASCADE,
  temperature DOUBLE PRECISION,
  humidity DOUBLE PRECISION,
  light DOUBLE PRECISION,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sensor_data_device_time_idx ON sensor_data (device_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  ip_address INET,
  sensor_name TEXT NOT NULL,
  sensor_value DOUBLE PRECISION NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS logs_device_time_idx ON logs (device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS logs_sensor_time_idx ON logs (sensor_name, timestamp DESC);
