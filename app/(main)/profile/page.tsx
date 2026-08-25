"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { WorkingStyle, UserSkill } from "@/types/user";
import { ProfileService } from "@/services/profile-service";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Github,
  Globe,
  Linkedin,
  Phone,
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  Camera,
  Upload,
  X,
  AlertCircle,
} from "lucide-react";

export default function ProfilePage() {
  const { profile, setProfile, isDemoMode, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [hoursPerWeek, setHoursPerWeek] = useState(12);
  const [workingStyle, setWorkingStyle] = useState<WorkingStyle>("collaborative");
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [skills, setSkills] = useState<UserSkill[]>([]);

  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillProf, setNewSkillProf] = useState(4);
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setBio(profile.bio || "");
      setPhoneNumber(profile.phoneNumber || "");
      setAvatarUrl(profile.avatarUrl);
      setHoursPerWeek(profile.availability?.hoursPerWeek || 10);
      setWorkingStyle(profile.workingStyle || "collaborative");
      setGithubUrl(profile.githubUrl || "");
      setPortfolioUrl(profile.portfolioUrl || "");
      setLinkedinUrl(profile.linkedinUrl || "");
      setSkills(profile.skills || []);
    }
  }, [profile]);

  if (!profile) {
    return (
      <div className="p-10 border-hard bg-white shadow-hard text-center space-y-4 max-w-md mx-auto">
        <h2 className="text-base font-mono font-black uppercase text-ink">
          NO ACTIVE PROFILE FOUND
        </h2>
        <p className="text-xs font-mono text-ink-muted">
          Complete your student setup to enable compatibility matching.
        </p>
        <Link href="/onboarding">
          <Button variant="primary" size="md" className="w-full">
            <span>START ONBOARDING →</span>
          </Button>
        </Link>
      </div>
    );
  }

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const userId = user?.id || profile.id || `usr_${Date.now()}`;
      const res = await ProfileService.uploadAvatar(userId, file);

      if (res.error) {
        setUploadError(res.error);
      } else if (res.url) {
        setAvatarUrl(res.url);
        const updated = { ...profile, avatarUrl: res.url };
        setProfile(updated);
      }
    } catch (err: any) {
      setUploadError(err?.message || "Failed to upload avatar");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(undefined);
    const updated = { ...profile, avatarUrl: undefined };
    setProfile(updated);
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const newSkill: UserSkill = {
      id: `sk_${Date.now()}`,
      name: newSkillName.trim(),
      category: "general",
      proficiency: newSkillProf,
      yearsExperience: 1.0,
      verified: false,
    };
    setSkills([...skills, newSkill]);
    setNewSkillName("");
  };

  const handleRemoveSkill = (id: string) => {
    setSkills(skills.filter((s) => s.id !== id));
  };

  const handleSave = () => {
    if (!profile) return;
    const updated = {
      ...profile,
      fullName: fullName.trim() || profile.fullName,
      bio: bio.trim() || undefined,
      phoneNumber: phoneNumber.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
      workingStyle,
      githubUrl: githubUrl.trim() || undefined,
      portfolioUrl: portfolioUrl.trim() || undefined,
      linkedinUrl: linkedinUrl.trim() || undefined,
      skills,
      availability: {
        ...profile.availability,
        hoursPerWeek,
      },
    };
    setProfile(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Top Banner */}
      <div className="border-b-2 border-ink pb-3 flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight uppercase text-ink">
          STUDENT PROFILE
        </h1>
        <div className="flex items-center gap-2">
          {isDemoMode && (
            <Badge variant="lime" size="sm">
              DEMO USER (ALEX CHEN)
            </Badge>
          )}
          {isSaved && (
            <div className="flex items-center gap-1 font-mono text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 border-hard-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>SAVED TO DATABASE</span>
            </div>
          )}
        </div>
      </div>

      {/* Identity & Avatar Card */}
      <div className="bg-white border-hard shadow-hard p-5 sm:p-6 space-y-5">
        <h2 className="text-xs font-mono font-black uppercase text-ink border-b-2 border-ink pb-2">
          IDENTITY & PHOTO
        </h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Avatar with Camera Overlay */}
          <div className="relative group">
            <Avatar
              name={fullName || profile.fullName}
              src={avatarUrl}
              size="lg"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute inset-0 bg-ink/50 text-white rounded-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity btn-tactile border-hard cursor-pointer"
              title="Upload avatar photo"
            >
              <Camera className="w-5 h-5 text-caca-lime" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                isLoading={isUploading}
                className="flex items-center gap-1.5 text-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{avatarUrl ? "CHANGE PHOTO" : "UPLOAD PHOTO"}</span>
              </Button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="px-2 py-1 border-hard text-[11px] font-mono font-bold uppercase text-red-600 hover:bg-red-50"
                >
                  REMOVE
                </button>
              )}
            </div>

            <p className="text-[11px] font-mono text-ink-muted">
              {profile.college} • {profile.major} (GRAD {profile.gradYear})
            </p>
          </div>
        </div>

        {uploadError && (
          <div className="p-2.5 bg-red-50 border-hard-sm border-red-500 text-xs font-mono font-bold text-red-600 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Input
            label="FULL NAME"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />

          <Input
            label="PHONE NUMBER (OPTIONAL)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1 (555) 000-0000"
          />
        </div>

        <div className="space-y-1">
          <label className="block font-mono text-xs font-bold uppercase tracking-wider text-ink">
            BIO / STATEMENT
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell squads about your background, passions, and current goals..."
            className="w-full p-3 bg-white border-hard font-mono text-xs text-ink focus:outline-none min-h-[75px]"
          />
        </div>
      </div>

      {/* Verified Skills Matrix */}
      <div className="bg-white border-hard shadow-hard p-5 space-y-4">
        <h2 className="text-xs font-mono font-black uppercase text-ink border-b-2 border-ink pb-2">
          SKILLS & PROFICIENCY ({skills.length})
        </h2>

        {/* Existing skills */}
        <div className="divide-y divide-ink/10">
          {skills.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between py-2 text-xs font-mono"
            >
              <span className="font-bold text-ink">{s.name}</span>
              <div className="flex items-center gap-3">
                <span className="font-black text-ink">{s.proficiency} / 5</span>
                <button
                  onClick={() => handleRemoveSkill(s.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                  aria-label="Remove skill"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Skill */}
        <div className="flex flex-col sm:flex-row items-end gap-2 pt-2 border-t-2 border-ink">
          <div className="flex-1 w-full">
            <Input
              label="NEW SKILL"
              placeholder="e.g. PyTorch, Rust, Solidity"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-28 space-y-1">
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-ink">
              LEVEL (1-5)
            </label>
            <select
              value={newSkillProf}
              onChange={(e) => setNewSkillProf(Number(e.target.value))}
              className="w-full h-11 px-2.5 bg-white border-hard font-mono text-xs text-ink focus:outline-none"
            >
              <option value={1}>1 (Beginner)</option>
              <option value={2}>2 (Learning)</option>
              <option value={3}>3 (Intermediate)</option>
              <option value={4}>4 (Proficient)</option>
              <option value={5}>5 (Expert)</option>
            </select>
          </div>
          <Button
            variant="accent"
            size="md"
            onClick={handleAddSkill}
            className="w-full sm:w-auto h-11 flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>ADD</span>
          </Button>
        </div>
      </div>

      {/* Availability & Style */}
      <div className="bg-white border-hard shadow-hard p-5 space-y-4">
        <h2 className="text-xs font-mono font-black uppercase text-ink border-b-2 border-ink pb-2">
          AVAILABILITY & WORKING STYLE
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-ink">
              WEEKLY HOURS ({hoursPerWeek}H)
            </label>
            <input
              type="range"
              min={5}
              max={40}
              step={1}
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              className="w-full accent-ink cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-ink">
              WORKING STYLE
            </label>
            <select
              value={workingStyle}
              onChange={(e) => setWorkingStyle(e.target.value as WorkingStyle)}
              className="w-full h-11 px-3 bg-white border-hard font-mono text-xs uppercase text-ink focus:outline-none"
            >
              <option value="collaborative">COLLABORATIVE</option>
              <option value="independent">INDEPENDENT</option>
              <option value="structured">STRUCTURED</option>
              <option value="fast-paced">FAST-PACED</option>
              <option value="mentor-oriented">MENTOR-ORIENTED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Social & Portfolio Links */}
      <div className="bg-white border-hard shadow-hard p-5 space-y-4">
        <h2 className="text-xs font-mono font-black uppercase text-ink border-b-2 border-ink pb-2">
          LINKS & SOCIALS
        </h2>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-[#0A66C2] shrink-0" />
            <div className="flex-1">
              <Input
                label="LINKEDIN URL"
                placeholder="https://linkedin.com/in/username"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-ink shrink-0" />
            <div className="flex-1">
              <Input
                label="GITHUB URL"
                placeholder="https://github.com/username"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-ink shrink-0" />
            <div className="flex-1">
              <Input
                label="PORTFOLIO / WEBSITE"
                placeholder="https://yourportfolio.dev"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button Sticky */}
      <div className="sticky bottom-4 z-20">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 shadow-hard-lg"
        >
          <Save className="w-4 h-4" />
          <span>SAVE PROFILE CHANGES</span>
        </Button>
      </div>
    </div>
  );
}
