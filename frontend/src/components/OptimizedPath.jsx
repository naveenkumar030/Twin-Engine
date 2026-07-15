import React from "react";
import { ChevronRight } from "lucide-react";

export default function OptimizedPath({ title, desc, icon: Icon, theme }) {
  const isDark = theme === "dark";
  
  return (
    <button
      className={`w-full rounded-xl p-4 text-left transition-all group relative overflow-hidden border shadow-sm hover:shadow-md cursor-pointer ${
        isDark
          ? "bg-[#0c1322] border-[#17253f] hover:border-slate-700 text-white"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-205"
      }`}
    >
      <div className="flex justify-between items-start relative z-10">
        <div>
          <h5 className={`text-sm font-bold flex items-center gap-2 ${
            isDark ? "text-white" : "text-slate-800 dark:text-slate-100"
          }`}>
            {title}
            <Icon size={14} className={isDark ? "text-indigo-400" : "text-indigo-500 dark:text-indigo-400"} />
          </h5>
          <p className={`text-xs mt-1 ${
            isDark ? "text-slate-400" : "text-slate-500 dark:text-slate-400"
          }`}>
            {desc}
          </p>
        </div>
        <ChevronRight size={16} className={`${
          isDark ? "text-slate-500" : "text-slate-400 dark:text-slate-600"
        } group-hover:translate-x-0.5 transition-transform`} />
      </div>
    </button>
  );
}
