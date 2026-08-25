"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { StudentProfile } from "@/types/user";
import { ProfileService } from "@/services/profile-service";
import { InvitationService } from "@/services/invitation-service";
import { useAuth } from "@/lib/auth-context";
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
}

export const MissingRoleMatcherModal: React.FC<MissingRoleMatcherModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  missingRole,
  requiredSkills,
  teamId,
}) => {
  const { user, profile } = useAuth();
  const [candidates, setCandidates] = useState<StudentProfile[]>([]);
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
        const results = await ProfileService.findCandidatesForRole(requiredSkills, missingRole);
        // Exclude current user from candidate suggestions
        const filtered = results.filter((c) => c.id !== user?.id && c.id !== profile?.id);
        setCandidates(filtered);
      } catch (err) {
        console.error("findCandidates error:", err);
      } finally {
        setLoading(false);
      }
    };

    findCandidates();
  }, [isOpen, missingRole, requiredSkills, user?.id, profile?.id]);

  const handleInvite = async (candidate: StudentProfile) => {
    const inviterId = user?.id || profile?.id;
    const inviterName = profile?.fullName || "Squad Lead";

    if (!inviterId) {
      setFeedback({ type: "error", message: "Please log in to send team invitations." });
      return;
    }

    setInvitingId(candidate.id);
    setFeedback(null);

    const targetTeamId = teamId || `team_proj_${projectId.substring(0, 8)}`;

    const res = await InvitationService.sendInvitation({
      teamId: targetTeamId,
      teamName: `${projectName} Squad`,
      projectId,
      projectName,
      inviterId,
      inviterName,
      inviteeId: candidate.id,
      inviteeName: candidate.fullName,
      roleTitle: missingRole,
    });

    setInvitingId(null);

    if (res.success) {
      setInvitedIds(new Set([...Array.from(invitedIds), candidate.id]));
      setFeedback({
        type: "success",
        message: `Invitation sent to ${candidate.fullName} for "${missingRole}" ✓`,
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
            <span className="text-[10px] text-ink-muted uppercase">TARGET ROLE</span>
            <p className="font-bold text-sm text-ink uppercase">{missingRole}</p>
          </div>
          <Badge variant="lime" size="sm">
            {requiredSkills.join(" • ") || "General"}
          </Badge>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 border-hard shadow-hard flex items-center gap-2 font-mono text-xs font-bold uppercase animate-in-fade ${
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
              <p className="font-bold uppercase text-ink-muted">SEARCHING REGISTERED STUDENTS...</p>
            </div>
          ) : candidates.length > 0 ? (
            candidates.map((cand) => {
              const isInvited = invitedIds.has(cand.id);
              const isPending = invitingId === cand.id;

              return (
                <div
                  key={cand.id}
                  className="p-3 bg-white border-hard shadow-hard flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={cand.fullName} src={cand.avatarUrl} size="md" />
                    <div className="space-y-0.5">
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
                      <p className="text-[11px] text-ink-muted">
                        {cand.major} • {cand.availability?.hoursPerWeek || 10}H/WK
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {cand.skills.slice(0, 3).map((sk) => (
                          <span
                            key={sk.name}
                            className="px-1.5 py-0.2 bg-canvas-subtle border-hard-sm text-[10px] font-bold uppercase text-ink"
                          >
                            {sk.name} ({sk.proficiency}/5)
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
                      onClick={() => handleInvite(cand)}
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
