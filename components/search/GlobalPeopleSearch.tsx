"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProfileService } from "@/services/profile-service";
import { StudentProfile } from "@/types/user";
import { Avatar } from "@/components/ui/Avatar";
import { Search, X, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const GlobalPeopleSearch: React.FC<{ className?: string }> = ({ className }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const found = await ProfileService.searchProfiles(query);
        setResults(found);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectUser = (userId: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(`/profile/${userId}`);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-sm", className)}>
      {/* Search Input Box */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="SEARCH PEOPLE, SKILLS, COLLEGES..."
          className="w-full h-9 pl-8 pr-7 bg-white border-hard font-mono text-xs uppercase text-ink placeholder:text-ink-muted/80 shadow-hard-sm focus:outline-none focus:bg-canvas-subtle"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-ink-muted hover:text-ink"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-hard shadow-hard-lg z-50 max-h-80 overflow-y-auto divide-y divide-ink/10 animate-in-fade">
          {results.length > 0 ? (
            results.map((student) => (
              <div
                key={student.id}
                onClick={() => handleSelectUser(student.id)}
                className="p-2.5 hover:bg-canvas-subtle cursor-pointer transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={student.fullName} src={student.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-xs uppercase text-ink truncate group-hover:text-caca-blue">
                      {student.fullName}
                    </p>
                    <p className="font-mono text-[10px] text-ink-muted truncate">
                      {student.college} • {student.major}
                    </p>
                    {student.skills && student.skills.length > 0 && (
                      <p className="font-mono text-[10px] text-ink/70 truncate">
                        {student.skills.slice(0, 3).map((s) => s.name).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>

                <ArrowRight className="w-3.5 h-3.5 text-ink-muted group-hover:text-ink shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            ))
          ) : !isLoading ? (
            <div className="p-3 text-center font-mono text-xs text-ink-muted">
              NO STUDENTS FOUND FOR &ldquo;{query}&rdquo;
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
