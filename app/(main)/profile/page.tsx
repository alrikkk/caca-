"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { WorkingStyle, UserSkill, ExperienceLevel } from "@/types/user";
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
  Loader2,
  Sparkles,
  FileText,
} from "lucide-react";
import { CameraModal } from "@/components/ui/CameraModal";

export default function ProfilePage() {
  const { profile, setProfile, isDemoMode, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [major, setMajor] = useState("");
  const [gradYear, setGradYear] = useState(2026);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("junior");
  const [bio, setBio] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [resumeUrl, setResumeUrl] = useState<string | undefined>(undefined);
  const [hoursPerWeek, setHoursPerWeek] = useState(12);
  const [workingStyle, setWorkingStyle] = useState<WorkingStyle>("collaborative");
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [openTo, setOpenTo] = useState<string[]>(["HACKATHONS", "STARTUPS"]);
  const [availabilityStatus, setAvailabilityStatus] = useState<"AVAILABLE" | "LIMITED" | "NOT_LOOKING">("AVAILABLE");

  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillProf, setNewSkillProf] = useState(4);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setCollege(profile.college || "");
      setMajor(profile.major || "");
      setGradYear(profile.gradYear || 2026);
      setExperienceLevel(profile.experienceLevel || "junior");
      setBio(profile.bio || "");
      setPhoneNumber(profile.phoneNumber || "");
      setAvatarUrl(profile.avatarUrl);
      setResumeUrl(profile.resumeUrl);
      setHoursPerWeek(profile.availability?.hoursPerWeek || 10);
      setWorkingStyle(profile.workingStyle || "collaborative");
      setGithubUrl(profile.githubUrl || "");
      setPortfolioUrl(profile.portfolioUrl || "");
      setLinkedinUrl(profile.linkedinUrl || "");
      setDiscordUrl(profile.discordUrl || "");
      setInstagramUrl(profile.instagramUrl || "");
      setSkills(profile.skills || []);
      setOpenTo(profile.openTo || ["HACKATHONS", "STARTUPS"]);
      setAvailabilityStatus(profile.availabilityStatus || "AVAILABLE");
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
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const userId = user?.id || profile.id || `usr_${Date.now()}`;
      const res = await ProfileService.uploadAndSaveAvatar(userId, file, isDemoMode);

      if (res.error) {
        setUploadError(res.error);
        setSaveError(res.error);
        setTimeout(() => setSaveError(null), 4000);
      } else if (res.url) {
        setAvatarUrl(res.url);
        const updated = { ...profile, avatarUrl: res.url };
        setProfile(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } catch (err: any) {
      console.error("handleAvatarFileChange error:", err);
      const msg = "Couldn't save changes right now, please try again.";
      setUploadError(msg);
      setSaveError(msg);
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleTakePhotoClick = () => {
    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    ) {
      setIsCameraOpen(true);
    } else if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleCameraCapture = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const userId = user?.id || profile.id || `usr_${Date.now()}`;
      const res = await ProfileService.uploadAndSaveAvatar(userId, file, isDemoMode);

      if (res.error) {
        setUploadError(res.error);
        setSaveError(res.error);
        setTimeout(() => setSaveError(null), 4000);
      } else if (res.url) {
        setAvatarUrl(res.url);
        const updated = { ...profile, avatarUrl: res.url };
        setProfile(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } catch (err: any) {
      console.error("handleCameraCapture error:", err);
      const msg = "Couldn't save changes right now, please try again.";
      setUploadError(msg);
      setSaveError(msg);
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    const userId = user?.id || profile.id;
    if (userId) {
      await ProfileService.removeAvatar(userId, isDemoMode);
    }
    setAvatarUrl(undefined);
    const updated = { ...profile, avatarUrl: undefined };
    setProfile(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleAddSkill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = newSkillName.trim();
    if (!cleanName) return;

    if (skills.some((s) => s.name.toLowerCase() === cleanName.toLowerCase())) {
      setSaveError(`Skill "${cleanName}" is already added.`);
      setTimeout(() => setSaveError(null), 3000);
      return;
    }

    const newSkill: UserSkill = {
      id: `sk_${Date.now()}`,
      name: cleanName,
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

  const handleResumeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setIsUploadingResume(true);
    setUploadError(null);

    const activeId = user?.id || profile.id;
    const res = await ProfileService.uploadResume(activeId, file, isDemoMode);
    setIsUploadingResume(false);

    if (res.error) {
      setUploadError(res.error);
    } else if (res.url) {
      setResumeUrl(res.url);
      setProfile({ ...profile, resumeUrl: res.url });
    }
  };

  const handleRemoveResume = async () => {
    if (!profile) return;
    const activeId = user?.id || profile.id;
    await ProfileService.removeResume(activeId, isDemoMode);
    setResumeUrl(undefined);
    setProfile({ ...profile, resumeUrl: undefined });
  };

  const handleSave = async () => {
    if (!profile || isSaving) return;
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    // Validate LinkedIn URL
    const cleanLinkedin = linkedinUrl.trim();
    if (cleanLinkedin && !cleanLinkedin.startsWith("https://")) {
      setSaveError("LinkedIn URL must start with https://");
      setIsSaving(false);
      return;
    }

    const updated = {
      ...profile,
      fullName: fullName.trim() || profile.fullName,
      college: college.trim() || profile.college,
      major: major.trim() || profile.major,
      gradYear: Number(gradYear),
      experienceLevel,
      bio: bio.trim() || undefined,
      phoneNumber: phoneNumber.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
      resumeUrl: resumeUrl || undefined,
      workingStyle,
      githubUrl: githubUrl.trim() || undefined,
      portfolioUrl: portfolioUrl.trim() || undefined,
      linkedinUrl: cleanLinkedin || undefined,
      discordUrl: discordUrl.trim() || undefined,
      instagramUrl: instagramUrl.trim() || undefined,
      skills,
      openTo,
      availabilityStatus,
      availability: {
        ...profile.availability,
        hoursPerWeek,
      },
    };

    try {
      await ProfileService.updateProfile(updated, isDemoMode);
      setProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error("Profile save exception:", err);
      setSaveError("Couldn't save changes right now, please try again.");
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b-2 border-ink pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight uppercase text-ink">
            PROFILE MATRIX
          </h1>
          <p className="text-xs font-mono text-ink-muted">
            {isDemoMode ? "DEMO MODE (ALEX CHEN)" : profile.email || "STUDENT ACCOUNT"}
          </p>
        </div>
        <Badge variant="lime" size="sm">
          {workingStyle.toUpperCase()}
        </Badge>
      </div>

      {/* Save Notification Toast / Feedback */}
      {saveSuccess && (
        <div className="p-3 bg-caca-lime border-hard shadow-hard flex items-center gap-2 font-mono text-xs font-bold text-ink uppercase animate-in-fade">
          <CheckCircle2 className="w-4 h-4 text-ink shrink-0" />
          <span>PROFILE SAVED ✓</span>
        </div>
      )}

      {saveError && (
        <div className="p-3 bg-red-50 border-hard-sm border-red-500 shadow-hard flex items-center gap-2 font-mono text-xs font-bold text-red-600 uppercase animate-in-fade">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Profile Completeness Card */}
      {(() => {
        const items = [
          { label: "Full Name", complete: Boolean(fullName.trim()) },
          { label: "College & Major", complete: Boolean(college.trim() && major.trim()) },
          { label: "Bio / Intro", complete: Boolean(bio.trim()) },
          { label: "Skills (1+)", complete: skills.length > 0 },
          { label: "Avatar Photo", complete: Boolean(avatarUrl) },
          { label: "LinkedIn / Web", complete: Boolean(linkedinUrl.trim() || portfolioUrl.trim() || githubUrl.trim()) },
        ];
        const count = items.filter((i) => i.complete).length;
        const pct = Math.round((count / items.length) * 100);

        return (
          <div className="bg-canvas-subtle border-hard p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-ink-muted uppercase font-bold">PROFILE READINESS</span>
                <p className="font-mono font-black text-sm text-ink uppercase">
                  PROFILE {pct}% COMPLETE
                </p>
              </div>
              <Badge variant={pct >= 80 ? "lime" : "default"} size="sm">
                {pct >= 80 ? "OPTIMIZED" : `${items.length - count} SUGGESTED`}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
              {items.map((item) => (
                <div
                  key={item.label}
                  className={`px-2 py-1 border-hard-sm text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 ${
                    item.complete ? "bg-white text-ink" : "bg-transparent text-ink-muted border-dashed"
                  }`}
                >
                  <span>{item.complete ? "✓" : "○"}</span>
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Main Info Card */}
      <div className="bg-white border-hard shadow-hard p-5 sm:p-6 space-y-6">
        {/* Avatar Upload / PFP */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pb-4 border-b border-ink/10">
          <div className="relative group">
            <Avatar name={fullName || "Student"} src={avatarUrl} size="lg" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute inset-0 bg-ink/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-hard cursor-pointer"
              title="Change Avatar"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <h3 className="font-mono font-bold text-xs uppercase text-ink">
              PROFILE PICTURE
            </h3>
            <p className="text-[11px] font-mono text-ink-muted">
              JPG, PNG or WEBP (Max 5MB).
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-xs h-7"
              >
                <Upload className="w-3 h-3 mr-1" />
                <span>{isUploading ? "UPLOADING..." : "UPLOAD PHOTO"}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTakePhotoClick}
                disabled={isUploading}
                className="text-xs h-7"
              >
                <Camera className="w-3 h-3 mr-1" />
                <span>TAKE PHOTO</span>
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={isUploading}
                  className="text-xs h-7 text-red-600 hover:bg-red-50"
                >
                  <X className="w-3 h-3 mr-1" />
                  <span>REMOVE</span>
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
            {uploadError && (
              <p className="text-[10px] font-mono text-red-600 uppercase font-bold">
                {uploadError}
              </p>
            )}
          </div>
        </div>

        {/* Identity Information */}
        <div className="space-y-4">
          <Input
            label="FULL NAME"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Alex Chen"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="COLLEGE / UNIVERSITY"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              placeholder="Stanford University"
              required
            />

            <Input
              label="MAJOR / FIELD OF STUDY"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              placeholder="Computer Science"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-mono font-bold uppercase text-ink">
                EXPERIENCE LEVEL
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                className="w-full h-10 px-3 bg-white border-hard font-mono text-xs uppercase text-ink shadow-hard-sm focus:outline-none"
              >
                <option value="freshman">Freshman</option>
                <option value="sophomore">Sophomore</option>
                <option value="junior">Junior</option>
                <option value="senior">Senior</option>
                <option value="master">Master</option>
                <option value="phd">PhD</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-mono font-bold uppercase text-ink">
                GRADUATION YEAR
              </label>
              <input
                type="number"
                value={gradYear}
                onChange={(e) => setGradYear(Number(e.target.value))}
                className="w-full h-10 px-3 bg-white border-hard font-mono text-xs text-ink shadow-hard-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-mono font-bold uppercase text-ink">
              STUDENT BIO
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you building or researching?"
              className="w-full p-2.5 bg-white border-hard font-mono text-xs text-ink shadow-hard-sm focus:outline-none resize-none"
            />
          </div>

          <Input
            label="PHONE NUMBER (OPTIONAL CONTACT)"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1 (555) 000-0000"
          />
        </div>

        {/* Custom Skills Section */}
        <div className="space-y-3 pt-2 border-t border-ink/10">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono font-bold uppercase text-ink">
              SKILLS & PROFICIENCIES ({skills.length})
            </label>
            <span className="text-[10px] font-mono text-ink-muted">
              ENTER ANY CUSTOM SKILL
            </span>
          </div>

          {/* Add custom skill input */}
          <div className="p-3 bg-canvas-subtle border-hard space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="TYPE SKILL (e.g. Rust, PyTorch, Figma...)"
                className="flex-1 h-9 px-3 bg-white border-hard font-mono text-xs uppercase text-ink shadow-hard-sm focus:outline-none"
              />
              <div className="flex gap-2">
                <select
                  value={newSkillProf}
                  onChange={(e) => setNewSkillProf(Number(e.target.value))}
                  className="h-9 px-2 bg-white border-hard font-mono text-xs uppercase text-ink shadow-hard-sm focus:outline-none"
                >
                  <option value={1}>1 (Beginner)</option>
                  <option value={2}>2 (Novice)</option>
                  <option value={3}>3 (Intermediate)</option>
                  <option value={4}>4 (Proficient)</option>
                  <option value={5}>5 (Expert)</option>
                </select>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleAddSkill}
                  className="h-9 text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADD</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Skills pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {skills.map((sk) => (
              <span
                key={sk.id || sk.name}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border-hard shadow-hard-sm font-mono text-xs font-bold uppercase text-ink group"
              >
                <span>{sk.name}</span>
                <span className="bg-caca-lime px-1 py-0.2 text-[10px] border-hard-sm">
                  {sk.proficiency}/5
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(sk.id)}
                  className="text-ink-muted hover:text-red-600 transition-colors ml-0.5"
                  title="Remove Skill"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {skills.length === 0 && (
              <p className="text-xs font-mono text-ink-muted">
                No skills added yet. Add your tech stack above.
              </p>
            )}
          </div>
        </div>

        {/* PDF Resume */}
        <div className="space-y-3 pt-2 border-t border-ink/10">
          <label className="block text-xs font-mono font-bold uppercase text-ink flex items-center justify-between">
            <span>STUDENT RESUME (PDF)</span>
            {resumeUrl && (
              <span className="text-[10px] text-caca-blue font-mono font-bold">PDF ATTACHED ✓</span>
            )}
          </label>

          <input
            type="file"
            ref={resumeInputRef}
            onChange={handleResumeFileChange}
            accept=".pdf,application/pdf"
            className="hidden"
          />

          <div className="p-3.5 bg-canvas-subtle border-hard flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white border-hard text-ink shrink-0">
                <FileText className="w-4 h-4 text-ink" />
              </div>
              <div>
                <p className="font-bold text-ink uppercase">
                  {resumeUrl ? "STUDENT_RESUME.PDF" : "NO RESUME ATTACHED"}
                </p>
                <span className="text-[10px] text-ink-muted">
                  {resumeUrl ? "Attached to public profile (Max 5MB)" : "Upload PDF for squad leads & hackathon partners"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => resumeInputRef.current?.click()}
                isLoading={isUploadingResume}
                className="text-xs h-7"
              >
                <span>{resumeUrl ? "REPLACE RESUME" : "UPLOAD PDF RESUME"}</span>
              </Button>

              {resumeUrl && (
                <button
                  type="button"
                  onClick={handleRemoveResume}
                  className="p-1.5 border-hard bg-white hover:bg-red-50 text-red-600 text-xs"
                  title="Remove Resume"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="space-y-3 pt-2 border-t border-ink/10">
          <label className="block text-xs font-mono font-bold uppercase text-ink">
            PUBLIC SOCIALS & PORTFOLIO
          </label>

          <Input
            label="LINKEDIN URL (HTTPS)"
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/username"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="GITHUB URL"
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username"
            />

            <Input
              label="PORTFOLIO / WEBSITE"
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://myportfolio.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="DISCORD HANDLE"
              type="text"
              value={discordUrl}
              onChange={(e) => setDiscordUrl(e.target.value)}
              placeholder="username#1234 or @username"
            />

            <Input
              label="INSTAGRAM URL / HANDLE"
              type="text"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/username"
            />
          </div>
        </div>

        {/* Availability & Working Style */}
        <div className="space-y-4 pt-2 border-t border-ink/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-mono font-bold uppercase text-ink">
                HOURS PER WEEK: {hoursPerWeek}H
              </label>
              <input
                type="range"
                min={5}
                max={40}
                step={5}
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                className="w-full accent-ink cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-mono font-bold uppercase text-ink">
                WORKING STYLE
              </label>
              <select
                value={workingStyle}
                onChange={(e) => setWorkingStyle(e.target.value as WorkingStyle)}
                className="w-full h-10 px-3 bg-white border-hard font-mono text-xs uppercase text-ink shadow-hard-sm focus:outline-none"
              >
                <option value="collaborative">Collaborative</option>
                <option value="independent">Independent</option>
                <option value="structured">Structured</option>
                <option value="mentor-oriented">Mentor-Oriented</option>
              </select>
            </div>
          </div>
        </div>

        {/* Discovery & Opportunities Intent */}
        <div className="space-y-4 pt-2 border-t border-ink/10">
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase text-ink">
              CURRENT AVAILABILITY STATUS
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: "AVAILABLE", label: "● AVAILABLE FOR TEAMS", desc: "Actively seeking squads & projects" },
                { id: "LIMITED", label: "◐ LIMITED BANDWIDTH", desc: "Open to lightweight contributions" },
                { id: "NOT_LOOKING", label: "○ NOT CURRENTLY LOOKING", desc: "Focused on current commitments" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAvailabilityStatus(opt.id as any)}
                  className={`p-2.5 border-hard text-left transition-all ${
                    availabilityStatus === opt.id
                      ? "bg-caca-lime text-ink shadow-hard-sm"
                      : "bg-white hover:bg-canvas-subtle text-ink"
                  }`}
                >
                  <p className="font-mono font-black text-xs uppercase">{opt.label}</p>
                  <p className="font-mono text-[10px] text-ink-muted leading-tight mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase text-ink">
              OPEN TO (DISCOVERY TAGS)
            </label>
            <div className="flex flex-wrap gap-2">
              {["HACKATHONS", "STARTUPS", "RESEARCH", "SIDE PROJECTS", "INTERNSHIPS"].map((tag) => {
                const isSelected = openTo.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setOpenTo(openTo.filter((t) => t !== tag));
                      } else {
                        setOpenTo([...openTo, tag]);
                      }
                    }}
                    className={`px-3 py-1.5 border-hard text-xs font-mono font-bold uppercase transition-all ${
                      isSelected
                        ? "bg-ink text-caca-lime shadow-hard-sm"
                        : "bg-white hover:bg-canvas-subtle text-ink"
                    }`}
                  >
                    {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-3 border-t-2 border-ink">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 text-sm"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "SAVING CHANGES..." : "SAVE PROFILE CHANGES"}</span>
          </Button>
        </div>
      </div>

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
}
