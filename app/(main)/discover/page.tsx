"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MOCK_PROJECTS, MOCK_STUDENTS } from "@/lib/mock-data";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Search, Sparkles, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DiscoverPage() {
  const [tab, setTab] = useState<"projects" | "students">("projects");
  const [query, setQuery] = useState("");

  const matchingProjects = MOCK_PROJECTS.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase()) ||
      p.requiredSkills.some((s) =>
        s.skill.name.toLowerCase().includes(query.toLowerCase())
      )
  );

  const matchingStudents = MOCK_STUDENTS.filter(
    (s) =>
      s.fullName.toLowerCase().includes(query.toLowerCase()) ||
      s.college.toLowerCase().includes(query.toLowerCase()) ||
      s.major.toLowerCase().includes(query.toLowerCase()) ||
      s.skills.some((sk) => sk.name.toLowerCase().includes(query.toLowerCase()))
  );

  const categories = [
    { name: "Assistive Tech & Vision", count: 12 },
    { name: "Systems & Infrastructure", count: 8 },
    { name: "EdTech & Knowledge Graphs", count: 15 },
    { name: "Biotech & Scientific Computing", count: 6 },
    { name: "Fintech & Smart Contracts", count: 9 },
    { name: "Robotics & Embedded IoT", count: 11 },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="border-b-2 border-ink pb-3 flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight uppercase text-ink">
          DISCOVER
        </h1>
        <div className="flex gap-1.5">
          <button
            onClick={() => setTab("projects")}
            className={cn(
              "px-3 py-1 text-xs font-mono font-bold uppercase border-hard transition-all",
              tab === "projects"
                ? "bg-ink text-caca-lime shadow-hard"
                : "bg-white text-ink hover:bg-canvas-subtle"
            )}
          >
            PROJECTS ({matchingProjects.length})
          </button>
          <button
            onClick={() => setTab("students")}
            className={cn(
              "px-3 py-1 text-xs font-mono font-bold uppercase border-hard transition-all",
              tab === "students"
                ? "bg-ink text-caca-lime shadow-hard"
                : "bg-white text-ink hover:bg-canvas-subtle"
            )}
          >
            STUDENTS ({matchingStudents.length})
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-ink" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            tab === "projects"
              ? "SEARCH PROJECTS, SKILLS, CATEGORIES..."
              : "SEARCH STUDENTS, MAJORS, SKILLS, UNIVERSITIES..."
          }
          className="w-full h-11 pl-10 pr-4 bg-white border-hard font-mono text-xs uppercase text-ink placeholder:text-ink-faint shadow-hard focus:outline-none"
        />
      </div>

      {/* Domain tags (when browsing projects) */}
      {tab === "projects" && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setQuery(query === cat.name ? "" : cat.name)}
              className="px-2.5 py-1.5 bg-white border-hard shadow-hard text-left hover:bg-canvas-subtle btn-tactile text-xs font-mono font-bold uppercase text-ink"
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Projects Results */}
      {tab === "projects" && (
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {matchingProjects.map((p) => (
              <div
                key={p.id}
                className="bg-white border-hard shadow-hard p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <Badge variant="lime" size="sm">
                      {p.category}
                    </Badge>
                    <span className="font-mono text-xs font-black text-ink">
                      MATCH {p.matchScore}%
                    </span>
                  </div>
                  <h3 className="font-mono font-black text-sm uppercase text-ink">
                    {p.title}
                  </h3>
                  <p className="text-xs font-mono text-ink-muted line-clamp-2">
                    {p.tagline}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-ink/10 pt-2 text-xs font-mono">
                  <span className="text-ink-muted">
                    {p.hoursPerWeek}H / WK
                  </span>
                  <Link href={`/projects/${p.id}`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      VIEW
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Students Results */}
      {tab === "students" && (
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {matchingStudents.map((s) => (
              <div
                key={s.id}
                className="bg-white border-hard shadow-hard p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.fullName} src={s.avatarUrl} size="md" />
                    <div className="space-y-0.5">
                      <h3 className="font-mono font-black text-sm uppercase text-ink">
                        {s.fullName}
                      </h3>
                      <p className="text-xs font-mono text-ink-muted">
                        {s.major} • {s.college}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {s.skills.slice(0, 3).map((sk) => (
                      <span
                        key={sk.id}
                        className="text-[10px] font-mono px-1.5 py-0.5 bg-canvas-subtle border-hard-sm uppercase font-bold text-ink"
                      >
                        {sk.name} {sk.proficiency}/5
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-ink/10 pt-2 text-xs font-mono">
                  <span className="text-ink-muted uppercase">
                    {s.availability.hoursPerWeek}H/WK • {s.workingStyle}
                  </span>
                  <Link href={`/profile/${s.id}`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      VIEW PROFILE
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
