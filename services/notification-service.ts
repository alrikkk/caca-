import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Database } from "@/types/database.types";

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "invitation" | "application_status" | "info";
  link?: string;
  read: boolean;
  createdAt: string;
}

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

const LOCAL_NOTIFS_KEY = "caca_user_notifications";

export class NotificationService {
  /**
   * Fetch all in-app notifications for the user
   */
  static async getNotifications(userId?: string): Promise<NotificationRecord[]> {
    if (!userId) return [];

    let localNotifs: NotificationRecord[] = [];
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
      if (stored) {
        try {
          localNotifs = JSON.parse(stored);
        } catch (err) {
          console.error("NotificationService.getNotifications (local parse) failed:", err);
          localNotifs = [];
        }
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) {
          console.error("NotificationService.getNotifications query error:", error);
        } else if (data) {
          const dbNotifs: NotificationRecord[] = (data as NotificationRow[]).map((n) => ({
            id: n.id,
            userId: n.user_id,
            title: n.title,
            message: n.message,
            type: n.type || "info",
            link: n.link || undefined,
            read: Boolean(n.read),
            createdAt: n.created_at,
          }));

          const dbIds = new Set(dbNotifs.map((n) => n.id));
          const remainingLocal = localNotifs.filter((n) => !dbIds.has(n.id));
          return [...dbNotifs, ...remainingLocal];
        }
      } catch (err) {
        console.error("NotificationService.getNotifications exception:", err);
      }
    }

    return localNotifs;
  }

  /**
   * Create and send a notification to a student
   */
  static async createNotification(params: {
    userId: string;
    title: string;
    message: string;
    type?: "invitation" | "application_status" | "info";
    link?: string;
  }): Promise<void> {
    const newNotif: NotificationRecord = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type || "info",
      link: params.link,
      read: false,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from("notifications").insert({
          user_id: params.userId,
          title: params.title,
          message: params.message,
          type: params.type || "info",
          link: params.link || null,
          read: false,
        });

        if (error) {
          console.error("NotificationService.createNotification query error:", error);
        }
      } catch (err) {
        console.error("NotificationService.createNotification exception:", err);
      }
    }

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
        let list: NotificationRecord[] = stored ? JSON.parse(stored) : [];
        list.unshift(newNotif);
        localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(list.slice(0, 30)));
      } catch (err) {
        console.error("NotificationService.createNotification (local save) failed:", err);
      }
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", notificationId);

        if (error) {
          console.error("NotificationService.markAsRead error:", error);
        }
      } catch (err) {
        console.error("NotificationService.markAsRead exception:", err);
      }
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
      if (stored) {
        try {
          const list: NotificationRecord[] = JSON.parse(stored);
          const updated = list.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          );
          localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error("NotificationService.markAsRead (local update) failed:", err);
        }
      }
    }
  }

  /**
   * Mark all notifications for a user as read
   */
  static async markAllAsRead(userId?: string): Promise<void> {
    if (userId && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("user_id", userId);

        if (error) {
          console.error("NotificationService.markAllAsRead error:", error);
        }
      } catch (err) {
        console.error("NotificationService.markAllAsRead exception:", err);
      }
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
      if (stored) {
        try {
          const list: NotificationRecord[] = JSON.parse(stored);
          const updated = list.map((n) => ({ ...n, read: true }));
          localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error("NotificationService.markAllAsRead (local update) failed:", err);
        }
      }
    }
  }
}
