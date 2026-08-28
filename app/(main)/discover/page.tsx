"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MOCK_PROJECTS, MOCK_STUDENTS } from "@/lib/mock-data";
import { ProfileService } from "@/services/profile-service";
import { StudentProfile } from "@/types/user";
import { SearchIntentResult } from "@/types/ai";
import { IntentParser } from "@/matching/intent-parser";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { VoiceInputButton } from "@/components/ui/VoiceInputButton";
import { Search, Loader2, Sparkles, Filter, Check, History, X } from "lucide-react";
import { cn } from "@/lib/utils";

const RECENT_SEARCHES_KEY = "caca_recent_searches";

export default function DiscoverPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"projects" | "students">("projects");
  const [query, setQuery] = useState("");
  const [dbStudents, setDbStudents] = useState<StudentProfile[]>(MOCK_STUDENTS);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [searchIntent, setSearchIntent] = useState<SearchIntentResult | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "Python developer",
    "React designer",
    "Healthcare ML",
    "Systems engineer",
  ]);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecentSearches(parsed);
          }
        }
      } catch {
        // Ignored
      }
    }
  }, []);

  const saveSearchTerm = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches((prev) => {
      const updated = Array.from(new Set([trimmed, ...prev])).slice(0, 6);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        } catch {
          // Ignored
        }
      }
      return updated;
    });
  }, []);

  // Search real students from Supabase or candidates pool on query change
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchIntent(null);
      if (tab === "students") {
        ProfileService.getAllCandidates().then((all) => {
          setDbStudents(all.length > 0 ? all : MOCK_STUDENTS);
        });
      }
      return;
    }

    saveSearchTerm(q);
    const parsed = IntentParser.parse(q);
    const hasIntent =
      parsed.extractedSkills.length > 0 ||
      parsed.extractedRoles.length > 0 ||
      parsed.extractedCategories.length > 0 ||
      Boolean(parsed.availabilityPreference) ||
      Boolean(parsed.projectCategory) ||
      Boolean(parsed.experiencePreference);

    setSearchIntent(hasIntent ? parsed : null);

    if (tab === "students") {
      setIsSearchingStudents(true);
      const timer = setTimeout(async () => {
        try {
          const results = await ProfileService.searchProfiles(q);
          setDbStudents(results);
        } catch {
          setDbStudents(MOCK_STUDENTS);
        } finally {
          setIsSearchingStudents(false);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [query, tab, saveSearchTerm]);

  const matchingProjects = React.useMemo(() => {
    const q = query.trim();
    if (!q) return MOCK_PROJECTS;
    const intent = IntentParser.parse(q);
    const ranked = IntentParser.rankProjects(MOCK_PROJECTS, intent);
    const matched = ranked.filter((r) => r.relevanceScore > 0).map((r) => r.project);
    return matched.length > 0 ? matched : MOCK_PROJECTS;
  }, [query]);

  const categories = [
    { name: "Assistive Tech & Vision", count: 12 },
    { name: "Systems & Infrastructure", count: 8 },
    { name: "EdTech & Knowledge Graphs", count: 15 },
    { name: "Biotech & Scientific Computing", count: 6 },
    { name: "Fintech & Smart Contracts", count: 9 },
    { name: "Robotics & Embedded IoT", count: 11 },
  ];

  const conceptExamples = [
    "Python developer interested in healthcare",
    "React designer available weekends",
    "ML student who likes accessibility",
    "Frontend developer for a hackathon",
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
            PEOPLE ({dbStudents.length})
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="space-y-2">
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            {isSearchingStudents ? (
              <Loader2 className="w-4 h-4 text-ink animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-ink" />
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === "projects"
                ? "SEARCH PROJECTS, SKILLS, CATEGORIES..."
                : "SEARCH CONCEPTS: 'REACT DESIGNER', 'ML STUDENT EVENINGS'..."
            }
            className="w-full h-11 pl-10 pr-12 bg-white border-hard font-mono text-xs uppercase text-ink placeholder:text-ink-faint shadow-hard focus:outline-none focus:bg-canvas-subtle"
          />
          <div className="absolute right-1.5 flex items-center">
            <VoiceInputButton
              onTranscript={(transcript) =>
                setQuery((prev) => (prev ? `${prev} ${transcript}` : transcript))
              }
              size="sm"
            />
          </div>
        </div>

        {/* Recent Search History Chips */}
        {recentSearches.length > 0 && !query && (
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-ink-muted uppercase font-bold flex items-center gap-1">
                <History className="w-3 h-3 text-ink" />
                <span>RECENT SEARCHES:</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setRecentSearches([]);
                  if (typeof window !== "undefined") localStorage.removeItem(RECENT_SEARCHES_KEY);
                }}
                className="text-[9px] font-mono text-ink-muted hover:text-red-600 uppercase"
              >
                CLEAR HISTORY
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="px-2 py-0.5 bg-canvas-subtle border-hard-sm text-[10px] font-mono font-bold uppercase text-ink hover:bg-white hover:border-ink transition-colors flex items-center gap-1"
                >
                  <span>{term}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Concept query suggestions */}
        {tab === "students" && !query && (
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-mono text-ink-muted uppercase font-bold">
              TRY NATURAL LANGUAGE SEARCH CONCEPTS:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {conceptExamples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setQuery(ex)}
                  className="px-2 py-1 bg-white border-hard-sm text-[10px] font-mono font-bold uppercase text-ink hover:bg-caca-yellow/30 transition-colors"
                >
                  &ldquo;{ex}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Structured Intent Signals Banner */}
        {searchIntent && (searchIntent.extractedSkills.length > 0 || searchIntent.extractedRoles.length > 0 || searchIntent.extractedCategories.length > 0 || Boolean(searchIntent.availabilityPreference) || Boolean(searchIntent.projectCategory) || Boolean(searchIntent.experiencePreference)) && (
          <div className="p-2.5 bg-canvas-subtle border-hard text-[11px] font-mono flex flex-wrap items-center gap-2">
            <span className="text-ink-muted uppercase font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-caca-blue" />
              <span>DETECTED INTENT:</span>
            </span>
            {searchIntent.extractedSkills.map((sk) => (
              <Badge key={sk} variant="lime" size="sm">
                SKILL: {sk}
              </Badge>
            ))}
            {searchIntent.extractedRoles.map((role) => (
              <Badge key={role} variant="dark" size="sm">
                ROLE: {role}
              </Badge>
            ))}
            {searchIntent.extractedCategories.map((cat) => (
              <Badge key={cat} variant="blue" size="sm">
                INTEREST: {cat}
              </Badge>
            ))}
            {searchIntent.availabilityPreference?.label && (
              <Badge variant="outline" size="sm">
                AVAIL: {searchIntent.availabilityPreference.label}
              </Badge>
            )}
            {searchIntent.projectCategory && (
              <Badge variant="coral" size="sm" className="bg-caca-coral text-white border-hard-sm">
                CONTEXT: {searchIntent.projectCategory}
              </Badge>
            )}
            {searchIntent.experiencePreference && (
              <Badge variant="outline" size="sm">
                LEVEL: {searchIntent.experiencePreference}
              </Badge>
            )}
          </div>
        )}
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
          {matchingProjects.length > 0 ? (
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
          ) : (
            <div className="p-8 border-hard bg-white shadow-hard text-center space-y-3">
              <p className="font-mono font-bold text-xs uppercase text-ink">
                NO MATCHING PROJECTS FOUND
              </p>
              <p className="text-xs font-mono text-ink-muted">
                Try searching for different skills or select a domain category above.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setSearchIntent(null);
                }}
                className="text-xs"
              >
                CLEAR SEARCH
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Students Results */}
      {tab === "students" && (
        <div className="space-y-3 pt-2">
          {dbStudents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dbStudents.map((s) => (
                <div
                  key={s.id}
                  className="bg-white border-hard shadow-hard p-4 flex flex-col justify-between space-y-3 hover:bg-canvas-subtle transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.fullName} src={s.avatarUrl} size="md" />
                      <div className="space-y-0.5 min-w-0">
                        <h3 className="font-mono font-black text-sm uppercase text-ink truncate">
                          {s.fullName}
                        </h3>
                        <p className="text-xs font-mono text-ink-muted truncate">
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
                    <span className="text-ink-muted uppercase text-[10px]">
                      {s.availability?.hoursPerWeek || 10}H/WK • {s.workingStyle || "TEAM"}
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
          ) : (
            <div className="p-8 border-hard bg-white shadow-hard text-center space-y-3">
              <p className="font-mono font-bold text-xs uppercase text-ink">
                NO MATCHING CANDIDATES FOUND
              </p>
              <p className="text-xs font-mono text-ink-muted">
                Try searching for a different skill, name, or role.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setSearchIntent(null);
                }}
                className="text-xs"
              >
                CLEAR SEARCH
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
