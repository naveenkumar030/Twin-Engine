import React, { useState } from "react";
import { Landmark, ShieldCheck, User as UserIcon, Mail, Lock, AlertCircle, X, Sparkles } from "lucide-react";
import { C } from "../constants/theme";
import { loginUser, registerUser } from "../services/api";

export default function AuthPage({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
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
        await registerUser(username, password, email);
        triggerToast("Account created successfully!", "success");
        // On registration success, auto-login the user
        const userData = await loginUser(username, password);
        onLoginSuccess(userData);
      } else {
        // Login existing account
        const userData = await loginUser(username, password);
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
        background: `radial-gradient(circle at 10% 20%, #f3f4f6 0%, #e5e7eb 90%)`,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Moving Background Blobs */}
      <div className="absolute top-12 left-1/4 w-72 h-72 rounded-full bg-indigo-400/20 filter blur-3xl animate-blob pointer-events-none" />
      <div className="absolute bottom-12 right-1/4 w-96 h-96 rounded-full bg-purple-400/20 filter blur-3xl animate-blob animation-delay-2000 pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-80 h-80 rounded-full bg-emerald-400/10 filter blur-3xl animate-blob animation-delay-4000 pointer-events-none" />

      {/* Floating Alert Toast */}
      {toast.show && (
        <div
          className="fixed top-6 right-6 left-6 md:left-auto md:w-96 z-50 p-4 rounded-2xl border shadow-xl flex items-start gap-3 animate-toast-slide"
          style={{
            background: toast.type === "success" ? "rgba(240, 253, 244, 0.95)" : "rgba(254, 242, 242, 0.95)",
            backdropFilter: "blur(8px)",
            borderColor: toast.type === "success" ? "rgba(74, 222, 128, 0.3)" : "rgba(248, 113, 113, 0.3)",
            color: toast.type === "success" ? "#166534" : "#991b1b",
          }}
        >
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1 text-sm font-semibold">{toast.message}</div>
          <button onClick={() => setToast({ show: false, message: "", type: "error" })} className="opacity-65 hover:opacity-100 transition-opacity">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Core Card */}
      <div
        className="w-full max-w-md rounded-[2.5rem] border shadow-2xl p-8 md:p-10 relative overflow-hidden flex flex-col items-center animate-fade-in bg-white/70"
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: "rgba(255, 255, 255, 0.6)",
        }}
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(90deg, ${C.secondary}, ${C.tertiaryFixedDim})` }} />

        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10"
            style={{
              background: `linear-gradient(135deg, ${C.secondary}, ${C.secondaryContainer})`,
              color: "#ffffff",
            }}
          >
            <Landmark size={24} />
          </div>
          <div>
            <h1 className="font-black tracking-tight text-2xl leading-none flex items-center gap-1.5" style={{ color: C.primary }}>
              Twin Engine
              <Sparkles size={16} className="text-indigo-500 animate-pulse" />
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest mt-1 text-slate-400">
              Interactive Financial Digital Twin
            </p>
          </div>
        </div>

        {/* Title */}
        <div className="w-full text-center mb-8">
          <h2 className="text-xl font-bold tracking-tight text-slate-800">
            {isRegister ? "Create your Twin Account" : "Access your Digital Twin"}
          </h2>
          <p className="text-xs text-slate-500 mt-1.5">
            {isRegister
              ? "Sign up below to calculate and persist financial simulations"
              : "Login using your credentials to resume your projection models"}
          </p>
        </div>

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          {/* Username Input Container */}
          <div className="relative group">
            <UserIcon size={16} className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              id="username-field"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 border rounded-2xl text-sm outline-none transition-all bg-white/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border-slate-200/80 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] peer"
              placeholder=" "
            />
            <label
              htmlFor="username-field"
              className="absolute left-11 top-3.5 text-sm text-slate-400 transition-all duration-300 pointer-events-none peer-focus:-translate-y-6 peer-focus:text-xs peer-focus:font-extrabold peer-focus:text-indigo-600 peer-focus:bg-white peer-focus:px-1.5 peer-focus:-translate-x-1.5
              peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-extrabold peer-[:not(:placeholder-shown)]:text-indigo-600 peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:-translate-x-1.5"
            >
              Username
            </label>
          </div>

          {/* Email Input Container (Register only) */}
          {isRegister && (
            <div className="relative group animate-slide-up">
              <Mail size={16} className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                id="email-field"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 border rounded-2xl text-sm outline-none transition-all bg-white/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border-slate-200/80 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] peer"
                placeholder=" "
              />
              <label
                htmlFor="email-field"
                className="absolute left-11 top-3.5 text-sm text-slate-400 transition-all duration-300 pointer-events-none peer-focus:-translate-y-6 peer-focus:text-xs peer-focus:font-extrabold peer-focus:text-indigo-600 peer-focus:bg-white peer-focus:px-1.5 peer-focus:-translate-x-1.5
                peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-extrabold peer-[:not(:placeholder-shown)]:text-indigo-600 peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:-translate-x-1.5"
              >
                Email address
              </label>
            </div>
          )}

          {/* Password Input Container */}
          <div className="relative group">
            <Lock size={16} className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              id="password-field"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 border rounded-2xl text-sm outline-none transition-all bg-white/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border-slate-200/80 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] peer"
              placeholder=" "
            />
            <label
              htmlFor="password-field"
              className="absolute left-11 top-3.5 text-sm text-slate-400 transition-all duration-300 pointer-events-none peer-focus:-translate-y-6 peer-focus:text-xs peer-focus:font-extrabold peer-focus:text-indigo-600 peer-focus:bg-white peer-focus:px-1.5 peer-focus:-translate-x-1.5
              peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-extrabold peer-[:not(:placeholder-shown)]:text-indigo-600 peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:-translate-x-1.5"
            >
              Password
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-bold text-sm py-4 rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95 flex justify-center items-center gap-2 mt-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            style={{ background: `linear-gradient(135deg, ${C.secondary}, ${C.secondaryContainer})` }}
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent border-white animate-spin" />
            ) : isRegister ? (
              "REGISTER & INITIALIZE"
            ) : (
              "SIGN IN"
            )}
          </button>
        </form>

        {/* Toggle link */}
        <div className="w-full text-center mt-8 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setUsername("");
              setPassword("");
              setEmail("");
            }}
            className="text-xs font-bold transition-colors hover:text-indigo-700"
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
