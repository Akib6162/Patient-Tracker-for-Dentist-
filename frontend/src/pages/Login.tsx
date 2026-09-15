import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Stethoscope,
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  Shield,
  Clock,
  Users,
  Activity,
  CheckCircle2,
} from "lucide-react";
import api from "@/lib/api";
import type { LoginResponse } from "@/types";

const FEATURES = [
  {
    icon: Users,
    title: "Patient Management",
    desc: "Track patient records, status, and history in one place.",
  },
  {
    icon: Activity,
    title: "Real-time Updates",
    desc: "Live sync across all staff — changes appear instantly.",
  },
  {
    icon: Shield,
    title: "Role-based Access",
    desc: "Doctors and assistants see exactly what they need.",
  },
  {
    icon: Clock,
    title: "Billing Tracking",
    desc: "Monitor payments, dues, and billing status effortlessly.",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const { data } = await api.post<LoginResponse>("/api/auth/login", {
        email,
        password,
      });

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === "assistant") {
        toast.success("Welcome back! Redirecting to dashboard...");
        navigate("/dashboard", { replace: true });
      } else if (data.user.role === "doctor") {
        toast.error("Access denied. Assistants only.");
        navigate("/doctor", { replace: true });
      } else {
        toast.error("Access denied. Invalid user role.");
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || "Invalid email or password";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel: Branding ────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-10 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, hsl(232 47% 9%) 0%, hsl(238 50% 14%) 50%, hsl(246 55% 18%) 100%)",
        }}
      >
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-25 animate-spin-slow"
            style={{
              background:
                "radial-gradient(circle, hsl(239 84% 62% / 0.6) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-1/3 -right-24 w-[400px] h-[400px] rounded-full opacity-20 animate-float"
            style={{
              background:
                "radial-gradient(circle, hsl(291 64% 60% / 0.5) 0%, transparent 70%)",
              animationDelay: "1s",
            }}
          />
          <div
            className="absolute -bottom-24 left-1/4 w-[350px] h-[350px] rounded-full opacity-15"
            style={{
              background:
                "radial-gradient(circle, hsl(172 66% 50% / 0.5) 0%, transparent 70%)",
            }}
          />
          {/* Grid dots */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 animate-slide-up">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">
                Patient Tracker
              </p>
              <p className="text-white/50 text-[11px] mt-0.5">
                Clinic Management Platform
              </p>
            </div>
          </div>
        </div>

        {/* Hero Text */}
        <div className="relative z-10 space-y-6 animate-slide-up delay-100">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/80 text-xs font-medium">
                System Online
              </span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
              Manage your{" "}
              <span
                className="animate-gradient-shift"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(239 84% 75%), hsl(291 64% 75%), hsl(172 66% 65%))",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                clinic
              </span>{" "}
              with clarity
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-sm">
              A streamlined platform for patient tracking, billing management,
              and real-time clinic coordination.
            </p>
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-1 gap-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="flex items-start gap-3 animate-slide-up"
                style={{ animationDelay: `${150 + i * 75}ms` }}
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/10">
                  <f.icon className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{f.title}</p>
                  <p className="text-white/50 text-xs leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer badges */}
        <div className="relative z-10 flex items-center gap-3 animate-slide-up delay-400">
          {["HIPAA Safe", "Role-based Auth", "Real-time Sync"].map((tag) => (
            <div
              key={tag}
              className="flex items-center gap-1.5 bg-white/8 border border-white/10 rounded-full px-3 py-1"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-white/70 text-[11px] font-medium">
                {tag}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel: Login Form ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-sm space-y-8 animate-fade-scale-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg">Patient Tracker</span>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to your assistant account to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-muted-foreground/70" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="assistant@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-border bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition-all"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground/70" />
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-border bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition-all"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              id="login-submit"
              className="w-full h-11 rounded-xl font-semibold text-white shadow-glow-sm hover:shadow-glow-primary transition-all duration-200 flex items-center justify-center gap-2 group mt-2"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--primary)), hsl(252 84% 55%))",
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground">
            This portal is for{" "}
            <span className="font-semibold text-foreground">
              clinic assistants
            </span>{" "}
            only.
            <br />
            Contact your administrator for access.
          </p>
        </div>
      </div>
    </div>
  );
}
