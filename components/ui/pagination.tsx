import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
}

// ── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Generate an array of page numbers to display
 * Uses siblingCount to determine how many pages to show on each side of current
 */
function generatePaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount: number
): (number | "ellipsis")[] {
  // If total pages is small, show all
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Calculate left and right sibling indices
  const leftSiblingIndex = Math.max(1, currentPage - siblingCount);
  const rightSiblingIndex = Math.min(totalPages, currentPage + siblingCount);

  // Determine if we need ellipsis
  const shouldShowLeftEllipsis = leftSiblingIndex > 2;
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

  // No ellipsis needed on left
  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, "ellipsis", totalPages];
  }

  // No ellipsis needed on right
  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1
    );
    return [1, "ellipsis", ...rightRange];
  }

  // Ellipsis on both sides
  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  );

  return [1, "ellipsis", ...middleRange, "ellipsis", totalPages];
}

// ── Pagination Component ──────────────────────────────────────────────────────

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
}: PaginationProps) {
  // Don't render if only one page
  if (totalPages <= 1) return null;

  const paginationRange = generatePaginationRange(
    currentPage,
    totalPages,
    siblingCount
  );

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <nav
      className={cn("flex items-center justify-center gap-1", className)}
      aria-label="Pagination"
    >
      {/* Previous Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrevious}
        aria-label="Go to previous page"
        className="hidden sm:inline-flex"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous</span>
      </Button>

      {/* Mobile Previous */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrevious}
        aria-label="Go to previous page"
        className="sm:hidden"
        iconOnly
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Page Numbers - Hidden on Mobile */}
      <div className="hidden sm:flex items-center gap-1">
        {paginationRange.map((page, index) => {
          if (page === "ellipsis") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-[var(--text-muted)]"
                aria-hidden="true"
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
            );
          }

          const isActive = page === currentPage;

          return (
            <Button
              key={page}
              variant={isActive ? "primary" : "ghost"}
              size="sm"
              onClick={() => onPageChange(page)}
              aria-label={`Go to page ${page}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "min-w-[36px]",
                isActive && "pointer-events-none"
              )}
            >
              {page}
            </Button>
          );
        })}
      </div>

      {/* Current Page Indicator - Mobile Only */}
      <span className="sm:hidden text-sm text-[var(--text-secondary)] px-2">
        {currentPage} / {totalPages}
      </span>

      {/* Mobile Next */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        aria-label="Go to next page"
        className="sm:hidden"
        iconOnly
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Next Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        aria-label="Go to next page"
        className="hidden sm:inline-flex"
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next</span>
      </Button>
    </nav>
  );
}

Pagination.displayName = "Pagination";
