"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApplicationService } from "@/services/application-service";
import { TeamService, TeamRecord } from "@/services/team-service";
import { ProjectApplication } from "@/types/project";
import { MOCK_PROJECTS } from "@/lib/mock-data";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plus, Users, CheckCircle2, ArrowRight } from "lucide-react";

export default function TeamsPage() {
  const { profile, isDemoMode, user } = useAuth();
  const [applications, setApplications] = useState<ProjectApplication[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Team Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(MOCK_PROJECTS[0]?.id || "");
  const [teamName, setTeamName] = useState("");
  const [roleTitle, setRoleTitle] = useState("Squad Lead");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const userId = user?.id || profile?.id;
      if (userId) {
        const [userApps, userTeams] = await Promise.all([
          ApplicationService.getMyApplications(userId),
          TeamService.getMyTeams(userId),
        ]);
        setApplications(userApps);
        setTeams(userTeams);
      } else {
        setApplications([]);
        setTeams([]);
      }
      setLoading(false);
    };
    loadData();
  }, [user?.id, profile?.id]);

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

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setIsSubmitting(true);
    setCreateError(null);

    const userId = user?.id || profile?.id || `usr_${Date.now()}`;
    const selectedProj = MOCK_PROJECTS.find((p) => p.id === selectedProjectId);

    const res = await TeamService.createTeam({
      projectId: selectedProjectId,
      projectName: selectedProj?.title,
      teamName: teamName.trim(),
      creatorId: userId,
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="border-b-2 border-ink pb-3 flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight uppercase text-ink">
          TEAMS
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="lime" size="sm">
            {applications.length + displayTeams.length} TOTAL
          </Badge>
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

      {/* Active Squads */}
      <div className="space-y-2">
        <p className="text-xs font-mono font-bold uppercase text-ink">
          ACTIVE SQUADS ({displayTeams.length})
        </p>

        {displayTeams.length > 0 ? (
          <div className="space-y-2.5">
            {displayTeams.map((team) => (
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
                    FIT {team.compatibilityScore}%
                  </Badge>
                </div>

                <div className="flex items-center justify-between border-t border-ink/10 pt-2 text-xs font-mono">
                  <span className="text-ink-muted flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {team.membersCount}/{team.maxMembers} MEMBERS
                  </span>
                  <Link href={`/projects/${team.projectId}`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      SQUAD ROOM
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
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
    </div>
  );
}
