import * as React from "react";

type ButtonVariant = "default" | "outline" | "ghost" | "danger" | "success";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const variantClasses: Record<ButtonVariant, string> = {
  default: "ui-button ui-button--primary",
  outline: "ui-button ui-button--secondary",
  ghost: "ui-button ui-button--ghost",
  danger: "ui-button ui-button--danger",
  success: "ui-button ui-button--success",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10 p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          variantClasses[variant],
          sizeClasses[size],
          "inline-flex items-center justify-center gap-2",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-solid)] focus-visible:ring-offset-2",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
