"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Project } from "@/types/project";
import { useAuth } from "@/lib/auth-context";
import { CURRENT_USER } from "@/lib/mock-data";
import { defaultMatchingEngine } from "@/matching/engine";
import { GroundedMatchExplanation } from "@/types/ai";
import { CheckCircle2, AlertTriangle, Sparkles, Check, X } from "lucide-react";

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
  const [aiExplanation, setAiExplanation] = useState<GroundedMatchExplanation | null>(null);

  const targetStudent = profile || CURRENT_USER;
  const match = project
    ? defaultMatchingEngine.calculateIndividualMatch(targetStudent, project)
    : null;

  useEffect(() => {
    if (!isOpen || !project) return;

    const fetchExplanation = async () => {
      try {
        const res = await fetch("/api/ai/explain-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project,
            student: targetStudent,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAiExplanation(data);
        }
      } catch {
        // Fallback to deterministic match object
      }
    };

    fetchExplanation();
  }, [isOpen, project, targetStudent]);

  if (!project || !match) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`COMPATIBILITY: ${project.title.toUpperCase()}`}
      className="max-w-xl"
    >
      <div className="space-y-4 font-mono text-xs">
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
            {match.overallScore >= 85 ? "HIGH FIT" : "MODERATE FIT"}
          </Badge>
        </div>

        {/* Grounded Synthesis / Match Rationale */}
        {(aiExplanation?.summary || match.groundedSummary) && (
          <div className="p-3 bg-white border-hard text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 font-bold uppercase text-ink">
              <Sparkles className="w-3.5 h-3.5 text-caca-blue" />
              <span>MATCH RATIONALE</span>
            </div>
            <p className="text-ink leading-relaxed font-sans">
              {aiExplanation?.summary || match.groundedSummary}
            </p>
          </div>
        )}

        {/* WHY YOU MATCH & MISSING Sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* WHY YOU MATCH */}
          <div className="p-3 border-hard bg-white space-y-2">
            <div className="flex items-center gap-1.5 font-bold uppercase text-green-700">
              <CheckCircle2 className="w-4 h-4 text-green-700" />
              <span>WHY YOU MATCH</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              {match.whyYouMatch && match.whyYouMatch.length > 0 ? (
                match.whyYouMatch.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-green-700 font-bold">✓</span>
                    <div>
                      <span className="font-bold text-ink">{item.title}</span>
                      <p className="text-[10px] text-ink-muted leading-tight">{item.detail}</p>
                    </div>
                  </div>
                ))
              ) : match.matchedSkills.length > 0 ? (
                match.matchedSkills.map((s) => (
                  <div key={s.skillName} className="flex items-center gap-1.5">
                    <span className="text-green-700 font-bold">✓</span>
                    <span className="font-bold text-ink">{s.skillName}</span>
                    <span className="text-ink-muted text-[10px]">({s.userProficiency}/5)</span>
                  </div>
                ))
              ) : (
                <p className="text-ink-muted text-[10px]">No direct skill overlaps yet</p>
              )}
            </div>
          </div>

          {/* MISSING */}
          <div className="p-3 border-hard bg-white space-y-2">
            <div className="flex items-center gap-1.5 font-bold uppercase text-amber-700">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>MISSING / GAPS</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              {match.missingPoints && match.missingPoints.length > 0 ? (
                match.missingPoints.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">⚠</span>
                    <div>
                      <span className="font-bold text-ink">{item.title}</span>
                      <p className="text-[10px] text-ink-muted leading-tight">{item.detail}</p>
                    </div>
                  </div>
                ))
              ) : match.missingSkills.length > 0 ? (
                match.missingSkills.map((s) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className="text-amber-600 font-bold">⚠</span>
                    <span className="text-ink">{s}</span>
                  </div>
                ))
              ) : (
                <p className="text-ink-muted text-[10px]">All core skill requirements covered</p>
              )}
            </div>
          </div>
        </div>

        {/* Deterministic Weighted Breakdown */}
        <div className="space-y-2 pt-1">
          <p className="text-xs font-mono font-bold uppercase text-ink">
            DETERMINISTIC WEIGHTED COMPONENTS
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
      </div>
    </Modal>
  );
};
