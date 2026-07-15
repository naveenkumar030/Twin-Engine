import React from "react";
import { Landmark, Play, HelpCircle, LogOut, X } from "lucide-react";
import { C } from "../constants/theme";
import { navItems } from "../constants/data";

export default function Sidebar({ active, onNavigate, onLogout, isOpen, onClose }) {
  return (
    <nav
      className={`h-screen w-64 fixed left-0 top-0 z-50 flex flex-col py-8 border-r transition-transform duration-300 ease-in-out md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{
        background: "rgba(255, 255, 255, 0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: "rgba(228, 228, 231, 0.6)",
      }}
    >
      {/* Brand Header */}
      <div className="px-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10 transition-transform hover:scale-105"
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
              style={{ color: C.primary }}
            >
              Twin Engine
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest mt-1 text-slate-400">
              V2.4 Active
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors active:scale-95 text-slate-500"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto px-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className="w-full flex items-center gap-4 p-3.5 rounded-xl transition-all text-left cursor-pointer group relative overflow-hidden"
              style={
                isActive
                  ? {
                      background: "rgba(99, 102, 241, 0.08)",
                      color: C.secondary,
                    }
                  : { color: C.onSurfaceVariant }
              }
            >
              {/* Active Pill Indicator */}
              {isActive && (
                <div
                  className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-md"
                  style={{ background: C.secondary }}
                />
              )}

              <Icon
                size={20}
                className={`transition-transform duration-300 group-hover:scale-110 ${
                  isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-500"
                }`}
              />
              <span className={`text-sm ${isActive ? "font-bold" : "font-medium group-hover:text-slate-900"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer / CTA Actions */}
      <div className="px-4 mt-auto space-y-4">
        <button
          onClick={() => onNavigate("simulator")}
          className="w-full py-3.5 rounded-xl text-sm font-bold shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-white"
          style={{ background: `linear-gradient(135deg, ${C.secondary}, ${C.secondaryContainer})` }}
        >
          <Play size={16} fill="#ffffff" /> Run Simulation
        </button>

        <div
          className="pt-4 space-y-1 border-t"
          style={{ borderColor: "rgba(228, 228, 231, 0.6)" }}
        >
          <a
            className="flex items-center gap-4 p-3 rounded-lg text-sm font-semibold transition-colors hover:bg-slate-100/50 hover:text-slate-900 text-slate-500"
            href="#"
          >
            <HelpCircle size={16} /> Support
          </a>
          <button
            onClick={(e) => {
              e.preventDefault();
              onLogout && onLogout();
            }}
            className="w-full flex items-center gap-4 p-3 rounded-lg text-sm font-semibold transition-colors hover:bg-red-50 hover:text-red-600 text-slate-500 text-left outline-none cursor-pointer"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
