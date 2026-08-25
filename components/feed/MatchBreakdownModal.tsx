"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Project } from "@/types/project";
import { useAuth } from "@/lib/auth-context";
import { CURRENT_USER } from "@/lib/mock-data";
import { defaultMatchingEngine } from "@/matching/engine";
import { CheckCircle2, XCircle } from "lucide-react";

interface MatchBreakdownModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MatchBreakdownModal: React.FC<MatchBreakdownModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const { profile } = useAuth();
  if (!project) return null;

  const targetStudent = profile || CURRENT_USER;
  const match = defaultMatchingEngine.calculateIndividualMatch(
    targetStudent,
    project
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`COMPATIBILITY: ${project.title}`}
    >
      <div className="space-y-5">
        {/* Score Banner */}
        <div className="bg-canvas-subtle p-3.5 border-hard flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase text-ink-muted">
              MATCH SCORE
            </p>
            <h2 className="text-2xl font-black font-mono tracking-tight text-ink">
              {match.overallScore}%
            </h2>
          </div>
          <Badge
            variant={match.overallScore >= 85 ? "lime" : "default"}
            size="sm"
          >
            {match.overallScore >= 85 ? "HIGH" : "MODERATE"}
          </Badge>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-mono font-bold uppercase text-ink">
            WEIGHTED COMPONENTS
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 border-hard bg-white space-y-1">
              <div className="flex justify-between">
                <span>SKILL (35%)</span>
                <span className="font-black">{match.breakdown.skillScore}%</span>
              </div>
              <ProgressBar value={match.breakdown.skillScore} color="lime" showValue={false} />
            </div>

            <div className="p-2.5 border-hard bg-white space-y-1">
              <div className="flex justify-between">
                <span>EXP (20%)</span>
                <span className="font-black">{match.breakdown.experienceScore}%</span>
              </div>
              <ProgressBar value={match.breakdown.experienceScore} color="blue" showValue={false} />
            </div>

            <div className="p-2.5 border-hard bg-white space-y-1">
              <div className="flex justify-between">
                <span>AVAIL (15%)</span>
                <span className="font-black">{match.breakdown.availabilityScore}%</span>
              </div>
              <ProgressBar value={match.breakdown.availabilityScore} color="lime" showValue={false} />
            </div>

            <div className="p-2.5 border-hard bg-white space-y-1">
              <div className="flex justify-between">
                <span>INTEREST (15%)</span>
                <span className="font-black">{match.breakdown.interestScore}%</span>
              </div>
              <ProgressBar value={match.breakdown.interestScore} color="coral" showValue={false} />
            </div>

            <div className="p-2.5 border-hard bg-white space-y-1">
              <div className="flex justify-between">
                <span>ROLE (10%)</span>
                <span className="font-black">{match.breakdown.roleScore}%</span>
              </div>
              <ProgressBar value={match.breakdown.roleScore} color="ink" showValue={false} />
            </div>

            <div className="p-2.5 border-hard bg-white space-y-1">
              <div className="flex justify-between">
                <span>STYLE (5%)</span>
                <span className="font-black">{match.breakdown.workingStyleScore}%</span>
              </div>
              <ProgressBar value={match.breakdown.workingStyleScore} color="lime" showValue={false} />
            </div>
          </div>
        </div>

        {/* Skill Match List */}
        <div className="space-y-1.5">
          <p className="text-xs font-mono font-bold uppercase text-ink">
            SKILL MATCH MATRIX
          </p>
          <div className="divide-y divide-ink/10 border-hard p-2.5 bg-canvas-subtle text-xs font-mono">
            {match.matchedSkills.map((s) => (
              <div
                key={s.skillName}
                className="flex items-center justify-between py-1"
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-700" />
                  <span className="font-bold text-ink">{s.skillName}</span>
                </div>
                <span>
                  {s.userProficiency}/5 (REQ {s.requiredProficiency}/5)
                </span>
              </div>
            ))}

            {match.missingSkills.map((s) => (
              <div
                key={s}
                className="flex items-center justify-between py-1"
              >
                <div className="flex items-center gap-1.5 text-ink-muted">
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>{s}</span>
                </div>
                <Badge variant="missing" size="sm">
                  MISSING
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
