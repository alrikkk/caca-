"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApplicationService } from "@/services/application-service";
import { TeamService, TeamRecord } from "@/services/team-service";
import { InvitationService, TeamInvitation } from "@/services/invitation-service";
import { ProfileService } from "@/services/profile-service";
import { defaultMatchingEngine } from "@/matching/engine";
import { StudentProfile } from "@/types/user";
import { ProjectApplication, Project } from "@/types/project";
import { MOCK_PROJECTS, MOCK_STUDENTS } from "@/lib/mock-data";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { SquadBuilderModal } from "@/components/feed/SquadBuilderModal";
import { MissingRoleMatcherModal } from "@/components/feed/MissingRoleMatcherModal";
import {
  Plus,
  Users,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Search,
  Sparkles,
  Shield,
  Loader2,
  Check,
  X,
  Zap,
  Edit2,
  Trash2,
  UserMinus,
  Briefcase,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ActiveTab = "SQUADS" | "INVITATIONS" | "APPLICATIONS";

export default function TeamsPage() {
  const { profile, isDemoMode, user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("SQUADS");
  const [applications, setApplications] = useState<ProjectApplication[]>([]);
  const [inboundApplications, setInboundApplications] = useState<ProjectApplication[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Squad Builder Modal State
  const [isSquadBuilderOpen, setIsSquadBuilderOpen] = useState(false);
  const [squadBuilderProject, setSquadBuilderProject] = useState<Project | null>(null);

  // Missing Role Matcher Modal State
  const [isMatcherOpen, setIsMatcherOpen] = useState(false);
  const [matcherRole, setMatcherRole] = useState("Squad Specialist");
  const [matcherSkills, setMatcherSkills] = useState<string[]>([]);
  const [matcherProject, setMatcherProject] = useState<Project | null>(null);

  // Create Team Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(MOCK_PROJECTS[0]?.id || "");
  const [teamName, setTeamName] = useState("");
  const [roleTitle, setRoleTitle] = useState("Squad Lead");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Invite Member Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [targetTeam, setTargetTeam] = useState<TeamRecord | null>(null);
  const [inviteSearchQuery, setInviteSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inviteRoleTitle, setInviteRoleTitle] = useState("Frontend Engineer");
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Role Edit Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamRecord | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingMemberName, setEditingMemberName] = useState<string>("");
  const [newRoleTitle, setNewRoleTitle] = useState<string>("");
  const [roleUpdating, setRoleUpdating] = useState(false);

  // Application response state
  const [respondingAppId, setRespondingAppId] = useState<string | null>(null);

  const userId = user?.id || profile?.id;

  const loadData = useCallback(async () => {
    setLoading(true);
    if (userId) {
      const [userApps, userTeams, userInvs] = await Promise.all([
        ApplicationService.getMyApplications(userId),
        TeamService.getMyTeams(userId),
        InvitationService.getMyInvitations(userId),
      ]);
      setApplications(userApps);
      setTeams(userTeams);
      setInvitations(userInvs);

      // Load inbound applications for user-owned projects
      const ownedProjects = MOCK_PROJECTS.filter((p) => p.ownerId === userId);
      const allInbound = await Promise.all(
        ownedProjects.map((p) => ApplicationService.getProjectApplications(p.id, userId))
      );
      setInboundApplications(allInbound.flat().filter((a) => a.applicantId !== userId));
    } else {
      setApplications([]);
      setTeams([]);
      setInvitations([]);
      setInboundApplications([]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const demoTeams: TeamRecord[] = isDemoMode
    ? [
        {
          id: "team_demo_01",
          projectId: "proj_01",
          projectName: "EchoSpatial: Spatial Audio for Visual Impairment",
          name: "EchoSpatial Core Squad",
          role: "Lead Frontend Architect",
          isLead: true,
          membersCount: 3,
          maxMembers: 4,
          compatibilityScore: 94,
          createdAt: new Date().toISOString(),
        },
      ]
    : [];

  const displayTeams = [...teams, ...demoTeams];
  const pendingInvitations = invitations.filter((i) => i.status === "pending");
  const pendingInbound = inboundApplications.filter((a) => a.status === "pending");

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setIsSubmitting(true);
    setCreateError(null);

    const activeUserId = userId || `usr_${Date.now()}`;
    const selectedProj = MOCK_PROJECTS.find((p) => p.id === selectedProjectId);

    const res = await TeamService.createTeam({
      projectId: selectedProjectId,
      projectName: selectedProj?.title,
      teamName: teamName.trim(),
      creatorId: activeUserId,
      roleTitle: roleTitle.trim() || "Squad Lead",
      compatibilityScore: selectedProj?.matchScore ?? 92,
    });

    setIsSubmitting(false);

    if (res.error) {
      setCreateError(res.error);
    } else if (res.team) {
      setTeams([res.team, ...teams]);
      setIsCreateModalOpen(false);
      setTeamName("");
    }
  };

  const handleRespondInvitation = async (invitationId: string, action: "accepted" | "declined") => {
    if (!userId) return;
    await InvitationService.respondToInvitation(
      invitationId,
      action,
      userId,
      profile?.fullName || "Student"
    );
    await loadData();
  };

  const handleRespondApplication = async (app: ProjectApplication, action: "accepted" | "rejected") => {
    if (!userId) return;
    setRespondingAppId(app.id);
    await ApplicationService.respondToApplication({
      applicationId: app.id,
      projectId: app.projectId,
      action,
      ownerId: userId,
      roleTitle: "Squad Member",
    });
    setRespondingAppId(null);
    await loadData();
  };

  const handleUpdateRole = async () => {
    if (!editingTeam || !editingUserId || !userId || !newRoleTitle.trim()) return;

    setRoleUpdating(true);
    const res = await TeamService.updateMemberRole({
      teamId: editingTeam.id,
      userId: editingUserId,
      newRoleTitle: newRoleTitle.trim(),
      requesterId: userId,
    });
    setRoleUpdating(false);

    if (res.success) {
      setIsRoleModalOpen(false);
      await loadData();
    }
  };

  const handleRemoveMember = async (team: TeamRecord, targetMemberId: string) => {
    if (!userId) return;
    const confirmRemove = window.confirm("Are you sure you want to remove this member from the squad?");
    if (!confirmRemove) return;

    await TeamService.removeMemberFromTeam({
      teamId: team.id,
      userId: targetMemberId,
      requesterId: userId,
    });
    await loadData();
  };

  const handleDeleteTeam = async (team: TeamRecord) => {
    if (!userId || !team.isLead) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete squad "${team.name}"? This will dissolve the squad.`
    );
    if (!confirmDelete) return;

    const res = await TeamService.deleteTeam({
      teamId: team.id,
      requesterId: userId,
    });

    if (res.success) {
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      await loadData();
    } else {
      alert(res.error || "Failed to delete team.");
    }
  };

  // Debounced search for invite members
  useEffect(() => {
    if (!inviteSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await ProfileService.searchProfiles(inviteSearchQuery);
        setSearchResults(results.filter((s) => s.id !== userId));
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [inviteSearchQuery, userId]);

  const handleSendInvite = async (student: StudentProfile) => {
    if (!targetTeam || !userId) return;

    setInvitingUserId(student.id);
    setInviteFeedback(null);

    const res = await InvitationService.sendInvitation({
      teamId: targetTeam.id,
      teamName: targetTeam.name,
      projectId: targetTeam.projectId,
      projectName: targetTeam.projectName,
      inviterId: userId,
      inviterName: profile?.fullName || "Squad Lead",
      inviteeId: student.id,
      inviteeName: student.fullName,
      roleTitle: inviteRoleTitle || "Squad Member",
    });

    setInvitingUserId(null);

    if (res.success) {
      setInviteFeedback({
        type: "success",
        message: `Invitation sent to ${student.fullName} ✓`,
      });
    } else {
      setInviteFeedback({
        type: "error",
        message: res.error || "Failed to send invitation.",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Page Header */}
      <div className="border-b-2 border-ink pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight uppercase text-ink">
            COLLABORATION & SQUADS
          </h1>
          <p className="text-xs font-mono text-ink-muted">
            Manage your project squads, team synergy, incoming applications, and invitations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="accent"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>CREATE SQUAD</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b-2 border-ink">
        <button
          onClick={() => setActiveTab("SQUADS")}
          className={cn(
            "px-3 py-1.5 text-xs font-mono font-bold uppercase border-hard whitespace-nowrap btn-tactile transition-all flex items-center gap-1.5",
            activeTab === "SQUADS"
              ? "bg-ink text-caca-lime shadow-hard"
              : "bg-white text-ink hover:bg-canvas-subtle shadow-hard"
          )}
        >
          <Users className="w-3.5 h-3.5" />
          <span>MY SQUADS ({displayTeams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("INVITATIONS")}
          className={cn(
            "px-3 py-1.5 text-xs font-mono font-bold uppercase border-hard whitespace-nowrap btn-tactile transition-all flex items-center gap-1.5",
            activeTab === "INVITATIONS"
              ? "bg-ink text-caca-lime shadow-hard"
              : "bg-white text-ink hover:bg-canvas-subtle shadow-hard"
          )}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>INVITATIONS ({pendingInvitations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("APPLICATIONS")}
          className={cn(
            "px-3 py-1.5 text-xs font-mono font-bold uppercase border-hard whitespace-nowrap btn-tactile transition-all flex items-center gap-1.5",
            activeTab === "APPLICATIONS"
              ? "bg-ink text-caca-lime shadow-hard"
              : "bg-white text-ink hover:bg-canvas-subtle shadow-hard"
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>APPLICATIONS ({applications.length + pendingInbound.length})</span>
        </button>
      </div>

      {/* TAB 1: SQUADS */}
      {activeTab === "SQUADS" && (
        <div className="space-y-4">
          {displayTeams.length > 0 ? (
            displayTeams.map((team) => {
              const matchedProj = MOCK_PROJECTS.find((p) => p.id === team.projectId) || {
                id: team.projectId,
                ownerId: userId || "",
                title: team.projectName,
                tagline: "Collaborative project squad",
                description: "",
                category: "Technology",
                status: "recruiting" as const,
                maxTeamSize: team.maxMembers || 4,
                durationWeeks: 8,
                hoursPerWeek: 12,
                requiredSkills: [
                  { skill: { id: "sk_1", name: "Frontend", category: "frontend" }, requiredProficiency: 4, importance: "required" as const },
                  { skill: { id: "sk_2", name: "Backend", category: "backend" }, requiredProficiency: 4, importance: "required" as const },
                  { skill: { id: "sk_3", name: "UI/UX Design", category: "design" }, requiredProficiency: 3, importance: "preferred" as const },
                ],
                missingRoles: ["Backend Architect"],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              // Evaluate synergy deterministically
              const teamMembersProfiles: StudentProfile[] = [
                profile || MOCK_STUDENTS[0],
                ...(team.membersCount > 1 ? [MOCK_STUDENTS[1]] : []),
                ...(team.membersCount > 2 ? [MOCK_STUDENTS[3]] : []),
              ];

              const synergyResult = defaultMatchingEngine.evaluateTeamSynergy(
                teamMembersProfiles,
                matchedProj
              );

              const readiness = defaultMatchingEngine.getTeamReadiness(synergyResult);

              return (
                <div
                  key={team.id}
                  className="p-5 bg-white border-hard shadow-hard space-y-4"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-ink pb-3 gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold bg-canvas-subtle px-1.5 py-0.5 border-hard-sm uppercase text-ink">
                          {team.name}
                        </span>
                        <Badge variant={readiness.variant as any} size="sm" className="text-[10px] font-black">
                          {readiness.statusLabel}
                        </Badge>
                      </div>
                      <h2 className="font-mono font-black text-base uppercase text-ink pt-1">
                        {team.projectName}
                      </h2>
                      <p className="font-mono text-xs text-ink-muted uppercase">
                        YOUR ROLE: <span className="font-bold text-ink">{team.role}</span> {team.isLead && "(LEAD)"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="lime" size="sm" className="text-xs">
                        SYNERGY {synergyResult.teamScore}%
                      </Badge>
                    </div>
                  </div>

                  {/* Team Readiness Summary Banner */}
                  <div className="p-3 bg-canvas-subtle border-hard flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-ink-muted uppercase font-bold">TEAM READINESS STATUS</span>
                      <p className="font-bold text-ink">{readiness.summary}</p>
                    </div>
                    {team.isLead && (matchedProj.missingRoles?.length || 0) > 0 && (
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => {
                          setMatcherRole(matchedProj.missingRoles?.[0] || "Squad Member");
                          setMatcherProject(matchedProj);
                          setIsMatcherOpen(true);
                        }}
                        className="text-xs h-7 shrink-0"
                      >
                        <span>FIND {matchedProj.missingRoles?.[0]} →</span>
                      </Button>
                    )}
                  </div>

                  {/* Team Synergy 5-Way Breakdown */}
                  {synergyResult.synergyBreakdown && (
                    <div className="p-3 bg-canvas-subtle border-hard font-mono text-[10px] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="p-1.5 bg-white border-hard-sm">
                        <span className="text-ink-muted uppercase block font-bold">SKILL COVERAGE (50%)</span>
                        <span className="text-sm font-black text-ink">{synergyResult.synergyBreakdown.skillCoverage}%</span>
                      </div>
                      <div className="p-1.5 bg-white border-hard-sm">
                        <span className="text-ink-muted uppercase block font-bold">ROLE DIVERSITY (20%)</span>
                        <span className="text-sm font-black text-ink">{synergyResult.synergyBreakdown.roleDiversity}%</span>
                      </div>
                      <div className="p-1.5 bg-white border-hard-sm">
                        <span className="text-ink-muted uppercase block font-bold">SCHEDULE OVERLAP (15%)</span>
                        <span className="text-sm font-black text-ink">{synergyResult.synergyBreakdown.availabilityOverlap}%</span>
                      </div>
                      <div className="p-1.5 bg-white border-hard-sm">
                        <span className="text-ink-muted uppercase block font-bold">STYLE HARMONY (10%)</span>
                        <span className="text-sm font-black text-ink">{synergyResult.synergyBreakdown.workingStyleHarmony}%</span>
                      </div>
                    </div>
                  )}

                  {/* Grounded Team Insight Callout */}
                  {synergyResult.teamInsightSummary && (
                    <div className="p-2.5 bg-canvas-subtle border-hard text-[11px] font-mono flex items-start gap-2">
                      <Zap className="w-3.5 h-3.5 text-caca-blue fill-caca-blue shrink-0 mt-0.5" />
                      <p className="text-ink font-sans leading-relaxed">{synergyResult.teamInsightSummary}</p>
                    </div>
                  )}

                  {/* Squad Member Roster */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono font-bold uppercase text-ink flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>SQUAD ROSTER ({teamMembersProfiles.length}/{team.maxMembers})</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                      {teamMembersProfiles.map((member, idx) => {
                        const isMemberLead = idx === 0;
                        const role = isMemberLead ? team.role : member.headline || "Squad Member";

                        return (
                          <div
                            key={member.id}
                            className="p-2.5 bg-canvas-subtle border-hard flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <Avatar name={member.fullName} src={member.avatarUrl} size="sm" />
                              <div>
                                <Link
                                  href={`/profile/${member.id}`}
                                  className="font-bold text-ink hover:underline uppercase block text-[11px]"
                                >
                                  {member.fullName}
                                </Link>
                                <span className="text-[10px] text-ink-muted font-semibold block">
                                  {role} {isMemberLead && "★"}
                                </span>
                              </div>
                            </div>

                            {team.isLead && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTeam(team);
                                    setEditingUserId(member.id);
                                    setEditingMemberName(member.fullName);
                                    setNewRoleTitle(role);
                                    setIsRoleModalOpen(true);
                                  }}
                                  className="p-1 hover:bg-white border-hard-sm text-ink text-[10px]"
                                  title="Edit role"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>

                                {!isMemberLead && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(team, member.id)}
                                    className="p-1 hover:bg-red-50 text-red-600 border-hard-sm text-[10px]"
                                    title="Remove member"
                                  >
                                    <UserMinus className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Capability Coverage Tracks */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-mono font-bold uppercase text-ink-muted">
                      CAPABILITY STATUS & GAPS
                    </p>
                    <div className="divide-y divide-ink/10 border-hard bg-canvas-subtle p-2.5 font-mono text-xs">
                      {synergyResult.skillCoverages.map((cov) => (
                        <div
                          key={cov.skillName}
                          className="flex items-center justify-between py-1 text-[11px]"
                        >
                          <span className="font-bold text-ink">{cov.skillName}</span>
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
                                  setMatcherRole(`${cov.skillName} Specialist`);
                                  setMatcherSkills([cov.skillName]);
                                  setMatcherProject(matchedProj);
                                  setIsMatcherOpen(true);
                                }}
                                className="px-1.5 py-0.5 bg-white hover:bg-ink hover:text-white border-hard-sm text-[9px] font-bold uppercase"
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
                                  setMatcherRole(`${cov.skillName} Specialist`);
                                  setMatcherSkills([cov.skillName]);
                                  setMatcherProject(matchedProj);
                                  setIsMatcherOpen(true);
                                }}
                                className="px-1.5 py-0.5 bg-white hover:bg-ink hover:text-white border-hard-sm text-[9px] font-bold uppercase"
                              >
                                FIND CANDIDATES →
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex flex-wrap items-center justify-between border-t border-ink/10 pt-3 gap-2 text-xs font-mono">
                    <span className="text-ink-muted flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {team.membersCount}/{team.maxMembers} SLOTS FILLED
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSquadBuilderProject(matchedProj);
                          setTargetTeam(team);
                          setIsSquadBuilderOpen(true);
                        }}
                        className="h-7 text-xs flex items-center gap-1 bg-caca-yellow/20 hover:bg-caca-yellow/40 text-ink border-hard"
                      >
                        <Zap className="w-3 h-3 text-ink fill-ink" />
                        <span>AI SQUAD BUILDER</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTargetTeam(team);
                          setIsInviteModalOpen(true);
                          setInviteFeedback(null);
                          setInviteSearchQuery("");
                        }}
                        className="h-7 text-xs flex items-center gap-1"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>INVITE MEMBER</span>
                      </Button>

                      {team.isLead && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTeam(team)}
                          className="h-7 text-xs flex items-center gap-1 text-red-600 hover:bg-red-50 border-hard"
                          title="Delete Squad"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                          <span>DELETE SQUAD</span>
                        </Button>
                      )}

                      <Link href={`/projects/${team.projectId}`}>
                        <Button variant="primary" size="sm" className="h-7 text-xs">
                          PROJECT ROOM →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center border-hard bg-white shadow-hard text-xs font-mono space-y-2">
              <p className="font-bold uppercase text-ink">NO ACTIVE SQUADS</p>
              <p className="text-ink-muted">
                Create a squad for your project or apply to an open project to begin collaborating.
              </p>
              <Button
                variant="accent"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-2 text-xs"
              >
                CREATE A SQUAD +
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INVITATIONS */}
      {activeTab === "INVITATIONS" && (
        <div className="space-y-3">
          {pendingInvitations.length > 0 ? (
            pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="p-4 bg-caca-lime/20 border-hard shadow-hard flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black uppercase text-ink text-sm">
                      {inv.teamName}
                    </span>
                    <Badge variant="lime" size="sm">
                      INVITE
                    </Badge>
                  </div>
                  <p className="text-ink font-bold">
                    Project: {inv.projectName}
                  </p>
                  <p className="text-ink-muted text-[11px]">
                    Invited by <span className="text-ink font-bold">{inv.inviterName}</span> as{" "}
                    <span className="text-ink font-bold">{inv.roleTitle}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRespondInvitation(inv.id, "declined")}
                    className="text-xs h-8 text-red-600 hover:bg-red-50"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    <span>DECLINE</span>
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleRespondInvitation(inv.id, "accepted")}
                    className="text-xs h-8 bg-caca-lime hover:bg-caca-lime/90 text-ink"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    <span>ACCEPT SQUAD</span>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center border-hard bg-white shadow-hard text-xs font-mono space-y-1">
              <p className="font-bold uppercase text-ink">NO PENDING INVITATIONS</p>
              <p className="text-ink-muted">When project leads invite you to join their squad, invitations appear here.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: APPLICATIONS */}
      {activeTab === "APPLICATIONS" && (
        <div className="space-y-6">
          {/* Inbound Applications for Project Owner */}
          {pendingInbound.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-mono font-bold uppercase text-ink flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-caca-blue" />
                <span>INCOMING APPLICANTS TO YOUR PROJECTS ({pendingInbound.length})</span>
              </p>

              <div className="space-y-2.5">
                {pendingInbound.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 bg-white border-hard shadow-hard flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar
                        name={app.applicant?.fullName || "Applicant"}
                        src={app.applicant?.avatarUrl}
                        size="md"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/profile/${app.applicantId}`}
                            className="font-bold uppercase text-ink hover:underline"
                          >
                            {app.applicant?.fullName || "Candidate"}
                          </Link>
                          <Badge variant={app.compatibilityScore && app.compatibilityScore >= 80 ? "lime" : "default"} size="sm">
                            {app.compatibilityScore || 85}% FIT
                          </Badge>
                        </div>
                        <p className="text-[11px] text-ink-muted">
                          {app.applicant?.college} • {app.applicant?.major}
                        </p>
                        {app.pitchNote && (
                          <p className="text-[11px] text-ink italic font-sans">
                            &ldquo;{app.pitchNote}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRespondApplication(app, "rejected")}
                        disabled={respondingAppId === app.id}
                        className="text-xs h-8 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        <span>REJECT</span>
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleRespondApplication(app, "accepted")}
                        disabled={respondingAppId === app.id}
                        className="text-xs h-8 bg-caca-lime hover:bg-caca-lime/90 text-ink"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        <span>ACCEPT TO SQUAD</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outgoing Applications */}
          <div className="space-y-2">
            <p className="text-xs font-mono font-bold uppercase text-ink">
              YOUR SUBMITTED APPLICATIONS ({applications.length})
            </p>

            {applications.length > 0 ? (
              <div className="space-y-2">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-3.5 bg-white border-hard shadow-hard flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black uppercase text-ink">
                          {app.project?.title || "Project Application"}
                        </span>
                        <Badge
                          variant={app.status === "accepted" ? "lime" : app.status === "rejected" ? "outline" : "default"}
                          size="sm"
                        >
                          {app.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-ink-muted">
                        MATCH {app.compatibilityScore || 85}%
                      </p>
                    </div>

                    <Link href={`/projects/${app.projectId}`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        VIEW PROJECT
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border-hard bg-white shadow-hard text-xs font-mono space-y-2">
                <p className="font-bold uppercase text-ink">NO SUBMITTED APPLICATIONS</p>
                <p className="text-ink-muted">
                  Browse the discovery feed and click JOIN on projects that match your skills.
                </p>
                <Link href="/feed">
                  <Button variant="accent" size="sm" className="mt-2 text-xs">
                    GO TO FEED →
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Role Edit Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={`ASSIGN ROLE: ${editingMemberName.toUpperCase()}`}
      >
        <div className="space-y-4 font-mono text-xs">
          <p className="text-ink-muted text-[11px]">
            Select or enter the specific capability track for this squad contributor.
          </p>

          <div className="space-y-1.5">
            <label className="block font-bold uppercase text-ink">ROLE PRESETS</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Squad Lead",
                "Frontend Engineer",
                "Backend Architect",
                "ML Researcher",
                "UI/UX Designer",
                "Systems & DevOps",
                "Product Lead",
                "Research Specialist",
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNewRoleTitle(preset)}
                  className={cn(
                    "px-2 py-1 border-hard-sm text-[10px] font-bold uppercase transition-colors",
                    newRoleTitle === preset ? "bg-ink text-caca-lime" : "bg-white text-ink hover:bg-canvas-subtle"
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="CUSTOM ROLE TITLE"
            value={newRoleTitle}
            onChange={(e) => setNewRoleTitle(e.target.value)}
            placeholder="e.g. Lead Acoustics Engineer"
            required
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRoleModalOpen(false)}
            >
              CANCEL
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpdateRole}
              isLoading={roleUpdating}
              disabled={roleUpdating || !newRoleTitle.trim()}
            >
              SAVE ROLE
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Team Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="CREATE SQUAD"
      >
        <form onSubmit={handleCreateTeam} className="space-y-4 font-mono text-xs">
          <div className="space-y-1.5">
            <label className="block font-bold uppercase tracking-wider text-ink">
              TARGET PROJECT
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full h-11 px-3 bg-white border-hard uppercase text-ink focus:outline-none"
              required
            >
              {MOCK_PROJECTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

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

          {createError && (
            <div className="p-2.5 bg-red-50 border-hard-sm border-red-500 text-red-600 font-bold uppercase">
              {createError}
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              CANCEL
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={isSubmitting || !teamName.trim()}
            >
              <span>CREATE SQUAD</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invite Member to Squad Modal */}
      {targetTeam && (
        <Modal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          title={`INVITE TO ${targetTeam.name.toUpperCase()}`}
          className="max-w-lg"
        >
          <div className="space-y-4 font-mono text-xs">
            <div className="space-y-1.5">
              <label className="block font-bold uppercase text-ink">TARGET ROLE TITLE</label>
              <Input
                value={inviteRoleTitle}
                onChange={(e) => setInviteRoleTitle(e.target.value)}
                placeholder="e.g. Frontend Developer, UI Designer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold uppercase text-ink">SEARCH REGISTERED STUDENTS</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-ink-muted" />
                <input
                  type="text"
                  value={inviteSearchQuery}
                  onChange={(e) => setInviteSearchQuery(e.target.value)}
                  placeholder="Type name, skill (Python, React), or college..."
                  className="w-full h-9 pl-9 pr-3 bg-white border-hard font-mono text-xs uppercase text-ink focus:outline-none"
                />
              </div>
            </div>

            {inviteFeedback && (
              <div
                className={`p-2.5 border-hard font-bold uppercase ${
                  inviteFeedback.type === "success"
                    ? "bg-caca-lime text-ink"
                    : "bg-red-50 text-red-600 border-red-500"
                }`}
              >
                {inviteFeedback.message}
              </div>
            )}

            <div className="max-h-60 overflow-y-auto divide-y divide-ink/10 border-hard bg-white">
              {searchLoading ? (
                <div className="p-4 text-center">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto text-ink" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((student) => (
                  <div
                    key={student.id}
                    className="p-2.5 flex items-center justify-between gap-2 hover:bg-canvas-subtle"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar name={student.fullName} src={student.avatarUrl} size="sm" />
                      <div>
                        <p className="font-bold uppercase text-ink">{student.fullName}</p>
                        <p className="text-[10px] text-ink-muted">
                          {student.college} • {student.skills.slice(0, 2).map((s) => s.name).join(", ")}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleSendInvite(student)}
                      disabled={invitingUserId === student.id}
                      className="text-[11px] h-7 bg-caca-lime hover:bg-caca-lime/90 text-ink"
                    >
                      {invitingUserId === student.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <span>INVITE</span>
                      )}
                    </Button>
                  </div>
                ))
              ) : inviteSearchQuery.trim() ? (
                <div className="p-4 text-center text-ink-muted">
                  No matching student profiles found.
                </div>
              ) : (
                <div className="p-4 text-center text-ink-muted text-[11px]">
                  Type in the search box to discover registered student candidates.
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInviteModalOpen(false)}
              >
                DONE
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* AI Squad Builder Modal */}
      {squadBuilderProject && (
        <SquadBuilderModal
          isOpen={isSquadBuilderOpen}
          onClose={() => {
            setIsSquadBuilderOpen(false);
            setSquadBuilderProject(null);
          }}
          project={squadBuilderProject}
          teamId={targetTeam?.id}
        />
      )}

      {/* Missing Role Candidate Matcher Modal */}
      {matcherProject && (
        <MissingRoleMatcherModal
          isOpen={isMatcherOpen}
          onClose={() => {
            setIsMatcherOpen(false);
            setMatcherProject(null);
          }}
          projectId={matcherProject.id}
          projectName={matcherProject.title}
          project={matcherProject}
          missingRole={matcherRole}
          requiredSkills={matcherSkills}
        />
      )}
    </div>
  );
}
