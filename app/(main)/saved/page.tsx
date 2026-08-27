"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ProjectService } from "@/services/project-service";
import { BookmarkService } from "@/services/bookmark-service";
import { Project } from "@/types/project";
import { ProjectFeedCard } from "@/components/feed/ProjectFeedCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Bookmark, Sparkles, ArrowRight } from "lucide-react";

export default function SavedProjectsPage() {
  const { profile } = useAuth();
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSaved = async () => {
      setLoading(true);
      if (profile?.id) {
        const [allProjects, savedIds] = await Promise.all([
          ProjectService.getFeedProjects(profile),
          BookmarkService.getBookmarkedProjectIds(profile.id),
        ]);
        const bookmarked = allProjects.filter((p) => savedIds.includes(p.id));
        setSavedProjects(bookmarked);
      } else {
        setSavedProjects([]);
      }
      setLoading(false);
    };

    loadSaved();
  }, [profile]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12 font-mono">
      {/* Header */}
      <div className="border-b-2 border-ink pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-ink flex items-center gap-2">
            <Bookmark className="w-6 h-6 fill-ink" />
            <span>SAVED PROJECTS</span>
          </h1>
          <p className="text-xs text-ink-muted">
            YOUR BOOKMARKED HACKATHON SQUADS & RESEARCH OPPORTUNITIES
          </p>
        </div>

        <Badge variant="lime" size="sm">
          {savedProjects.length} BOOKMARKED
        </Badge>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {savedProjects.length > 0 ? (
          savedProjects.map((project) => (
            <ProjectFeedCard key={project.id} project={project} />
          ))
        ) : (
          <div className="p-10 text-center border-hard bg-white shadow-hard space-y-3">
            <div className="p-3 bg-canvas-subtle border-hard inline-block mx-auto text-ink">
              <Bookmark className="w-6 h-6" />
            </div>
            <p className="font-bold text-xs uppercase text-ink">
              NO SAVED PROJECTS YET
            </p>
            <p className="text-xs text-ink-muted max-w-sm mx-auto">
              Click the bookmark icon on any project card in the feed to save squads you are interested in exploring or joining later.
            </p>
            <div className="pt-2">
              <Link href="/feed">
                <Button variant="primary" size="sm" className="text-xs">
                  <span>BROWSE PROJECT FEED →</span>
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
