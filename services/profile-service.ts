import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { StudentProfile, UserSkill, Availability, WorkingStyle, ExperienceLevel, TimeWindow, Interest } from "@/types/user";
import { CURRENT_USER, MOCK_STUDENTS } from "@/lib/mock-data";

const LOCAL_STORAGE_PROFILE_KEY = "caca_active_profile";
const LOCAL_STORAGE_DEMO_KEY = "caca_is_demo_mode";

export interface OnboardingData {
  fullName: string;
  college: string;
  major: string;
  gradYear: number;
  experienceLevel: ExperienceLevel;
  workingStyle: WorkingStyle;
  bio?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  discordUrl?: string;
  instagramUrl?: string;
  resumeUrl?: string;
  hoursPerWeek: number;
  skills: { name: string; category: string; proficiency: number }[];
  interests?: { name: string; category: string }[];
  openTo?: string[];
  availabilityStatus?: "AVAILABLE" | "LIMITED" | "NOT_LOOKING";
}

interface UserSkillJoinRow {
  proficiency: number;
  years_experience: number;
  verified: boolean;
  skills: { id: string; name: string; category: string } | null;
}

interface UserInterestJoinRow {
  interests: { id: string; name: string; category: string } | null;
}

interface AvailabilityJoinRow {
  hours_per_week?: number | null;
  timezone?: string | null;
  prefers_remote?: boolean | null;
  weekend_availability?: boolean | null;
  weekday_evenings?: boolean | null;
  schedule_windows?: TimeWindow[] | null;
}

interface SearchProfileJoinRow {
  id: string;
  full_name: string;
  headline: string | null;
  college: string;
  major: string;
  grad_year: number;
  experience_level: "freshman" | "sophomore" | "junior" | "senior" | "grad" | "alumni";
  working_style: "collaborative" | "independent" | "mentor_seeking" | "mentor_offering" | null;
  bio: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  open_to: string[] | null;
  availability_status: "AVAILABLE" | "LIMITED" | "NOT_LOOKING" | null;
  user_skills: Array<{
    proficiency: number;
    skills: { name: string } | null;
  }> | null;
}

export class ProfileService {
  /**
   * Calculates profile completeness score, tier, and recommendations
   */
  static calculateCompleteness(profile?: StudentProfile | null): {
    score: number;
    tier: "BASIC" | "DEVELOPING" | "HIGH QUALITY" | "COMPLETE";
    missingRecommendations: string[];
  } {
    if (!profile) {
      return {
        score: 0,
        tier: "BASIC",
        missingRecommendations: [
          "Add full name & major",
          "Upload avatar",
          "List at least 3 skills",
          "Set weekly availability",
        ],
      };
    }

    let score = 0;
    const missing: string[] = [];

    if (profile.fullName?.trim()) score += 15;
    else missing.push("Add your full name");

    if (profile.avatarUrl) score += 15;
    else missing.push("Upload a profile picture");

    if (profile.major?.trim() && profile.college?.trim()) score += 15;
    else missing.push("Specify college and major");

    if (profile.bio && profile.bio.trim().length > 10) score += 15;
    else missing.push("Write a short bio");

    if (profile.skills && profile.skills.length >= 3) score += 20;
    else if (profile.skills && profile.skills.length > 0) {
      score += 10;
      missing.push("Add at least 3 verified skills");
    } else {
      missing.push("Add your skills matrix");
    }

    if (profile.availability && profile.availability.hoursPerWeek > 0) score += 10;
    else missing.push("Set weekly availability");

    if (profile.githubUrl || profile.linkedinUrl || profile.portfolioUrl || profile.resumeUrl) score += 10;
    else missing.push("Link GitHub, LinkedIn or upload a Resume");

    let tier: "BASIC" | "DEVELOPING" | "HIGH QUALITY" | "COMPLETE" = "BASIC";
    if (score >= 85) tier = "COMPLETE";
    else if (score >= 70) tier = "HIGH QUALITY";
    else if (score >= 40) tier = "DEVELOPING";

    return {
      score,
      tier,
      missingRecommendations: missing,
    };
  }

