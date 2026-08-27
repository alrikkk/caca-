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
  const [projectApplications, setProjectApplications] = useState<any[]>([]);

  // Modals
  const [isMatcherOpen, setIsMatcherOpen] = useState(false);
  const [selectedMatcherRole, setSelectedMatcherRole] = useState("Squad Member");
  const [selectedRequiredSkills, setSelectedRequiredSkills] = useState<string[]>([]);
  const [isSquadBuilderOpen, setIsSquadBuilderOpen] = useState(false);
  const [isMatchBreakdownOpen, setIsMatchBreakdownOpen] = useState(false);

  // Apply Modal State with Pitch Note
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [pitchNote, setPitchNote] = useState("");

  // Team creation modal
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [roleTitle, setRoleTitle] = useState("Squad Lead");
  const [isCreatingSquad, setIsCreatingSquad] = useState(false);
  const [squadError, setSquadError] = useState<string | null>(null);

  // Responding to applications
  const [respondingAppId, setRespondingAppId] = useState<string | null>(null);

  const userId = user?.id || profile?.id;
  const isOwner = Boolean(userId && (project?.owner?.id === userId || project?.ownerId === userId));

  const loadData = React.useCallback(async () => {
    const p = await ProjectService.getProjectById(projectId, profile);
    setProject(p);

    if (userId) {
      const applied = await ApplicationService.hasApplied(projectId, userId);
      setIsApplied(applied);

      if (p && (p.ownerId === userId || p.owner?.id === userId)) {
        const apps = await ApplicationService.getProjectApplications(projectId, userId);
        setProjectApplications(apps.filter((a) => a.applicantId !== userId));
      }
    }
  }, [projectId, profile, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    if (!userId) {
      router.push("/login");
      return;
    }
    if (isApplied) return;

    setLoading(true);
    const res = await ApplicationService.applyToProject(
      project.id,
      userId,
      project.matchScore ?? 85,
      pitchNote.trim() || undefined
    );
    setLoading(false);
    if (res.success) {
      setIsApplied(true);
      setIsApplyModalOpen(false);
    }
  };

  const handleRespondApplication = async (appId: string, action: "accepted" | "rejected") => {
    if (!userId) return;
    setRespondingAppId(appId);
    await ApplicationService.respondToApplication({
      applicationId: appId,
      projectId: project.id,
      action,
      ownerId: userId,
      roleTitle: "Squad Member",
    });
    setRespondingAppId(null);
    await loadData();
  };

  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

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

              {!isOwner && (
                <Button
                  variant={isApplied ? "accent" : "primary"}
                  size="md"
                  onClick={() => {
                    if (isApplied) return;
                    setIsApplyModalOpen(true);
                  }}
                  isLoading={loading}
                  disabled={isApplied}
                  className="text-xs"
                >
                  {isApplied ? (
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> APPLIED
                    </span>
                  ) : (
                    <span>JOIN SQUAD</span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inbound Project Applications for Project Owner */}
      {isOwner && projectApplications.length > 0 && (
        <div className="bg-white border-hard shadow-hard p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b-2 border-ink pb-2">
            <h2 className="font-black uppercase text-ink flex items-center gap-1.5">
              <Users className="w-4 h-4 text-caca-blue" />
              <span>INCOMING CANDIDATE APPLICATIONS ({projectApplications.length})</span>
            </h2>
          </div>

          <div className="space-y-2.5">
            {projectApplications.map((app) => (
              <div
                key={app.id}
                className="p-3 bg-canvas-subtle border-hard flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-2.5">
                  <Avatar
                    name={app.applicant?.fullName || "Applicant"}
                    src={app.applicant?.avatarUrl}
                    size="sm"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/profile/${app.applicantId}`}
                        className="font-bold text-ink uppercase hover:underline"
                      >
                        {app.applicant?.fullName || "Candidate"}
                      </Link>
                      <Badge variant="lime" size="sm">
                        {app.compatibilityScore || 85}% FIT
                      </Badge>
                      <Badge variant={app.status === "accepted" ? "lime" : "outline"} size="sm">
                        {app.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-ink-muted">
                      {app.applicant?.college} • {app.applicant?.major}
                    </p>
                    {app.pitchNote && (
                      <p className="text-[11px] text-ink italic font-sans pt-0.5">
                        &ldquo;{app.pitchNote}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {app.status === "pending" && (
                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRespondApplication(app.id, "rejected")}
                      disabled={respondingAppId === app.id}
                      className="h-7 text-xs text-red-600 hover:bg-red-50"
                    >
                      <span>REJECT</span>
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleRespondApplication(app.id, "accepted")}
                      disabled={respondingAppId === app.id}
                      className="h-7 text-xs bg-caca-lime hover:bg-caca-lime/90 text-ink"
                    >
                      <span>ACCEPT TO SQUAD</span>
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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

        {/* Phase 5: Grounded Team Insight Callout */}
        {teamResult.teamInsightSummary && (
          <div className="p-3 bg-canvas-subtle border-hard text-[11px] font-mono space-y-1">
            <div className="flex items-center gap-1.5 font-bold uppercase text-ink">
              <Zap className="w-3.5 h-3.5 text-caca-blue fill-caca-blue" />
              <span>TEAM SYNERGY INSIGHT</span>
            </div>
            <p className="text-ink leading-relaxed font-sans">
              {teamResult.teamInsightSummary}
            </p>
          </div>
        )}

        {/* Skill Coverage matrix */}
        <div className="pt-2">
          <p className="text-xs font-mono font-bold uppercase text-ink mb-2">
            SKILL & CAPABILITY COVERAGE BREAKDOWN
          </p>
          <div className="divide-y divide-ink/10 border-hard bg-canvas-subtle p-3 text-xs font-mono">
            {teamResult.skillCoverages.map((cov) => (
              <div
                key={cov.skillName}
                className="flex items-center justify-between py-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink">{cov.skillName}</span>
                  {cov.coveredBy && (
                    <span className="text-[10px] text-ink-muted">
                      ({cov.coveredBy.userName} • {cov.coveredBy.proficiency}/5)
                    </span>
                  )}
                </div>
                {cov.status === "covered" || cov.isCovered ? (
                  <Badge variant="lime" size="sm">
                    COVERED ✓
                  </Badge>
                ) : cov.status === "partially_covered" ? (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" size="sm" className="border-amber-500 text-amber-700 bg-amber-50">
                      PARTIAL ({cov.currentProficiency}/5)
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

      {/* Join / Pitch Application Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title={`APPLY TO ${project.title.toUpperCase()}`}
      >
        <div className="space-y-4 font-mono text-xs">
          <p className="text-ink-muted">
            Submit your application to the project owner. You can include a short pitch explaining your interest or background.
          </p>

          <div className="space-y-1.5">
            <label className="block font-bold uppercase text-ink">
              OPTIONAL PITCH / NOTE
            </label>
            <textarea
              value={pitchNote}
              onChange={(e) => setPitchNote(e.target.value)}
              placeholder="e.g. Excited to contribute to spatial audio. Experienced in Web Audio API & React."
              rows={3}
              className="w-full p-2.5 bg-white border-hard font-mono text-xs text-ink focus:outline-none"
            />
          </div>

          <div className="p-2.5 bg-canvas-subtle border-hard text-[11px] space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-ink-muted uppercase">ESTIMATED COMPATIBILITY</span>
              <span className="font-bold text-ink">{matchResult.overallScore}%</span>
            </div>
            <p className="text-[10px] text-ink-muted">
              Your verified skills and availability will be shared with the project lead.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApplyModalOpen(false)}
            >
              CANCEL
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              isLoading={loading}
              disabled={loading}
            >
              CONFIRM APPLICATION
            </Button>
          </div>
        </div>
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
