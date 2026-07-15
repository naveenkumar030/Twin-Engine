import React from "react";

export function SkeletonCard({ className = "", style = {} }) {
  return (
    <div
      className={`rounded-2xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-5 ${className}`}
      style={{ borderColor: "rgba(228,228,231,0.8)", ...style }}
    >
      <div className="skeleton h-3 w-24 rounded-full mb-3" />
      <div className="skeleton h-7 w-36 rounded-lg mb-2" />
      <div className="skeleton h-2 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonChart({ className = "" }) {
  return (
    <div
      className={`rounded-2xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-6 ${className}`}
      style={{ borderColor: "rgba(228,228,231,0.8)" }}
    >
      <div className="skeleton h-4 w-40 rounded-full mb-6" />
      <div className="flex items-end gap-2 h-48">
        {[65, 40, 80, 55, 90, 45, 70, 60, 85, 50, 75, 65].map((h, i) => (
          <div
            key={i}
            className="skeleton flex-1 rounded-t-lg"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, className = "" }) {
  return (
    <div
      className={`rounded-2xl border bg-white dark:bg-slate-800 dark:border-slate-700 overflow-hidden ${className}`}
      style={{ borderColor: "rgba(228,228,231,0.8)" }}
    >
      <div className="px-6 py-4 border-b dark:border-slate-700">
        <div className="skeleton h-4 w-32 rounded-full" />
      </div>
      <div className="divide-y dark:divide-slate-700">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center gap-4">
            <div className="skeleton h-3 w-24 rounded-full" />
            <div className="skeleton h-3 w-16 rounded-full" />
            <div className="skeleton h-3 w-20 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonGauge({ size = 120 }) {
  return (
    <div
      className="skeleton rounded-full"
      style={{ width: size, height: size }}
    />
  );
}

export default function LoadingSkeleton({ type = "page" }) {
  if (type === "page") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonChart />
        <SkeletonTable />
      </div>
    );
  }
  return <SkeletonCard />;
}
