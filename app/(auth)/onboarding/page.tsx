"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProfileService, OnboardingData } from "@/services/profile-service";
import { ExperienceLevel, WorkingStyle } from "@/types/user";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Plus, Trash2, ArrowRight, Camera, Upload, X } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [major, setMajor] = useState("Computer Science");
  const [gradYear, setGradYear] = useState(2027);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("sophomore");
  const [workingStyle, setWorkingStyle] = useState<WorkingStyle>("collaborative");
  const [bio, setBio] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [linkedinUrl, setLinkedinUrl] = useState("");
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const tempId = user?.id || `usr_${Date.now()}`;
      const res = await ProfileService.uploadAvatar(tempId, file);
      if (res.url) {
        setAvatarUrl(res.url);
      }
    } catch {
      // Ignored
    } finally {
      setUploadingAvatar(false);
    }
  };

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
        phoneNumber: phoneNumber.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
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
          {/* Avatar Selector */}
          <div className="p-3.5 bg-canvas-subtle border-hard flex items-center gap-4">
            <Avatar name={fullName || "Student"} src={avatarUrl} size="md" />
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-2.5 py-1 border-hard bg-white hover:bg-ink hover:text-white font-mono text-[11px] font-bold uppercase transition-colors"
                >
                  {uploadingAvatar ? "UPLOADING..." : "UPLOAD PHOTO"}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(undefined)}
                    className="p-1 text-ink-muted hover:text-red-600"
                    title="Remove avatar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-ink-muted uppercase">
                OPTIONAL • JPG, PNG, WEBP (MAX 5MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

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
            <Input
              label="PHONE NUMBER (OPTIONAL)"
              placeholder="+1 (555) 000-0000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

          <Input
            label="LINKEDIN URL (OPTIONAL)"
            placeholder="https://linkedin.com/in/username"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block font-bold uppercase tracking-wider text-ink">
              SHORT BIO / OBJECTIVE
            </label>
            <textarea
              placeholder="What are your primary technical interests or hackathon goals?"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 bg-white border-hard text-xs focus:outline-none min-h-[60px]"
            />
          </div>

          {/* Skills Section */}
          <div className="space-y-2 pt-2 border-t border-ink/20">
            <label className="block font-bold uppercase tracking-wider text-ink">
              TECHNICAL SKILLS ({skills.length})
            </label>

            <div className="flex flex-wrap gap-1.5">
              {skills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-canvas-subtle border-hard-sm flex items-center gap-1.5 text-[11px]"
                >
                  <span className="font-bold">{s.name}</span>
                  <span className="text-ink-muted">({s.proficiency}/5)</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(idx)}
                    className="text-red-500 hover:text-red-700 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 items-end pt-1">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Add skill (e.g. Next.js, Rust)"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  className="w-full h-10 px-3 bg-white border-hard uppercase text-ink focus:outline-none"
                />
              </div>
              <select
                value={newSkillProf}
                onChange={(e) => setNewSkillProf(Number(e.target.value))}
                className="w-24 h-10 px-2 bg-white border-hard font-mono text-xs focus:outline-none"
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
                className="h-10 text-xs"
              >
                +
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-4 flex items-center justify-center gap-2"
            isLoading={loading}
            disabled={loading || !fullName.trim() || !college.trim()}
          >
            <span>ENTER DISCOVERY FEED</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
