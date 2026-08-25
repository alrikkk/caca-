"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MOCK_PROJECTS } from "@/lib/mock-data";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Search } from "lucide-react";

export default function DiscoverPage() {
  const [query, setQuery] = useState("");

  const matching = MOCK_PROJECTS.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase()) ||
      p.requiredSkills.some((s) =>
        s.skill.name.toLowerCase().includes(query.toLowerCase())
      )
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
        <Badge variant="outline" size="sm">
          {matching.length} PROJECTS
        </Badge>
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
          placeholder="SEARCH PROJECTS, SKILLS, CATEGORIES..."
          className="w-full h-11 pl-10 pr-4 bg-white border-hard font-mono text-xs uppercase text-ink placeholder:text-ink-faint shadow-hard focus:outline-none"
        />
      </div>

      {/* Domain tags */}
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

      {/* Results */}
      <div className="space-y-3 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {matching.map((p) => (
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
    </div>
  );
}
