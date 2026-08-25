"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Project } from "@/types/project";
import { useAuth } from "@/lib/auth-context";
import { ApplicationService } from "@/services/application-service";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { MatchBreakdownModal } from "./MatchBreakdownModal";
import { MissingRoleMatcherModal } from "./MissingRoleMatcherModal";
import { SquadBuilderModal } from "./SquadBuilderModal";
import {
  Bookmark,
  Clock,
  Users,
  AlertTriangle,
  BarChart2,
  Check,
  UserPlus,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectFeedCardProps {
  project: Project;
  isActive?: boolean;
}

export const ProjectFeedCard: React.FC<ProjectFeedCardProps> = ({
  project,
  isActive = false,
}) => {
  const { profile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMatcherOpen, setIsMatcherOpen] = useState(false);
  const [isSquadBuilderOpen, setIsSquadBuilderOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isApplied, setIsApplied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkApp = async () => {
      if (profile?.id) {
        const applied = await ApplicationService.hasApplied(project.id, profile.id);
        setIsApplied(applied);
      }
    };
    checkApp();
  }, [project.id, profile?.id]);

  const handleApply = async () => {
    if (!profile) {
      window.location.href = "/login";
      return;
    }
    if (isApplied) return;

    setLoading(true);
    const res = await ApplicationService.applyToProject(
      project.id,
      profile.id,
      project.matchScore ?? 85
    );
    setLoading(false);
    if (res.success) {
      setIsApplied(true);
    }
  };

  const matchScore = project.matchScore ?? 80;
  const ownerId = project.owner?.id || project.ownerId;

  return (
    <>
      <article
        className={cn(
          "feed-item w-full bg-white border-hard shadow-hard-lg overflow-hidden mb-6 transition-all",
          isActive && "ring-2 ring-caca-blue"
        )}
      >
        {/* Header */}
        <div className="bg-canvas-subtle border-b-2 border-ink px-4 py-2.5 flex items-center justify-between">
          <Link
            href={`/profile/${ownerId}`}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <Avatar
              name={project.owner?.fullName || "Lead"}
              src={project.owner?.avatarUrl}
              size="sm"
            />
            <span className="font-mono text-xs font-bold uppercase text-ink hover:underline">
              {project.owner?.fullName} • {project.owner?.college}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Badge variant="dark" size="sm">
              {project.category}
            </Badge>
            <button
              onClick={() => setIsModalOpen(true)}
              className={cn(
                "px-2 py-0.5 font-mono font-black text-xs border-hard uppercase tracking-tight hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1",
                matchScore >= 90
                  ? "bg-caca-lime text-ink shadow-hard"
                  : matchScore >= 75
                  ? "bg-caca-yellow text-ink shadow-hard"
                  : "bg-canvas-muted text-ink"
              )}
            >
              <span>MATCH {matchScore}%</span>
            </button>
          </div>
        </div>

        {/* Media */}
        {project.bannerUrl && (
          <div className="relative h-44 sm:h-52 w-full border-b-2 border-ink bg-canvas-muted overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.bannerUrl}
              alt={project.title}
              className="w-full h-full object-cover grayscale-[15%] hover:grayscale-0 transition-all duration-300"
            />
            <div className="absolute bottom-2.5 left-2.5 flex gap-1.5 font-mono text-[11px] font-bold">
              <span className="bg-ink text-white px-2 py-0.5 border-hard-sm uppercase flex items-center gap-1">
                <Clock className="w-3 h-3" /> {project.durationWeeks}W
              </span>
              <span className="bg-ink text-caca-lime px-2 py-0.5 border-hard-sm uppercase flex items-center gap-1">
                <Users className="w-3 h-3" /> {project.hoursPerWeek}H/WK
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="space-y-1">
            <Link
              href={`/projects/${project.id}`}
              className="block group"
            >
              <h2 className="text-lg sm:text-xl font-black font-mono tracking-tight text-ink uppercase group-hover:text-caca-blue transition-colors">
                {project.title}
              </h2>
            </Link>
            <p className="text-xs font-mono text-ink-muted leading-snug">
              {project.tagline}
            </p>
          </div>

          <p className="text-xs sm:text-sm text-ink leading-relaxed font-sans line-clamp-2">
            {project.description}
          </p>

          {/* Missing Roles with 1-Click Candidate Matching */}
          {project.missingRoles && project.missingRoles.length > 0 && (
            <div className="p-2.5 bg-red-50 border-hard-sm border-dashed border-red-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span className="font-bold text-red-700 uppercase">
                  MISSING: {project.missingRoles.join(" • ")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole(project.missingRoles?.[0] || "Squad Member");
                  setIsMatcherOpen(true);
                }}
                className="px-2 py-1 bg-white hover:bg-ink hover:text-white border-hard-sm text-[10px] font-bold uppercase transition-colors shrink-0 flex items-center gap-1 shadow-hard-sm"
              >
                <UserPlus className="w-3 h-3" />
                <span>FIND MATCHES →</span>
              </button>
            </div>
          )}

          {/* Required Skills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {project.requiredSkills.map((req) => (
              <Badge
                key={req.skill.name}
                variant={req.importance === "required" ? "default" : "outline"}
                size="sm"
              >
                <span>{req.skill.name}</span>
                <span className="ml-1 text-[10px] text-ink-muted">
                  {req.requiredProficiency}/5
                </span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Action Footer */}
        <div className="border-t-2 border-ink bg-canvas-subtle p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1 text-xs"
            >
              <BarChart2 className="w-3 h-3" />
              <span>WHY YOU MATCH</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSquadBuilderOpen(true)}
              className="flex items-center gap-1 text-xs bg-caca-yellow/20 hover:bg-caca-yellow/40 text-ink border-hard"
            >
              <Zap className="w-3 h-3 text-ink fill-ink" />
              <span>BUILD SQUAD</span>
            </Button>

            <button
              onClick={() => setIsSaved(!isSaved)}
              className={cn(
                "p-1.5 border-hard bg-white btn-tactile",
                isSaved && "bg-caca-yellow"
              )}
              aria-label="Save project"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/projects/${project.id}`}>
              <Button variant="outline" size="sm" className="text-xs">
                VIEW
              </Button>
            </Link>

            <Button
              variant={isApplied ? "accent" : "primary"}
              size="sm"
              onClick={handleApply}
              isLoading={loading}
              disabled={isApplied}
              className="text-xs"
            >
              {isApplied ? (
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" /> APPLIED
                </span>
              ) : (
                <span>JOIN</span>
              )}
            </Button>
          </div>
        </div>
      </article>

      <MatchBreakdownModal
        project={project}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <MissingRoleMatcherModal
        isOpen={isMatcherOpen}
        onClose={() => setIsMatcherOpen(false)}
        projectId={project.id}
        projectName={project.title}
        missingRole={selectedRole || project.missingRoles?.[0] || "Squad Member"}
        requiredSkills={project.requiredSkills.map((r) => r.skill.name)}
        project={project}
      />

      <SquadBuilderModal
        isOpen={isSquadBuilderOpen}
        onClose={() => setIsSquadBuilderOpen(false)}
        project={project}
      />
    </>
  );
};
