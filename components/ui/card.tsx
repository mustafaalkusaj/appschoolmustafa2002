import * as React from "react";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

// ── Card Component ────────────────────────────────────────────────────────────

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // Base styles using design tokens
        "rounded-[var(--card-radius)]",
        "bg-[var(--card-bg)]",
        "border border-[var(--card-border)]",
        "shadow-[var(--card-shadow)]",
        // Transition for interaction states
        "transition-all duration-200",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

// ── CardHeader Component ──────────────────────────────────────────────────────

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-1.5 p-[var(--card-padding)]",
        className
      )}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

// ── CardTitle Component ───────────────────────────────────────────────────────

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-lg font-semibold text-[var(--text-primary)]",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

// ── CardDescription Component ─────────────────────────────────────────────────

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  CardDescriptionProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[var(--text-muted)]", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

// ── CardContent Component ─────────────────────────────────────────────────────

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "px-[var(--card-padding)] pb-[var(--card-padding)]",
        className
      )}
      {...props}
    />
  )
);
CardContent.displayName = "CardContent";

// ── CardFooter Component ──────────────────────────────────────────────────────

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center px-[var(--card-padding)] pb-[var(--card-padding)]",
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

// ── Exports ───────────────────────────────────────────────────────────────────

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
