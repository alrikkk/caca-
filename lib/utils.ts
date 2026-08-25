import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number): string {
  return `${Math.round(score)}%`;
}

export function getMatchScoreColor(score: number): {
  bg: string;
  text: string;
  border: string;
  badge: string;
} {
  if (score >= 90) {
    return {
      bg: "bg-caca-lime",
      text: "text-ink",
      border: "border-ink",
      badge: "bg-caca-lime text-ink border-ink",
    };
  }
  if (score >= 75) {
    return {
      bg: "bg-caca-yellow",
      text: "text-ink",
      border: "border-ink",
      badge: "bg-caca-yellow text-ink border-ink",
    };
  }
  if (score >= 60) {
    return {
      bg: "bg-caca-blue",
      text: "text-white",
      border: "border-ink",
      badge: "bg-caca-blue text-white border-ink",
    };
  }
  return {
    bg: "bg-canvas-muted",
    text: "text-ink-muted",
    border: "border-ink-muted",
    badge: "bg-canvas-muted text-ink-muted border-ink-muted",
  };
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + "...";
}
