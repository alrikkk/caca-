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
const LOCAL_STORAGE_DEMO_KEY = "caca_is_demo_mode";

export class NotificationService {
  /**
   * Helper to check if Demo Mode is active
   */
  private static checkIsDemo(isDemoParam?: boolean): boolean {
    if (typeof isDemoParam === "boolean") return isDemoParam;
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem(LOCAL_STORAGE_DEMO_KEY) === "true" &&
        document.cookie.includes("caca_demo_mode=true")
      );
    }
    return false;
  }

  /**
   * Get initial mock notifications scoped strictly by recipient user ID for Demo Mode
   */
  static getInitialDemoNotifications(userId: string): NotificationRecord[] {
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
   * Fetch all in-app notifications strictly filtered by recipient user ID
   */
  static async getNotifications(userId?: string, isDemoMode?: boolean): Promise<NotificationRecord[]> {
    if (!userId) return [];

    const isDemo = this.checkIsDemo(isDemoMode);
    let localNotifs: NotificationRecord[] = [];

    // 1. Local Storage Cache retrieval filtered by userId
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
      if (stored) {
        try {
          const all: NotificationRecord[] = JSON.parse(stored);
          localNotifs = all.filter((n) => n.userId === userId);
          if (localNotifs.length === 0) {
            const initial = this.getInitialDemoNotifications(userId);
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
        const allInitial = [
          ...this.getInitialDemoNotifications("usr_curr_01"),
          ...this.getInitialDemoNotifications("usr_02"),
          ...this.getInitialDemoNotifications("usr_03"),
        ];
        localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(allInitial));
        localNotifs = allInitial.filter((n) => n.userId === userId);
      }
    } else {
      localNotifs = this.getInitialDemoNotifications(userId);
    }

    // 2. Supabase DB fetch for Real Authenticated Users
    if (isSupabaseConfigured() && !isDemo) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(30);

        if (error) {
          console.error("NotificationService.getNotifications query error:", error);
        } else if (data && data.length > 0) {
          // Identify any actor IDs to resolve profile info
          const actorIds = new Set<string>();
          data.forEach((n: any) => {
            const meta = n.metadata || {};
            if (meta.actor_id) actorIds.add(meta.actor_id);
          });

          let actorProfilesMap = new Map<string, any>();
          if (actorIds.size > 0) {
            const { data: profs } = await supabase
              .from("profiles")
              .select("id, full_name, avatar_url")
              .in("id", Array.from(actorIds));

            if (profs) {
              profs.forEach((p) => actorProfilesMap.set(p.id, p));
            }
          }

          const dbNotifs: NotificationRecord[] = (data as any[]).map((n) => {
            const meta = n.metadata || {};
            const resolvedActor = meta.actor_id ? actorProfilesMap.get(meta.actor_id) : null;
            const mockActor = meta.actor_id ? MOCK_STUDENTS.find((s) => s.id === meta.actor_id) : null;

            return {
              id: n.id,
              userId: n.user_id,
              actorId: meta.actor_id,
              actorName: resolvedActor?.full_name || meta.actor_name || mockActor?.fullName,
              actorAvatarUrl: resolvedActor?.avatar_url || meta.actor_avatar_url || mockActor?.avatarUrl,
              title: n.title,
              message: n.message,
              type: (n.type as NotificationRecord["type"]) || "info",
              link: n.link || undefined,
              read: Boolean(n.read),
              createdAt: n.created_at,
            };
          });

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
    isDemoMode?: boolean;
  }): Promise<void> {
    if (!params.userId) return;

    const isDemo = this.checkIsDemo(params.isDemoMode);

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

    if (isSupabaseConfigured() && !isDemo) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from("notifications").insert({
          user_id: params.userId,
          title: params.title,
          message: params.message,
          type: (params.type || "info") as any,
          link: params.link || null,
          metadata: {
            actor_id: params.actorId || null,
            actor_name: actorName || null,
            actor_avatar_url: actorAvatarUrl || null,
          },
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
   * Mark a single notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
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

    if (isSupabaseConfigured() && !this.checkIsDemo()) {
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
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
      if (stored) {
        try {
          const list: NotificationRecord[] = JSON.parse(stored);
          const updated = list.map((n) =>
            n.userId === userId ? { ...n, read: true } : n
          );
          localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error("NotificationService.markAllAsRead (local update) failed:", err);
        }
      }
    }

    if (isSupabaseConfigured() && !this.checkIsDemo()) {
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
  }
}
