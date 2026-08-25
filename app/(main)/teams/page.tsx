"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApplicationService } from "@/services/application-service";
import { ProjectApplication } from "@/types/project";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function TeamsPage() {
  const { profile, isDemoMode } = useAuth();
  const [applications, setApplications] = useState<ProjectApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadApps = async () => {
      setLoading(true);
      if (profile?.id) {
        const list = await ApplicationService.getMyApplications(profile.id);
        setApplications(list);
      } else {
        setApplications([]);
      }
      setLoading(false);
    };
    loadApps();
  }, [profile?.id]);

  const activeTeams = isDemoMode
    ? [
        {
          id: "team_01",
          projectName: "EchoSpatial: Spatial Audio for Visual Impairment",
          role: "Lead Frontend",
          status: "BUILDING",
          membersCount: 3,
          maxMembers: 4,
          compatibilityScore: 94,
        },
      ]
    : [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="border-b-2 border-ink pb-3 flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight uppercase text-ink">
          TEAMS
        </h1>
        <Badge variant="lime" size="sm">
          {applications.length + activeTeams.length} TOTAL
        </Badge>
      </div>

      {/* Active Squads */}
      {activeTeams.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-mono font-bold uppercase text-ink">
            ACTIVE SQUADS ({activeTeams.length})
          </p>

          {activeTeams.map((team) => (
            <div
              key={team.id}
              className="p-4 bg-white border-hard shadow-hard space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-mono font-black text-sm uppercase text-ink">
                    {team.projectName}
                  </h3>
                  <p className="font-mono text-xs text-ink-muted uppercase">
                    ROLE: {team.role}
                  </p>
                </div>
                <Badge variant="lime" size="sm">
                  FIT {team.compatibilityScore}%
                </Badge>
              </div>

              <div className="flex items-center justify-between border-t border-ink/10 pt-2 text-xs font-mono">
                <span className="text-ink-muted">
                  {team.membersCount}/{team.maxMembers} MEMBERS
                </span>
                <Link href="/projects/proj_01">
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    SQUAD ROOM
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
}
