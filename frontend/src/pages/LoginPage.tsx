import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { setToken } from "../lib/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex h-full items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 text-xl font-semibold">Đăng nhập</div>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setError(null);
            try {
              const res = await api.post<{ token: string }>("/api/auth/login", { username, password });
              setToken(res.data.token);
              navigate("/dashboard", { replace: true });
            } catch {
              setError("Sai tên đăng nhập hoặc mật khẩu");
            } finally {
              setLoading(false);
            }
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Tên đăng nhập</span>
            <input
              className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Mật khẩu</span>
            <input
              className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div> : null}
          <button
            className="mt-2 rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        <div className="mt-4 text-xs text-slate-500">
          Tài khoản mặc định: admin / admin123
        </div>
      </div>
    </div>
  );
}
