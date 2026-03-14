import type { ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearToken } from "../lib/auth";
import { getUsernameFromToken } from "../lib/user";
import { IconChart, IconControl, IconHome, IconLogs } from "./Icons";

function getTitle(pathname: string) {
  if (pathname.startsWith("/dashboard")) return "DASHBOARD";
  if (pathname.startsWith("/main")) return "MAIN";
  if (pathname.startsWith("/charts")) return "CHARTS";
  if (pathname.startsWith("/logs")) return "LOGS";
  return "DASHBOARD";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  const last = parts[parts.length - 1];
  return (last[0] ?? "U").toUpperCase();
}

function NavItem(props: { to: string; label: string; icon: ReactNode }) {
  return (
    <NavLink
      to={props.to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"
        }`
      }
      end
    >
      <span className={`${typeof props.icon === "string" ? "" : "text-slate-500"}`}>{props.icon}</span>
      {props.label}
    </NavLink>
  );
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const title = getTitle(location.pathname);
  const username = getUsernameFromToken();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-slate-200 bg-white px-4 py-5">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
            <span className="text-sm font-semibold">IoT</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">Urit IoT</div>
            <div className="text-xs text-slate-500">Dashboard</div>
          </div>
        </div>

        <div className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">Menu</div>
        <nav className="mt-3 flex flex-col gap-1">
          <NavItem to="/dashboard" label="Dashboard" icon={<IconHome className="h-5 w-5" />} />
          <NavItem to="/main" label="Main" icon={<IconControl className="h-5 w-5" />} />
          <NavItem to="/charts" label="Charts" icon={<IconChart className="h-5 w-5" />} />
          <NavItem to="/logs" label="Logs" icon={<IconLogs className="h-5 w-5" />} />
        </nav>

        <div className="mt-auto">
          <button
            className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            onClick={() => {
              clearToken();
              navigate("/login");
            }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <header className="fixed left-64 right-0 top-0 z-10 h-16 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex h-full items-center justify-between px-6">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-semibold text-white">
              {initials(username)}
            </div>
            <div className="text-sm font-medium text-slate-800">{username}</div>
          </div>
        </div>
      </header>

      <main className="ml-64 pt-20">
        <div className="mx-auto w-full max-w-7xl px-6 pb-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
