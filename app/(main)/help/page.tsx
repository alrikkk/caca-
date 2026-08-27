"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  HelpCircle,
  Sparkles,
  Zap,
  Users,
  Shield,
  MessageSquare,
  Film,
  Bookmark,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  category: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    category: "MATCHING & COMPATIBILITY",
    question: "HOW DOES CACA'S COMPATIBILITY SCORE WORK?",
    answer:
      "Caca's matching engine is 100% deterministic and explainable. It evaluates 5 core dimensions: Skill Overlap & Proficiency (50%), Role Complementarity (20%), Availability & Timezone Alignment (15%), Working Style Harmony (10%), and Domain Interests (5%). Click 'WHY YOU MATCH' on any project card to inspect the exact point-by-point breakdown.",
  },
  {
    category: "MATCHING & COMPATIBILITY",
    question: "WHAT DO 'STRONG MATCH' AND 'SKILL GAP' BADGES MEAN?",
    answer:
      "'STRONG MATCH' (>=85%) indicates deep overlap with the project's required stack. 'GOOD FIT' (70–84%) represents strong capability alignment. 'SKILL GAP' flags that the squad still requires critical skills you or other candidates can help fill.",
  },
  {
    category: "SQUADS & TEAMS",
    question: "HOW DO I CREATE OR DISSOLVE A SQUAD?",
    answer:
      "Go to the Teams tab and click 'CREATE SQUAD'. You can designate yourself as the Squad Lead and specify missing roles. As a Squad Lead, you have authorization to invite candidates, edit member roles, or dissolve the squad via 'DELETE SQUAD'.",
  },
  {
    category: "SQUADS & TEAMS",
    question: "WHAT IS SQUAD READINESS STATUS?",
    answer:
      "Readiness analyzes team skill coverage and open slots: 'SQUAD READY ✓' (synergy >=80% with zero unfilled roles), 'PARTIALLY READY △' (minor role/skill gap), or 'GAPS TO FILL ⚠' (multiple unfilled critical roles). Leads can click 'FIND CANDIDATES' to auto-filter applicants matching open tracks.",
  },
  {
    category: "CLIPS & DISCOVERY",
    question: "HOW DO CLIPS WORK?",
    answer:
      "Clips allow student builders to share 15–60s video demos, sprint updates, and hardware tests. You can vertically scroll clips, like posts with persistent telemetry, connect with creators, and view attached project squads directly.",
  },
  {
    category: "CHAT & COLLABORATION",
    question: "CAN I MESSAGE CANDIDATES AND CREATE GROUPS?",
    answer:
      "Yes! Click 'MESSAGE' on any student profile to initiate a direct 1-to-1 conversation, or use 'NEW GROUP' inside the Chat tab to start sprint rooms with your squad members. You can also use voice typing by clicking the mic icon in the composer.",
  },
  {
    category: "PROFILE & RESUME",
    question: "HOW DO I UPLOAD A PDF RESUME OR SOCIAL HANDLES?",
    answer:
      "Open your Profile Matrix, scroll to 'STUDENT RESUME (PDF)' to attach your document (up to 5MB), and add your LinkedIn, GitHub, Discord, or Instagram handles in the Public Socials section.",
  },
  {
    category: "DEMO MODE",
    question: "HOW DOES DEMO MODE WORK FOR EVALUATORS?",
    answer:
      "Demo Mode loads pre-populated student identities (Alex Chen, Maya Patel, Marcus Vance, Elena Rostova) with complete matching graphs, chat history, squads, and clips. All actions run in an isolated client environment without altering production data.",
  },
];

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const categories = ["ALL", "MATCHING & COMPATIBILITY", "SQUADS & TEAMS", "CLIPS & DISCOVERY", "CHAT & COLLABORATION", "PROFILE & RESUME", "DEMO MODE"];

  const filteredFaqs = FAQ_ITEMS.filter(
    (item) => selectedCategory === "ALL" || item.category === selectedCategory
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12 font-mono">
      {/* Header */}
      <div className="border-b-2 border-ink pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-ink flex items-center gap-2">
            <HelpCircle className="w-6 h-6" />
            <span>HELP & ARCHITECTURE</span>
          </h1>
          <p className="text-xs text-ink-muted">
            PRODUCT GUIDE, MATCHING ENGINE WEIGHTS & FREQUENTLY ASKED QUESTIONS
          </p>
        </div>

        <Badge variant="lime" size="sm">
          CACA V2.0
        </Badge>
      </div>

      {/* Quick Architecture Callout */}
      <div className="p-4 bg-white border-hard shadow-hard space-y-2.5">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-caca-blue" />
          <h2 className="font-black text-xs uppercase text-ink">
            THE CACA MATCHING FORMULA
          </h2>
        </div>
        <p className="text-xs font-sans text-ink leading-relaxed">
          Caca solves the student team fragmentation problem through deterministic capability graphs rather than black-box algorithms. Every score is mathematically grounded in verified skills, role coverage, time windows, and working styles.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-center text-[10px]">
          <div className="p-1.5 bg-canvas-subtle border-hard-sm">
            <span className="font-bold block">SKILLS</span>
            <span className="font-black text-xs text-ink">50%</span>
          </div>
          <div className="p-1.5 bg-canvas-subtle border-hard-sm">
            <span className="font-bold block">ROLES</span>
            <span className="font-black text-xs text-ink">20%</span>
          </div>
          <div className="p-1.5 bg-canvas-subtle border-hard-sm">
            <span className="font-bold block">SCHEDULE</span>
            <span className="font-black text-xs text-ink">15%</span>
          </div>
          <div className="p-1.5 bg-canvas-subtle border-hard-sm">
            <span className="font-bold block">STYLE</span>
            <span className="font-black text-xs text-ink">10%</span>
          </div>
          <div className="p-1.5 bg-canvas-subtle border-hard-sm">
            <span className="font-bold block">DOMAINS</span>
            <span className="font-black text-xs text-ink">5%</span>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-3 py-1 text-[11px] font-bold uppercase border-hard whitespace-nowrap btn-tactile transition-all",
              selectedCategory === cat
                ? "bg-ink text-caca-lime shadow-hard-sm"
                : "bg-white text-ink hover:bg-canvas-subtle"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={faq.question}
              className="bg-white border-hard shadow-hard overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-canvas-subtle transition-colors"
              >
                <div className="space-y-0.5">
                  <span className="text-[9px] text-ink-muted uppercase font-bold">
                    {faq.category}
                  </span>
                  <p className="font-black text-xs sm:text-sm uppercase text-ink">
                    {faq.question}
                  </p>
                </div>
                <div className="p-1 bg-canvas-subtle border-hard-sm shrink-0">
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-ink" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-ink" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="p-4 pt-0 border-t border-ink/10 bg-canvas-subtle/50">
                  <p className="font-sans text-xs sm:text-sm text-ink leading-relaxed font-medium">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
