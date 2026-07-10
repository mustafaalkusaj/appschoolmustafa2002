
import Link from "next/link";
import { ChevronRight } from "@/lib/icons";
import { cn } from "@/lib/brand/brand-utils";

export interface BreadcrumbItem {
  /** Display label for the item */
  label: string;
  /** Optional href - if provided, renders as link; otherwise plain text */
  href?: string;
}

export interface BreadcrumbProps {
  /** Array of breadcrumb items */
  items: BreadcrumbItem[];
  /** Additional className */
  className?: string;
}

/**
 * Breadcrumb - Simple breadcrumb navigation.
 * 
 * - Separator: chevron icon that flips in RTL
 * - Current (last) item: styled differently, no link
 * - Previous items: links with hover state
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-sm", className)}
    >
      <ol className="flex items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight
                  size={14}
                  className="text-[var(--text-muted)] rtl:rotate-180 shrink-0"
                  aria-hidden="true"
                />
              )}
              {isLast || !item.href ? (
                <span
                  className="text-[var(--text-primary)] font-medium truncate"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors truncate"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
