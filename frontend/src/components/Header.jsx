import React from "react";
import { Menu, ShieldCheck, Bell, Activity } from "lucide-react";
import { C } from "../constants/theme";

export default function Header({ title, onMenuToggle, healthScore = 840, darkMode, userId }) {
  const scoreColor =
    healthScore >= 850 ? "#10b981" :
    healthScore >= 700 ? "#6366f1" :
    healthScore >= 500 ? "#f59e0b" : "#ef4444";

  const scoreLabel =
    healthScore >= 850 ? "Outstanding" :
    healthScore >= 700 ? "Strong" :
    healthScore >= 500 ? "Moderate" : "Vulnerable";

  const initials = userId ? userId.slice(0, 2).toUpperCase() : "FT";

  return (
    <header
      className="w-full sticky top-0 z-40 border-b flex justify-between items-center px-5 md:px-8 py-3.5"
      style={{
        background: darkMode
          ? "rgba(15, 23, 42, 0.9)"
          : "rgba(250, 250, 252, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: darkMode ? "rgba(51, 65, 85, 0.5)" : "rgba(228, 228, 231, 0.6)",
      }}
    >
      {/* Left: Menu + Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
          style={{ color: darkMode ? "#94a3b8" : C.onSurfaceVariant }}
        >
          <Menu size={20} />
        </button>
        <div>
          <h2
            className="hidden md:block text-xl font-bold tracking-tight"
            style={{ color: darkMode ? "#f1f5f9" : C.primary }}
          >
            {title}
          </h2>
        </div>
      </div>

      {/* Right: Score + Avatar */}
      <div className="flex items-center gap-3">
        {/* Health Score Pill */}
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold"
          style={{
            background: darkMode ? "rgba(15,23,42,0.6)" : "rgba(248,249,255,0.9)",
            borderColor: darkMode ? "rgba(51,65,85,0.6)" : "rgba(228,228,231,0.8)",
            color: darkMode ? "#f1f5f9" : C.primary,
          }}
        >
          <ShieldCheck size={14} style={{ color: scoreColor }} />
          <span>
            <span style={{ color: scoreColor }}>{healthScore}</span>
            <span className="text-slate-400 font-medium"> · {scoreLabel}</span>
          </span>
        </div>

        {/* Notification Bell */}
        <button
          className="relative p-2 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          style={{ color: darkMode ? "#64748b" : "#94a3b8" }}
        >
          <Bell size={18} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border border-white dark:border-slate-900"
            style={{ background: "#ef4444" }}
          />
        </button>

        {/* Activity indicator */}
        <button
          className="hidden md:flex p-2 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          style={{ color: darkMode ? "#64748b" : "#94a3b8" }}
        >
          <Activity size={18} />
        </button>

        {/* User Avatar */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md"
          style={{
            background: `linear-gradient(135deg, ${C.secondary}, ${C.secondaryContainer})`,
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
