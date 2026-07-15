import React from "react";
import { C } from "../constants/theme";

export default function Milestone({ age, label, amount, active }) {
  return (
    <div className="flex flex-col items-center group cursor-pointer relative">
      {/* Circle Container to align centers perfectly */}
      <div className="h-8 flex items-center justify-center mb-3">
        <div
          className={`rounded-full border-4 transition-all duration-300 ${
            active 
              ? "w-8 h-8 shadow-lg shadow-indigo-500/20 flex items-center justify-center" 
              : "w-6 h-6 shadow-sm hover:scale-115"
          }`}
          style={
            active
              ? { background: "#ffffff", borderColor: C.secondary }
              : { background: "#e4e4e7", borderColor: "#ffffff" }
          }
        >
          {active && (
            <div 
              className="w-3 h-3 rounded-full animate-pulse" 
              style={{ background: C.secondary }} 
            />
          )}
        </div>
      </div>

      {/* Label and Details */}
      <div className="text-center transition-all duration-300">
        <p
          className={`text-sm font-extrabold transition-colors ${
            active ? "text-indigo-600 scale-105" : "text-slate-700"
          }`}
        >
          Age {age}
        </p>
        <p className="text-[11px] text-slate-400 font-bold mt-0.5">
          {label}
        </p>
        <p 
          className={`text-[11px] font-black mt-1 ${
            active ? "text-indigo-600" : "text-slate-500"
          }`}
        >
          {amount} Req.
        </p>
      </div>
    </div>
  );
}
