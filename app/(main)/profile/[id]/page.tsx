"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { StudentProfile } from "@/types/user";
import { ProfileService } from "@/services/profile-service";
import { MOCK_PROJECTS } from "@/lib/mock-data";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Github,
  Globe,
  Linkedin,
  Clock,
  Briefcase,
  Sparkles,
} from "lucide-react";

export default function StudentProfileDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      setLoading(true);
      try {
        const data = await ProfileService.getProfileById(userId);
        setStudent(data);
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [userId]);

  if (loading) {
    return (
      <div className="p-10 border-hard bg-white shadow-hard text-center max-w-md mx-auto">
        <p className="font-mono text-xs font-bold uppercase text-ink-muted">
          LOADING PROFILE...
        </p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-10 border-hard bg-white shadow-hard text-center space-y-4 max-w-md mx-auto">
        <h2 className="text-base font-mono font-black uppercase text-ink">
          STUDENT PROFILE NOT FOUND
        </h2>
        <p className="text-xs font-mono text-ink-muted">
          The requested student profile could not be located.
        </p>
        <Link href="/feed">
          <Button variant="primary" size="md" className="w-full">
            <span>RETURN TO FEED →</span>
          </Button>
        </Link>
      </div>
    );
  }

  const isMockStudent = student.id.startsWith("usr_");
  const studentProjects = MOCK_PROJECTS.filter((p) => p.ownerId === student.id);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b-2 border-ink pb-3">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase text-ink hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO FEED</span>
        </Link>

        {isMockStudent && (
          <Badge variant="lime" size="sm">
            DEMO PROFILE
          </Badge>
        )}
      </div>

      {/* Identity Card */}
      <div className="bg-white border-hard shadow-hard p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar
            name={student.fullName}
            src={student.avatarUrl}
            size="lg"
          />
          <div className="space-y-1 flex-1">
            <h1 className="text-xl sm:text-2xl font-black font-mono tracking-tight uppercase text-ink">
              {student.fullName}
            </h1>
            <p className="text-xs font-mono font-bold text-ink">
              {student.major} • {student.college}
            </p>
            <p className="text-[11px] font-mono text-ink-muted uppercase">
              {student.experienceLevel} • GRAD {student.gradYear}
            </p>
          </div>
        </div>

        {/* Bio */}
        {student.bio && (
          <div className="p-3 bg-canvas-subtle border-hard">
            <p className="text-xs sm:text-sm font-sans text-ink leading-relaxed">
              {student.bio}
            </p>
          </div>
        )}

        {/* Links */}
        {(student.linkedinUrl || student.githubUrl || student.portfolioUrl) && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-ink/10">
            {student.linkedinUrl && (
              <a
                href={student.linkedinUrl.startsWith("http") ? student.linkedinUrl : `https://${student.linkedinUrl}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 border-hard bg-canvas-subtle hover:bg-white text-xs font-mono font-bold text-ink"
              >
                <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                <span>LINKEDIN</span>
              </a>
            )}
            {student.githubUrl && (
              <a
                href={student.githubUrl.startsWith("http") ? student.githubUrl : `https://${student.githubUrl}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 border-hard bg-canvas-subtle hover:bg-white text-xs font-mono font-bold text-ink"
              >
                <Github className="w-3.5 h-3.5" />
                <span>GITHUB</span>
              </a>
            )}
            {student.portfolioUrl && (
              <a
                href={student.portfolioUrl.startsWith("http") ? student.portfolioUrl : `https://${student.portfolioUrl}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 border-hard bg-canvas-subtle hover:bg-white text-xs font-mono font-bold text-ink"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>PORTFOLIO</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Availability & Working Style */}
      <div className="bg-white border-hard shadow-hard p-5 space-y-3">
        <h2 className="text-xs font-mono font-black uppercase text-ink border-b-2 border-ink pb-2">
          AVAILABILITY & WORKING STYLE
        </h2>

        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 bg-canvas-subtle border-hard flex items-center gap-2">
            <Clock className="w-4 h-4 text-ink" />
            <div>
              <p className="text-[10px] text-ink-muted uppercase">COMMITMENT</p>
              <p className="font-bold text-ink">
                {student.availability?.hoursPerWeek || 10}H / WEEK
              </p>
            </div>
          </div>

          <div className="p-3 bg-canvas-subtle border-hard flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-ink" />
            <div>
              <p className="text-[10px] text-ink-muted uppercase">STYLE</p>
              <p className="font-bold text-ink uppercase">
                {student.workingStyle || "COLLABORATIVE"}
              </p>
            </div>
          </div>
        </div>

        {student.availability?.scheduleWindows && student.availability.scheduleWindows.length > 0 && (
          <div className="pt-2">
            <p className="text-[11px] font-mono font-bold uppercase text-ink-muted mb-1.5">
              ACTIVE TIME WINDOWS
            </p>
            <div className="flex flex-wrap gap-1.5">
              {student.availability.scheduleWindows.map((win, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 border-hard-sm bg-canvas-subtle font-mono text-[11px] uppercase font-bold text-ink"
                >
                  {win.day}: {win.startTime} - {win.endTime}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Skills Matrix */}
      <div className="bg-white border-hard shadow-hard p-5 space-y-3">
        <h2 className="text-xs font-mono font-black uppercase text-ink border-b-2 border-ink pb-2">
          VERIFIED SKILLS ({student.skills?.length || 0})
        </h2>

        <div className="divide-y divide-ink/10">
          {(student.skills || []).map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between py-2 text-xs font-mono"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink">{s.name}</span>
                {s.verified && (
                  <span className="text-[10px] px-1 bg-caca-lime border-hard-sm text-ink font-bold uppercase">
                    VERIFIED
                  </span>
                )}
              </div>
              <span className="font-mono font-black text-ink">
                {s.proficiency} / 5
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Interests */}
      {student.interests && student.interests.length > 0 && (
        <div className="bg-white border-hard shadow-hard p-5 space-y-3">
          <h2 className="text-xs font-mono font-black uppercase text-ink border-b-2 border-ink pb-2">
            INTEREST DOMAINS
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {student.interests.map((int) => (
              <Badge key={int.id} variant="outline" size="sm">
                <Sparkles className="w-3 h-3 mr-1" />
                <span>{int.name}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {studentProjects.length > 0 && (
        <div className="bg-white border-hard shadow-hard p-5 space-y-3">
          <h2 className="text-xs font-mono font-black uppercase text-ink border-b-2 border-ink pb-2">
            ACTIVE PROJECTS ({studentProjects.length})
          </h2>
          <div className="space-y-2">
            {studentProjects.map((p) => (
              <div
                key={p.id}
                className="p-3 border-hard bg-canvas-subtle flex items-center justify-between"
              >
                <div>
                  <p className="font-mono font-black text-xs uppercase text-ink">
                    {p.title}
                  </p>
                  <p className="text-[11px] font-mono text-ink-muted">
                    {p.category} • {p.hoursPerWeek}H/WK
                  </p>
                </div>
                <Link href={`/projects/${p.id}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    VIEW
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
