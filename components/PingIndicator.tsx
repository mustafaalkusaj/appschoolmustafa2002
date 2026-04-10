"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from "next-intl";

interface PingResult {
  ms: number;
  speed: 'fast' | 'medium' | 'slow';
}

export function PingIndicator() {
  const [ping, setPing] = useState<PingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations();

  const getSpeedLabel = (speed: PingResult["speed"]) => {
    return t(`ping.speed${speed.charAt(0).toUpperCase() + speed.slice(1)}`);
  };

  const getSpeedColor = (speed: PingResult["speed"]) => {
    if (speed === 'fast') return 'bg-[var(--success)] text-white';
    if (speed === 'medium') return 'bg-[var(--warning)] text-white';
    return 'bg-[var(--danger)] text-white';
  };

  useEffect(() => {
    let mounted = true;

    const measurePing = async () => {
      setLoading(true);
      const start = performance.now();
      try {
        await fetch('/api/ping', { cache: 'no-store' });
        const end = performance.now();
        const ms = Math.round(end - start);

        let speed: 'fast' | 'medium' | 'slow';
        if (ms < 100) speed = 'fast';
        else if (ms < 500) speed = 'medium';
        else speed = 'slow';

        if (mounted) {
          setPing({ ms, speed });
        }
      } catch {
        // Keep the last successful measurement instead of rendering a fake latency value.
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    measurePing();

    const interval = setInterval(measurePing, 30000); // Update every 30s

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="ping-indicator">
        <div className="animate-pulse bg-[var(--surface-muted)] dark:bg-[var(--surface-inset)] w-16 h-4 rounded"></div>
      </div>
    );
  }

  if (!ping) return null;

  const label = t("ping.label");
  const formattedMs = `~${ping.ms}ms`;

  return (
    <div className="ping-indicator flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]">
      <span className="whitespace-nowrap">{label}</span>
      <span className="font-mono text-sm">{formattedMs}</span>
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getSpeedColor(ping.speed)}`}>
        {getSpeedLabel(ping.speed)}
      </span>
    </div>
  );
}
