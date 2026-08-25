import React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = "md",
  className,
}) => {
  const [imageError, setImageError] = React.useState(false);

  const sizeStyles = {
    sm: "w-7 h-7 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-20 h-20 text-xl",
  };

  const getInitials = (n: string) => {
    return n
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center font-bold font-mono uppercase bg-caca-yellow border-hard overflow-hidden select-none shrink-0 shadow-hard",
        sizeStyles[size],
        className
      )}
    >
      {src && !imageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="text-ink">{getInitials(name || "User")}</span>
      )}
    </div>
  );
};
