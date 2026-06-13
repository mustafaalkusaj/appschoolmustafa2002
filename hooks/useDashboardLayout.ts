"use client";

import { useCallback, useEffect, useState } from "react";
import { type WidgetId, DEFAULT_WIDGET_ORDER } from "@/lib/dashboard-widgets";

const STORAGE_KEY = "dashboard-layout";
const CHANGE_EVENT = "dashboard-layout-changed";

interface DashboardLayout {
  order: WidgetId[];
  hidden: WidgetId[];
}

function readFromStorage(): DashboardLayout {
  if (typeof window === "undefined") {
    return { order: [...DEFAULT_WIDGET_ORDER], hidden: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { order: [...DEFAULT_WIDGET_ORDER], hidden: [] };
    const parsed = JSON.parse(raw) as Partial<DashboardLayout>;
    const order = Array.isArray(parsed.order) ? (parsed.order as WidgetId[]) : [...DEFAULT_WIDGET_ORDER];
    const hidden = Array.isArray(parsed.hidden) ? (parsed.hidden as WidgetId[]) : [];
    return { order, hidden };
  } catch {
    return { order: [...DEFAULT_WIDGET_ORDER], hidden: [] };
  }
}

function writeToStorage(layout: DashboardLayout): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // storage quota or private-mode — silently ignore
  }
}

export interface UseDashboardLayoutReturn {
  order: WidgetId[];
  hidden: WidgetId[];
  setOrder: (order: WidgetId[]) => void;
  toggleHidden: (id: WidgetId) => void;
  reset: () => void;
}

export function useDashboardLayout(): UseDashboardLayoutReturn {
  const [layout, setLayout] = useState<DashboardLayout>(() => readFromStorage());

  // Stay in sync across tabs and with the settings page
  useEffect(() => {
    function handleChange() {
      setLayout(readFromStorage());
    }
    window.addEventListener(CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const setOrder = useCallback((order: WidgetId[]) => {
    setLayout((prev) => {
      const next = { ...prev, order };
      writeToStorage(next);
      return next;
    });
  }, []);

  const toggleHidden = useCallback((id: WidgetId) => {
    setLayout((prev) => {
      const isHidden = prev.hidden.includes(id);
      const hidden = isHidden
        ? prev.hidden.filter((h) => h !== id)
        : [...prev.hidden, id];
      const next = { ...prev, hidden };
      writeToStorage(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next: DashboardLayout = { order: [...DEFAULT_WIDGET_ORDER], hidden: [] };
    writeToStorage(next);
    setLayout(next);
  }, []);

  return {
    order: layout.order,
    hidden: layout.hidden,
    setOrder,
    toggleHidden,
    reset,
  };
}
