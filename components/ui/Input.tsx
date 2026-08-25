import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ink">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "w-full h-11 px-3.5 bg-white border-hard font-sans text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-ink focus:shadow-hard-md transition-all disabled:opacity-50",
            error && "border-red-600 focus:ring-red-600",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-xs font-mono text-red-600 font-bold uppercase">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
