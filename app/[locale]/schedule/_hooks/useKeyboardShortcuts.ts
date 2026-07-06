"use client";

import { useEffect } from "react";

type KeyboardShortcutHandlers = {
  onSave?: () => void;
  onPrint?: () => void;
  onEscape?: () => void;
};

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isModifier = e.metaKey || e.ctrlKey;

      if (isModifier && e.key === "s") {
        e.preventDefault();
        handlers.onSave?.();
        return;
      }

      if (isModifier && e.key === "p") {
        e.preventDefault();
        handlers.onPrint?.();
        return;
      }

      if (e.key === "Escape") {
        handlers.onEscape?.();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}

export default useKeyboardShortcuts;
