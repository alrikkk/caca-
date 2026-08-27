"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProjectService } from "@/services/project-service";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { getAIProvider } from "@/ai/mock-provider";
import { ExtractedProjectRequirements } from "@/types/ai";
import { Sparkles, Check, CheckCircle2, Image as ImageIcon } from "lucide-react";

export default function CreateProjectPage() {
  const router = useRouter();
  const { profile, isDemoMode } = useAuth();
  const [description, setDescription] = useState(
    "Building an autonomous underwater robot for environmental water sampling in San Francisco Bay. Need embedded C++ for telemetry, PyTorch ML for real-time algae classification, and full-stack Next.js for lab portal."
  );
  const [isExtracting, setIsExtracting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);
  const [extracted, setExtracted] =
    useState<ExtractedProjectRequirements | null>(null);

  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState("Robotics & IoT");
  const [bannerUrl, setBannerUrl] = useState(
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80"
  );
  const [hoursPerWeek, setHoursPerWeek] = useState(12);
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [maxTeamSize, setMaxTeamSize] = useState(4);

  const handleAIExtract = async () => {
    if (!description.trim()) return;
    setIsExtracting(true);
    try {
      const provider = getAIProvider();
      const result = await provider.extractProjectRequirements(description);
      setExtracted(result);
      setTitle(result.suggestedTitle);
      setTagline(result.tagline);
      setCategory(result.category);
      setDurationWeeks(result.estimatedDurationWeeks);
      setHoursPerWeek(result.recommendedHoursPerWeek);
      setMaxTeamSize(result.recommendedTeamSize);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePublish = async (status: "published" | "draft" = "published") => {
    if (!title.trim() || !description.trim()) return;
    setIsPublishing(true);

    try {
      const res = await ProjectService.createProject(
        {
          title: title.trim(),
          tagline: tagline.trim() || tagline,
          description: description.trim(),
          category: category.trim(),
          bannerUrl: bannerUrl.trim() || undefined,
          hoursPerWeek,
          durationWeeks,
          maxTeamSize,
          status,
          requiredSkills: extracted?.skills.map((s) => ({
            name: s.name,
            requiredProficiency: s.requiredProficiency,
            importance: s.importance as any,
          })) || [],
          missingRoles: extracted?.rolesNeeded || ["Core Engineer"],
        },
        profile,
        isDemoMode
      );

      if (res.success) {
        setPublishedSuccess(true);
        setTimeout(() => {
          router.push("/feed");
        }, 600);
      }
    } catch (err) {
      console.error("Failed to publish project:", err);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="border-b-2 border-ink pb-3">
        <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight uppercase text-ink">
          CREATE PROJECT
        </h1>
      </div>

      {/* Description Prompt */}
      <div className="bg-white border-hard shadow-hard p-5 space-y-3">
        <label className="text-xs font-mono font-black uppercase tracking-wider text-ink">
          PROJECT DESCRIPTION
        </label>

        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your project, tech stack, and roles needed..."
          className="w-full p-3 bg-canvas-subtle border-hard font-mono text-xs text-ink focus:outline-none focus:bg-white transition-all leading-relaxed"
        />

        <div className="flex justify-end">
          <Button
            variant="accent"
            size="md"
            onClick={handleAIExtract}
            isLoading={isExtracting}
          >
            <span>EXTRACT REQUIREMENTS</span>
          </Button>
        </div>
      </div>

      {/* Structured Blueprint */}
      {extracted && (
        <div className="bg-white border-hard shadow-hard-md p-5 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b-2 border-ink pb-2">
            <h2 className="text-xs font-mono font-black uppercase text-ink">
              EXTRACTED SPECIFICATION
            </h2>
            <Badge variant="lime" size="sm">
              READY
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="TITLE"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              label="CATEGORY"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <Input
            label="TAGLINE"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />

          <Input
            label="IMAGE BANNER URL (OPTIONAL)"
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder="https://..."
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="TEAM SIZE"
              type="number"
              value={maxTeamSize}
              onChange={(e) => setMaxTeamSize(Number(e.target.value))}
            />
            <Input
              label="HOURS / WK"
              type="number"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
            />
            <Input
              label="WEEKS"
              type="number"
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(Number(e.target.value))}
            />
          </div>

          {/* Skills Required */}
          <div className="space-y-2 pt-2">
            <p className="text-xs font-mono font-bold uppercase text-ink">
              REQUIRED SKILLS
            </p>
            <div className="divide-y divide-ink/10 border-hard bg-canvas-subtle p-3">
              {extracted.skills.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs font-mono py-1.5"
                >
                  <span className="font-bold text-ink">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.importance === "required" ? "coral" : "outline"} size="sm">
                      {s.importance}
                    </Badge>
                    <span>Lv.{s.requiredProficiency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {publishedSuccess && (
            <div className="p-3 bg-caca-lime border-hard flex items-center gap-2 font-mono text-xs font-bold text-ink uppercase animate-in-fade">
              <CheckCircle2 className="w-4 h-4 text-ink" />
              <span>PROJECT PUBLISHED SUCCESSFULLY ✓ REDIRECTING TO FEED...</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <Button
              variant="outline"
              size="md"
              onClick={() => handlePublish("draft")}
              isLoading={isPublishing}
              disabled={isPublishing || publishedSuccess || !title.trim()}
            >
              <span>SAVE DRAFT</span>
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={() => handlePublish("published")}
              isLoading={isPublishing}
              disabled={isPublishing || publishedSuccess || !title.trim()}
            >
              <span>{publishedSuccess ? "PUBLISHED" : "SHIP / PUBLISH →"}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
