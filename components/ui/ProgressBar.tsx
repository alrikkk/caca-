import React from "react";
import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: "lime" | "coral" | "blue" | "ink";
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showValue = true,
  color = "lime",
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colorStyles = {
    lime: "bg-caca-lime",
    coral: "bg-caca-coral",
    blue: "bg-caca-blue",
    ink: "bg-ink",
  };

  return (
    <div className={cn("w-full space-y-1", className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-xs font-mono font-bold uppercase text-ink">
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className="w-full h-3 bg-canvas-muted border-hard overflow-hidden">
        <div
          className={cn("h-full border-r-2 border-ink transition-all duration-300", colorStyles[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
