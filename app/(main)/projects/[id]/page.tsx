"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Project } from "@/types/project";
import { ProjectService } from "@/services/project-service";
import { ApplicationService } from "@/services/application-service";
import { TeamService } from "@/services/team-service";
import { useAuth } from "@/lib/auth-context";
import { MOCK_STUDENTS, CURRENT_USER } from "@/lib/mock-data";
import { defaultMatchingEngine } from "@/matching/engine";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MissingRoleMatcherModal } from "@/components/feed/MissingRoleMatcherModal";
import { SquadBuilderModal } from "@/components/feed/SquadBuilderModal";
import { MatchBreakdownModal } from "@/components/feed/MatchBreakdownModal";
import {
  ArrowLeft,
  Check,
  Plus,
  Users,
  UserPlus,
  Zap,
  CheckCircle2,
  AlertTriangle,
  BarChart2,
  Shield,
} from "lucide-react";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { profile, user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [isApplied, setIsApplied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isMatcherOpen, setIsMatcherOpen] = useState(false);
  const [selectedMatcherRole, setSelectedMatcherRole] = useState("Squad Member");
  const [selectedRequiredSkills, setSelectedRequiredSkills] = useState<string[]>([]);
  const [isSquadBuilderOpen, setIsSquadBuilderOpen] = useState(false);
  const [isMatchBreakdownOpen, setIsMatchBreakdownOpen] = useState(false);

  // Team creation modal
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [roleTitle, setRoleTitle] = useState("Squad Lead");
  const [isCreatingSquad, setIsCreatingSquad] = useState(false);
  const [squadError, setSquadError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const p = await ProjectService.getProjectById(projectId, profile);
      setProject(p);

      const userId = user?.id || profile?.id;
      if (userId) {
        const applied = await ApplicationService.hasApplied(projectId, userId);
        setIsApplied(applied);
      }
    };
    loadData();
  }, [projectId, profile, user?.id]);

  if (!project) {
    return (
      <div className="p-10 border-hard bg-white shadow-hard text-center">
        <p className="font-mono font-bold text-xs uppercase text-ink">
          PROJECT NOT FOUND
        </p>
      </div>
    );
  }

  const targetStudent = profile || CURRENT_USER;
  const matchResult = defaultMatchingEngine.calculateIndividualMatch(targetStudent, project);
  const teamResult = defaultMatchingEngine.evaluateTeamSynergy(
    MOCK_STUDENTS.slice(0, 3),
    project
  );

  const handleApply = async () => {
    const userId = user?.id || profile?.id;
    if (!userId) {
      router.push("/login");
      return;
    }
    if (isApplied) return;

    setLoading(true);
    const res = await ApplicationService.applyToProject(
      project.id,
      userId,
      project.matchScore ?? 85
    );
    setLoading(false);
    if (res.success) {
      setIsApplied(true);
    }
  };

  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    const userId = user?.id || profile?.id;
    if (!userId) {
      router.push("/login");
      return;
    }

    setIsCreatingSquad(true);
    setSquadError(null);

    const res = await TeamService.createTeam({
      projectId: project.id,
      projectName: project.title,
      teamName: teamName.trim(),
      creatorId: userId,
      roleTitle: roleTitle.trim() || "Squad Lead",
      compatibilityScore: project.matchScore ?? 90,
    });

    setIsCreatingSquad(false);

    if (res.error) {
      setSquadError(res.error);
    } else {
      setIsSquadModalOpen(false);
      router.push("/teams");
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
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                onClick={() => setIsMatchBreakdownOpen(true)}
                className="cursor-pointer"
              >
                <Badge variant="lime" size="md">
                  MATCH {matchResult.overallScore}%
                </Badge>
              </button>
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
              <p className="text-[10px] text-ink-muted uppercase font-bold">TEAM SIZE</p>
              <p className="text-sm font-black text-ink">{project.maxTeamSize} ROLES</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-muted uppercase font-bold">COMMITMENT</p>
              <p className="text-sm font-black text-ink">{project.hoursPerWeek}H / WK</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-muted uppercase font-bold">DURATION</p>
              <p className="text-sm font-black text-ink">{project.durationWeeks} WEEKS</p>
            </div>
          </div>

          {/* Owner & Primary Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
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

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsSquadBuilderOpen(true)}
                className="bg-caca-yellow/30 hover:bg-caca-yellow/50 text-ink border-hard text-xs flex items-center gap-1.5 shadow-hard-sm"
              >
                <Zap className="w-3.5 h-3.5 fill-ink" />
                <span>BUILD MY SQUAD</span>
              </Button>

              <Button
                variant="accent"
                size="md"
                onClick={() => setIsSquadModalOpen(true)}
                className="text-xs flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>CREATE SQUAD</span>
              </Button>

              <Button
                variant={isApplied ? "accent" : "primary"}
                size="md"
                onClick={handleApply}
                isLoading={loading}
                disabled={isApplied}
                className="text-xs"
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
      </div>

      {/* WHY YOU MATCH & MISSING Section */}
      <div className="bg-white border-hard shadow-hard p-5 space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b-2 border-ink pb-2">
          <h2 className="font-black uppercase text-ink text-sm flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-caca-blue" />
            <span>EXPLAINABLE COMPATIBILITY</span>
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMatchBreakdownOpen(true)}
            className="text-[11px] h-7"
          >
            VIEW FULL MATRIX
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* WHY YOU MATCH */}
          <div className="p-3 border-hard bg-canvas-subtle space-y-2">
            <div className="flex items-center gap-1.5 font-bold uppercase text-green-700">
              <CheckCircle2 className="w-4 h-4 text-green-700" />
              <span>WHY YOU MATCH</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              {matchResult.whyYouMatch && matchResult.whyYouMatch.length > 0 ? (
                matchResult.whyYouMatch.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-green-700 font-bold">✓</span>
                    <div>
                      <span className="font-bold text-ink">{item.title}</span>
                      <p className="text-[10px] text-ink-muted leading-tight">{item.detail}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-ink-muted text-[10px]">Review requirements to see overlap</p>
              )}
            </div>
          </div>

          {/* MISSING */}
          <div className="p-3 border-hard bg-canvas-subtle space-y-2">
            <div className="flex items-center gap-1.5 font-bold uppercase text-amber-700">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>MISSING / GAPS</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              {matchResult.missingPoints && matchResult.missingPoints.length > 0 ? (
                matchResult.missingPoints.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">⚠</span>
                    <div>
                      <span className="font-bold text-ink">{item.title}</span>
                      <p className="text-[10px] text-ink-muted leading-tight">{item.detail}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-ink-muted text-[10px]">All core skill requirements covered</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TEAM SYNERGY & ROSTER */}
      <div className="bg-white border-hard shadow-hard p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-ink pb-2 gap-2">
          <div>
            <h2 className="text-xs font-mono font-black uppercase text-ink">
              TEAM ROSTER & SYNERGY ({project.slots?.length || 4} ROLES)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="lime" size="sm">
              TEAM SYNERGY: {teamResult.teamScore}%
            </Badge>
          </div>
        </div>

        {/* Synergy Component Breakdown */}
        {teamResult.synergyBreakdown && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px]">
            <div className="p-2 border-hard bg-canvas-subtle">
              <span className="text-ink-muted uppercase block font-bold">SKILL COVERAGE (50%)</span>
              <span className="text-sm font-black text-ink">{teamResult.synergyBreakdown.skillCoverage}%</span>
            </div>
            <div className="p-2 border-hard bg-canvas-subtle">
              <span className="text-ink-muted uppercase block font-bold">ROLE DIVERSITY (20%)</span>
              <span className="text-sm font-black text-ink">{teamResult.synergyBreakdown.roleDiversity}%</span>
            </div>
            <div className="p-2 border-hard bg-canvas-subtle">
              <span className="text-ink-muted uppercase block font-bold">SCHEDULE OVERLAP (15%)</span>
              <span className="text-sm font-black text-ink">{teamResult.synergyBreakdown.availabilityOverlap}%</span>
            </div>
            <div className="p-2 border-hard bg-canvas-subtle">
              <span className="text-ink-muted uppercase block font-bold">STYLE HARMONY (10%)</span>
              <span className="text-sm font-black text-ink">{teamResult.synergyBreakdown.workingStyleHarmony}%</span>
            </div>
          </div>
        )}

        {/* Slots */}
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
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="coral" size="sm">
                    OPEN
                  </Badge>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMatcherRole(slot.roleTitle);
                      setSelectedRequiredSkills(slot.requiredSkills);
                      setIsMatcherOpen(true);
                    }}
                    className="px-1.5 py-0.5 bg-white hover:bg-ink hover:text-white border-hard-sm text-[10px] font-mono font-bold uppercase transition-colors"
                  >
                    FIND MATCHES →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Skill Coverage matrix */}
        <div className="pt-2">
          <p className="text-xs font-mono font-bold uppercase text-ink mb-2">
            SKILL COVERAGE BREAKDOWN
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
                    COVERED ✓
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="missing" size="sm">
                      MISSING
                    </Badge>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMatcherRole(`${cov.skillName} Specialist`);
                        setSelectedRequiredSkills([cov.skillName]);
                        setIsMatcherOpen(true);
                      }}
                      className="px-1.5 py-0.5 bg-white hover:bg-ink hover:text-white border-hard-sm text-[10px] font-mono font-bold uppercase"
                    >
                      FIND CANDIDATES →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Squad Modal */}
      <Modal
        isOpen={isSquadModalOpen}
        onClose={() => setIsSquadModalOpen(false)}
        title="CREATE PROJECT SQUAD"
      >
        <form onSubmit={handleCreateSquad} className="space-y-4 font-mono text-xs">
          <p className="text-ink-muted">
            Create an official squad for <strong>{project.title}</strong> and become the founding lead.
          </p>

          <Input
            label="SQUAD NAME"
            placeholder="e.g. Core Engineering Alpha"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
          />

          <Input
            label="YOUR SQUAD ROLE"
            placeholder="e.g. Lead Architect, ML Lead"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            required
          />

          {squadError && (
            <div className="p-2.5 bg-red-50 border-hard-sm border-red-500 text-red-600 font-bold uppercase">
              {squadError}
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSquadModalOpen(false)}
            >
              CANCEL
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isCreatingSquad}
              disabled={isCreatingSquad || !teamName.trim()}
            >
              <span>CREATE SQUAD</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Missing Role Candidate Matcher Modal */}
      <MissingRoleMatcherModal
        isOpen={isMatcherOpen}
        onClose={() => setIsMatcherOpen(false)}
        projectId={project.id}
        projectName={project.title}
        missingRole={selectedMatcherRole}
        requiredSkills={selectedRequiredSkills}
        project={project}
      />

      {/* AI Squad Builder Modal */}
      <SquadBuilderModal
        isOpen={isSquadBuilderOpen}
        onClose={() => setIsSquadBuilderOpen(false)}
        project={project}
      />

      {/* Explainable Match Breakdown Modal */}
      <MatchBreakdownModal
        isOpen={isMatchBreakdownOpen}
        onClose={() => setIsMatchBreakdownOpen(false)}
        project={project}
      />
    </div>
  );
}
