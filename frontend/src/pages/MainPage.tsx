import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { api } from "../lib/api";
import { createSocket } from "../lib/socket";
import { IconDroplet, IconSun, IconThermometer } from "../components/Icons";
import type { Device, LatestSensorRow, SensorUpdate } from "../types";

function SensorBlock(props: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="flex flex-1 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {props.icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{props.label}</div>
        <div className="mt-1 truncate text-2xl font-semibold text-slate-900">{props.value}</div>
      </div>
    </div>
  );
}

function Toggle(props: { checked: boolean; onChange: (next: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={() => props.onChange(!props.checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${props.checked ? "bg-blue-600" : "bg-slate-300"
        } ${props.disabled ? "opacity-50" : ""}`}
      aria-pressed={props.checked}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${props.checked ? "translate-x-6" : "translate-x-1"
          }`}
      />
    </button>
  );
}

export function MainPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [latest, setLatest] = useState<LatestSensorRow | null>(null);
  const [led, setLed] = useState<{ n1: "ON" | "OFF"; n2: "ON" | "OFF" }>({ n1: "OFF", n2: "OFF" });
  const deviceIdRef = useRef(deviceId);
  const [ledLoading, setLedLoading] = useState<{ n1: boolean; n2: boolean }>({ n1: false, n2: false });

  const selectedDevice = useMemo(() => devices.find((d) => d.device_id === deviceId) ?? null, [devices, deviceId]);

  useEffect(() => {
    deviceIdRef.current = deviceId;
  }, [deviceId]);

  useEffect(() => {
    let mounted = true;
    void api
      .get<{ devices: Device[] }>("/api/devices")
      .then((res) => {
        if (!mounted) return;
        setDevices(res.data.devices);
        setDeviceId((prev) => {
          if (!res.data.devices.length) return "";
          if (prev && res.data.devices.some((d) => d.device_id === prev)) return prev;
          return res.data.devices[0].device_id;
        });
      })
      .catch(() => {
        void 0;
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const socket = createSocket();
    socket.on("devices_update", (payload: { devices: Device[] }) => {
      setDevices(payload.devices);
      setDeviceId((prev) => {
        if (!payload.devices.length) return "";
        if (prev && payload.devices.some((d) => d.device_id === prev)) return prev;
        return payload.devices[0].device_id;
      });
    });
    socket.on("sensor_update", (update: SensorUpdate) => {
      if (update.device_id !== deviceIdRef.current) return;
      setLatest((prev) => {
        const ts = update.timestamp;
        const device_name = update.device_name ?? prev?.device_name ?? update.device_id;
        const ip_address = update.ip_address ?? prev?.ip_address ?? null;
        return {
          device_id: update.device_id,
          device_name,
          ip_address,
          temperature: update.temperature ?? prev?.temperature ?? null,
          humidity: update.humidity ?? prev?.humidity ?? null,
          light: update.light ?? prev?.light ?? null,
          timestamp: ts
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    void api
      .get<{ latest: LatestSensorRow | null }>("/api/sensors/latest", { params: { device_id: deviceId } })
      .then((res) => setLatest(res.data.latest))
      .catch(() => {
        void 0;
      });
  }, [deviceId]);

  async function setLedState(ledId: "n1" | "n2", state: "ON" | "OFF") {
    setLedLoading((prev) => ({ ...prev, [ledId]: true }));
    try {
      await api.post(`/api/control/led/${ledId}`, { state });
      setLed((prev) => ({ ...prev, [ledId]: state }));
    } finally {
      setLedLoading((prev) => ({ ...prev, [ledId]: false }));
    }
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 p-6 text-white shadow-sm">
          <div className="text-sm font-semibold tracking-wide opacity-90">MAIN</div>
          <div className="mt-2 text-2xl font-semibold">Điều khiển thiết bị</div>
          <div className="mt-2 text-sm opacity-95">
            {selectedDevice ? `${selectedDevice.device_name} (${selectedDevice.device_id})` : "Chọn thiết bị để theo dõi cảm biến"}
          </div>
        </div>

        <div className="-mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">Giá trị cảm biến</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Thiết bị</span>
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
              >
                {devices.map((d) => (
                  <option key={d.device_id} value={d.device_id}>
                    {d.device_name} ({d.device_id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <SensorBlock
              label="Temperature"
              value={latest?.temperature != null ? `${latest.temperature.toFixed(1)}°C` : "-"}
              icon={<IconThermometer className="h-6 w-6" />}
            />
            <SensorBlock
              label="Humidity"
              value={latest?.humidity != null ? `${latest.humidity.toFixed(0)}%` : "-"}
              icon={<IconDroplet className="h-6 w-6" />}
            />
            <SensorBlock
              label="Light"
              value={latest?.light != null ? `${latest.light.toFixed(0)} lux` : "-"}
              icon={<IconSun className="h-6 w-6" />}
            />
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Cập nhật lần cuối: {latest?.timestamp ? dayjs(latest.timestamp).format("DD/MM/YYYY HH:mm:ss") : "-"}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="text-sm font-semibold text-slate-900">Các thiết bị</div>
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:flex-1">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Đèn 1</div>
                  <div className="text-xs text-slate-500">LED n1</div>
                </div>
                <Toggle
                  checked={led.n1 === "ON"}
                  disabled={ledLoading.n1}
                  onChange={(next) => void setLedState("n1", next ? "ON" : "OFF")}
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:flex-1">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Đèn 2</div>
                  <div className="text-xs text-slate-500">LED n2</div>
                </div>
                <Toggle
                  checked={led.n2 === "ON"}
                  disabled={ledLoading.n2}
                  onChange={(next) => void setLedState("n2", next ? "ON" : "OFF")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
