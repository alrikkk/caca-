import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "flat" | "interactive";
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = "default",
  children,
  ...props
}) => {
  const variantStyles = {
    default: "bg-white border-hard shadow-hard",
    elevated: "bg-white border-hard shadow-hard-md",
    flat: "bg-canvas-subtle border-hard",
    interactive:
      "bg-white border-hard shadow-hard-md hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg transition-all cursor-pointer",
  };

  return (
    <div
      className={cn("p-5 rounded-none", variantStyles[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
};
