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
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-ink pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight uppercase text-ink">
            PROFILE
          </h1>
          {isDemoMode && (
            <Badge variant="lime" size="sm">
              DEMO USER
            </Badge>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          className="flex items-center gap-1.5"
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-caca-lime" />
              <span>SAVED</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>SAVE</span>
            </>
          )}
        </Button>
      </div>

      {/* Identity & Avatar Section */}
      <div className="bg-white border-hard shadow-hard p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative group">
            <Avatar
              name={fullName || profile.fullName}
              src={avatarUrl}
              size="lg"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-1 bg-ink text-white hover:bg-caca-coral border-hard transition-colors shadow-hard"
              title="Upload photo"
              aria-label="Upload photo"
            >
              <Camera className="w-3 h-3" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
          </div>

          <div className="space-y-1 flex-1 w-full">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="text-lg font-black font-mono uppercase text-ink bg-transparent border-b border-ink/20 focus:border-ink focus:outline-none w-full"
            />
            <p className="text-xs font-mono font-bold text-ink">
              {profile.major} • {profile.college}
            </p>
            <p className="text-[11px] font-mono text-ink-muted uppercase">
              {profile.experienceLevel} • GRAD {profile.gradYear}
            </p>
          </div>
        </div>

        {/* Compact Avatar Controls */}
        <div className="flex items-center gap-2 pt-1 border-t border-ink/10 text-xs font-mono">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 border-hard bg-canvas-subtle hover:bg-white text-ink text-[11px] font-mono font-bold uppercase transition-colors"
          >
            <Upload className="w-3 h-3" />
            <span>{isUploading ? "UPLOADING..." : "UPLOAD PHOTO"}</span>
          </button>

          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="inline-flex items-center gap-1 px-2 py-1 text-ink-muted hover:text-red-600 text-[11px] font-mono uppercase"
            >
              <X className="w-3 h-3" />
              <span>REMOVE</span>
            </button>
          )}

          {uploadError && (
            <span className="text-red-600 text-[11px] flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {uploadError}
            </span>
          )}
        </div>

        {/* Bio */}
        <div className="space-y-1">
          <label className="text-xs font-mono font-bold uppercase text-ink">
            BIO
          </label>
          <textarea
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Add a bio..."
            className="w-full p-2.5 bg-canvas-subtle border-hard font-mono text-xs text-ink focus:outline-none focus:bg-white"
          />
        </div>

        {/* Social / Portfolio Links */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold uppercase text-ink">
            LINKS
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              label="LINKEDIN"
              placeholder="https://linkedin.com/in/..."
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
            />
            <Input
              label="GITHUB"
              placeholder="https://github.com/..."
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
            />
            <Input
              label="PORTFOLIO"
              placeholder="https://..."
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
            />
          </div>

          {(linkedinUrl || githubUrl || portfolioUrl) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {linkedinUrl && (
                <a
                  href={linkedinUrl.startsWith("http") ? linkedinUrl : `https://${linkedinUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 border-hard bg-canvas-subtle hover:bg-white text-xs font-mono font-bold text-ink"
                >
                  <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                  <span>LINKEDIN</span>
                </a>
              )}
              {githubUrl && (
                <a
                  href={githubUrl.startsWith("http") ? githubUrl : `https://${githubUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 border-hard bg-canvas-subtle hover:bg-white text-xs font-mono font-bold text-ink"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GITHUB</span>
                </a>
              )}
              {portfolioUrl && (
                <a
                  href={portfolioUrl.startsWith("http") ? portfolioUrl : `https://${portfolioUrl}`}
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
      </div>

      {/* Availability & Working Style */}
      <div className="bg-white border-hard shadow-hard p-5 space-y-4">
        <div className="flex items-center justify-between border-b-2 border-ink pb-2">
          <h3 className="text-xs font-mono font-black uppercase text-ink">
            AVAILABILITY & WORKING STYLE
          </h3>
          <span className="font-mono text-xs font-bold text-ink">
            {hoursPerWeek}H / WEEK
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="WEEKLY HOURS"
            type="number"
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(Number(e.target.value))}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ink">
              WORKING STYLE
            </label>
            <select
              value={workingStyle}
              onChange={(e) => setWorkingStyle(e.target.value as WorkingStyle)}
              className="w-full h-11 px-3 bg-white border-hard font-mono text-xs uppercase text-ink focus:outline-none"
            >
              <option value="collaborative">COLLABORATIVE</option>
              <option value="structured">STRUCTURED</option>
              <option value="fast-paced">FAST-PACED</option>
              <option value="independent">INDEPENDENT</option>
              <option value="mentor-oriented">MENTOR-ORIENTED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Skills Matrix */}
      <div className="bg-white border-hard shadow-hard p-5 space-y-3">
        <div className="flex items-center justify-between border-b-2 border-ink pb-2">
          <h3 className="text-xs font-mono font-black uppercase text-ink">
            SKILLS ({skills.length})
          </h3>
        </div>

        <div className="divide-y divide-ink/10">
          {skills.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between py-2 text-xs font-mono"
            >
              <span className="font-bold text-ink">{s.name}</span>
              <div className="flex items-center gap-4">
                <span className="font-mono font-bold text-ink">
                  {s.proficiency} / 5
                </span>
                <button
                  onClick={() => handleRemoveSkill(s.id)}
                  className="text-ink-muted hover:text-red-600"
                  aria-label="Remove skill"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Skill */}
        <div className="pt-2 flex gap-2">
          <input
            type="text"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            placeholder="ADD SKILL..."
            className="flex-1 h-9 px-2.5 border-hard font-mono text-xs uppercase focus:outline-none bg-canvas-subtle"
          />
          <select
            value={newSkillProf}
            onChange={(e) => setNewSkillProf(Number(e.target.value))}
            className="h-9 px-2 border-hard font-mono text-xs uppercase bg-white focus:outline-none"
          >
            <option value={1}>1/5</option>
            <option value={2}>2/5</option>
            <option value={3}>3/5</option>
            <option value={4}>4/5</option>
            <option value={5}>5/5</option>
          </select>
          <Button
            variant="accent"
            size="sm"
            onClick={handleAddSkill}
            className="h-9 px-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> ADD
          </Button>
        </div>
      </div>
    </div>
  );
}
