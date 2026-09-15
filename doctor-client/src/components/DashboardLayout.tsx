import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
  Stethoscope,
  Menu,
  X,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/types";

function getUser(): User | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getUserInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* ── Brand ── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0 shadow-glow-sm">
          <Stethoscope className="w-5 h-5 text-indigo-400" />
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-bold tracking-tight leading-none" style={{ color: "hsl(var(--sidebar-fg))" }}>
            Patient Tracker
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--sidebar-muted))" }}>
            Doctor Portal
          </p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: "hsl(var(--sidebar-muted))" }}>
          Main Menu
        </p>

        <NavLink
          to="/dashboard"
          end
          onClick={onNavClick}
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          <LayoutDashboard className="sidebar-icon" />
          <span>Dashboard</span>
        </NavLink>

        <div className="pt-4 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: "hsl(var(--sidebar-muted))" }}>
            System
          </p>
        </div>

        <div
          className="sidebar-link opacity-50 cursor-not-allowed select-none"
        >
          <Activity className="sidebar-icon" />
          <span>Clinical Analytics</span>
          <Badge className="ml-auto text-[9px] px-1.5 py-0 h-4 bg-indigo-500/20 text-indigo-300 border-0 font-semibold">
            Soon
          </Badge>
        </div>
      </nav>

      {/* ── User Footer ── */}
      {user && (
        <div className="px-2 pb-4 pt-2 border-t" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "hsl(var(--sidebar-hover))" }}>
            <div className="w-8 h-8 rounded-full bg-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-indigo-300">
                {getUserInitials(user.name)}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate leading-none" style={{ color: "hsl(var(--sidebar-fg))" }}>
                Dr. {user.name.replace(/^(dr\.?\s*)/i, "")}
              </p>
              <p className="text-[11px] capitalize mt-0.5" style={{ color: "hsl(var(--sidebar-muted))" }}>
                {user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/20"
            >
              <LogOut className="w-3.5 h-3.5" style={{ color: "hsl(var(--sidebar-muted))" }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 shadow-sidebar z-30"
        style={{
          width: "var(--sidebar-width)",
          background: "hsl(var(--sidebar-bg))",
        }}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        </div>
      )}

      {/* ── Mobile Sidebar Drawer ── */}
      <aside
        className="fixed top-0 left-0 h-full z-50 flex flex-col lg:hidden transition-transform duration-300 ease-in-out shadow-sidebar"
        style={{
          width: "var(--sidebar-width)",
          background: "hsl(var(--sidebar-bg))",
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div className="flex items-center justify-end px-3 pt-3">
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "hsl(var(--sidebar-muted))" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <SidebarContent onNavClick={() => setSidebarOpen(false)} />
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── Topbar ── */}
        <header className="flex-shrink-0 h-14 bg-card border-b border-border flex items-center px-4 sm:px-6 gap-4 z-20">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Mobile brand */}
          <div className="flex items-center gap-2 lg:hidden">
            <Stethoscope className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">Doctor Portal</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side: user info + logout */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Dr. {user.name.replace(/^(dr\.?\s*)/i, "")}</span>
                <Badge variant="secondary" className="capitalize text-xs bg-primary/10 text-primary border-0 font-semibold">
                  {user.role}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Logout"
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
