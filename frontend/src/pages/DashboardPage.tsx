import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { api } from "../lib/api";
import { createSocket } from "../lib/socket";
import type { Device } from "../types";

function DeviceIllustration(props: { variant: "board" | "pi" }) {
  if (props.variant === "pi") {
    return (
      <svg viewBox="0 0 120 80" className="h-16 w-24">
        <rect x="8" y="10" width="104" height="60" rx="10" fill="#22c55e" opacity="0.12" />
        <rect x="18" y="20" width="84" height="40" rx="8" fill="#16a34a" opacity="0.18" />
        <rect x="26" y="28" width="28" height="24" rx="4" fill="#16a34a" opacity="0.35" />
        <rect x="60" y="28" width="34" height="8" rx="4" fill="#16a34a" opacity="0.35" />
        <rect x="60" y="42" width="34" height="8" rx="4" fill="#16a34a" opacity="0.35" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 80" className="h-16 w-24">
      <rect x="10" y="8" width="100" height="64" rx="10" fill="#3b82f6" opacity="0.12" />
      <rect x="22" y="20" width="76" height="40" rx="8" fill="#2563eb" opacity="0.2" />
      <circle cx="34" cy="30" r="5" fill="#2563eb" opacity="0.5" />
      <circle cx="50" cy="30" r="5" fill="#2563eb" opacity="0.5" />
      <circle cx="66" cy="30" r="5" fill="#2563eb" opacity="0.5" />
      <rect x="32" y="42" width="56" height="10" rx="5" fill="#2563eb" opacity="0.35" />
    </svg>
  );
}

function statusDot(status: Device["status"]) {
  return status === "online" ? "bg-emerald-500" : "bg-rose-500";
}

export function DashboardPage() {
  const teamName = "Nhóm IoT Web";
  const members = useMemo(
    () => ["Nguyễn Trọng Lâm", "Ngô Quang Hiệu", "Trịnh Minh Hiếu", "Lương Trung Hoàng"],
    []
  );
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    let mounted = true;
    void api
      .get<{ devices: Device[] }>("/api/devices")
      .then((res) => {
        if (mounted) setDevices(res.data.devices);
      })
      .catch(() => {
        void 0;
      });

    const socket = createSocket();
    socket.on("devices_update", (payload: { devices: Device[] }) => {
      setDevices(payload.devices);
    });
    return () => {
      mounted = false;
      socket.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 p-8 text-white shadow-sm">
        <div className="text-sm font-semibold tracking-wide opacity-90">DASHBOARD</div>
        <div className="mt-2 text-2xl font-semibold">Chào mừng bạn đến với hệ thống IoT</div>
        <div className="mt-2 max-w-3xl text-sm opacity-95">
          Thông điệp chào mừng: Hệ thống thu thập dữ liệu cảm biến thời gian thực (temperature, humidity, light) từ ESP32 qua MQTT, lưu vào Database và đẩy cập nhật realtime lên Web UI qua API/WebSocket.
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
            <div className="text-sm font-semibold">Thông tin nhóm</div>
            <div className="mt-2 text-sm opacity-95">
              <div className="font-medium">{teamName}</div>
              <div className="mt-2 text-sm font-semibold">Danh sách thành viên</div>
              <ul className="mt-2 list-disc pl-5">
                {members.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
            <div className="text-sm font-semibold">Tên bài thực hành</div>
            <div className="mt-2 text-sm opacity-95">
              <div>Web UI IoT (Web UI - API - Database)</div>
              <div className="mt-1">Giám sát cảm biến, biểu đồ realtime, điều khiển thiết bị qua MQTT và quản lý logs</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="text-base font-semibold text-slate-900">Thiết bị</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((d) => {
            const variant = /raspberry|pi/i.test(d.device_name) ? "pi" : "board";
            return (
              <div key={d.device_id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{d.device_name}</div>
                    <div className="mt-1 text-xs text-slate-500">{d.device_id}</div>
                  </div>
                  <DeviceIllustration variant={variant} />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${statusDot(d.status)}`} />
                    <span className="font-medium">{d.status === "online" ? "Online" : "Offline"}</span>
                  </div>
                  <div className="text-right">
                    {d.last_seen ? dayjs(d.last_seen).format("DD/MM/YYYY") : "-"}
                  </div>
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Lần cuối: {d.last_seen ? dayjs(d.last_seen).format("HH:mm:ss") : "-"} • IP: {d.ip_address ?? "-"}
                </div>
              </div>
            );
          })}

          {devices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500 sm:col-span-2 lg:col-span-3">
              Chưa có thiết bị
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
