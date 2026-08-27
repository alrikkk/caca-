"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Layers,
  Compass,
  Film,
  Bookmark,
  Users,
  MessageSquare,
  User,
  Settings,
} from "lucide-react";

const MOBILE_ITEMS = [
  { label: "FEED", href: "/feed", icon: Layers },
  { label: "DISCOVER", href: "/discover", icon: Compass },
  { label: "CLIPS", href: "/clips", icon: Film },
  { label: "SAVED", href: "/saved", icon: Bookmark },
  { label: "TEAMS", href: "/teams", icon: Users },
  { label: "CHAT", href: "/chat", icon: MessageSquare },
  { label: "PROFILE", href: "/profile", icon: User },
  { label: "SETTINGS", href: "/settings", icon: Settings },
];

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-ink h-16 flex items-center justify-around px-1 overflow-x-auto">
      {MOBILE_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center p-1.5 rounded-none transition-transform active:scale-95 shrink-0",
              isActive ? "text-ink font-black" : "text-ink-muted font-bold"
            )}
          >
            <div
              className={cn(
                "p-1 border-hard-sm",
                isActive
                  ? "bg-caca-lime text-ink shadow-hard-sm"
                  : "bg-white text-ink"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[8px] font-mono tracking-tighter uppercase mt-0.5">
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
};
