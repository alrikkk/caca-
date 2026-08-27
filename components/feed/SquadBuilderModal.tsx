"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Project } from "@/types/project";
import { StudentProfile } from "@/types/user";
import { SquadRecommendationResult, RecommendedSquadMember } from "@/types/ai";
import { ProfileService } from "@/services/profile-service";
import { InvitationService } from "@/services/invitation-service";
import { useAuth } from "@/lib/auth-context";
import { defaultMatchingEngine } from "@/matching/engine";
import {
  Users,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Shield,
  Clock,
  Briefcase,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface SquadBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  teamId?: string;
}

export const SquadBuilderModal: React.FC<SquadBuilderModalProps> = ({
  isOpen,
  onClose,
  project,
  teamId,
}) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<SquadRecommendationResult | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !project) return;

    const buildSquad = async () => {
      setLoading(true);
      setFeedback(null);
      try {
        const allCandidates = await ProfileService.getAllCandidates();
        // Exclude current user from candidate pool
        const currentUserId = user?.id || profile?.id;
        const candidatePool = allCandidates.filter((c) => c.id !== currentUserId);

        // Try server-side AI route first with graceful local fallback
        let squadData: SquadRecommendationResult | null = null;
        try {
          const res = await fetch("/api/ai/squad-builder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project,
              candidates: candidatePool,
              currentMembers: profile ? [profile] : [],
            }),
          });
          if (res.ok) {
            squadData = await res.json();
          }
        } catch {
          // Ignore network errors and use deterministic engine
        }

        if (!squadData) {
          // Deterministic fallback
          const teamResult = defaultMatchingEngine.buildRecommendedSquad(
            candidatePool,
            project,
            profile ? [profile] : []
          );

          const recommendedSquad: RecommendedSquadMember[] = teamResult.recommendedMembers
            .filter((m) => m.student.id !== currentUserId)
            .map((m) => {
              const ind = defaultMatchingEngine.calculateIndividualMatch(m.student, project);
              return {
                candidateId: m.student.id,
                candidateName: m.student.fullName,
                college: m.student.college,
                major: m.student.major,
                assignedRole: m.assignedRole || "Squad Specialist",
                fitScore: ind.overallScore,
                matchedSkills: ind.matchedSkills.map((s) => s.skillName),
                missingSkills: ind.missingSkills,
                rationale: ind.explanation.join(" • ") || `Strong profile in ${m.student.major}`,
                availabilityMatch: `${m.student.availability?.hoursPerWeek || 10}h/wk match`,
                workingStyleFit: `${m.student.workingStyle.toUpperCase()} style`,
              };
            });

          squadData = {
            projectId: project.id,
            projectName: project.title,
            projectCategory: project.category,
            recommendedSquad,
            predictedSynergyScore: teamResult.teamScore,
            synergySummary: `Squad covers ${teamResult.skillCoverages.filter((s) => s.isCovered).length} of ${teamResult.skillCoverages.length} required skill tracks.`,
            keyStrengths: ["Balanced cross-functional skill coverage", "Compatible working styles and schedules"],
            potentialRisks: teamResult.gaps.riskNotes,
          };
        }

        setRecommendation(squadData);
      } catch (err) {
        console.error("SquadBuilder error:", err);
      } finally {
        setLoading(false);
      }
    };

    buildSquad();
  }, [isOpen, project, user?.id, profile]);

  if (!project) return null;

  const handleInvite = async (member: RecommendedSquadMember) => {
    const inviterId = user?.id || profile?.id;
    const inviterName = profile?.fullName || "Squad Lead";

    if (!inviterId) {
      setFeedback({ type: "error", message: "Please log in to invite candidates." });
      return;
    }

    setInvitingId(member.candidateId);
    setFeedback(null);

    const targetTeamId = teamId || `team_proj_${project.id.substring(0, 8)}`;

    const res = await InvitationService.sendInvitation({
      teamId: targetTeamId,
      teamName: `${project.title} Squad`,
      projectId: project.id,
      projectName: project.title,
      inviterId,
      inviterName,
      inviteeId: member.candidateId,
      inviteeName: member.candidateName,
      roleTitle: member.assignedRole,
    });

    setInvitingId(null);

    if (res.success) {
      setInvitedIds(new Set([...Array.from(invitedIds), member.candidateId]));
      setFeedback({
        type: "success",
        message: `Invitation sent to ${member.candidateName} for "${member.assignedRole}" ✓`,
      });
    } else {
      setFeedback({
        type: "error",
        message: res.error || "Could not send invitation.",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`AI SQUAD BUILDER: ${project.title.toUpperCase()}`}
      className="max-w-2xl"
    >
      <div className="space-y-4 font-mono text-xs">
        {/* Banner with Synergy preview */}
        <div className="p-3.5 bg-canvas-subtle border-hard flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-ink-muted text-[10px] uppercase font-bold">
              <Zap className="w-3.5 h-3.5 text-caca-blue fill-caca-blue" />
              <span>OPTIMAL SQUAD CONFIGURATION</span>
            </div>
            <p className="font-bold text-sm text-ink uppercase mt-0.5">
              {project.title}
            </p>
          </div>
          {recommendation && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 border-hard">
              <span className="text-[10px] text-ink-muted font-bold">TEAM SYNERGY</span>
              <span className="text-base font-black text-ink">
                {recommendation.predictedSynergyScore}%
              </span>
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 border-hard shadow-hard flex items-center gap-2 font-mono text-xs font-bold uppercase ${
              feedback.type === "success"
                ? "bg-caca-lime text-ink"
                : "bg-red-50 text-red-600 border-red-500"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-ink" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="p-10 text-center border-hard bg-white shadow-hard space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-ink" />
            <p className="font-bold uppercase text-ink">
              ANALYZING PROJECT REQUIREMENTS & CANDIDATES...
            </p>
            <p className="text-[11px] text-ink-muted">
              Matching skill matrices, time commitments, and working styles.
            </p>
          </div>
        ) : recommendation && recommendation.recommendedSquad.length > 0 ? (
          <div className="space-y-3">
            {/* AI Summary note */}
            <div className="p-2.5 bg-white border-hard text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 font-bold uppercase text-ink">
                <Sparkles className="w-3.5 h-3.5 text-caca-blue" />
                <span>WHY THIS SQUAD WAS SELECTED</span>
              </div>
              <p className="text-ink-muted leading-relaxed">
                {recommendation.synergySummary}
              </p>
            </div>

            {/* Recommended Squad List */}
            <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
              {recommendation.recommendedSquad.map((member) => {
                const isInvited = invitedIds.has(member.candidateId);
                const isPending = invitingId === member.candidateId;

                return (
                  <div
                    key={member.candidateId}
                    className="p-3 bg-white border-hard shadow-hard flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all hover:bg-canvas-subtle"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={member.candidateName} size="md" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/profile/${member.candidateId}`}
                            target="_blank"
                            className="font-bold text-sm uppercase text-ink hover:underline"
                          >
                            {member.candidateName}
                          </Link>
                          <Badge variant="lime" size="sm">
                            {member.fitScore}% FIT
                          </Badge>
                        </div>
                        <p className="text-[11px] font-bold text-caca-blue uppercase">
                          ROLE: {member.assignedRole}
                        </p>
                        <p className="text-[10px] text-ink-muted">
                          {member.college} • {member.major} • {member.availabilityMatch}
                        </p>
                        {member.rationale && (
                          <p className="text-[10px] text-ink font-semibold">
                            {member.rationale}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {member.matchedSkills.map((sk) => (
                            <span
                              key={sk}
                              className="px-1.5 py-0.5 bg-canvas-subtle border-hard-sm text-[9px] font-bold uppercase text-ink"
                            >
                              ✓ {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Link href={`/profile/${member.candidateId}`} target="_blank">
                        <Button variant="outline" size="sm" className="text-[11px] h-8">
                          PROFILE
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleInvite(member)}
                        disabled={isInvited || isPending}
                        className={`text-[11px] h-8 ${
                          isInvited
                            ? "bg-gray-200 text-ink cursor-default"
                            : "bg-caca-lime hover:bg-caca-lime/90 text-ink"
                        }`}
                      >
                        {isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isInvited ? (
                          <span>INVITED ✓</span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>INVITE</span>
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center border-hard bg-white shadow-hard space-y-1">
            <p className="font-bold uppercase text-ink">NO SQUAD RECOMMENDATIONS AVAILABLE</p>
            <p className="text-ink-muted text-[11px]">
              Could not find matching registered students for open project roles.
            </p>
          </div>
        )}

        {/* Notice & Footer */}
        <div className="border-t border-ink/10 pt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-ink-muted">
            * Candidates are recommendations only. You must review and click &ldquo;INVITE&rdquo; to recruit them.
          </p>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            DONE
          </Button>
        </div>
      </div>
    </Modal>
  );
};
