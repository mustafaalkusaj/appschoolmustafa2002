"use client";
import { useEffect } from "react";

type Options = {
  onSave?: () => void;
  onPrint?: () => void;
  onEscape?: () => void;
};

export function useKeyboardShortcuts({ onSave, onPrint, onEscape }: Options) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") {
        onEscape?.();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave?.();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        onPrint?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave, onPrint, onEscape]);
}
