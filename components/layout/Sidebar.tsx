"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Compass,
  Layers,
  PlusCircle,
  Users,
  User,
  Film,
  Bookmark,
  MessageSquare,
  HelpCircle,
  BookOpen,
  Settings,
} from "lucide-react";

export const PRIMARY_NAV_ITEMS = [
  { label: "FEED", href: "/feed", icon: Layers },
  { label: "DISCOVER", href: "/discover", icon: Compass },
  { label: "CLIPS", href: "/clips", icon: Film },
  { label: "SAVED", href: "/saved", icon: Bookmark },
  { label: "TEAMS", href: "/teams", icon: Users },
  { label: "CHAT", href: "/chat", icon: MessageSquare },
  { label: "PROFILE", href: "/profile", icon: User },
];

export const SECONDARY_NAV_ITEMS = [
  { label: "GUIDE", href: "/guide", icon: BookOpen },
  { label: "HELP", href: "/help", icon: HelpCircle },
  { label: "SETTINGS", href: "/settings", icon: Settings },
];

export const NAV_ITEMS = [
  ...PRIMARY_NAV_ITEMS,
  { label: "CREATE", href: "/create", icon: PlusCircle, isAccent: true },
  ...SECONDARY_NAV_ITEMS,
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 border-r-2 border-ink bg-white p-3.5 justify-between h-[calc(100vh-4rem)] sticky top-16 shrink-0 overflow-y-auto font-mono">
      <div className="space-y-4">
        {/* Create CTA Button */}
        <Link
          href="/create"
          className={cn(
            "flex items-center justify-center gap-2 px-3 py-2 text-xs font-black uppercase border-hard tracking-wider transition-all select-none btn-tactile bg-caca-lime text-ink hover:bg-[#c8ea17] shadow-hard mb-2"
          )}
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span>PUBLISH SQUAD</span>
        </Link>

        {/* Primary Navigation */}
        <nav className="space-y-1">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 text-xs font-bold uppercase border-hard tracking-wider transition-all select-none btn-tactile",
                  isActive
                    ? "bg-ink text-white shadow-hard"
                    : "bg-white text-ink hover:bg-canvas-subtle shadow-hard-sm"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Secondary Navigation */}
        <div className="pt-2 border-t border-ink/10 space-y-1">
          <span className="text-[9px] text-ink-muted uppercase font-bold px-1">
            RESOURCES & TOOLS
          </span>
          {SECONDARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase border-hard-sm transition-all select-none",
                  isActive
                    ? "bg-ink text-white"
                    : "bg-canvas-subtle text-ink hover:bg-white"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer Version Indicator */}
      <div className="border-t-2 border-ink pt-2.5 text-[10px] uppercase text-ink-muted flex justify-between items-center">
        <span>CACA OS</span>
        <span className="font-bold text-ink bg-caca-lime px-1 border-hard-sm">v2.0</span>
      </div>
    </aside>
  );
};
