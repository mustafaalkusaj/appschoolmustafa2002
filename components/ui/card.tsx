import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("content-card", className)} {...props}>
      {children}
    </div>
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  actions?: React.ReactNode;
}

export function CardHeader({ title, actions, className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn("content-card__header", className)} {...props}>
      {title && <h3 className="content-card__title">{title}</h3>}
      {children}
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  flush?: boolean;
}

export function CardContent({ flush, className, children, ...props }: CardContentProps) {
  return (
    <div
      className={cn(flush ? "content-card__body--flush" : "content-card__body", className)}
      {...props}
    >
      {children}
    </div>
  );
}
