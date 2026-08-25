import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

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
        } catch {
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

        if (!error && data) {
          const dbNotifs: NotificationRecord[] = data.map((n: any) => ({
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
        console.error("getNotifications exception:", err);
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
        await supabase.from("notifications").insert({
          user_id: params.userId,
          title: params.title,
          message: params.message,
          type: params.type || "info",
          link: params.link || null,
          read: false,
        });
      } catch (err) {
        console.error("createNotification supabase exception:", err);
      }
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
      let list: NotificationRecord[] = stored ? JSON.parse(stored) : [];
      list.unshift(newNotif);
      localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(list.slice(0, 30)));
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", notificationId);
      } catch (err) {
        console.error("markAsRead error:", err);
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
        } catch {}
      }
    }
  }
}
