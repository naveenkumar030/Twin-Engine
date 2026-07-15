import React from "react";
import { CheckCircle } from "lucide-react";
import { C } from "../constants/theme";

export default function Milestone({ age, label, amount, active }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${active ? "shadow-lg scale-110" : "opacity-50"}`}
        style={{
          background: active ? `linear-gradient(135deg, ${C.secondary}, ${C.secondaryContainer})` : "#e4e4e7",
          borderColor: active ? C.secondary : "#d4d4d8",
        }}
      >
        {active ? (
          <CheckCircle size={16} className="text-white" />
        ) : (
          <div className="w-3 h-3 rounded-full bg-white opacity-50" />
        )}
      </div>
      <div className="text-center">
        <p className={`text-[11px] font-black uppercase tracking-widest ${active ? "" : "opacity-50"}`}
          style={{ color: active ? C.secondary : "#94a3b8" }}>
          {label}
        </p>
        <p className={`text-[10px] font-bold ${active ? "" : "opacity-50"}`} style={{ color: "#94a3b8" }}>
          Age {age}
        </p>
        <p className={`text-[10px] font-bold mt-0.5 ${active ? "" : "opacity-50"}`}
          style={{ color: active ? C.secondary : "#94a3b8" }}>
          {amount}
        </p>
      </div>
    </div>
  );
}
