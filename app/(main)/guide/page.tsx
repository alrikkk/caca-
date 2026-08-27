"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Compass,
  ExternalLink,
  BookOpen,
  Sparkles,
  Rocket,
  Code2,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GuideResource {
  title: string;
  source: string;
  category: string;
  description: string;
  url: string;
  tags: string[];
}

const GUIDE_RESOURCES: GuideResource[] = [
  {
    title: "Y Combinator Startup School",
    source: "Y Combinator",
    category: "FOUNDER ESSENTIALS",
    description:
      "Comprehensive curriculum and video modules on how to validate ideas, talk to users, launch MVPs, and find the right technical co-founders.",
    url: "https://www.startupschool.org",
    tags: ["Idea Validation", "Co-founders", "Fundraising", "MVPs"],
  },
  {
    title: "Google for Startups Accelerator & AI Program",
    source: "Google for Startups",
    category: "CLOUD & AI CREDITS",
    description:
      "Cloud credit grants, technical mentorship, and developer toolkits for early-stage university founders building machine learning applications.",
    url: "https://startup.google.com",
    tags: ["Cloud Credits", "Vertex AI", "Mentorship", "Scale"],
  },
  {
    title: "GitHub Student Developer Pack",
    source: "GitHub Education",
    category: "DEVELOPER TOOLING",
    description:
      "Free developer tools, cloud hosting instances, domain names, and GitHub Copilot access for enrolled college students.",
    url: "https://education.github.com/pack",
    tags: ["Free Tools", "Domains", "Copilot", "Cloud"],
  },
  {
    title: "How to Build a Minimum Viable Product (MVP)",
    source: "Y Combinator Library",
    category: "PRODUCT EXECUTION",
    description:
      "Practical guidance from Michael Seibel on shipping the leanest possible version of your product to get immediate user feedback.",
    url: "https://www.ycombinator.com/library/4D-how-to-plan-an-mvp",
    tags: ["MVP", "Fast Iteration", "Product"],
  },
  {
    title: "Stanford eCorner: Entrepreneurial Thought Leaders",
    source: "Stanford University",
    category: "FOUNDER TALKS",
    description:
      "Case studies and recorded discussions with technology founders on venture creation, ethics, engineering leadership, and scaling.",
    url: "https://ecorner.stanford.edu",
    tags: ["Leadership", "Case Studies", "Stanford"],
  },
  {
    title: "MIT OpenCourseWare: Entrepreneurship in Technology",
    source: "MIT",
    category: "ACADEMIC FRAMEWORKS",
    description:
      "Structured lecture notes, business model canvases, and venture evaluation rubrics from the Martin Trust Center for MIT Entrepreneurship.",
    url: "https://ocw.mit.edu",
    tags: ["MIT", "Disciplined Entrepreneurship", "Strategy"],
  },
  {
    title: "Paul Graham Essays on Startups & Ideas",
    source: "Paul Graham",
    category: "FOUNDER ESSENTIALS",
    description:
      "Timeless foundational essays including 'How to Get Startup Ideas', 'Do Things that Don't Scale', and 'Why to Not Not Start a Startup'.",
    url: "https://paulgraham.com/articles.html",
    tags: ["Essays", "Philosophy", "Idea Generation"],
  },
];

export default function GuidePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const categories = [
    "ALL",
    "FOUNDER ESSENTIALS",
    "PRODUCT EXECUTION",
    "CLOUD & AI CREDITS",
    "DEVELOPER TOOLING",
    "FOUNDER TALKS",
    "ACADEMIC FRAMEWORKS",
  ];

  const filteredResources = GUIDE_RESOURCES.filter(
    (item) => selectedCategory === "ALL" || item.category === selectedCategory
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12 font-mono">
      {/* Header */}
      <div className="border-b-2 border-ink pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-ink flex items-center gap-2">
            <Compass className="w-6 h-6" />
            <span>STARTUP GUIDE</span>
          </h1>
          <p className="text-xs text-ink-muted">
            CURATED KNOWLEDGE, FOUNDER LIBRARIES & DEVELOPER RESOURCES FOR STUDENT BUILDERS
          </p>
        </div>

        <Badge variant="lime" size="sm">
          {filteredResources.length} RESOURCES
        </Badge>
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

      {/* Resource Cards */}
      <div className="space-y-4">
        {filteredResources.map((res) => (
          <div
            key={res.title}
            className="p-5 bg-white border-hard shadow-hard space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink/10 pb-2.5">
              <div>
                <span className="text-[10px] text-ink-muted font-bold uppercase">
                  {res.source} • {res.category}
                </span>
                <h2 className="text-base font-black uppercase text-ink pt-0.5">
                  {res.title}
                </h2>
              </div>
              <a
                href={res.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-caca-lime border-hard text-xs font-bold uppercase btn-tactile self-start sm:self-center"
              >
                <span>OPEN GUIDE</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="font-sans text-xs sm:text-sm text-ink leading-relaxed font-medium">
              {res.description}
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {res.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-canvas-subtle border-hard-sm text-[10px] font-bold uppercase text-ink"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
