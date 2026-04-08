import * as React from "react";

type ButtonVariant = "default" | "outline";
type ButtonSize = "default" | "sm";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#69D5FF] focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          variant === "default" && "bg-[#0F5D91] text-white hover:bg-[#0B4A73]",
          variant === "outline" && "border border-[#0F5D91] bg-transparent text-[#0F5D91] hover:bg-[#0F5D91]/10",
          size === "default" && "h-10 px-4 py-2",
          size === "sm" && "h-9 px-3 text-sm",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
