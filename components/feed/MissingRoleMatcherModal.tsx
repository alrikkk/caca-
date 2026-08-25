"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { StudentProfile } from "@/types/user";
import { Project } from "@/types/project";
import { ProfileService } from "@/services/profile-service";
import { InvitationService } from "@/services/invitation-service";
import { useAuth } from "@/lib/auth-context";
import { defaultMatchingEngine } from "@/matching/engine";
import { Search, UserPlus, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

interface MissingRoleMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  missingRole: string;
  requiredSkills: string[];
  teamId?: string;
  project?: Project;
}

export const MissingRoleMatcherModal: React.FC<MissingRoleMatcherModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  missingRole,
  requiredSkills,
  teamId,
  project,
}) => {
  const { user, profile } = useAuth();
  const [candidates, setCandidates] = useState<Array<{
    candidate: StudentProfile;
    fitScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    rationale: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const findCandidates = async () => {
      setLoading(true);
      setFeedback(null);
      try {
        const allCandidates = await ProfileService.getAllCandidates();
        const currentUserId = user?.id || profile?.id;
        const pool = allCandidates.filter((c) => c.id !== currentUserId);

        const dummyProject: Project = project || {
          id: projectId,
          ownerId: currentUserId || "usr_owner",
          title: projectName,
          tagline: "",
          description: "",
          category: "Technology",
          status: "recruiting",
          maxTeamSize: 4,
          durationWeeks: 8,
          hoursPerWeek: 12,
          requiredSkills: requiredSkills.map((sk) => ({
            skill: { id: `sk_${sk}`, name: sk, category: "general" },
            requiredProficiency: 3,
            importance: "required",
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const ranked = defaultMatchingEngine.rankCandidatesForRole(
          pool,
          missingRole,
          requiredSkills,
          dummyProject
        );

        setCandidates(ranked);
      } catch (err) {
        console.error("findCandidates error:", err);
      } finally {
        setLoading(false);
      }
    };

    findCandidates();
  }, [isOpen, missingRole, requiredSkills, user?.id, profile?.id, projectId, projectName, project]);

  const handleInvite = async (candData: { candidate: StudentProfile; fitScore: number }) => {
    const inviterId = user?.id || profile?.id;
    const inviterName = profile?.fullName || "Squad Lead";

    if (!inviterId) {
      setFeedback({ type: "error", message: "Please log in to send team invitations." });
      return;
    }

    setInvitingId(candData.candidate.id);
    setFeedback(null);

    const targetTeamId = teamId || `team_proj_${projectId.substring(0, 8)}`;

    const res = await InvitationService.sendInvitation({
      teamId: targetTeamId,
      teamName: `${projectName} Squad`,
      projectId,
      projectName,
      inviterId,
      inviterName,
      inviteeId: candData.candidate.id,
      inviteeName: candData.candidate.fullName,
      roleTitle: missingRole,
    });

    setInvitingId(null);

    if (res.success) {
      setInvitedIds(new Set([...Array.from(invitedIds), candData.candidate.id]));
      setFeedback({
        type: "success",
        message: `Invitation sent to ${candData.candidate.fullName} for "${missingRole}" ✓`,
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
      title={`FIND CANDIDATES: ${missingRole.toUpperCase()}`}
      className="max-w-xl"
    >
      <div className="space-y-4 font-mono text-xs">
        {/* Banner */}
        <div className="p-3 bg-canvas-subtle border-hard flex items-center justify-between">
          <div>
            <span className="text-[10px] text-ink-muted uppercase font-bold">PROJECT NEEDS</span>
            <p className="font-bold text-sm text-ink uppercase">{missingRole}</p>
          </div>
          <Badge variant="lime" size="sm">
            {requiredSkills.join(" • ") || "General"}
          </Badge>
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

        {/* Candidate List */}
        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="p-8 text-center border-hard bg-white shadow-hard space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-ink" />
              <p className="font-bold uppercase text-ink-muted">SEARCHING & RANKING CANDIDATES...</p>
            </div>
          ) : candidates.length > 0 ? (
            candidates.map((candData) => {
              const cand = candData.candidate;
              const isInvited = invitedIds.has(cand.id);
              const isPending = invitingId === cand.id;

              return (
                <div
                  key={cand.id}
                  className="p-3 bg-white border-hard shadow-hard flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all hover:bg-canvas-subtle"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={cand.fullName} src={cand.avatarUrl} size="md" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/profile/${cand.id}`}
                          target="_blank"
                          className="font-bold uppercase text-ink hover:underline flex items-center gap-1.5"
                        >
                          <span>{cand.fullName}</span>
                          <span className="text-[10px] text-ink-muted font-normal">
                            • {cand.college}
                          </span>
                        </Link>
                        <Badge variant={candData.fitScore >= 80 ? "lime" : "default"} size="sm">
                          {candData.fitScore}% FIT
                        </Badge>
                      </div>
                      <p className="text-[11px] text-ink-muted">
                        {cand.major} • {cand.availability?.hoursPerWeek || 10}H/WK
                      </p>
                      <p className="text-[10px] text-ink font-semibold">
                        {candData.rationale}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {candData.matchedSkills.slice(0, 3).map((sk) => (
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
                    <Link href={`/profile/${cand.id}`} target="_blank">
                      <Button variant="outline" size="sm" className="text-[11px] h-8">
                        PROFILE
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleInvite(candData)}
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
            })
          ) : (
            <div className="p-8 text-center border-hard bg-white shadow-hard space-y-1">
              <p className="font-bold uppercase text-ink">NO MATCHING PROFILES FOUND</p>
              <p className="text-ink-muted text-[11px]">
                Try searching via the global search bar or broadening role keywords.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-ink/10 pt-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            DONE
          </Button>
        </div>
      </div>
    </Modal>
  );
};
