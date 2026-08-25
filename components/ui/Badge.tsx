import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "lime" | "coral" | "blue" | "outline" | "missing" | "dark";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center font-mono font-bold tracking-tight uppercase border-hard-sm select-none";

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] leading-tight",
    md: "px-2.5 py-1 text-xs leading-none",
  };

  const variantStyles = {
    default: "bg-canvas-subtle text-ink border-ink",
    lime: "bg-caca-lime text-ink border-ink",
    coral: "bg-caca-coral text-white border-ink",
    blue: "bg-caca-blue text-white border-ink",
    dark: "bg-ink text-white border-ink",
    outline: "bg-white text-ink border-ink",
    missing: "bg-red-50 text-red-700 border-red-500 border-dashed",
  };

  return (
    <span
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
};
