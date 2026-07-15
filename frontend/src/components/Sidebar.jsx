import React from "react";
import { Landmark, Play, HelpCircle, LogOut, X, Sun, Moon } from "lucide-react";
import { C } from "../constants/theme";
import { navItems } from "../constants/data";

export default function Sidebar({ active, onNavigate, onLogout, isOpen, onClose, darkMode, onToggleDark }) {
  return (
    <nav
      className={`h-screen w-64 fixed left-0 top-0 z-50 flex flex-col py-8 border-r transition-transform duration-300 ease-in-out md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{
        background: darkMode
          ? "rgba(15, 23, 42, 0.95)"
          : "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: darkMode ? "rgba(51, 65, 85, 0.6)" : "rgba(228, 228, 231, 0.6)",
      }}
    >
      {/* Brand Header */}
      <div className="px-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 transition-transform hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${C.secondary}, ${C.secondaryContainer})`,
              color: "#ffffff",
            }}
          >
            <Landmark size={20} />
          </div>
          <div>
            <h1
              className="font-black tracking-tight text-xl leading-none"
              style={{ color: darkMode ? "#f1f5f9" : C.primary }}
            >
              Twin Engine
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest mt-1 text-slate-400">
              V3.0 Active
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 text-slate-500"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all text-left cursor-pointer group relative overflow-hidden"
              style={
                isActive
                  ? {
                      background: "rgba(99, 102, 241, 0.1)",
                      color: C.secondary,
                    }
                  : {
                      color: darkMode ? "#94a3b8" : C.onSurfaceVariant,
                    }
              }
            >
              {/* Active Pill Indicator */}
              {isActive && (
                <div
                  className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full"
                  style={{ background: C.secondary }}
                />
              )}

              <Icon
                size={18}
                className={`transition-all duration-200 group-hover:scale-110 ${
                  isActive
                    ? "text-indigo-500"
                    : darkMode
                    ? "text-slate-500 group-hover:text-indigo-400"
                    : "text-slate-400 group-hover:text-indigo-500"
                }`}
              />
              <span
                className={`text-sm ${
                  isActive
                    ? "font-bold"
                    : darkMode
                    ? "font-medium text-slate-400 group-hover:text-slate-200"
                    : "font-medium group-hover:text-slate-900"
                }`}
              >
                {item.label}
              </span>

              {/* Active dot */}
              {isActive && (
                <div
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: C.secondary }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="px-4 mt-auto space-y-3">
        {/* Run Simulation CTA */}
        <button
          onClick={() => onNavigate("simulator")}
          className="w-full py-3 rounded-xl text-sm font-bold shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-white"
          style={{ background: `linear-gradient(135deg, ${C.secondary}, ${C.secondaryContainer})` }}
        >
          <Play size={15} fill="#ffffff" />
          Run Simulation
        </button>

        <div
          className="pt-3 space-y-0.5 border-t"
          style={{ borderColor: darkMode ? "rgba(51, 65, 85, 0.6)" : "rgba(228, 228, 231, 0.6)" }}
        >
          {/* Dark mode toggle */}
          <button
            onClick={onToggleDark}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            style={{ color: darkMode ? "#94a3b8" : "#71717a" }}
          >
            <span className="flex items-center gap-3">
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
              {darkMode ? "Light Mode" : "Dark Mode"}
            </span>
            {/* Toggle pill */}
            <div
              className="relative w-9 h-5 rounded-full transition-colors duration-300"
              style={{ background: darkMode ? C.secondary : "#e4e4e7" }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300"
                style={{ transform: darkMode ? "translateX(18px)" : "translateX(2px)" }}
              />
            </div>
          </button>

          <a
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            style={{ color: darkMode ? "#64748b" : "#a1a1aa" }}
            href="#"
          >
            <HelpCircle size={15} />
            Support
          </a>
          <button
            onClick={(e) => {
              e.preventDefault();
              onLogout && onLogout();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 text-left outline-none cursor-pointer"
            style={{ color: darkMode ? "#64748b" : "#a1a1aa" }}
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
