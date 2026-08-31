"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { GlobalPeopleSearch } from "@/components/search/GlobalPeopleSearch";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/lib/auth-context";
import { LogOut } from "lucide-react";

export const Navbar: React.FC = () => {
  const router = useRouter();
  const { profile, user, isDemoMode, isLoading, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const displayName = isDemoMode
    ? profile?.fullName || "Alex Chen"
    : user
    ? profile?.fullName || user.email?.split("@")[0] || "Student"
    : isLoading
    ? "..."
    : "Student";

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b-2 border-ink h-16 flex items-center justify-between px-3 sm:px-6 gap-3">
      {/* Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/feed"
          className="flex items-center gap-2 font-black tracking-tighter text-2xl uppercase hover:opacity-90 transition-opacity"
        >
          <span className="bg-ink text-caca-lime px-2 py-0.5 border-hard text-xl">
            CACA
          </span>
        </Link>

        {isDemoMode ? (
          <Badge variant="lime" size="sm" className="hidden xs:inline-flex">
            DEMO MODE
          </Badge>
        ) : profile?.college ? (
          <Badge variant="default" size="sm" className="hidden md:inline-flex">
            {profile.college}
          </Badge>
        ) : null}
      </div>

      {/* Global People Search */}
      <div className="flex-1 max-w-xs sm:max-w-sm mx-auto">
        <GlobalPeopleSearch />
      </div>

      {/* User Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        <NotificationBell />

        <Link
          href="/profile"
          className="flex items-center gap-2 hover:opacity-85 transition-opacity"
        >
          <Avatar
            name={displayName}
            src={profile?.avatarUrl}
            size="sm"
          />
          <span className="font-mono text-xs font-bold uppercase hidden lg:inline-block">
            {displayName}
          </span>
        </Link>

        <button
          onClick={handleLogout}
          className="p-1.5 border-hard bg-canvas-subtle hover:bg-caca-coral hover:text-white btn-tactile text-ink"
          title="Log Out"
          aria-label="Log Out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
