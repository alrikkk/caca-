import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Database } from "@/types/database.types";
import { MOCK_STUDENTS } from "@/lib/mock-data";

export interface NotificationRecord {
  id: string;
  userId: string; // recipient_id
  actorId?: string; // actor_id
  actorName?: string;
  actorAvatarUrl?: string;
  title: string;
  message: string;
  type: "invitation" | "application_status" | "follow" | "connect" | "message" | "info";
  link?: string;
  read: boolean;
  createdAt: string;
}

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

const LOCAL_NOTIFS_KEY = "caca_user_notifications";

export class NotificationService {
  /**
   * Get initial mock notifications scoped strictly by recipient user ID
   */
  private static getInitialUserNotifications(userId: string): NotificationRecord[] {
    if (userId === "usr_curr_01" || userId === "demo") {
      return [
        {
          id: "notif_alex_1",
          userId,
          actorId: "usr_02",
          actorName: "Maya Patel",
          actorAvatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
          title: "Invitation Accepted",
          message: "Maya Patel accepted your invitation to join EchoSpatial Core Squad!",
          type: "application_status",
          link: "/teams",
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: "notif_alex_2",
          userId,
          actorId: "usr_03",
          actorName: "Marcus Vance",
          actorAvatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
          title: "New Project Application",
          message: "Marcus Vance applied to join your project \"eBPF Distributed Kernel Telemetry\".",
          type: "application_status",
          link: "/teams",
          read: false,
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: "notif_alex_3",
          userId,
          title: "New Match Alert",
          message: "BioFlow matched 96% with your skills in React & PyTorch.",
          type: "info",
          link: "/feed",
          read: true,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ];
    }

    if (userId === "usr_02") {
      return [
        {
          id: "notif_maya_1",
          userId: "usr_02",
          actorId: "usr_curr_01",
          actorName: "Alex Chen",
          actorAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          title: "New Squad Invitation",
          message: "Alex Chen invited you to join \"EchoSpatial Core Squad\" as Lead ML Engineer.",
          type: "invitation",
          link: "/teams",
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    if (userId === "usr_03") {
      return [
        {
          id: "notif_marcus_1",
          userId: "usr_03",
          actorId: "usr_curr_01",
          actorName: "Alex Chen",
          actorAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          title: "New Connection",
          message: "Alex Chen connected with you on Caca.",
          type: "connect",
          link: "/profile/usr_curr_01",
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    return [];
  }

  /**
   * Fetch all in-app notifications strictly filtered by recipient_id
   */
  static async getNotifications(userId?: string): Promise<NotificationRecord[]> {
    if (!userId) return [];

    let localNotifs: NotificationRecord[] = [];
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
      if (stored) {
        try {
          const all: NotificationRecord[] = JSON.parse(stored);
          localNotifs = all.filter((n) => n.userId === userId);
          if (localNotifs.length === 0) {
            const initial = this.getInitialUserNotifications(userId);
            if (initial.length > 0) {
              localNotifs = initial;
              localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify([...all, ...initial]));
            }
          }
        } catch (err) {
          console.error("NotificationService.getNotifications (local parse) failed:", err);
          localNotifs = [];
        }
      } else {
        // Initialize scoped mock notifications for all default users
        const allInitial = [
          ...this.getInitialUserNotifications("usr_curr_01"),
          ...this.getInitialUserNotifications("usr_02"),
          ...this.getInitialUserNotifications("usr_03"),
        ];
        localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(allInitial));
        localNotifs = allInitial.filter((n) => n.userId === userId);
      }
    } else {
      localNotifs = this.getInitialUserNotifications(userId);
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
            type: (n.type as NotificationRecord["type"]) || "info",
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
   * Create and send a notification to a specific recipient student
   */
  static async createNotification(params: {
    userId: string; // Recipient
    actorId?: string;
    actorName?: string;
    actorAvatarUrl?: string;
    title: string;
    message: string;
    type?: "invitation" | "application_status" | "follow" | "connect" | "message" | "info";
    link?: string;
  }): Promise<void> {
    // Resolve actor details if actorId provided and name/avatar missing
    let actorName = params.actorName;
    let actorAvatarUrl = params.actorAvatarUrl;

    if (params.actorId && (!actorName || !actorAvatarUrl)) {
      const actorStudent = MOCK_STUDENTS.find((s) => s.id === params.actorId);
      if (actorStudent) {
        actorName = actorName || actorStudent.fullName;
        actorAvatarUrl = actorAvatarUrl || actorStudent.avatarUrl;
      }
    }

    const newNotif: NotificationRecord = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: params.userId,
      actorId: params.actorId,
      actorName,
      actorAvatarUrl,
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
        localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(list.slice(0, 50)));
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
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", notificationId);
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
   * Mark all notifications for a specific user as read
   */
  static async markAllAsRead(userId?: string): Promise<void> {
    if (!userId) return;

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("user_id", userId);
      } catch (err) {
        console.error("NotificationService.markAllAsRead exception:", err);
      }
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
      if (stored) {
        try {
          const list: NotificationRecord[] = JSON.parse(stored);
          // ONLY mark notifications belonging to this specific user as read
          const updated = list.map((n) =>
            n.userId === userId ? { ...n, read: true } : n
          );
          localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error("NotificationService.markAllAsRead (local update) failed:", err);
        }
      }
    }
  }
}
