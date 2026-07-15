import React from "react";
import { Menu, Search, ShieldCheck, Bell, Wallet } from "lucide-react";
import { C } from "../constants/theme";

export default function Header({ title, showSearch, onMenuToggle, healthScore = 840 }) {
  return (
    <header
      className="w-full sticky top-0 z-40 backdrop-blur-xl border-b shadow-sm flex justify-between items-center px-6 md:px-10 py-4"
      style={{ background: "rgba(248,249,255,0.8)", borderColor: "rgba(197,197,211,0.3)" }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors active:scale-95"
          style={{ color: C.onSurfaceVariant }}
        >
          <Menu size={20} />
        </button>
        {showSearch ? (
          <div className="relative w-full max-w-md hidden md:block">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: C.outline }}
            />
            <input
              className="w-full pl-10 pr-4 py-2 rounded-lg border outline-none text-sm"
              style={{ borderColor: "rgba(197,197,211,0.5)", background: C.surfaceContainerLowest }}
              placeholder="Search scenarios, assets..."
              type="text"
            />
          </div>
        ) : (
          <h2 className="hidden md:block text-2xl font-bold" style={{ color: C.primary }}>
            {title}
          </h2>
        )}
      </div>
      <div className="flex items-center gap-6">
        <div
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full border"
          style={{ background: C.surfaceContainer, borderColor: "rgba(197,197,211,0.3)" }}
        >
          <ShieldCheck size={18} style={{ color: C.tertiaryFixedDim }} />
          <span className="text-sm font-semibold" style={{ color: C.primary }}>
            Health Score: {healthScore}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full relative" style={{ color: C.onSurfaceVariant }}>
            <Bell size={20} />
            <span
              className="absolute top-2 right-2 w-2 h-2 rounded-full"
              style={{ background: C.error }}
            />
          </button>
          <button className="p-2 rounded-full" style={{ color: C.onSurfaceVariant }}>
            <Wallet size={20} />
          </button>
        </div>
        <div
          className="w-10 h-10 rounded-full border-2 overflow-hidden flex items-center justify-center font-semibold text-sm"
          style={{ borderColor: C.surfaceContainerHigh, background: C.primaryContainer, color: "#fff" }}
        >
          AK
        </div>
      </div>
    </header>
  );
}
