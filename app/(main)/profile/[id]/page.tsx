"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { StudentProfile } from "@/types/user";
import { ProfileService } from "@/services/profile-service";
import { TeamService, TeamRecord } from "@/services/team-service";
import { InvitationService } from "@/services/invitation-service";
import { SocialService } from "@/services/social-service";
import { MOCK_PROJECTS } from "@/lib/mock-data";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  ArrowLeft,
  Github,
  Globe,
  Linkedin,
  Clock,
  Briefcase,
  Sparkles,
  UserPlus,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  FileText,
  Instagram,
  Users,
} from "lucide-react";

export default function StudentProfileDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const { profile: activeUser, isDemoMode } = useAuth();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userTeams, setUserTeams] = useState<TeamRecord[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followersCount: 24, followingCount: 16 });

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [inviteRoleTitle, setInviteRoleTitle] = useState<string>("Squad Specialist");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const fetchStudent = async () => {
      setLoading(true);
      try {
        const data = await ProfileService.getProfileById(userId);
        setStudent(data);

        if (activeUser?.id) {
          const following = SocialService.isFollowing(activeUser.id, userId);
          setIsFollowing(following);
          const connected = SocialService.isConnected(activeUser.id, userId);
          setIsConnected(connected);
        }

        const counts = await SocialService.getFollowCounts(userId);
        setFollowCounts({
          followersCount: data?.followersCount || counts.followersCount,
          followingCount: data?.followingCount || counts.followingCount,
        });
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [userId, activeUser?.id]);

  useEffect(() => {
    const loadTeams = async () => {
      if (activeUser?.id) {
        const teams = await TeamService.getMyTeams(activeUser.id);
        setUserTeams(teams);
        if (teams.length > 0) {
          setSelectedTeamId(teams[0].id);
        }
      }
    };
    loadTeams();
  }, [activeUser?.id]);

  const handleSendInvite = async () => {
    if (!student || !activeUser || !selectedTeamId) return;

    const chosenTeam = userTeams.find((t) => t.id === selectedTeamId);
    if (!chosenTeam) return;

    setIsInviting(true);
    setInviteFeedback(null);

    const res = await InvitationService.sendInvitation({
      teamId: chosenTeam.id,
      teamName: chosenTeam.name,
      projectId: chosenTeam.projectId,
      projectName: chosenTeam.projectName,
      inviterId: activeUser.id,
      inviterName: activeUser.fullName,
      inviteeId: student.id,
      inviteeName: student.fullName,
      roleTitle: inviteRoleTitle.trim() || "Squad Specialist",
    });

    setIsInviting(false);

    if (res.success) {
      setInviteFeedback({
        type: "success",
        message: `Invitation sent to ${student.fullName}! ✓`,
      });
    } else {
      setInviteFeedback({
        type: "error",
        message: res.error || "Failed to send invitation.",
      });
    }
  };

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

  const handleToggleFollow = async () => {
    if (!activeUser) {
      window.location.href = "/login";
      return;
    }
    if (isOwnProfile) return;

    const previous = isFollowing;
    setIsFollowing(!previous);
    setFollowCounts((prev) => ({
      ...prev,
      followersCount: previous ? Math.max(0, prev.followersCount - 1) : prev.followersCount + 1,
    }));

    if (previous) {
      await SocialService.unfollowUser(activeUser.id, student.id, isDemoMode);
    } else {
      await SocialService.followUser(activeUser.id, student.id, isDemoMode);
    }
  };

  const handleToggleConnect = async () => {
    if (!activeUser) {
      window.location.href = "/login";
      return;
    }
    if (isOwnProfile) return;

    const previous = isConnected;
    setIsConnected(!previous);

    if (previous) {
      await SocialService.disconnectUser(activeUser.id, student.id, isDemoMode);
    } else {
      await SocialService.connectUser(activeUser.id, student.id, isDemoMode);
    }
  };

  const isMockStudent = student.id.startsWith("usr_");
  const studentProjects = MOCK_PROJECTS.filter((p) => p.ownerId === student.id);
  const isOwnProfile = activeUser?.id === student.id;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-ink pb-3 gap-3">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase text-ink hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO DISCOVERY</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {isMockStudent && (
            <Badge variant="lime" size="sm">
              DEMO PROFILE
            </Badge>
          )}

          {!isOwnProfile && (
            <>
              {/* Separate Connect Action */}
              <Button
                variant={isConnected ? "outline" : "primary"}
                size="sm"
                onClick={handleToggleConnect}
                className="h-8 text-xs font-mono font-bold uppercase flex items-center gap-1 shadow-hard-sm"
              >
                {isConnected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-caca-green" />
                    <span>CONNECTED</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>CONNECT</span>
                  </>
                )}
              </Button>

              {/* Separate Follow Action */}
              <Button
                variant={isFollowing ? "outline" : "accent"}
                size="sm"
                onClick={handleToggleFollow}
                className="h-8 text-xs font-mono font-bold uppercase flex items-center gap-1 shadow-hard-sm"
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-caca-blue" />
                    <span>FOLLOWING</span>
                  </>
                ) : (
                  <>
                    <Users className="w-3.5 h-3.5" />
                    <span>FOLLOW</span>
                  </>
                )}
              </Button>

              {/* Message Action */}
              <Link href={`/chat?recipient=${student.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-mono font-bold uppercase flex items-center gap-1 shadow-hard-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>MESSAGE</span>
                </Button>
              </Link>

              {/* Invite Action */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsInviteModalOpen(true);
                  setInviteFeedback(null);
                }}
                className="h-8 text-xs font-mono font-bold uppercase flex items-center gap-1 shadow-hard-sm bg-caca-lime text-ink hover:bg-[#c8ea17]"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>INVITE</span>
              </Button>
            </>
          )}
        </div>
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
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black font-mono tracking-tight uppercase text-ink">
                {student.fullName}
              </h1>
              {student.availabilityStatus && (
                <span className="px-2 py-0.5 bg-caca-lime border-hard-sm text-[10px] font-mono font-bold uppercase text-ink">
                  ● {student.availabilityStatus.replace("_", " ")}
                </span>
              )}
            </div>
            <p className="text-xs font-mono font-bold text-ink">
              {student.major} • {student.college}
            </p>
            <p className="text-[11px] font-mono text-ink-muted uppercase">
              {student.experienceLevel} • GRAD {student.gradYear} • {followCounts.followersCount} FOLLOWERS • {followCounts.followingCount} FOLLOWING
            </p>

            {student.openTo && student.openTo.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1.5">
                <span className="text-[10px] font-mono text-ink-muted font-bold self-center mr-1">OPEN TO:</span>
                {student.openTo.map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 bg-canvas-subtle border-hard-sm text-[10px] font-mono font-bold uppercase text-ink"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
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

        {/* Links & Resume */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-ink/10">
          {student.resumeUrl && (
            <a
              href={student.resumeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 border-hard bg-caca-lime/20 hover:bg-caca-lime text-xs font-mono font-bold text-ink"
            >
              <FileText className="w-3.5 h-3.5 text-ink" />
              <span>VIEW RESUME (PDF)</span>
            </a>
          )}
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
          {student.discordUrl && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border-hard bg-canvas-subtle text-xs font-mono font-bold text-ink">
              <span>DISCORD: {student.discordUrl}</span>
            </span>
          )}
          {student.instagramUrl && (
            <a
              href={student.instagramUrl.startsWith("http") ? student.instagramUrl : `https://instagram.com/${student.instagramUrl}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 border-hard bg-canvas-subtle hover:bg-white text-xs font-mono font-bold text-ink"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-600" />
              <span>INSTAGRAM</span>
            </a>
          )}
        </div>
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

        {student.skills && student.skills.length > 0 ? (
          <div className="divide-y divide-ink/10">
            {student.skills.map((s) => (
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
        ) : (
          <div className="p-4 bg-canvas-subtle border-hard text-center">
            <p className="text-xs font-mono text-ink-muted uppercase">
              NO VERIFIED SKILLS LISTED YET
            </p>
          </div>
        )}
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

      {/* Invite to Squad Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title={`INVITE ${student.fullName.toUpperCase()} TO SQUAD`}
        className="max-w-md"
      >
        <div className="space-y-4 font-mono text-xs">
          {userTeams.length > 0 ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block font-bold uppercase text-ink">
                  SELECT SQUAD
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full h-10 px-3 bg-white border-hard font-mono text-xs uppercase text-ink focus:outline-none shadow-hard-sm cursor-pointer"
                  required
                >
                  {userTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.projectName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold uppercase text-ink">
                  TARGET ROLE TITLE
                </label>
                <Input
                  value={inviteRoleTitle}
                  onChange={(e) => setInviteRoleTitle(e.target.value)}
                  placeholder="e.g. Lead Frontend Architect, ML Lead"
                  required
                />
              </div>

              {inviteFeedback && (
                <div
                  className={`p-2.5 border-hard font-bold uppercase ${
                    inviteFeedback.type === "success"
                      ? "bg-caca-lime text-ink"
                      : "bg-red-50 text-red-600 border-red-500"
                  }`}
                >
                  {inviteFeedback.message}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInviteModalOpen(false)}
                >
                  CANCEL
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSendInvite}
                  isLoading={isInviting}
                  disabled={isInviting || !inviteRoleTitle.trim()}
                >
                  SEND INVITATION
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center space-y-3">
              <p className="text-ink font-bold">You don&apos;t have any active squads yet.</p>
              <p className="text-[11px] text-ink-muted">
                Create a squad for your project first, then invite candidates to join.
              </p>
              <Link href="/teams">
                <Button variant="accent" size="sm">
                  GO TO SQUADS →
                </Button>
              </Link>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
