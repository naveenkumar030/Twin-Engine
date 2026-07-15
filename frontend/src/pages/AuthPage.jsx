import React, { useState } from "react";
import { Landmark, ShieldCheck, Mail, Lock, AlertCircle, X, Sparkles, User as UserIcon } from "lucide-react";
import { C } from "../constants/theme";
import { loginUser, registerUser } from "../services/api";

export default function AuthPage({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "error" });
  const [loading, setLoading] = useState(false);

  const triggerToast = (message, type = "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        // Register new account
        await registerUser(email, password, username);
        triggerToast("Account created successfully!", "success");
        // On registration success, auto-login the user
        const userData = await loginUser(email, password);
        onLoginSuccess(userData);
      } else {
        // Login existing account
        const userData = await loginUser(email, password);
        onLoginSuccess(userData);
      }
    } catch (err) {
      triggerToast(err.message || "Authentication failed. Please check your details.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 md:p-10 antialiased relative overflow-hidden"
      style={{
        background: `radial-gradient(circle at 20% 30%, #f1f5f9 0%, #e2e8f0 100%)`,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Moving Background Blobs - Enhanced */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-indigo-500/20 filter blur-3xl animate-blob pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] rounded-full bg-purple-500/10 filter blur-3xl animate-blob animation-delay-2000 pointer-events-none" />
      <div className="absolute top-1/3 right-1/3 w-80 h-80 rounded-full bg-blue-400/15 filter blur-3xl animate-blob animation-delay-4000 pointer-events-none" />

      {/* Floating Alert Toast */}
      {toast.show && (
        <div
          className="fixed top-6 right-6 left-6 md:left-auto md:w-96 z-50 p-4 rounded-2xl border shadow-2xl flex items-start gap-3 animate-toast-slide"
          style={{
            background: toast.type === "success" ? "rgba(240, 253, 244, 0.95)" : "rgba(254, 242, 242, 0.95)",
            backdropFilter: "blur(12px)",
            borderColor: toast.type === "success" ? "rgba(74, 222, 128, 0.4)" : "rgba(248, 113, 113, 0.4)",
            color: toast.type === "success" ? "#166534" : "#991b1b",
          }}
        >
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1 text-sm font-bold">{toast.message}</div>
          <button onClick={() => setToast({ show: false, message: "", type: "error" })} className="opacity-60 hover:opacity-100 transition-opacity">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Core Card */}
      <div
        className="w-full max-w-md rounded-[2.5rem] border shadow-2xl p-8 md:p-12 relative overflow-hidden flex flex-col items-center animate-fade-in bg-white/70"
        style={{
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderColor: "rgba(255, 255, 255, 0.8)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset"
        }}
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-2" style={{ background: `linear-gradient(90deg, ${C.secondary}, #8b5cf6)` }} />

        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="w-14 h-14 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-xl shadow-indigo-500/20"
            style={{
              background: `linear-gradient(135deg, ${C.secondary}, #8b5cf6)`,
              color: "#ffffff",
            }}
          >
            <Landmark size={28} />
          </div>
          <div>
            <h1 className="font-black tracking-tight text-3xl leading-none flex items-center gap-1.5 bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, ${C.primary}, #6366f1)` }}>
              Twin Engine
              <Sparkles size={18} className="text-indigo-500 animate-pulse" />
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest mt-1.5 text-slate-400">
              Interactive Financial Digital Twin
            </p>
          </div>
        </div>

        {/* Title */}
        <div className="w-full text-center mb-8">
          <h2 className="text-2xl font-black tracking-tight text-slate-800">
            {isRegister ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-2">
            {isRegister
              ? "Sign up with your email to start simulating."
              : "Login using your email to resume your models."}
          </p>
        </div>

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          {/* Username Input Container (Register only) */}
          {isRegister && (
            <div className="relative group animate-slide-up">
              <UserIcon size={18} className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input
                id="username-field"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 rounded-2xl text-sm font-medium outline-none transition-all bg-white/60 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border-slate-200/80 peer"
                placeholder=" "
              />
              <label
                htmlFor="username-field"
                className="absolute left-12 top-4 text-sm font-medium text-slate-400 transition-all duration-300 pointer-events-none peer-focus:-translate-y-7 peer-focus:text-xs peer-focus:font-extrabold peer-focus:text-indigo-600 peer-focus:bg-white peer-focus:px-2 peer-focus:-translate-x-2
                peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-extrabold peer-[:not(:placeholder-shown)]:text-indigo-600 peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:-translate-x-2 rounded-full"
              >
                Username
              </label>
            </div>
          )}

          {/* Email Input Container */}
          <div className="relative group animate-slide-up" style={{ animationDelay: isRegister ? '50ms' : '0ms' }}>
            <Mail size={18} className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input
              id="email-field"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 rounded-2xl text-sm font-medium outline-none transition-all bg-white/60 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border-slate-200/80 peer"
              placeholder=" "
            />
            <label
              htmlFor="email-field"
              className="absolute left-12 top-4 text-sm font-medium text-slate-400 transition-all duration-300 pointer-events-none peer-focus:-translate-y-7 peer-focus:text-xs peer-focus:font-extrabold peer-focus:text-indigo-600 peer-focus:bg-white peer-focus:px-2 peer-focus:-translate-x-2
              peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-extrabold peer-[:not(:placeholder-shown)]:text-indigo-600 peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:-translate-x-2 rounded-full"
            >
              Email address
            </label>
          </div>

          {/* Password Input Container */}
          <div className="relative group animate-slide-up" style={{ animationDelay: isRegister ? '100ms' : '50ms' }}>
            <Lock size={18} className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input
              id="password-field"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 rounded-2xl text-sm font-medium outline-none transition-all bg-white/60 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border-slate-200/80 peer"
              placeholder=" "
            />
            <label
              htmlFor="password-field"
              className="absolute left-12 top-4 text-sm font-medium text-slate-400 transition-all duration-300 pointer-events-none peer-focus:-translate-y-7 peer-focus:text-xs peer-focus:font-extrabold peer-focus:text-indigo-600 peer-focus:bg-white peer-focus:px-2 peer-focus:-translate-x-2
              peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-extrabold peer-[:not(:placeholder-shown)]:text-indigo-600 peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:-translate-x-2 rounded-full"
            >
              Password
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-black text-sm py-4 rounded-2xl transition-all shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 flex justify-center items-center gap-2 mt-4 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{ background: `linear-gradient(135deg, ${C.secondary}, #8b5cf6)` }}
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent border-white animate-spin" />
            ) : isRegister ? (
              "REGISTER NOW"
            ) : (
              "SIGN IN"
            )}
          </button>
        </form>

        {/* Toggle link */}
        <div className="w-full text-center mt-10 pt-5 border-t border-slate-200/50">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setEmail("");
              setPassword("");
              setUsername("");
            }}
            className="text-xs font-bold transition-colors hover:text-indigo-600"
            style={{ color: C.secondary }}
          >
            {isRegister
              ? "Already have an account? Sign In"
              : "Need a personal simulation database? Create Account"}
          </button>
        </div>

        {/* Trust badge */}
        <div className="flex items-center gap-1.5 mt-8 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">
          <ShieldCheck size={12} className="text-emerald-500" /> Secure SSL Connection
        </div>
      </div>
    </div>
  );
}
