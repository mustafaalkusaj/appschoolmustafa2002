"use client";

import { useState, useEffect } from 'react';
import { useRuntimeBranding } from '@/hooks/useRuntimeBranding';
import { usePathname } from 'next/navigation';
import { getLocaleFromPath } from '@/lib/locale-routing';

interface PingResult {
  ms: number;
  speed: 'fast' | 'medium' | 'slow';
}

export function PingIndicator() {
  const [ping, setPing] = useState<PingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const branding = useRuntimeBranding();

  const getSpeedLabel = (speed: string) => {
    const t = (key: string) => key; // Replace with actual i18n hook
    return t(`ping.speed${speed.charAt(0).toUpperCase() + speed.slice(1)}`);
  };

  const getSpeedColor = (speed: string) => {
    if (speed === 'fast') return 'bg-green-500 text-white';
    if (speed === 'medium') return 'bg-yellow-500 text-black';
    return 'bg-red-500 text-white';
  };

  useEffect(() => {
    let mounted = true;

    const measurePing = async () => {
      setLoading(true);
      const start = performance.now();
      try {
        const response = await fetch('/api/ping', { cache: 'no-store' });
        const end = performance.now();
        const ms = Math.round(end - start);

        let speed: 'fast' | 'medium' | 'slow';
        if (ms < 100) speed = 'fast';
        else if (ms < 500) speed = 'medium';
        else speed = 'slow';

        if (mounted) {
          setPing({ ms, speed });
        }
      } catch (error) {
        if (mounted) {
          setPing({ ms: 999, speed: 'slow' });
        }
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
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 w-16 h-4 rounded"></div>
      </div>
    );
  }

  if (!ping) return null;

  const label = 'وقت الاستجابة (Ping)'; // t('ping.label') - hardcode for demo
  const formattedMs = `~${ping.ms}ms`;

  return (
    <div className="ping-indicator flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
      <span className="whitespace-nowrap">{label}</span>
      <span className="font-mono text-sm">{formattedMs}</span>
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getSpeedColor(ping.speed)}`}>
        {getSpeedLabel(ping.speed)}
      </span>
    </div>
  );
}

