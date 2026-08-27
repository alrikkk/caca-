import { Clip } from "@/types/clip";
import { MOCK_CLIPS, CURRENT_USER } from "@/lib/mock-data";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const LOCAL_CLIPS_KEY = "caca_user_clips";
const LOCAL_CLIP_LIKES_PREFIX = "caca_clip_likes_";

export class ClipService {
  /**
   * Get all clips with like status for specified user
   */
  static async getClips(userId?: string | null): Promise<Clip[]> {
    let localClips: Clip[] = [];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_CLIPS_KEY);
        if (stored) {
          localClips = JSON.parse(stored);
        }
      } catch (err) {
        localClips = [];
      }
    }

    const allClips = [...localClips, ...MOCK_CLIPS];

    return allClips.map((clip) => {
      let isLiked = false;
      if (userId && typeof window !== "undefined") {
        try {
          const key = `${LOCAL_CLIP_LIKES_PREFIX}${userId}`;
          const likedList: string[] = JSON.parse(localStorage.getItem(key) || "[]");
          isLiked = likedList.includes(clip.id);
        } catch {
          isLiked = false;
        }
      }
      return {
        ...clip,
        isLiked,
      };
    });
  }

  /**
   * Toggle like/unlike on a clip
   */
  static async toggleLikeClip(
    clipId: string,
    userId: string,
    isDemo: boolean = false
  ): Promise<{ success: boolean; isLiked: boolean; likesCount: number; error?: string }> {
    let isLiked = false;
    let likesCount = 0;

    // 1. Local Storage persistence
    if (typeof window !== "undefined") {
      try {
        const key = `${LOCAL_CLIP_LIKES_PREFIX}${userId}`;
        const stored = localStorage.getItem(key);
        let list: string[] = stored ? JSON.parse(stored) : [];

        if (list.includes(clipId)) {
          list = list.filter((id) => id !== clipId);
          isLiked = false;
        } else {
          list.push(clipId);
          isLiked = true;
        }
        localStorage.setItem(key, JSON.stringify(list));
      } catch (err) {
        console.warn("Could not update local clip likes:", err);
      }
    }

    // 2. Supabase DB toggle
    if (!isDemo && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        if (isLiked) {
          await supabase.from("clip_likes").insert({ clip_id: clipId, user_id: userId });
          await supabase.rpc("increment_clip_likes", { clip_id_param: clipId });
        } else {
          await supabase
            .from("clip_likes")
            .delete()
            .eq("clip_id", clipId)
            .eq("user_id", userId);
          await supabase.rpc("decrement_clip_likes", { clip_id_param: clipId });
        }
      } catch (err) {
        // Fall back gracefully
      }
    }

    // Calculate updated count
    const target = MOCK_CLIPS.find((c) => c.id === clipId);
    const baseCount = target ? target.likesCount : 10;
    likesCount = isLiked ? baseCount + 1 : baseCount;

    return { success: true, isLiked, likesCount };
  }

  /**
   * Create a new student clip
   */
  static async createClip(
    data: {
      creatorId: string;
      projectId?: string;
      videoUrl: string;
      thumbnailUrl?: string;
      caption: string;
      tags: string[];
    },
    isDemo: boolean = false
  ): Promise<{ success: boolean; clip?: Clip; error?: string }> {
    const newClip: Clip = {
      id: `clip_${Date.now()}`,
      creatorId: data.creatorId,
      creator: CURRENT_USER,
      projectId: data.projectId,
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl,
      caption: data.caption,
      tags: data.tags,
      likesCount: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_CLIPS_KEY);
        const list: Clip[] = stored ? JSON.parse(stored) : [];
        localStorage.setItem(LOCAL_CLIPS_KEY, JSON.stringify([newClip, ...list]));
      } catch (err) {
        console.warn("Could not save clip locally:", err);
      }
    }

    if (!isDemo && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from("clips").insert({
          creator_id: data.creatorId,
          project_id: data.projectId,
          video_url: data.videoUrl,
          thumbnail_url: data.thumbnailUrl,
          caption: data.caption,
          tags: data.tags,
        });
      } catch (err) {
        // Fall back gracefully
      }
    }

    return { success: true, clip: newClip };
  }
}
