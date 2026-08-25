import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "coral" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold tracking-wider uppercase border-hard select-none btn-tactile focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-all";

    const variantStyles = {
      primary: "bg-ink text-canvas hover:bg-black shadow-hard-md text-white",
      accent: "bg-caca-lime text-ink hover:bg-[#c8ea17] shadow-hard-md",
      coral: "bg-caca-coral text-white hover:bg-[#e63f22] shadow-hard-md",
      outline: "bg-white text-ink hover:bg-canvas-subtle shadow-hard",
      ghost: "bg-transparent text-ink border-transparent shadow-none hover:bg-canvas-muted active:translate-x-0 active:translate-y-0",
      danger: "bg-red-600 text-white hover:bg-red-700 shadow-hard-md",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs",
      md: "h-11 px-5 text-sm",
      lg: "h-13 px-7 text-base",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>PROCESSING</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
