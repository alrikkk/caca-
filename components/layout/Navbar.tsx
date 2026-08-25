"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { LogOut } from "lucide-react";

export const Navbar: React.FC = () => {
  const router = useRouter();
  const { profile, isDemoMode, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const displayName = profile?.fullName || "Guest Student";
  const college = profile?.college || "Unassigned College";

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b-2 border-ink h-16 flex items-center justify-between px-4 sm:px-8">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Link
          href="/feed"
          className="flex items-center gap-2 font-black tracking-tighter text-2xl uppercase hover:opacity-90 transition-opacity"
        >
          <span className="bg-ink text-caca-lime px-2 py-0.5 border-hard text-xl">
            CACA
          </span>
        </Link>

        {isDemoMode ? (
          <Badge variant="lime" size="sm">
            DEMO MODE
          </Badge>
        ) : profile?.college ? (
          <Badge variant="default" size="sm" className="hidden sm:inline-flex">
            {profile.college}
          </Badge>
        ) : null}
      </div>

      {/* User Controls */}
      <div className="flex items-center gap-3">
        <Link
          href="/profile"
          className="flex items-center gap-2.5 hover:opacity-85 transition-opacity"
        >
          <Avatar
            name={displayName}
            src={profile?.avatarUrl}
            size="sm"
          />
          <span className="font-mono text-xs font-bold uppercase hidden sm:inline-block">
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
