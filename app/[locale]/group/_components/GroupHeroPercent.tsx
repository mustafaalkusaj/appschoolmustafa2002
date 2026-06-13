"use client";
import { useState, useEffect } from "react";

export function GroupHeroPercent({
  value,
  colorClass,
}: {
  value: number;
  colorClass: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const startTime = Date.now();
    function tick() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value]);

  return (
    <span className={`font-mono text-[28px] font-black leading-none tabular-nums ${colorClass}`}>
      {display.toFixed(1)}
    </span>
  );
}
