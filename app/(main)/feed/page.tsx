"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { ProjectFeedCard } from "@/components/feed/ProjectFeedCard";
import { ProjectService } from "@/services/project-service";
import { Project } from "@/types/project";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type FilterType = "ALL" | "HIGH_MATCH" | "URGENT" | "SYSTEMS" | "AI";

export default function FeedPage() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const loadProjects = async () => {
      const list = await ProjectService.getFeedProjects(profile);
      setProjects(list);
    };
    loadProjects();
  }, [profile]);

  const filteredProjects = useMemo(() => {
    return projects.filter((proj) => {
      if (activeFilter === "HIGH_MATCH") {
        return (proj.matchScore ?? 0) >= 85;
      }
      if (activeFilter === "URGENT") {
        return proj.missingRoles && proj.missingRoles.length > 0;
      }
      if (activeFilter === "SYSTEMS") {
        return proj.category.toLowerCase().includes("systems");
      }
      if (activeFilter === "AI") {
        return (
          proj.category.toLowerCase().includes("ai") ||
          proj.category.toLowerCase().includes("vision")
        );
      }
      return true;
    });
  }, [projects, activeFilter]);

  // Keyboard navigation for vertical discovery (J/K or Down/Up)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === "j" || e.key === "ArrowDown") {
        setSelectedIndex((prev) => Math.min(filteredProjects.length - 1, prev + 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredProjects.length]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header & Filter Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight uppercase text-ink">
              FEED
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="lime" size="sm">
              {filteredProjects.length} MATCHED
            </Badge>
            <span className="hidden sm:inline-block text-[10px] font-mono text-ink-muted uppercase">
              [J / K NAV]
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(
            [
              { id: "ALL", label: "ALL" },
              { id: "HIGH_MATCH", label: "MATCH >85%" },
              { id: "URGENT", label: "MISSING ROLES" },
              { id: "AI", label: "AI & VISION" },
              { id: "SYSTEMS", label: "SYSTEMS" },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => {
                setActiveFilter(filter.id);
                setSelectedIndex(0);
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-mono font-bold uppercase border-hard whitespace-nowrap btn-tactile transition-all",
                activeFilter === filter.id
                  ? "bg-ink text-white shadow-hard"
                  : "bg-white text-ink hover:bg-canvas-subtle shadow-hard"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical Feed Stream */}
      <div className="feed-container space-y-4">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project, index) => (
            <ProjectFeedCard
              key={project.id}
              project={project}
              isActive={index === selectedIndex}
            />
          ))
        ) : (
          <div className="p-10 text-center border-hard bg-white shadow-hard">
            <p className="font-mono font-bold text-xs uppercase text-ink">
              NO MATCHING PROJECTS
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
