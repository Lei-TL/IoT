import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";
import { api } from "../lib/api";
import { createSocket } from "../lib/socket";
import type { Device, SensorUpdate } from "../types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

type HistoryRow = {
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  light: number | null;
};

export function ChartsPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const deviceIdRef = useRef(deviceId);

  const labels = useMemo(() => rows.map((r) => dayjs(r.timestamp).format("HH:mm:ss")), [rows]);
  const temperatureData = useMemo(() => rows.map((r) => r.temperature ?? null), [rows]);
  const lightData = useMemo(() => rows.map((r) => r.light ?? null), [rows]);

  const humidityPercent = useMemo(() => {
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const v = rows[i]?.humidity;
      if (typeof v === "number") return Math.min(100, Math.max(0, v));
    }
    return 0;
  }, [rows]);

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
      setRows((prev) => {
        const next = [
          ...prev,
          {
            timestamp: update.timestamp,
            temperature: update.temperature ?? null,
            humidity: update.humidity ?? null,
            light: update.light ?? null
          }
        ];
        return next.slice(Math.max(0, next.length - 120));
      });
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    const to = dayjs();
    const from = to.subtract(1, "hour");
    void api
      .get<{ rows: HistoryRow[] }>("/api/sensors/history", {
        params: { device_id: deviceId, from: from.toISOString(), to: to.toISOString(), limit: 500 }
      })
      .then((res) => setRows(res.data.rows))
      .catch(() => {
        setRows([]);
      });
  }, [deviceId]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900">Biểu đồ cảm biến</div>
            <div className="mt-1 text-sm text-slate-600">Mặc định lấy dữ liệu 1 giờ gần nhất và cập nhật realtime</div>
          </div>
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
      </section>

      <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Cảm biến ánh sáng</div>
          <div className="text-xs text-white/70">Line chart</div>
        </div>
        <div className="h-72">
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Ánh sáng (lux)",
                  data: lightData,
                  borderColor: "rgba(59, 130, 246, 1)",
                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                  pointRadius: 0,
                  fill: true,
                  tension: 0.25
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: "rgba(255,255,255,0.7)" }, grid: { color: "rgba(255,255,255,0.08)" } },
                y: { ticks: { color: "rgba(255,255,255,0.7)" }, grid: { color: "rgba(255,255,255,0.08)" } }
              }
            }}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Cảm biến nhiệt độ</div>
            <div className="text-xs text-slate-500">Bar chart</div>
          </div>
          <div className="h-64">
            <Bar
              data={{
                labels,
                datasets: [
                  {
                    label: "Nhiệt độ (°C)",
                    data: temperatureData,
                    backgroundColor: "rgba(239, 68, 68, 0.75)",
                    borderRadius: 6
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
              }}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Cảm biến độ ẩm</div>
            <div className="text-xs text-slate-500">Pie chart</div>
          </div>
          <div className="h-64">
            <Pie
              data={{
                labels: ["Humidity (%)", "Remaining"],
                datasets: [
                  {
                    data: [humidityPercent, 100 - humidityPercent],
                    backgroundColor: ["rgba(59, 130, 246, 0.85)", "rgba(148, 163, 184, 0.35)"],
                    borderWidth: 0
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "bottom" }
                }
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
