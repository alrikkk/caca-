"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./Sidebar";

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-ink h-16 flex items-center justify-around px-2">
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
              "flex flex-col items-center justify-center p-2 rounded-none transition-transform active:scale-95",
              isActive ? "text-ink font-black" : "text-ink-muted font-bold"
            )}
          >
            <div
              className={cn(
                "p-1.5 border-hard-sm",
                isActive
                  ? "bg-caca-lime text-ink shadow-hard"
                  : item.isAccent
                  ? "bg-caca-yellow text-ink border-ink"
                  : "bg-white text-ink border-ink"
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-mono tracking-tighter uppercase mt-0.5">
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
};
