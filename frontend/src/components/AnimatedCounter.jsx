import React, { useEffect, useRef, useState } from "react";

/**
 * AnimatedCounter - smoothly animates a number from 0 to target value
 * @param {number} value - target number
 * @param {number} duration - animation duration in ms
 * @param {function} formatter - optional formatter function
 */
export default function AnimatedCounter({ value = 0, duration = 1200, formatter, className = "" }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);
  const startRef = useRef(null);
  const startValRef = useRef(0);

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    startValRef.current = display;
    startRef.current = null;

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValRef.current + (value - startValRef.current) * eased;
      setDisplay(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const formatted = formatter ? formatter(display) : Math.round(display).toLocaleString();

  return <span className={className}>{formatted}</span>;
}
