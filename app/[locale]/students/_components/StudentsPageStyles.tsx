"use client";

/**
 * StudentsPageStyles - Minimal styles for the students page
 * Most component styles are now handled by the shared UI components
 */
export function StudentsPageStyles() {
  return (
    <style>{`
      /* Custom scrollbar for the page */
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: var(--border);
        border-radius: var(--radius-full);
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: var(--text-muted);
      }

      /* RTL support for tables */
      [dir="rtl"] table {
        direction: rtl;
      }

      [dir="rtl"] table th,
      [dir="rtl"] table td {
        text-align: right;
      }

      /* Focus visible for better accessibility */
      .focus-visible:focus-visible {
        outline: 2px solid var(--focus-ring-color);
        outline-offset: 2px;
      }
    `}</style>
  );
}
