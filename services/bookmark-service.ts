import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const BOOKMARK_STORAGE_KEY_PREFIX = "caca_saved_projects_";

export class BookmarkService {
  /**
   * Retrieves all bookmarked project IDs for a given user.
   */
  static async getBookmarkedProjectIds(userId: string): Promise<string[]> {
    if (!userId) return [];

    // 1. Check local cache first for instant synchronous/cached load
    let localSaved: string[] = [];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`${BOOKMARK_STORAGE_KEY_PREFIX}${userId}`);
        if (stored) {
          localSaved = JSON.parse(stored);
        }
      } catch (err) {
        console.error("BookmarkService.getBookmarkedProjectIds local error:", err);
      }
    }

    // 2. Query Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("project_bookmarks")
          .select("project_id")
          .eq("user_id", userId);

        if (!error && data) {
          const dbSaved = data.map((d: { project_id: string }) => d.project_id);
          // Sync with local storage
          const combined = Array.from(new Set([...localSaved, ...dbSaved]));
          if (typeof window !== "undefined") {
            localStorage.setItem(`${BOOKMARK_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(combined));
          }
          return combined;
        }
      } catch (err) {
        // Fallback to local storage
      }
    }

    return localSaved;
  }

  /**
   * Checks if a project is bookmarked by a user.
   */
  static isBookmarked(userId: string, projectId: string): boolean {
    if (!userId || !projectId || typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem(`${BOOKMARK_STORAGE_KEY_PREFIX}${userId}`);
      if (!stored) return false;
      const list: string[] = JSON.parse(stored);
      return list.includes(projectId);
    } catch {
      return false;
    }
  }

  /**
   * Toggles bookmark state for a project with optimistic local update.
   */
  static async toggleBookmark(
    userId: string,
    projectId: string
  ): Promise<{ isSaved: boolean; success: boolean }> {
    if (!userId || !projectId) {
      return { isSaved: false, success: false };
    }

    // 1. Compute new state optimistically
    let currentSaved: string[] = [];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`${BOOKMARK_STORAGE_KEY_PREFIX}${userId}`);
        if (stored) currentSaved = JSON.parse(stored);
      } catch {
        currentSaved = [];
      }
    }

    const wasSaved = currentSaved.includes(projectId);
    const newSaved = wasSaved
      ? currentSaved.filter((id) => id !== projectId)
      : [...currentSaved, projectId];

    // Save to local storage immediately
    if (typeof window !== "undefined") {
      localStorage.setItem(`${BOOKMARK_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(newSaved));
    }

    // 2. Persist to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        if (wasSaved) {
          await supabase
            .from("project_bookmarks")
            .delete()
            .eq("user_id", userId)
            .eq("project_id", projectId);
        } else {
          await supabase
            .from("project_bookmarks")
            .insert({ user_id: userId, project_id: projectId });
        }
      } catch (err) {
        // Failures gracefully handled by local fallback
      }
    }

    return { isSaved: !wasSaved, success: true };
  }
}
