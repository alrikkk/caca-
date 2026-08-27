"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ClipService } from "@/services/clip-service";
import { SocialService } from "@/services/social-service";
import { Clip } from "@/types/clip";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import {
  Heart,
  Share2,
  Play,
  Pause,
  Plus,
  UserPlus,
  UserCheck,
  Check,
  Film,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClipsPage() {
  const { profile, isDemoMode } = useAuth();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [copiedClipId, setCopiedClipId] = useState<string | null>(null);

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState(
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
  );
  const [tags, setTags] = useState("Demo, Prototype, AI");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadClips = async () => {
      setLoading(true);
      const data = await ClipService.getClips(profile?.id);
      setClips(data);
      if (data.length > 0) {
        setPlayingId(data[0].id);
      }

      // Check follows
      if (profile?.id) {
        const map: Record<string, boolean> = {};
        for (const c of data) {
          map[c.creatorId] = SocialService.isFollowing(profile.id, c.creatorId);
        }
        setFollowingMap(map);
      }
      setLoading(false);
    };

    loadClips();
  }, [profile?.id]);

  const handleToggleLike = async (clip: Clip) => {
    if (!profile?.id) {
      window.location.href = "/login";
      return;
    }

    const currentLiked = clip.isLiked;
    const currentCount = clip.likesCount;

    // Optimistic UI
    setClips((prev) =>
      prev.map((c) =>
        c.id === clip.id
          ? {
              ...c,
              isLiked: !currentLiked,
              likesCount: currentLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
            }
          : c
      )
    );

    await ClipService.toggleLikeClip(clip.id, profile.id, isDemoMode);
  };

  const handleToggleFollow = async (creatorId: string) => {
    if (!profile?.id) {
      window.location.href = "/login";
      return;
    }
    if (profile.id === creatorId) return;

    const isCurrentlyFollowing = Boolean(followingMap[creatorId]);
    setFollowingMap((prev) => ({ ...prev, [creatorId]: !isCurrentlyFollowing }));

    if (isCurrentlyFollowing) {
      await SocialService.unfollowUser(profile.id, creatorId, isDemoMode);
    } else {
      await SocialService.followUser(profile.id, creatorId, isDemoMode);
    }
  };

  const handleShare = (clipId: string) => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedClipId(clipId);
    setTimeout(() => setCopiedClipId(null), 2500);
  };

  const handleCreateClip = async () => {
    if (!caption.trim() || !profile?.id) return;
    setIsSubmitting(true);

    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const res = await ClipService.createClip(
      {
        creatorId: profile.id,
        caption: caption.trim(),
        videoUrl: videoUrl.trim(),
        tags: tagList,
      },
      isDemoMode
    );

    setIsSubmitting(false);

    if (res.success && res.clip) {
      setClips([res.clip, ...clips]);
      setIsUploadOpen(false);
      setCaption("");
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b-2 border-ink pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight uppercase text-ink flex items-center gap-2">
            <Film className="w-6 h-6" />
            <span>CLIPS</span>
          </h1>
          <p className="text-xs font-mono text-ink-muted">
            STUDENT PROJECT DEMOS, LAB EXPERIMENTS & SPRINT UPDATES
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-1 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>UPLOAD CLIP</span>
        </Button>
      </div>

      {/* Vertical Clips Feed */}
      <div className="space-y-6">
        {clips.map((clip) => {
          const isPlaying = playingId === clip.id;
          const isFollowed = Boolean(followingMap[clip.creatorId]);
          const isCreatorSelf = profile?.id === clip.creatorId;

          return (
            <article
              key={clip.id}
              className="bg-white border-hard shadow-hard-lg overflow-hidden font-mono"
            >
              {/* Creator Header */}
              <div className="p-3 bg-canvas-subtle border-b-2 border-ink flex items-center justify-between">
                <Link
                  href={`/profile/${clip.creatorId}`}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <Avatar
                    name={clip.creator?.fullName || "Student"}
                    src={clip.creator?.avatarUrl}
                    size="sm"
                  />
                  <div>
                    <p className="font-bold text-xs uppercase text-ink">
                      {clip.creator?.fullName || "Student Creator"}
                    </p>
                    <p className="text-[10px] text-ink-muted">
                      {clip.creator?.college || "University"}
                    </p>
                  </div>
                </Link>

                {!isCreatorSelf && (
                  <Button
                    variant={isFollowed ? "outline" : "accent"}
                    size="sm"
                    onClick={() => handleToggleFollow(clip.creatorId)}
                    className="text-[10px] h-6 px-2"
                  >
                    {isFollowed ? (
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-caca-blue" />
                        <span>FOLLOWING</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <UserPlus className="w-3 h-3" />
                        <span>FOLLOW</span>
                      </span>
                    )}
                  </Button>
                )}
              </div>

              {/* Video Player */}
              <div className="relative aspect-[4/3] sm:aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
                <video
                  src={clip.videoUrl}
                  poster={clip.thumbnailUrl}
                  loop
                  muted
                  playsInline
                  autoPlay={isPlaying}
                  className="w-full h-full object-cover"
                />

                {/* Play/Pause Overlay Controls */}
                <button
                  type="button"
                  onClick={() => setPlayingId(isPlaying ? null : clip.id)}
                  className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors group"
                  aria-label={isPlaying ? "Pause video" : "Play video"}
                >
                  <div className="p-3 bg-ink text-caca-lime border-hard opacity-0 group-hover:opacity-100 transition-opacity">
                    {isPlaying ? (
                      <Pause className="w-5 h-5 fill-caca-lime" />
                    ) : (
                      <Play className="w-5 h-5 fill-caca-lime" />
                    )}
                  </div>
                </button>
              </div>

              {/* Caption & Metadata */}
              <div className="p-4 space-y-3">
                <p className="font-sans text-xs sm:text-sm text-ink leading-relaxed font-medium">
                  {clip.caption}
                </p>

                {/* Tags */}
                {clip.tags && clip.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {clip.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 bg-canvas-subtle border-hard-sm text-[10px] font-bold uppercase text-ink"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Project Link Banner if attached */}
                {clip.project && (
                  <div className="p-2.5 bg-canvas-subtle border-hard flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[9px] text-ink-muted uppercase font-bold">ATTACHED PROJECT</span>
                      <p className="font-bold text-ink truncate max-w-[200px] sm:max-w-xs uppercase">
                        {clip.project.title}
                      </p>
                    </div>
                    <Link href={`/projects/${clip.project.id}`}>
                      <Button variant="outline" size="sm" className="text-xs h-6 px-2">
                        <span>VIEW SQUAD →</span>
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Interaction Footer */}
                <div className="flex items-center justify-between border-t border-ink/10 pt-3">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(clip)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 border-hard text-xs font-bold uppercase btn-tactile transition-all",
                      clip.isLiked
                        ? "bg-red-500 text-white shadow-hard-sm"
                        : "bg-white text-ink hover:bg-canvas-subtle shadow-hard-sm"
                    )}
                  >
                    <Heart
                      className={cn("w-3.5 h-3.5", clip.isLiked && "fill-white text-white")}
                    />
                    <span>{clip.likesCount} LIKES</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShare(clip.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border-hard bg-white hover:bg-canvas-subtle text-xs font-bold uppercase shadow-hard-sm"
                  >
                    {copiedClipId === clip.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-caca-blue" />
                        <span className="text-caca-blue font-black">LINK COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-ink" />
                        <span>SHARE</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Upload Clip Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="UPLOAD STUDENT CLIP"
        className="max-w-md"
      >
        <div className="space-y-3.5 font-mono text-xs">
          <div className="space-y-1">
            <label className="block font-bold uppercase text-ink">CAPTION / UPDATE</label>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What did your squad ship or test today?..."
              className="w-full p-2.5 bg-canvas-subtle border-hard text-xs focus:outline-none focus:bg-white leading-relaxed"
              required
            />
          </div>

          <Input
            label="VIDEO URL (MP4 / WEBM)"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://..."
            required
          />

          <Input
            label="TAGS (COMMA SEPARATED)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Demo, LiDAR, Robotics, NextJS"
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsUploadOpen(false)}>
              CANCEL
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateClip}
              isLoading={isSubmitting}
              disabled={isSubmitting || !caption.trim()}
            >
              PUBLISH CLIP
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
