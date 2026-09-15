import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/lib/queryClient";
import Login from "@/pages/Login";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import PatientDetail from "@/pages/PatientDetail";
import "./index.css";

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole?: "assistant" | "doctor" }) {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole) {
    try {
      const userRaw = localStorage.getItem("user");
      const user = userRaw ? JSON.parse(userRaw) : null;

      if (!user || user.role !== allowedRole) {
        if (user?.role === "doctor") {
          return <Navigate to="/dashboard" replace />;
        }
        if (user?.role === "assistant") {
          return <Navigate to="/assistant" replace />;
        }
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        return <Navigate to="/login" replace />;
      }
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}

export default function App() {
  // ── SSE: real-time sync across doctor & assistant clients ──
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        retryTimer = setTimeout(connect, 2000);
        return;
      }

      eventSource = new EventSource(
        `http://localhost:3000/api/events?token=${encodeURIComponent(token)}`
      );

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "invalidate_patients") {
            queryClient.invalidateQueries({ queryKey: ["patients"] });
            queryClient.invalidateQueries({ queryKey: ["patient"] });
            queryClient.invalidateQueries({ queryKey: ["patientsStats"] });
          }
        } catch {
          // ignore
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        retryTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(retryTimer);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRole="doctor">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="patients/:id" element={<PatientDetail />} />
          </Route>

          <Route
            path="/assistant"
            element={
              <ProtectedRoute allowedRole="assistant">
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                  <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-5">
                    <div className="mx-auto w-14 h-14 bg-red-500/10 dark:bg-red-500/5 rounded-2xl flex items-center justify-center">
                      <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h1>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        This application is doctor only. If you believe this is an error, please contact your system administrator.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        localStorage.removeItem("accessToken");
                        localStorage.removeItem("user");
                        window.location.href = "/login";
                      }}
                      className="w-full h-11 bg-slate-900 hover:bg-slate-800 dark:bg-slate-850 dark:hover:bg-slate-800 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 cursor-pointer"
                    >
                      Return to Login
                    </button>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