  /**
   * Fetches the current user profile from Supabase with full relational joins
   */
  static async getCurrentProfile(userId?: string): Promise<StudentProfile | null> {
    if (typeof window !== "undefined") {
      const isDemo =
        localStorage.getItem(LOCAL_STORAGE_DEMO_KEY) === "true" &&
        document.cookie.includes("caca_demo_mode=true");
      if (isDemo) return CURRENT_USER;
    }

    if (!userId || !isSupabaseConfigured()) {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch (err) {
            console.error("ProfileService.getCurrentProfile (local parse) failed:", err);
            return null;
          }
        }
      }
      return null;
    }

    try {
      const supabase = createClient();
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select(`
          *,
          user_skills (
            proficiency,
            years_experience,
            verified,
            skills ( id, name, category )
          ),
          user_interests (
            interests ( id, name, category )
          ),
          availability (
            hours_per_week,
            timezone,
            prefers_remote,
            weekend_availability,
            weekday_evenings,
            schedule_windows
          )
        `)
        .eq("id", userId)
        .maybeSingle();

      if (error || !profileData) {
        if (error) {
          console.error("ProfileService.getCurrentProfile query error:", error);
        }
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
          if (stored) {
            try {
              return JSON.parse(stored);
            } catch (err) {
              console.error("ProfileService.getCurrentProfile fallback parse failed:", err);
            }
          }
        }
        return null;
      }

      const skills: UserSkill[] = ((profileData.user_skills as unknown as UserSkillJoinRow[]) || []).map((us) => ({
        id: us.skills?.id || `sk_${Math.random().toString(36).substring(2, 8)}`,
        name: us.skills?.name || "Skill",
        category: us.skills?.category || "general",
        proficiency: us.proficiency,
        yearsExperience: Number(us.years_experience || 0),
        verified: Boolean(us.verified),
      }));

      const interests = ((profileData.user_interests as unknown as UserInterestJoinRow[]) || []).map((ui) => ({
        id: ui.interests?.id || `int_${Math.random().toString(36).substring(2, 8)}`,
        name: ui.interests?.name || "Interest",
        category: ui.interests?.category || "general",
      }));

      const rawAvail = (profileData.availability as unknown as AvailabilityJoinRow[])?.[0];
      const avail: Availability = rawAvail
        ? {
            hoursPerWeek: rawAvail.hours_per_week ?? 10,
            timezone: rawAvail.timezone ?? "UTC",
            prefersRemote: Boolean(rawAvail.prefers_remote ?? true),
            weekendAvailability: Boolean(rawAvail.weekend_availability ?? true),
            weekdayEvenings: Boolean(rawAvail.weekday_evenings ?? true),
            scheduleWindows: rawAvail.schedule_windows || [],
          }
        : {
            hoursPerWeek: 10,
            timezone: "UTC",
            prefersRemote: true,
            weekendAvailability: true,
            weekdayEvenings: true,
            scheduleWindows: [],
          };

      const mappedProfile: StudentProfile = {
        id: profileData.id,
        email: profileData.email,
        fullName: profileData.full_name,
        headline: profileData.headline || undefined,
        college: profileData.college,
        major: profileData.major,
        gradYear: profileData.grad_year,
        experienceLevel: profileData.experience_level,
        workingStyle: profileData.working_style || "collaborative",
        bio: profileData.bio || undefined,
        phoneNumber: profileData.phone_number || undefined,
        avatarUrl: profileData.avatar_url || undefined,
        githubUrl: profileData.github_url || undefined,
        portfolioUrl: profileData.portfolio_url || undefined,
        linkedinUrl: profileData.linkedin_url || undefined,
        discordUrl: (profileData as any).discord_url || (profileData as any).discord_handle || undefined,
        instagramUrl: (profileData as any).instagram_url || (profileData as any).instagram_handle || undefined,
        resumeUrl: (profileData as any).resume_url || undefined,
        skills,
        interests,
        availability: avail,
        openTo: profileData.open_to || ["HACKATHONS", "STARTUPS"],
        availabilityStatus: profileData.availability_status || "AVAILABLE",
      };

      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(mappedProfile));
      }

      return mappedProfile;
    } catch (err) {
      console.error("getCurrentProfile error:", err);
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
        if (stored) return JSON.parse(stored);
      }
      return null;
    }
  }

  /**
   * Fetches any student profile by ID without exposing private fields
   */
  static async getProfileById(userId: string): Promise<StudentProfile | null> {
    const mockMatch = MOCK_STUDENTS.find((s) => s.id === userId);
    if (mockMatch) {
      return {
        ...mockMatch,
        email: "",
        phoneNumber: undefined,
      };
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.id === userId) {
            return {
              ...parsed,
              email: "",
              phoneNumber: undefined,
            };
          }
        } catch (err) {
          console.error("ProfileService.getProfileById (local parse) failed:", err);
        }
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            headline,
            college,
            major,
            grad_year,
            experience_level,
            working_style,
            bio,
            avatar_url,
            github_url,
            portfolio_url,
            linkedin_url,
            discord_url,
            instagram_url,
            discord_handle,
            instagram_handle,
            resume_url,
            open_to,
            availability_status,
            user_skills (
              proficiency,
              years_experience,
              verified,
              skills ( id, name, category )
            ),
            user_interests (
              interests ( id, name, category )
            ),
            availability (
              hours_per_week,
              timezone,
              prefers_remote,
              weekend_availability,
              weekday_evenings,
              schedule_windows
            )
          `)
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.error("ProfileService.getProfileById query error:", error);
        } else if (profileData) {
          const skills: UserSkill[] = ((profileData.user_skills as unknown as UserSkillJoinRow[]) || []).map((us) => ({
            id: us.skills?.id || `sk_${Math.random().toString(36).substring(2, 8)}`,
            name: us.skills?.name || "Skill",
            category: us.skills?.category || "general",
            proficiency: us.proficiency,
            yearsExperience: Number(us.years_experience || 0),
            verified: Boolean(us.verified),
          }));

          const interests = ((profileData.user_interests as unknown as UserInterestJoinRow[]) || []).map((ui) => ({
            id: ui.interests?.id || `int_${Math.random().toString(36).substring(2, 8)}`,
            name: ui.interests?.name || "Interest",
            category: ui.interests?.category || "general",
          }));

          const rawAvail = (profileData.availability as unknown as AvailabilityJoinRow[])?.[0];
          const avail: Availability = rawAvail
            ? {
                hoursPerWeek: rawAvail.hours_per_week ?? 10,
                timezone: rawAvail.timezone ?? "UTC",
                prefersRemote: Boolean(rawAvail.prefers_remote ?? true),
                weekendAvailability: Boolean(rawAvail.weekend_availability ?? true),
                weekdayEvenings: Boolean(rawAvail.weekday_evenings ?? true),
                scheduleWindows: rawAvail.schedule_windows || [],
              }
            : {
                hoursPerWeek: 10,
                timezone: "UTC",
                prefersRemote: true,
                weekendAvailability: true,
                weekdayEvenings: true,
                scheduleWindows: [],
              };

          return {
            id: profileData.id,
            email: "",
            fullName: profileData.full_name,
            headline: profileData.headline || undefined,
            college: profileData.college,
            major: profileData.major,
            gradYear: profileData.grad_year,
            experienceLevel: profileData.experience_level,
            workingStyle: profileData.working_style || "collaborative",
            bio: profileData.bio || undefined,
            phoneNumber: undefined,
            avatarUrl: profileData.avatar_url || undefined,
            githubUrl: profileData.github_url || undefined,
            portfolioUrl: profileData.portfolio_url || undefined,
            linkedinUrl: profileData.linkedin_url || undefined,
            discordUrl: (profileData as any).discord_url || (profileData as any).discord_handle || undefined,
            instagramUrl: (profileData as any).instagram_url || (profileData as any).instagram_handle || undefined,
            resumeUrl: (profileData as any).resume_url || undefined,
            skills,
            interests,
            availability: avail,
            openTo: profileData.open_to || ["HACKATHONS", "STARTUPS"],
            availabilityStatus: profileData.availability_status || "AVAILABLE",
          };
        }
      } catch (err) {
        console.error("ProfileService.getProfileById exception:", err);
      }
    }

    return null;
  }

  /**
   * Search real student profiles with strict privacy protection across names, colleges, majors, skills, and tags
   */
  static async searchProfiles(query: string): Promise<StudentProfile[]> {
    const q = query.trim();
    if (!q) return [];

    let isDemo = false;
    if (typeof window !== "undefined") {
      isDemo =
        localStorage.getItem(LOCAL_STORAGE_DEMO_KEY) === "true" &&
        document.cookie.includes("caca_demo_mode=true");
    }

    if (isDemo) {
      const lower = q.toLowerCase();
      return MOCK_STUDENTS.filter(
        (s) =>
          s.fullName.toLowerCase().includes(lower) ||
          s.college.toLowerCase().includes(lower) ||
          s.major.toLowerCase().includes(lower) ||
          s.skills.some((sk) => sk.name.toLowerCase().includes(lower)) ||
          (s.openTo || []).some((tag) => tag.toLowerCase().includes(lower))
      ).map((s) => ({
        ...s,
        email: "",
        phoneNumber: undefined,
      }));
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();

        const { data: matchingSkills } = await supabase
          .from("skills")
          .select("id")
          .ilike("name", `%${q}%`);

        const skillIds = (matchingSkills || []).map((s) => s.id);

        let userIdsFromSkills: string[] = [];
        if (skillIds.length > 0) {
          const { data: userSkillRows } = await supabase
            .from("user_skills")
            .select("user_id")
            .in("skill_id", skillIds);
          userIdsFromSkills = (userSkillRows || []).map((r) => r.user_id);
        }

        let queryBuilder = supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            headline,
            college,
            major,
            grad_year,
            experience_level,
            working_style,
            bio,
            avatar_url,
            linkedin_url,
            github_url,
            portfolio_url,
            open_to,
            availability_status,
            user_skills (
              proficiency,
              skills ( name )
            )
          `);

        if (userIdsFromSkills.length > 0) {
          queryBuilder = queryBuilder.or(
            `full_name.ilike.%${q}%,college.ilike.%${q}%,major.ilike.%${q}%,id.in.(${userIdsFromSkills.join(",")})`
          );
        } else {
          queryBuilder = queryBuilder.or(
            `full_name.ilike.%${q}%,college.ilike.%${q}%,major.ilike.%${q}%`
          );
        }

        const { data, error } = await queryBuilder.limit(20);

        if (!error && data && data.length > 0) {
          const typedData = data as unknown as SearchProfileJoinRow[];
          return typedData.map((p) => ({
            id: p.id,
            email: "",
            fullName: p.full_name,
            headline: p.headline || undefined,
            college: p.college,
            major: p.major,
            gradYear: p.grad_year,
            experienceLevel: p.experience_level,
            workingStyle: (p.working_style as StudentProfile["workingStyle"]) || "collaborative",
            bio: p.bio || undefined,
            avatarUrl: p.avatar_url || undefined,
            linkedinUrl: p.linkedin_url || undefined,
            githubUrl: p.github_url || undefined,
            portfolioUrl: p.portfolio_url || undefined,
            openTo: p.open_to || ["HACKATHONS", "STARTUPS"],
            availabilityStatus: (p.availability_status as StudentProfile["availabilityStatus"]) || "AVAILABLE",
            skills: (p.user_skills || []).map((us) => ({
              id: `sk_${Math.random().toString(36).substring(2, 8)}`,
              name: us.skills?.name || "Skill",
              category: "general",
              proficiency: us.proficiency,
              yearsExperience: 1,
            })),
            interests: [],
            availability: {
              hoursPerWeek: 10,
              timezone: "UTC",
              prefersRemote: true,
              weekendAvailability: true,
              weekdayEvenings: true,
            },
          }));
        }
      } catch (err) {
        console.error("searchProfiles database error:", err);
      }
    }

    const lower = q.toLowerCase();
    return MOCK_STUDENTS.filter(
      (s) =>
        s.fullName.toLowerCase().includes(lower) ||
        s.college.toLowerCase().includes(lower) ||
        s.major.toLowerCase().includes(lower) ||
        s.skills.some((sk) => sk.name.toLowerCase().includes(lower))
    ).map((s) => ({
      ...s,
      email: "",
      phoneNumber: undefined,
    }));
  }

  /**
   * Retrieves all candidate profiles for squad building and ranking, scrubbing private fields
   */
  static async getAllCandidates(): Promise<StudentProfile[]> {
    let isDemo = false;
    if (typeof window !== "undefined") {
      isDemo =
        localStorage.getItem(LOCAL_STORAGE_DEMO_KEY) === "true" &&
        document.cookie.includes("caca_demo_mode=true");
    }

    if (isDemo) {
      return MOCK_STUDENTS.map((s) => ({
        ...s,
        email: "",
        phoneNumber: undefined,
      }));
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            headline,
            college,
            major,
            grad_year,
            experience_level,
            working_style,
            bio,
            avatar_url,
            linkedin_url,
            github_url,
            portfolio_url,
            open_to,
            availability_status,
            user_skills (
              proficiency,
              skills ( name, category )
            ),
            availability (
              hours_per_week,
              timezone,
              prefers_remote,
              weekend_availability,
              weekday_evenings
            )
          `)
          .limit(50);

        if (!error && data && data.length > 0) {
          const typedData = data as any[];
          return typedData.map((p) => ({
            id: p.id,
            email: "",
            fullName: p.full_name,
            headline: p.headline || undefined,
            college: p.college,
            major: p.major,
            gradYear: p.grad_year,
            experienceLevel: p.experience_level,
            workingStyle: (p.working_style as StudentProfile["workingStyle"]) || "collaborative",
            bio: p.bio || undefined,
            avatarUrl: p.avatar_url || undefined,
            linkedinUrl: p.linkedin_url || undefined,
            githubUrl: p.github_url || undefined,
            portfolioUrl: p.portfolio_url || undefined,
            openTo: p.open_to || ["HACKATHONS", "STARTUPS"],
            availabilityStatus: (p.availability_status as StudentProfile["availabilityStatus"]) || "AVAILABLE",
            skills: (p.user_skills || []).map((us: any) => ({
              id: `sk_${Math.random().toString(36).substring(2, 8)}`,
              name: us.skills?.name || "Skill",
              category: us.skills?.category || "general",
              proficiency: us.proficiency,
              yearsExperience: 1,
            })),
            interests: [],
            availability: {
              hoursPerWeek: p.availability?.hours_per_week || 10,
              timezone: p.availability?.timezone || "UTC",
              prefersRemote: p.availability?.prefers_remote ?? true,
              weekendAvailability: p.availability?.weekend_availability ?? true,
              weekdayEvenings: p.availability?.weekday_evenings ?? true,
            },
          }));
        }
      } catch (err) {
        console.error("getAllCandidates database error:", err);
      }
    }

    return MOCK_STUDENTS.map((s) => ({
      ...s,
      email: "",
      phoneNumber: undefined,
    }));
  }

  /**
   * Find candidate profiles matching missing role skills with ranking
   */
  static async findCandidatesForRole(
    requiredSkills: string[],
    roleTitle?: string
  ): Promise<StudentProfile[]> {
    const allCandidates = await this.getAllCandidates();
    if (requiredSkills.length === 0 && !roleTitle) {
      return allCandidates;
    }

    const reqLowers = requiredSkills.map((s) => s.toLowerCase());
    const roleLower = (roleTitle || "").toLowerCase();

    const scored = allCandidates.map((cand) => {
      let score = 0;
      requiredSkills.forEach((req) => {
        const found = cand.skills.find(
          (s) => s.name.toLowerCase().includes(req.toLowerCase()) || req.toLowerCase().includes(s.name.toLowerCase())
        );
        if (found) {
          score += found.proficiency * 20;
        }
      });

      if (roleLower && (cand.headline?.toLowerCase().includes(roleLower) || cand.major.toLowerCase().includes(roleLower))) {
        score += 30;
      }

      return { cand, score };
    });

    return scored
      .filter((s) => s.score > 0 || requiredSkills.length === 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.cand);
  }

  /**
   * Completes the first-time onboarding profile setup with verified database writes
   */
  static async completeOnboarding(
    userId: string,
    email: string,
    data: OnboardingData
  ): Promise<StudentProfile> {
    const newProfile: StudentProfile = {
      id: userId,
      email,
      fullName: data.fullName.trim(),
      headline: `${data.major.trim()} Student`,
      college: data.college.trim(),
      major: data.major.trim(),
      gradYear: data.gradYear,
      experienceLevel: data.experienceLevel,
      workingStyle: data.workingStyle,
      bio: data.bio?.trim() || undefined,
      phoneNumber: data.phoneNumber?.trim() || undefined,
      avatarUrl: data.avatarUrl || undefined,
      githubUrl: data.githubUrl?.trim() || undefined,
      portfolioUrl: data.portfolioUrl?.trim() || undefined,
      linkedinUrl: data.linkedinUrl?.trim() || undefined,
      discordUrl: data.discordUrl?.trim() || undefined,
      instagramUrl: data.instagramUrl?.trim() || undefined,
      resumeUrl: data.resumeUrl || undefined,
      skills: data.skills.map((s, idx) => ({
        id: `sk_onboard_${idx}`,
        name: s.name.trim(),
        category: s.category,
        proficiency: s.proficiency,
        yearsExperience: 1.0,
        verified: false,
      })),
      interests: (data.interests || []).map((int, idx) => ({
        id: `int_onboard_${idx}`,
        name: int.name.trim(),
        category: int.category || "general",
      })),
      availability: {
        hoursPerWeek: data.hoursPerWeek,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        prefersRemote: true,
        weekendAvailability: true,
        weekdayEvenings: true,
        scheduleWindows: [],
      },
      openTo: data.openTo || ["HACKATHONS", "STARTUPS"],
      availabilityStatus: data.availabilityStatus || "AVAILABLE",
    };

    if (isSupabaseConfigured()) {
      const supabase = createClient();

      // 1. Profile Core
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        email,
        full_name: newProfile.fullName,
        headline: newProfile.headline,
        college: newProfile.college,
        major: newProfile.major,
        grad_year: newProfile.gradYear,
        experience_level: newProfile.experienceLevel,
        working_style: newProfile.workingStyle,
        bio: newProfile.bio || null,
        phone_number: newProfile.phoneNumber || null,
        avatar_url: newProfile.avatarUrl || null,
        github_url: newProfile.githubUrl || null,
        portfolio_url: newProfile.portfolioUrl || null,
        linkedin_url: newProfile.linkedinUrl || null,
        discord_url: newProfile.discordUrl || null,
        instagram_url: newProfile.instagramUrl || null,
        discord_handle: newProfile.discordUrl || null,
        instagram_handle: newProfile.instagramUrl || null,
        resume_url: newProfile.resumeUrl || null,
        open_to: newProfile.openTo,
        availability_status: newProfile.availabilityStatus,
      });

      if (profileError) {
        console.error("Supabase profile onboarding insert failed:", profileError);
        throw new Error(profileError.message || "Failed to create profile record in database");
      }

      // 2. Availability
      const { error: availError } = await supabase.from("availability").upsert(
        {
          user_id: userId,
          hours_per_week: data.hoursPerWeek,
          timezone: newProfile.availability.timezone,
          prefers_remote: true,
          weekend_availability: true,
          weekday_evenings: true,
          schedule_windows: [],
        },
        { onConflict: "user_id" }
      );

      if (availError) {
        console.error("Supabase availability insert failed:", availError);
        throw new Error(availError.message || "Failed to save availability settings");
      }

      // 3. Relational Skills Persistence
      const activeSkillIds: string[] = [];
      for (const sk of data.skills) {
        const skillName = sk.name.trim();
        if (!skillName) continue;

        let skillId: string | null = null;
        const { data: existingSkill } = await supabase
          .from("skills")
          .select("id")
          .ilike("name", skillName)
          .maybeSingle();

        if (existingSkill?.id) {
          skillId = existingSkill.id;
        } else {
          const { data: createdSkill, error: createSkillErr } = await supabase
            .from("skills")
            .insert({ name: skillName, category: sk.category || "general" })
            .select("id")
            .maybeSingle();

          if (createSkillErr) {
            console.error("Failed to insert custom skill during onboarding:", createSkillErr);
          }
          if (createdSkill?.id) skillId = createdSkill.id;
        }

        if (skillId) {
          activeSkillIds.push(skillId);
          const { error: userSkillErr } = await supabase.from("user_skills").upsert(
            {
              user_id: userId,
              skill_id: skillId,
              proficiency: sk.proficiency,
              years_experience: 1,
            },
            { onConflict: "user_id,skill_id" }
          );

          if (userSkillErr) {
            console.error("Failed to upsert user_skill during onboarding:", userSkillErr);
            throw new Error(userSkillErr.message || "Failed to link skill to profile");
          }
        }
      }

      // Prune removed skills if any exist
      const userSkillsTable = supabase.from("user_skills") as any;
      if (activeSkillIds.length > 0 && typeof userSkillsTable.delete === "function") {
        await userSkillsTable
          .delete()
          .eq("user_id", userId)
          .not("skill_id", "in", `(${activeSkillIds.join(",")})`);
      }
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(newProfile));
      localStorage.setItem(LOCAL_STORAGE_DEMO_KEY, "false");
      document.cookie = "caca_demo_mode=; path=/; max-age=0";
      document.cookie = "caca_demo_session=; path=/; max-age=0";
    }

    return newProfile;
  }

  /**
   * Updates an existing profile and verifies all database writes atomically
   */
  static async updateProfile(profile: StudentProfile, isDemoMode?: boolean): Promise<void> {
    let isDemo = Boolean(isDemoMode);
    if (!isDemo && typeof window !== "undefined") {
      isDemo =
        localStorage.getItem(LOCAL_STORAGE_DEMO_KEY) === "true" &&
        document.cookie.includes("caca_demo_mode=true");
    }

    if (isSupabaseConfigured() && !isDemo) {
      const supabase = createClient();

      // 1. Update Core Profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.fullName.trim(),
          headline: profile.headline || null,
          college: profile.college.trim(),
          major: profile.major.trim(),
          grad_year: profile.gradYear,
          experience_level: profile.experienceLevel,
          working_style: profile.workingStyle,
          bio: profile.bio?.trim() || null,
          phone_number: profile.phoneNumber?.trim() || null,
          avatar_url: profile.avatarUrl || null,
          github_url: profile.githubUrl?.trim() || null,
          portfolio_url: profile.portfolioUrl?.trim() || null,
          linkedin_url: profile.linkedinUrl?.trim() || null,
          discord_url: profile.discordUrl?.trim() || null,
          instagram_url: profile.instagramUrl?.trim() || null,
          discord_handle: profile.discordUrl?.trim() || null,
          instagram_handle: profile.instagramUrl?.trim() || null,
          resume_url: profile.resumeUrl || null,
          open_to: profile.openTo || ["HACKATHONS", "STARTUPS"],
          availability_status: profile.availabilityStatus || "AVAILABLE",
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (profileError) {
        console.error("Supabase profile update failed:", profileError);
        throw new Error("Couldn't save changes right now, please try again.");
      }

      // 2. Update Availability
      const { error: availError } = await supabase.from("availability").upsert(
        {
          user_id: profile.id,
          hours_per_week: profile.availability.hoursPerWeek,
          timezone: profile.availability.timezone || "UTC",
          prefers_remote: profile.availability.prefersRemote,
          weekend_availability: profile.availability.weekendAvailability,
          weekday_evenings: profile.availability.weekdayEvenings,
          schedule_windows: profile.availability.scheduleWindows || [],
        },
        { onConflict: "user_id" }
      );

      if (availError) {
        console.error("Supabase availability update failed:", availError);
        throw new Error("Couldn't save changes right now, please try again.");
      }

      // 3. Relational Skills Persistence & Sync
      const activeSkillIds: string[] = [];
      for (const sk of profile.skills) {
        const skillName = sk.name.trim();
        if (!skillName) continue;

        let skillId: string | null = null;
        const { data: existingSkill } = await supabase
          .from("skills")
          .select("id")
          .ilike("name", skillName)
          .maybeSingle();

        if (existingSkill?.id) {
          skillId = existingSkill.id;
        } else {
          const { data: createdSkill, error: createSkillErr } = await supabase
            .from("skills")
            .insert({ name: skillName, category: sk.category || "general" })
            .select("id")
            .maybeSingle();

          if (createSkillErr) {
            console.error("Failed to insert custom skill during update:", createSkillErr);
          }
          if (createdSkill?.id) skillId = createdSkill.id;
        }

        if (skillId) {
          activeSkillIds.push(skillId);
          const { error: userSkillErr } = await supabase.from("user_skills").upsert(
            {
              user_id: profile.id,
              skill_id: skillId,
              proficiency: sk.proficiency,
              years_experience: sk.yearsExperience || 1,
            },
            { onConflict: "user_id,skill_id" }
          );

          if (userSkillErr) {
            console.error("Failed to upsert user_skill during update:", userSkillErr);
            throw new Error("Couldn't save changes right now, please try again.");
          }
        }
      }

      // 4. Prune Removed Skills
      const userSkillsTable = supabase.from("user_skills") as any;
      if (typeof userSkillsTable.delete === "function") {
        if (activeSkillIds.length > 0) {
          const { error: pruneErr } = await userSkillsTable
            .delete()
            .eq("user_id", profile.id)
            .not("skill_id", "in", `(${activeSkillIds.join(",")})`);

          if (pruneErr) {
            console.error("Failed to prune removed user_skills:", pruneErr);
          }
        } else {
          const { error: clearErr } = await userSkillsTable
            .delete()
            .eq("user_id", profile.id);

          if (clearErr) {
            console.error("Failed to clear user_skills:", clearErr);
          }
        }
      }

      // 5. Relational Interests Persistence
      if (profile.interests && profile.interests.length > 0) {
        const activeInterestIds: string[] = [];
        for (const int of profile.interests) {
          const intName = int.name.trim();
          if (!intName) continue;

          let intId: string | null = null;
          const { data: existingInt } = await supabase
            .from("interests")
            .select("id")
            .ilike("name", intName)
            .maybeSingle();

          if (existingInt?.id) {
            intId = existingInt.id;
          } else {
            const { data: createdInt } = await supabase
              .from("interests")
              .insert({ name: intName, category: int.category || "general" })
              .select("id")
              .maybeSingle();
            if (createdInt?.id) intId = createdInt.id;
          }

          if (intId) {
            activeInterestIds.push(intId);
            await supabase.from("user_interests").upsert(
              {
                user_id: profile.id,
                interest_id: intId,
              },
              { onConflict: "user_id,interest_id" }
            );
          }
        }

        const userInterestsTable = supabase.from("user_interests") as any;
        if (activeInterestIds.length > 0 && typeof userInterestsTable.delete === "function") {
          await userInterestsTable
            .delete()
            .eq("user_id", profile.id)
            .not("interest_id", "in", `(${activeInterestIds.join(",")})`);
        }
      }
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
    }
  }

  /**
   * Uploads an avatar image to Supabase Storage and immediately persists avatar_url to the profile database.
   * In Demo Mode, skips Supabase calls completely and uses local-only FileReader/base64 storage.
   */
  static async uploadAndSaveAvatar(
    userId: string,
    file: File,
    isDemoMode?: boolean
  ): Promise<{ url?: string; error?: string }> {
    if (!file.type.startsWith("image/")) {
      return { error: "File must be an image (JPEG, PNG, WEBP, GIF)." };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { error: "Image size must be less than 5MB." };
    }

    let isDemo = Boolean(isDemoMode);
    if (!isDemo && typeof window !== "undefined") {
      isDemo =
        localStorage.getItem(LOCAL_STORAGE_DEMO_KEY) === "true" &&
        document.cookie.includes("caca_demo_mode=true");
    }

    if (isSupabaseConfigured() && !isDemo) {
      try {
        const supabase = createClient();
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
        const filePath = `${userId}/avatar_${Date.now()}.${fileExt}`;

        // 1. Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
          });

        if (uploadError) {
          console.error("Supabase storage upload error:", uploadError);
          return { error: "Couldn't save changes right now, please try again." };
        }

        // 2. Obtain permanent public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);

        // 3. Immediately persist avatar_url in the database
        const { error: dbError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl })
          .eq("id", userId);

        if (dbError) {
          console.error("Supabase profile avatar update error:", dbError);
          return { error: "Couldn't save changes right now, please try again." };
        }

        // 4. Update local storage profile cache if present
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
          let parsed: any = {};
          if (stored) {
            try {
              parsed = JSON.parse(stored);
            } catch {
              parsed = {};
            }
          }
          parsed.id = parsed.id || userId;
          parsed.avatarUrl = publicUrl;
          localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(parsed));
        }

        return { url: publicUrl };
      } catch (err) {
        console.error("Storage upload exception:", err);
        return { error: "Couldn't save changes right now, please try again." };
      }
    }

    // Fallback for Demo Mode and standalone offline testing
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
          let parsed: any = {};
          if (stored) {
            try {
              parsed = JSON.parse(stored);
            } catch {
              parsed = {};
            }
          }
          parsed.id = parsed.id || userId;
          parsed.avatarUrl = base64;
          localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(parsed));
        }
        resolve({ url: base64 });
      };
      reader.onerror = () => resolve({ error: "Failed to read image." });
      reader.readAsDataURL(file);
    });
  }

  /**
   * Uploads an avatar image (legacy compatibility)
   */
  static async uploadAvatar(
    userId: string,
    file: File,
    isDemoMode?: boolean
  ): Promise<{ url?: string; error?: string }> {
    return this.uploadAndSaveAvatar(userId, file, isDemoMode);
  }

  /**
   * Removes the avatar from the database and profile.
   * In Demo Mode, skips Supabase calls and clears local storage.
   */
  static async removeAvatar(
    userId: string,
    isDemoMode?: boolean
  ): Promise<{ success: boolean; error?: string }> {
    let isDemo = Boolean(isDemoMode);
    if (!isDemo && typeof window !== "undefined") {
      isDemo =
        localStorage.getItem(LOCAL_STORAGE_DEMO_KEY) === "true" &&
        document.cookie.includes("caca_demo_mode=true");
    }

    if (isSupabaseConfigured() && !isDemo) {
      try {
        const supabase = createClient();
        const { error: dbError } = await supabase
          .from("profiles")
          .update({ avatar_url: null })
          .eq("id", userId);

        if (dbError) {
          console.error("Failed to remove avatar from database:", dbError);
          return { success: false, error: "Couldn't save changes right now, please try again." };
        }
      } catch (err) {
        console.error("removeAvatar exception:", err);
        return { success: false, error: "Couldn't save changes right now, please try again." };
      }
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      let parsed: any = {};
      if (stored) {
        try {
          parsed = JSON.parse(stored);
        } catch {
          parsed = {};
        }
      }
      parsed.avatarUrl = undefined;
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(parsed));
    }

    return { success: true };
  }

  /**
   * Uploads a student PDF resume to Supabase Storage with size and MIME validation
   */
  static async uploadResume(
    userId: string,
    file: File,
    isDemoMode?: boolean
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    // Validate file type
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return { success: false, error: "Only PDF documents are supported for resumes." };
    }

    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, error: "Resume file size exceeds the 5MB limit." };
    }

    let isDemo = Boolean(isDemoMode);
    if (!isDemo && typeof window !== "undefined") {
      isDemo =
        localStorage.getItem(LOCAL_STORAGE_DEMO_KEY) === "true" &&
        document.cookie.includes("caca_demo_mode=true");
    }

    let resumeUrl =
      typeof window !== "undefined" && typeof URL.createObjectURL === "function"
        ? URL.createObjectURL(file)
        : `blob:https://caca.app/resumes/${Date.now()}.pdf`;

    if (isSupabaseConfigured() && !isDemo) {
      try {
        const supabase = createClient();
        const fileExt = "pdf";
        const filePath = `${userId}/resume_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(filePath, file, {
            upsert: true,
            contentType: "application/pdf",
          });

        if (uploadError) {
          console.error("Supabase resume storage error:", uploadError);
          return { success: false, error: "Could not upload resume to cloud storage." };
        }

        const { data: publicUrlData } = supabase.storage
          .from("resumes")
          .getPublicUrl(filePath);

        resumeUrl = publicUrlData.publicUrl;

        // Update profile in DB
        const { error: dbError } = await supabase
          .from("profiles")
          .update({ resume_url: resumeUrl })
          .eq("id", userId);

        if (dbError) {
          console.error("Failed to update profile with resume_url:", dbError);
          return { success: false, error: "Failed to link resume to profile." };
        }
      } catch (err) {
        console.error("uploadResume exception:", err);
        return { success: false, error: "Could not upload resume." };
      }
    }

    // Update local cache
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      let parsed: any = {};
      if (stored) {
        try {
          parsed = JSON.parse(stored);
        } catch {
          parsed = {};
        }
      }
      parsed.id = parsed.id || userId;
      parsed.resumeUrl = resumeUrl;
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(parsed));
    }

    return { success: true, url: resumeUrl };
  }

  /**
   * Removes a student's resume reference
   */
  static async removeResume(
    userId: string,
    isDemoMode?: boolean
  ): Promise<{ success: boolean; error?: string }> {
    let isDemo = Boolean(isDemoMode);
    if (!isDemo && typeof window !== "undefined") {
      isDemo =
        localStorage.getItem(LOCAL_STORAGE_DEMO_KEY) === "true" &&
        document.cookie.includes("caca_demo_mode=true");
    }

    if (isSupabaseConfigured() && !isDemo) {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("profiles")
          .update({ resume_url: null })
          .eq("id", userId);

        if (error) {
          console.error("Failed to remove resume from DB:", error);
          return { success: false, error: error.message };
        }
      } catch (err) {
        console.error("removeResume exception:", err);
      }
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      let parsed: any = {};
      if (stored) {
        try {
          parsed = JSON.parse(stored);
        } catch {
          parsed = {};
        }
      }
      parsed.resumeUrl = undefined;
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(parsed));
    }

    return { success: true };
  }
}
