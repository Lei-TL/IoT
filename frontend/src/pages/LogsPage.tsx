import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { api, downloadWithAuth } from "../lib/api";
import { createSocket } from "../lib/socket";
import { IconSearch } from "../components/Icons";
import type { LogRow } from "../types";

type LogUpdatePayload =
  | LogRow
  | {
    device_id: string;
    device_name: string;
    ip_address: string | null;
    sensor_name: "temperature" | "humidity" | "light";
    sensor_value: number;
    timestamp: string;
  };

function normalizeLogRow(row: LogUpdatePayload): LogRow {
  if ("sensor_type" in row) return row;
  return { ...row, sensor_type: row.sensor_name };
}

export function LogsPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  useEffect(() => {
    const socket = createSocket();
    socket.on("log_update", (payload: LogUpdatePayload) => {
      const normalized = normalizeLogRow(payload);
      if (q) {
        const hay = `${normalized.device_id} ${normalized.device_name ?? ""} ${normalized.ip_address ?? ""} ${normalized.sensor_type}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return;
      }

      setRows((prev) => {
        const next = [normalized, ...prev];
        return next.slice(0, pageSize);
      });
      setTotal((t) => t + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [pageSize, q]);

  useEffect(() => {
    const params: Record<string, string | number> = { page, pageSize };
    if (q.trim()) params.q = q.trim();

    void api
      .get<{ rows: LogRow[]; total: number; page: number; pageSize: number }>("/api/logs", { params })
      .then((res) => {
        setRows(res.data.rows);
        setTotal(res.data.total);
      })
      .catch(() => {
        setRows([]);
        setTotal(0);
      });
  }, [page, pageSize, q]);

  async function exportData(format: "csv" | "xlsx") {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    params.set("format", format);
    await downloadWithAuth(`/api/logs/export?${params.toString()}`, `logs.${format}`);
  }

  const pageNumbers = useMemo(() => {
    const windowSize = 7;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, page - half);
    const end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    const items: number[] = [];
    for (let i = start; i <= end; i += 1) items.push(i);
    return items;
  }, [page, totalPages]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-base font-semibold text-slate-900">Logs</div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <IconSearch className="h-4 w-4" />
              </div>
              <input
                className="w-72 rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                placeholder="Search..."
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="relative">
              <button
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                onClick={() => setExportOpen((v) => !v)}
              >
                Export
              </button>
              {exportOpen ? (
                <div className="absolute right-0 top-11 z-10 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setExportOpen(false);
                      void exportData("csv");
                    }}
                  >
                    Export CSV
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setExportOpen(false);
                      void exportData("xlsx");
                    }}
                  >
                    Export Excel
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-3 pr-4">ID thiết bị</th>
                <th className="py-3 pr-4">Địa chỉ IP</th>
                <th className="py-3 pr-4">Tên thiết bị</th>
                <th className="py-3 pr-4">Cảm biến</th>
                <th className="py-3 pr-4">Giá trị</th>
                <th className="py-3 pr-4">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={`${r.device_id}-${r.timestamp}-${idx}`} className="border-b border-slate-100">
                  <td className="py-3 pr-4">{r.device_id}</td>
                  <td className="py-3 pr-4">{r.ip_address ?? "-"}</td>
                  <td className="py-3 pr-4">{r.device_name}</td>
                  <td className="py-3 pr-4">
                    {r.sensor_type === "temperature" ? "Nhiệt độ" : r.sensor_type === "humidity" ? "Độ ẩm" : "Ánh sáng"}
                  </td>
                  <td className="py-3 pr-4">{r.sensor_value}</td>
                  <td className="py-3 pr-4">{dayjs(r.timestamp).format("DD/MM/YYYY HH:mm:ss")}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan={6}>
                    Chưa có nhật ký
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">Tổng: {total}</div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>

            <div className="flex items-center gap-1">
              {pageNumbers[0] && pageNumbers[0] > 1 ? (
                <>
                  <button
                    className={`h-8 w-8 rounded-lg text-sm ${page === 1 ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}
                    onClick={() => setPage(1)}
                  >
                    1
                  </button>
                  <div className="px-1 text-slate-400">…</div>
                </>
              ) : null}

              {pageNumbers.map((p) => (
                <button
                  key={p}
                  className={`h-8 w-8 rounded-lg text-sm ${page === p ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}

              {pageNumbers[pageNumbers.length - 1] && pageNumbers[pageNumbers.length - 1] < totalPages ? (
                <>
                  <div className="px-1 text-slate-400">…</div>
                  <button
                    className={`h-8 w-8 rounded-lg text-sm ${page === totalPages ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}
                    onClick={() => setPage(totalPages)}
                  >
                    {totalPages}
                  </button>
                </>
              ) : null}
            </div>

            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
