"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { NotificationService, NotificationRecord } from "@/services/notification-service";
import { useAuth } from "@/lib/auth-context";
import { Bell, Check, Users, MessageSquare, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export const NotificationBell: React.FC = () => {
  const { user, profile, isDemoMode } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userId = user?.id || profile?.id;

  const loadNotifications = useCallback(async () => {
    if (isDemoMode) {
      setNotifications([
        {
          id: "notif_demo_1",
          userId: "demo",
          title: "EchoSpatial Squad",
          message: "Maya accepted your invitation to join EchoSpatial Core Squad!",
          type: "application_status",
          link: "/teams",
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: "notif_demo_2",
          userId: "demo",
          title: "New Match Alert",
          message: "BioFlow matched 96% with your skills in React & PyTorch.",
          type: "info",
          link: "/feed",
          read: true,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ]);
      return;
    }

    if (userId) {
      const list = await NotificationService.getNotifications(userId);
      setNotifications(list);
    }
  }, [userId, isDemoMode]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (notifId: string) => {
    await NotificationService.markAsRead(notifId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    for (const n of notifications) {
      if (!n.read) {
        await NotificationService.markAsRead(n.id);
      }
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          loadNotifications();
        }}
        className="relative p-1.5 border-hard bg-white hover:bg-canvas-subtle btn-tactile text-ink"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-3.5 h-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-caca-lime text-ink font-mono text-[9px] font-black border-hard-sm flex items-center justify-center shadow-hard-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border-hard shadow-hard-xl z-50 animate-in fade-in zoom-in-95 duration-100 font-mono text-xs">
          {/* Header */}
          <div className="p-3 border-b-2 border-ink bg-canvas-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="font-black uppercase text-ink">NOTIFICATIONS</h4>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 bg-caca-lime border-hard-sm text-[10px] font-bold">
                  {unreadCount} NEW
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] text-ink-muted hover:text-ink uppercase font-bold underline"
              >
                MARK ALL READ
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-ink/10">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "p-3 transition-colors flex items-start justify-between gap-2.5",
                    !notif.read ? "bg-caca-lime/10" : "hover:bg-canvas-subtle"
                  )}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-1.5">
                      {notif.type === "invitation" ? (
                        <Users className="w-3 h-3 text-ink shrink-0" />
                      ) : (
                        <MessageSquare className="w-3 h-3 text-ink shrink-0" />
                      )}
                      <span className="font-black uppercase text-ink text-[11px]">
                        {notif.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink leading-snug font-sans">
                      {notif.message}
                    </p>
                    {notif.link && (
                      <Link
                        href={notif.link}
                        onClick={() => {
                          handleMarkAsRead(notif.id);
                          setIsOpen(false);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-ink underline uppercase pt-0.5 hover:text-caca-coral"
                      >
                        <span>VIEW DETAILS</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    )}
                  </div>

                  {!notif.read && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="p-1 hover:bg-white border-hard-sm text-ink shrink-0"
                      title="Mark as read"
                    >
                      <Check className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-ink-muted">
                <p className="font-bold uppercase text-[11px]">ALL CAUGHT UP</p>
                <p className="text-[10px] pt-0.5">No notifications at this time.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-ink/10 bg-canvas-subtle text-center">
            <Link
              href="/teams"
              onClick={() => setIsOpen(false)}
              className="text-[10px] font-bold text-ink uppercase hover:underline"
            >
              GO TO SQUADS & INVITATIONS →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
