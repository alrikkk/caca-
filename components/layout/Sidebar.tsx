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
} from "lucide-react";

export const NAV_ITEMS = [
  { label: "FEED", href: "/feed", icon: Layers },
  { label: "DISCOVER", href: "/discover", icon: Compass },
  { label: "CREATE", href: "/create", icon: PlusCircle, isAccent: true },
  { label: "TEAMS", href: "/teams", icon: Users },
  { label: "PROFILE", href: "/profile", icon: User },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 border-r-2 border-ink bg-white p-4 justify-between h-[calc(100vh-4rem)] sticky top-16 shrink-0">
      <nav className="space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 font-mono text-xs font-bold uppercase border-hard tracking-wider transition-all select-none btn-tactile",
                isActive
                  ? "bg-ink text-white shadow-hard"
                  : item.isAccent
                  ? "bg-caca-lime text-ink hover:bg-[#c8ea17] shadow-hard"
                  : "bg-white text-ink hover:bg-canvas-subtle shadow-hard"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t-2 border-ink pt-3 text-[10px] font-mono uppercase text-ink-muted flex justify-between">
        <span>CACA</span>
        <span className="font-bold text-ink">v0.1</span>
      </div>
    </aside>
  );
};
