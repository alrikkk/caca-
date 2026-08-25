"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProfileService, OnboardingData } from "@/services/profile-service";
import { ExperienceLevel, WorkingStyle } from "@/types/user";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Plus, Trash2, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [major, setMajor] = useState("Computer Science");
  const [gradYear, setGradYear] = useState(2027);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("sophomore");
  const [workingStyle, setWorkingStyle] = useState<WorkingStyle>("collaborative");
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState(12);

  const [skills, setSkills] = useState<{ name: string; category: string; proficiency: number }[]>([
    { name: "Python", category: "backend", proficiency: 4 },
    { name: "React", category: "frontend", proficiency: 3 },
  ]);

  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillProf, setNewSkillProf] = useState(4);
  const [loading, setLoading] = useState(false);

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    setSkills([
      ...skills,
      { name: newSkillName.trim(), category: "general", proficiency: newSkillProf },
    ]);
    setNewSkillName("");
  };

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !college.trim()) return;

    setLoading(true);
    try {
      const userId = user?.id || `usr_${Date.now()}`;
      const email = user?.email || "student@university.edu";

      const data: OnboardingData = {
        fullName: fullName.trim(),
        college: college.trim(),
        major: major.trim(),
        gradYear: Number(gradYear),
        experienceLevel,
        workingStyle,
        bio: bio.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
        hoursPerWeek: Number(hoursPerWeek),
        skills,
      };

      const created = await ProfileService.completeOnboarding(userId, email, data);
      setProfile(created);
      router.push("/feed");
    } catch (err) {
      console.error("Onboarding error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4 sm:p-6 bg-grid-subtle">
      <div className="w-full max-w-xl bg-white border-hard shadow-hard-xl p-6 sm:p-8 space-y-6">
        <div className="border-b-2 border-ink pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-mono tracking-tight uppercase text-ink">
              STUDENT ONBOARDING
            </h1>
            <p className="text-xs font-mono text-ink-muted uppercase">
              SETUP YOUR PROFILE FOR COMPATIBILITY MATCHING
            </p>
          </div>
          <Badge variant="lime" size="sm">
            STEP 1 OF 1
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="FULL NAME"
              placeholder="e.g. Jordan Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="COLLEGE / UNIVERSITY"
              placeholder="e.g. Georgia Tech, CMU..."
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="MAJOR"
              placeholder="e.g. Computer Science, EE..."
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              required
            />
            <div className="space-y-1.5">
              <label className="block font-bold uppercase tracking-wider text-ink">
                EXPERIENCE LEVEL
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                className="w-full h-11 px-3 bg-white border-hard uppercase text-ink focus:outline-none"
              >
                <option value="freshman">FRESHMAN</option>
                <option value="sophomore">SOPHOMORE</option>
                <option value="junior">JUNIOR</option>
                <option value="senior">SENIOR</option>
                <option value="grad">GRADUATE</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block font-bold uppercase tracking-wider text-ink">
                WORKING STYLE
              </label>
              <select
                value={workingStyle}
                onChange={(e) => setWorkingStyle(e.target.value as WorkingStyle)}
                className="w-full h-11 px-3 bg-white border-hard uppercase text-ink focus:outline-none"
              >
                <option value="collaborative">COLLABORATIVE</option>
                <option value="structured">STRUCTURED</option>
                <option value="fast-paced">FAST-PACED</option>
                <option value="independent">INDEPENDENT</option>
                <option value="mentor-oriented">MENTOR-ORIENTED</option>
              </select>
            </div>
            <Input
              label="HOURS / WEEK COMMITMENT"
              type="number"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              required
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="block font-bold uppercase tracking-wider text-ink">
              SHORT BIO (OPTIONAL)
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you interested in building or learning?"
              className="w-full p-2.5 bg-canvas-subtle border-hard text-ink focus:outline-none focus:bg-white"
            />
          </div>

          {/* Social Links (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="GITHUB URL (OPTIONAL)"
              placeholder="https://github.com/..."
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
            />
            <Input
              label="PORTFOLIO URL (OPTIONAL)"
              placeholder="https://..."
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
            />
          </div>

          {/* Initial Skills */}
          <div className="space-y-2 pt-2 border-t-2 border-ink">
            <p className="font-bold uppercase text-ink">
              YOUR SKILLS & PROFICIENCY (1-5)
            </p>

            <div className="divide-y divide-ink/10 border-hard bg-canvas-subtle p-3">
              {skills.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5">
                  <span className="font-bold">{s.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-black">{s.proficiency}/5</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(idx)}
                      className="text-ink-muted hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ADD SKILL (E.G. 'TYPESCRIPT', 'PYTORCH')..."
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                className="flex-1 h-9 px-2.5 bg-white border-hard uppercase focus:outline-none"
              />
              <select
                value={newSkillProf}
                onChange={(e) => setNewSkillProf(Number(e.target.value))}
                className="h-9 px-2 bg-white border-hard uppercase focus:outline-none"
              >
                <option value={1}>1/5</option>
                <option value={2}>2/5</option>
                <option value={3}>3/5</option>
                <option value={4}>4/5</option>
                <option value={5}>5/5</option>
              </select>
              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={handleAddSkill}
                className="h-9 px-3 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> ADD
              </Button>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={loading}
              className="flex items-center gap-2"
            >
              <span>COMPLETE PROFILE & ENTER FEED</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
