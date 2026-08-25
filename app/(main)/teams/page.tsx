"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApplicationService } from "@/services/application-service";
import { TeamService, TeamRecord } from "@/services/team-service";
import { InvitationService, TeamInvitation } from "@/services/invitation-service";
import { ProfileService } from "@/services/profile-service";
import { StudentProfile } from "@/types/user";
import { ProjectApplication } from "@/types/project";
import { MOCK_PROJECTS } from "@/lib/mock-data";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import {
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  UserPlus,
  Search,
  Sparkles,
  Shield,
  Loader2,
  Check,
  X,
  Zap,
} from "lucide-react";

export default function TeamsPage() {
  const { profile, isDemoMode, user } = useAuth();
  const [applications, setApplications] = useState<ProjectApplication[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);

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

  const userId = user?.id || profile?.id;

  const loadData = React.useCallback(async () => {
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
    } else {
      setApplications([]);
      setTeams([]);
      setInvitations([]);
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
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Page Header */}
      <div className="border-b-2 border-ink pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight uppercase text-ink">
            SQUADS & TEAMS
          </h1>
          <p className="text-xs font-mono text-ink-muted">
            Manage your project squads, team synergy, and pending invitations.
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

      {/* Pending Invitations Received */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono font-bold uppercase text-ink flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-caca-coral" />
              <span>INVITATIONS RECEIVED ({pendingInvitations.length})</span>
            </p>
          </div>

          <div className="space-y-2.5">
            {pendingInvitations.map((inv) => (
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
            ))}
          </div>
        </div>
      )}

      {/* Active Squads */}
      <div className="space-y-2">
        <p className="text-xs font-mono font-bold uppercase text-ink">
          ACTIVE SQUADS ({displayTeams.length})
        </p>

        {displayTeams.length > 0 ? (
          <div className="space-y-3">
            {displayTeams.map((team) => {
              // Calculate deterministic team synergy components
              const skillSynergy = Math.min(98, 85 + (team.compatibilityScore % 12));
              const availSynergy = Math.min(95, 88 + (team.compatibilityScore % 8));
              const styleSynergy = 92;
              const overallSynergy = Math.round((skillSynergy * 0.45 + availSynergy * 0.35 + styleSynergy * 0.2));

              return (
                <div
                  key={team.id}
                  className="p-4 bg-white border-hard shadow-hard space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono font-bold bg-canvas-subtle px-1.5 py-0.5 border-hard-sm uppercase text-ink">
                        {team.name}
                      </span>
                      <h3 className="font-mono font-black text-sm uppercase text-ink pt-1">
                        {team.projectName}
                      </h3>
                      <p className="font-mono text-xs text-ink-muted uppercase">
                        YOUR ROLE: {team.role} {team.isLead && "(LEAD)"}
                      </p>
                    </div>
                    <Badge variant="lime" size="sm">
                      SYNERGY {overallSynergy}%
                    </Badge>
                  </div>

                  {/* Team Synergy Breakdown */}
                  <div className="p-2.5 bg-canvas-subtle border-hard text-[11px] font-mono grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-ink-muted text-[10px] uppercase block">SKILL FIT</span>
                      <span className="font-black text-ink">{skillSynergy}%</span>
                    </div>
                    <div>
                      <span className="text-ink-muted text-[10px] uppercase block">SCHEDULE</span>
                      <span className="font-black text-ink">{availSynergy}%</span>
                    </div>
                    <div>
                      <span className="text-ink-muted text-[10px] uppercase block">STYLE</span>
                      <span className="font-black text-ink">{styleSynergy}%</span>
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="flex items-center justify-between border-t border-ink/10 pt-2 text-xs font-mono">
                    <span className="text-ink-muted flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {team.membersCount}/{team.maxMembers} MEMBERS
                    </span>
                    <div className="flex items-center gap-2">
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

                      <Link href={`/projects/${team.projectId}`}>
                        <Button variant="primary" size="sm" className="h-7 text-xs">
                          ROOM →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center border-hard bg-white shadow-hard text-xs font-mono space-y-2">
            <p className="font-bold uppercase text-ink">NO ACTIVE SQUADS</p>
            <p className="text-ink-muted">
              You haven&apos;t joined or created any squads yet.
            </p>
            <Button
              variant="accent"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-1 text-xs"
            >
              CREATE A SQUAD +
            </Button>
          </div>
        )}
      </div>

      {/* Outgoing Applications */}
      <div className="space-y-2 pt-2">
        <p className="text-xs font-mono font-bold uppercase text-ink">
          APPLICATIONS ({applications.length})
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
                      variant={app.status === "accepted" ? "lime" : "default"}
                      size="sm"
                    >
                      {app.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-ink-muted">
                    MATCH {app.compatibilityScore || 85}%
                  </p>
                </div>

                <Link href={`/projects/${app.projectId}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    VIEW
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center border-hard bg-white shadow-hard text-xs font-mono space-y-2">
            <p className="font-bold uppercase text-ink">NO ACTIVE APPLICATIONS</p>
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
    </div>
  );
}
