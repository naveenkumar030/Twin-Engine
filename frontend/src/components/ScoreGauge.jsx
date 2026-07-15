import React, { useEffect, useRef } from "react";

/**
 * ScoreGauge - Circular gauge that animates stroke-dashoffset on mount
 * @param {number} score - value to display (0-max)
 * @param {number} max - maximum value (default 100)
 * @param {string} color - stroke color
 * @param {string} label - text below the number
 * @param {number} size - diameter in px (default 160)
 */
export default function ScoreGauge({
  score = 0,
  max = 100,
  color = "#6366f1",
  label = "",
  size = 160,
  strokeWidth = 10,
  children,
}) {
  const circleRef = useRef(null);
  const radius = (size / 2) - (strokeWidth / 2) - 4;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, Math.max(0, score / max));
  const offset = circumference * (1 - pct);

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    // Start from full offset (empty), animate to target
    el.style.strokeDashoffset = circumference;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)";
        el.style.strokeDashoffset = offset;
      });
    });
  }, [score, circumference, offset]);

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        style={{ width: size, height: size }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-slate-800"
        />
        {/* Progress */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children || (
          <>
            <span className="text-3xl font-black tracking-tighter" style={{ color }}>
              {Math.round(score)}
            </span>
            {label && (
              <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">
                {label}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
