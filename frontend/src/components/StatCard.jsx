import React from "react";
import AnimatedCounter from "./AnimatedCounter";

/**
 * StatCard - Premium metric card with icon, animated counter, trend indicator
 */
export default function StatCard({
  label,
  value,
  formatter,
  icon: Icon,
  iconBg = "rgba(99,102,241,0.1)",
  iconColor = "#6366f1",
  trend,        // e.g. "+12.5%"
  trendUp,      // true = green, false = red, undefined = neutral
  subtitle,
  className = "",
  animate = true,
}) {
  return (
    <div
      className={`rounded-2xl border p-5 flex items-center justify-between hover:shadow-lg transition-all duration-300 bg-white dark:bg-slate-800 dark:border-slate-700 ${className}`}
      style={{ borderColor: "rgba(228,228,231,0.8)" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 mb-1">
          {label}
        </p>
        <div className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          {animate ? (
            <AnimatedCounter
              value={typeof value === "number" ? value : 0}
              formatter={formatter}
            />
          ) : (
            <span>{typeof value === "string" ? value : (formatter ? formatter(value) : value)}</span>
          )}
        </div>
        {(trend || subtitle) && (
          <div className="flex items-center gap-1.5 mt-1">
            {trend && (
              <span
                className="text-[10px] font-bold"
                style={{
                  color: trendUp === true ? "#10b981" : trendUp === false ? "#ef4444" : "#94a3b8",
                }}
              >
                {trend}
              </span>
            )}
            {subtitle && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
      {Icon && (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center ml-4 shrink-0"
          style={{ background: iconBg, color: iconColor }}
        >
          <Icon size={18} />
        </div>
      )}
    </div>
  );
}
