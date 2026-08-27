"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Settings,
  Bell,
  Moon,
  Volume2,
  VolumeX,
  Trash2,
  Sparkles,
  AlertTriangle,
  Smile,
  Frown,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { profile, isDemoMode, signOut } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [normalUIMode, setNormalUIMode] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [clearSuccess, setClearSuccess] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (normalUIMode) {
      setCountdown(5);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            setNormalUIMode(false);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [normalUIMode]);

  const handleClearCache = () => {
    const confirm = window.confirm(
      "Clear local client storage and reset demo data? Your persistent Supabase profile is unaffected."
    );
    if (!confirm) return;

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("caca_bookmarks");
        localStorage.removeItem("caca_recent_searches");
        localStorage.removeItem("caca_user_clips");
        localStorage.removeItem("caca_published_projects");
        setClearSuccess(true);
        setTimeout(() => setClearSuccess(false), 3000);
      } catch (err) {
        console.error("Failed to clear local cache:", err);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12 font-mono">
      {/* Header */}
      <div className="border-b-2 border-ink pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-ink flex items-center gap-2">
            <Settings className="w-6 h-6" />
            <span>SETTINGS</span>
          </h1>
          <p className="text-xs text-ink-muted">
            APP PREFERENCES, NOTIFICATION CONTROLS & SYSTEM CONFIGURATION
          </p>
        </div>

        <Badge variant="lime" size="sm">
          V2.0 STABLE
        </Badge>
      </div>

      {/* Corporate UI Easter Egg Warning Banner */}
      {normalUIMode && (
        <div className="p-5 bg-yellow-300 border-hard shadow-hard-lg space-y-2 animate-bounce">
          <div className="flex items-center gap-2 font-black text-sm uppercase text-ink">
            <Frown className="w-5 h-5 text-ink" />
            <span>NOT A VIBE! 🤮 BORING CORPORATE SaaS MODE ACTIVATED</span>
          </div>
          <p className="font-sans text-xs text-ink font-bold">
            Generic rounded gradients, bland gray buttons, and zero soul detected. Restoring ultra-tactile neo-brutalist glory in {countdown}s...
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setNormalUIMode(false)}
            className="text-xs"
          >
            RESTORE CACA VIBE NOW ⚡
          </Button>
        </div>
      )}

      {/* Preferences Cards */}
      <div className="bg-white border-hard shadow-hard p-5 space-y-5">
        <h2 className="text-xs font-black uppercase text-ink border-b-2 border-ink pb-2">
          APP & NOTIFICATION CONTROLS
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-xs uppercase text-ink">
                IN-APP NOTIFICATIONS & ALERTS
              </span>
              <p className="text-[11px] text-ink-muted">
                Receive match notifications, squad invites, and application updates.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={cn(
                "px-3 py-1.5 border-hard text-xs font-bold uppercase btn-tactile transition-all",
                notificationsEnabled
                  ? "bg-caca-lime text-ink"
                  : "bg-canvas-subtle text-ink-muted"
              )}
            >
              {notificationsEnabled ? "ENABLED ✓" : "MUTED ✕"}
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-ink/10 pt-3">
            <div className="space-y-0.5">
              <span className="font-bold text-xs uppercase text-ink">
                TACTILE UI AUDIO FEEDBACK
              </span>
              <p className="text-[11px] text-ink-muted">
                Play subtle click sounds on card interactions and swipes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(
                "px-3 py-1.5 border-hard text-xs font-bold uppercase btn-tactile transition-all",
                soundEnabled
                  ? "bg-caca-lime text-ink"
                  : "bg-canvas-subtle text-ink-muted"
              )}
            >
              {soundEnabled ? "ACTIVE 🔊" : "OFF 🔇"}
            </button>
          </div>
        </div>
      </div>

      {/* Normal UI Easter Egg Section */}
      <div className="bg-white border-hard shadow-hard p-5 space-y-3">
        <h2 className="text-xs font-black uppercase text-ink border-b-2 border-ink pb-2 flex items-center justify-between">
          <span>EXPERIMENTAL: NORMAL CORPORATE UI</span>
          <span className="text-[9px] text-red-600 bg-red-50 border-hard-sm px-1 py-0.2">
            EASTER EGG
          </span>
        </h2>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="font-bold text-xs uppercase text-ink">
              SWITCH TO GENERIC TECH SaaS MODE
            </span>
            <p className="text-[11px] text-ink-muted">
              Curious what Caca would look like as a standard boring corporate startup?
            </p>
          </div>

          <button
            type="button"
            onClick={() => setNormalUIMode(true)}
            className="px-3 py-1.5 border-hard bg-white hover:bg-canvas-subtle text-xs font-bold uppercase text-ink btn-tactile shadow-hard-sm"
          >
            TRY NORMAL UI
          </button>
        </div>
      </div>

      {/* Storage & Data Management */}
      <div className="bg-white border-hard shadow-hard p-5 space-y-4">
        <h2 className="text-xs font-black uppercase text-ink border-b-2 border-ink pb-2">
          CLIENT DATA & CACHE
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-bold text-xs uppercase text-ink">
              RESET LOCAL STORAGE & CACHE
            </span>
            <p className="text-[11px] text-ink-muted">
              Clear search history, bookmarked project cache, and local draft clips.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCache}
            className="text-xs flex items-center gap-1 text-red-600 hover:bg-red-50 border-hard"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>CLEAR CLIENT CACHE</span>
          </Button>
        </div>

        {clearSuccess && (
          <div className="p-2.5 bg-caca-lime border-hard text-xs font-bold uppercase text-ink flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-ink" />
            <span>LOCAL CLIENT STORAGE EMPTIED SUCCESSFULLY!</span>
          </div>
        )}
      </div>

      {/* Active Identity Summary */}
      <div className="p-4 bg-canvas-subtle border-hard text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-ink-muted uppercase font-bold">LOGGED IN AS</span>
          {isDemoMode && <Badge variant="lime" size="sm">DEMO USER</Badge>}
        </div>
        <p className="font-bold uppercase text-ink">
          {profile?.fullName || "Guest User"} ({profile?.major || "Student"} @ {profile?.college || "University"})
        </p>
      </div>
    </div>
  );
}
