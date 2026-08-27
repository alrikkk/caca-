"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ProfileService } from "@/services/profile-service";
import { InvitationService, TeamInvitation } from "@/services/invitation-service";
import { TeamService, TeamRecord } from "@/services/team-service";
import { MOCK_PROJECTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, ArrowRight, UserPlus, ShieldAlert, CheckCircle2, UserCheck } from "lucide-react";

export const NextStepBanner: React.FC = () => {
  const { profile, user, isDemoMode } = useAuth();
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [userSquadsCount, setUserSquadsCount] = useState(0);
  const [missingSquadRole, setMissingSquadRole] = useState<string | null>(null);

  useEffect(() => {
    const checkState = async () => {
      const activeId = user?.id || profile?.id;
      if (!activeId) return;

      try {
        // 1. Check pending invitations
        const invites = await InvitationService.getMyInvitations(activeId);
        const pending = invites.filter((inv: TeamInvitation) => inv.status === "pending");
        setPendingInvitesCount(pending.length);

        // 2. Check user's squads
        const teams = await TeamService.getMyTeams(activeId);
        setUserSquadsCount(teams.length);

        // Check if any team led by user has missing roles
        const leadTeam = teams.find((t: TeamRecord) => t.isLead);
        if (leadTeam) {
          const proj = MOCK_PROJECTS.find((p) => p.id === leadTeam.projectId);
          if (proj && proj.missingRoles && proj.missingRoles.length > 0) {
            setMissingSquadRole(proj.missingRoles[0]);
          }
        }
      } catch (err) {
        // Gracefully ignore
      }
    };

    checkState();
  }, [user?.id, profile?.id]);

  if (!profile) return null;

  const completeness = ProfileService.calculateCompleteness(profile);

  // Priority 1: Pending Invitations
  if (pendingInvitesCount > 0) {
    return (
      <div className="p-3.5 bg-caca-yellow/20 border-hard shadow-hard flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1 bg-caca-yellow border-hard text-ink shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-ink-muted uppercase font-bold">NEXT STEP • INVITATIONS</span>
            <p className="font-bold text-ink uppercase">
              YOU HAVE {pendingInvitesCount} PENDING SQUAD INVITATION{pendingInvitesCount > 1 ? "S" : ""}
            </p>
          </div>
        </div>
        <Link href="/teams">
          <Button variant="primary" size="sm" className="text-xs h-7">
            <span>REVIEW INVITATIONS →</span>
          </Button>
        </Link>
      </div>
    );
  }

  // Priority 2: Owned squad missing role
  if (missingSquadRole) {
    return (
      <div className="p-3.5 bg-red-50 border-hard shadow-hard border-red-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1 bg-red-100 border-hard-sm text-red-700 shrink-0">
            <UserPlus className="w-4 h-4 text-red-700" />
          </div>
          <div>
            <span className="text-[10px] text-red-600 uppercase font-bold">NEXT STEP • RECRUITMENT</span>
            <p className="font-bold text-ink uppercase">
              YOUR SQUAD IS MISSING: <span className="text-red-700 font-black">{missingSquadRole}</span>
            </p>
          </div>
        </div>
        <Link href="/discover">
          <Button variant="accent" size="sm" className="text-xs h-7">
            <span>FIND CANDIDATES →</span>
          </Button>
        </Link>
      </div>
    );
  }

  // Priority 3: Incomplete Profile (< 70%)
  if (completeness.score < 70) {
    return (
      <div className="p-3.5 bg-canvas-subtle border-hard shadow-hard flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1 bg-white border-hard text-ink shrink-0">
            <Sparkles className="w-4 h-4 text-caca-blue" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-ink-muted uppercase font-bold">NEXT STEP • PROFILE</span>
              <Badge variant="outline" size="sm" className="text-[9px]">
                {completeness.score}% {completeness.tier}
              </Badge>
            </div>
            <p className="font-bold text-ink uppercase">
              {completeness.missingRecommendations[0] || "COMPLETE YOUR STUDENT PROFILE"}
            </p>
          </div>
        </div>
        <Link href="/profile">
          <Button variant="outline" size="sm" className="text-xs h-7">
            <span>EDIT PROFILE →</span>
          </Button>
        </Link>
      </div>
    );
  }

  // Priority 4: No active squads joined
  if (userSquadsCount === 0) {
    return (
      <div className="p-3.5 bg-caca-lime/20 border-hard shadow-hard flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1 bg-caca-lime border-hard text-ink shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-ink-muted uppercase font-bold">RECOMMENDED ACTION</span>
            <p className="font-bold text-ink uppercase">
              FIND AN OPEN PROJECT SQUAD MATCHING YOUR SKILLS
            </p>
          </div>
        </div>
        <Link href="/feed">
          <Button variant="primary" size="sm" className="text-xs h-7">
            <span>EXPLORE SQUADS →</span>
          </Button>
        </Link>
      </div>
    );
  }

  // Default: Squad ready
  return (
    <div className="p-3.5 bg-canvas-subtle border-hard shadow-hard flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
      <div className="flex items-center gap-2.5">
        <div className="p-1 bg-caca-lime border-hard text-ink shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[10px] text-ink-muted uppercase font-bold">SQUAD STATUS</span>
          <p className="font-bold text-ink uppercase">
            YOUR SQUADS ARE ACTIVE • CHECK YOUR TEAM ROSTER & SYNERGY
          </p>
        </div>
      </div>
      <Link href="/teams">
        <Button variant="outline" size="sm" className="text-xs h-7">
          <span>VIEW SQUADS →</span>
        </Button>
      </Link>
    </div>
  );
};
