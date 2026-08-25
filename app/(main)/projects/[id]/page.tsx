"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Project } from "@/types/project";
import { ProjectService } from "@/services/project-service";
import { ApplicationService } from "@/services/application-service";
import { useAuth } from "@/lib/auth-context";
import { MOCK_STUDENTS } from "@/lib/mock-data";
import { defaultMatchingEngine } from "@/matching/engine";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import {
  ArrowLeft,
  Check,
} from "lucide-react";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { profile } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [isApplied, setIsApplied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const p = await ProjectService.getProjectById(projectId, profile);
      setProject(p);

      if (profile?.id) {
        const applied = await ApplicationService.hasApplied(projectId, profile.id);
        setIsApplied(applied);
      }
    };
    loadData();
  }, [projectId, profile]);

  if (!project) {
    return (
      <div className="p-10 border-hard bg-white shadow-hard text-center">
        <p className="font-mono font-bold text-xs uppercase text-ink">
          PROJECT NOT FOUND
        </p>
      </div>
    );
  }

  const teamResult = defaultMatchingEngine.evaluateTeamComposition(
    MOCK_STUDENTS.slice(0, 3),
    project
  );

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

  const ownerId = project.owner?.id || project.ownerId;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase text-ink hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>FEED</span>
        </Link>
      </div>

      {/* Main Project Card */}
      <div className="bg-white border-hard shadow-hard overflow-hidden">
        {project.bannerUrl && (
          <div className="h-48 sm:h-64 w-full border-b-2 border-ink overflow-hidden relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.bannerUrl}
              alt={project.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3">
              <Badge variant="lime" size="md">
                MATCH {project.matchScore ?? 90}%
              </Badge>
            </div>
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="dark" size="sm">
                {project.category}
              </Badge>
              <Badge variant="outline" size="sm">
                {project.status}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-mono tracking-tight uppercase text-ink">
              {project.title}
            </h1>
            <p className="text-xs sm:text-sm font-mono text-ink-muted leading-snug">
              {project.tagline}
            </p>
          </div>

          <p className="text-xs sm:text-sm leading-relaxed text-ink font-sans">
            {project.description}
          </p>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2 border-t-2 border-b-2 border-ink py-3 text-center font-mono">
            <div>
              <p className="text-[10px] text-ink-muted uppercase">TEAM SIZE</p>
              <p className="text-sm font-black text-ink">{project.maxTeamSize} ROLES</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-muted uppercase">COMMITMENT</p>
              <p className="text-sm font-black text-ink">{project.hoursPerWeek}H / WK</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-muted uppercase">DURATION</p>
              <p className="text-sm font-black text-ink">{project.durationWeeks} WEEKS</p>
            </div>
          </div>

          {/* Owner & Action */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href={`/profile/${ownerId}`}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <Avatar
                name={project.owner?.fullName || "Lead"}
                src={project.owner?.avatarUrl}
                size="sm"
              />
              <div className="text-xs font-mono">
                <p className="font-bold uppercase text-ink hover:underline">
                  {project.owner?.fullName}
                </p>
                <p className="text-[10px] text-ink-muted">
                  {project.owner?.college}
                </p>
              </div>
            </Link>

            <Button
              variant={isApplied ? "accent" : "primary"}
              size="md"
              onClick={handleApply}
              isLoading={loading}
              disabled={isApplied}
            >
              {isApplied ? (
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> APPLIED
                </span>
              ) : (
                <span>JOIN</span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Roster & Skill Coverage */}
      <div className="bg-white border-hard shadow-hard p-5 space-y-4">
        <div className="flex items-center justify-between border-b-2 border-ink pb-2">
          <h2 className="text-xs font-mono font-black uppercase text-ink">
            TEAM ROSTER ({project.slots?.length || 4} SLOTS)
          </h2>
          <Badge variant="lime" size="sm">
            TEAM COMPATIBILITY: {teamResult.teamScore}%
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {(project.slots || []).map((slot) => (
            <div
              key={slot.id}
              className="p-3 border-hard bg-canvas-subtle flex items-start justify-between gap-2"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-xs uppercase text-ink">
                    {slot.roleTitle}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {slot.requiredSkills.map((sk) => (
                    <span
                      key={sk}
                      className="text-[10px] font-mono bg-white px-1 border-hard-sm"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              {slot.assignedMember ? (
                <Link
                  href={`/profile/${slot.assignedMember.id}`}
                  className="hover:opacity-80 transition-opacity"
                  title={`View ${slot.assignedMember.fullName}'s profile`}
                >
                  <Avatar
                    name={slot.assignedMember.fullName}
                    src={slot.assignedMember.avatarUrl}
                    size="sm"
                  />
                </Link>
              ) : (
                <Badge variant="coral" size="sm">
                  OPEN
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Skill Coverage */}
        <div className="pt-2">
          <p className="text-xs font-mono font-bold uppercase text-ink mb-2">
            SKILL COVERAGE
          </p>
          <div className="divide-y divide-ink/10 border-hard bg-canvas-subtle p-3 text-xs font-mono">
            {teamResult.skillCoverages.map((cov) => (
              <div
                key={cov.skillName}
                className="flex items-center justify-between py-1.5"
              >
                <span className="font-bold text-ink">{cov.skillName}</span>
                {cov.isCovered ? (
                  <Badge variant="lime" size="sm">
                    COVERED
                  </Badge>
                ) : (
                  <Badge variant="missing" size="sm">
                    MISSING: {cov.skillName}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
