import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { StudentProfile, UserSkill, Availability, WorkingStyle, ExperienceLevel } from "@/types/user";
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
  hoursPerWeek: number;
  skills: { name: string; category: string; proficiency: number }[];
  openTo?: string[];
  availabilityStatus?: "AVAILABLE" | "LIMITED" | "NOT_LOOKING";
}

export class ProfileService {
  /**
   * Fetches the current logged in user's profile from Supabase or active local session
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
          } catch {
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
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
          if (stored) return JSON.parse(stored);
        }
        return null;
      }

      const skills: UserSkill[] = (profileData.user_skills || []).map((us: any) => ({
        id: us.skills?.id || `sk_${Math.random()}`,
        name: us.skills?.name || "Skill",
        category: us.skills?.category || "general",
        proficiency: us.proficiency,
        yearsExperience: Number(us.years_experience || 0),
        verified: Boolean(us.verified),
      }));

      const interests = (profileData.user_interests || []).map((ui: any) => ({
        id: ui.interests?.id || `int_${Math.random()}`,
        name: ui.interests?.name || "Interest",
        category: ui.interests?.category || "general",
      }));

      const rawAvail = profileData.availability?.[0];
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
        headline: profileData.headline,
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
        } catch {
          // Ignored
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

        if (!error && profileData) {
          const skills: UserSkill[] = (profileData.user_skills || []).map((us: any) => ({
            id: us.skills?.id || `sk_${Math.random()}`,
            name: us.skills?.name || "Skill",
            category: us.skills?.category || "general",
            proficiency: us.proficiency,
            yearsExperience: Number(us.years_experience || 0),
            verified: Boolean(us.verified),
          }));

          const interests = (profileData.user_interests || []).map((ui: any) => ({
            id: ui.interests?.id || `int_${Math.random()}`,
            name: ui.interests?.name || "Interest",
            category: ui.interests?.category || "general",
          }));

          const rawAvail = profileData.availability?.[0];
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
            headline: profileData.headline,
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
            skills,
            interests,
            availability: avail,
            openTo: profileData.open_to || ["HACKATHONS", "STARTUPS"],
            availabilityStatus: profileData.availability_status || "AVAILABLE",
          };
        }
      } catch (err) {
        console.error("getProfileById error:", err);
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

        // 1. Check if query matches skill names
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

        // 2. Query profiles
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
          return data.map((p: any) => ({
            id: p.id,
            email: "",
            fullName: p.full_name,
            headline: p.headline,
            college: p.college,
            major: p.major,
            gradYear: p.grad_year,
            experienceLevel: p.experience_level,
            workingStyle: p.working_style || "collaborative",
            bio: p.bio || undefined,
            avatarUrl: p.avatar_url || undefined,
            linkedinUrl: p.linkedin_url || undefined,
            githubUrl: p.github_url || undefined,
            portfolioUrl: p.portfolio_url || undefined,
            openTo: p.open_to || ["HACKATHONS", "STARTUPS"],
            availabilityStatus: p.availability_status || "AVAILABLE",
            skills: (p.user_skills || []).map((us: any) => ({
              id: `sk_${Math.random()}`,
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
   * Find candidate profiles matching missing role skills
   */
  static async findCandidatesForRole(
    requiredSkills: string[],
    roleTitle?: string
  ): Promise<StudentProfile[]> {
    if (requiredSkills.length === 0) {
      return this.searchProfiles(roleTitle || "Engineer");
    }

    const query = requiredSkills[0];
    const results = await this.searchProfiles(query);
    return results;
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
      skills: data.skills.map((s, idx) => ({
        id: `sk_onboard_${idx}`,
        name: s.name.trim(),
        category: s.category,
        proficiency: s.proficiency,
        yearsExperience: 1.0,
        verified: false,
      })),
      interests: [],
      availability: {
        hoursPerWeek: data.hoursPerWeek,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        prefersRemote: true,
        weekendAvailability: true,
        weekdayEvenings: true,
      },
      openTo: data.openTo || ["HACKATHONS", "STARTUPS"],
      availabilityStatus: data.availabilityStatus || "AVAILABLE",
    };

    if (isSupabaseConfigured()) {
      const supabase = createClient();

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        email,
        full_name: newProfile.fullName,
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
        open_to: newProfile.openTo,
        availability_status: newProfile.availabilityStatus,
      });

      if (profileError) {
        console.error("Supabase profile onboarding insert failed:", profileError);
        throw new Error(profileError.message || "Failed to create profile record in database");
      }

      const { error: availError } = await supabase.from("availability").upsert({
        user_id: userId,
        hours_per_week: data.hoursPerWeek,
        timezone: newProfile.availability.timezone,
        prefers_remote: true,
        weekend_availability: true,
        weekday_evenings: true,
      });

      if (availError) {
        console.error("Supabase availability insert failed:", availError);
      }

      // Upsert skills
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
          const { data: createdSkill } = await supabase
            .from("skills")
            .insert({ name: skillName, category: sk.category || "general" })
            .select("id")
            .maybeSingle();
          if (createdSkill?.id) skillId = createdSkill.id;
        }

        if (skillId) {
          await supabase.from("user_skills").upsert({
            user_id: userId,
            skill_id: skillId,
            proficiency: sk.proficiency,
            years_experience: 1,
          });
        }
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
   * Updates an existing profile and verifies database writes
   */
  static async updateProfile(profile: StudentProfile): Promise<void> {
    if (isSupabaseConfigured()) {
      const supabase = createClient();

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.fullName.trim(),
          college: profile.college.trim(),
          major: profile.major.trim(),
          grad_year: profile.gradYear,
          experience_level: profile.experienceLevel,
          bio: profile.bio?.trim() || null,
          phone_number: profile.phoneNumber?.trim() || null,
          avatar_url: profile.avatarUrl || null,
          working_style: profile.workingStyle,
          github_url: profile.githubUrl?.trim() || null,
          portfolio_url: profile.portfolioUrl?.trim() || null,
          linkedin_url: profile.linkedinUrl?.trim() || null,
          open_to: profile.openTo || ["HACKATHONS", "STARTUPS"],
          availability_status: profile.availabilityStatus || "AVAILABLE",
        })
        .eq("id", profile.id);

      if (profileError) {
        console.error("Supabase profile update failed:", profileError);
        throw new Error(profileError.message || "Failed to update profile in database");
      }

      const { error: availError } = await supabase.from("availability").upsert({
        user_id: profile.id,
        hours_per_week: profile.availability.hoursPerWeek,
        timezone: profile.availability.timezone || "UTC",
        prefers_remote: profile.availability.prefersRemote,
        weekend_availability: profile.availability.weekendAvailability,
        weekday_evenings: profile.availability.weekdayEvenings,
      });

      if (availError) {
        console.error("Supabase availability update failed:", availError);
      }

      // Upsert custom skills into public.skills and public.user_skills
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
          const { data: createdSkill } = await supabase
            .from("skills")
            .insert({ name: skillName, category: sk.category || "general" })
            .select("id")
            .maybeSingle();
          if (createdSkill?.id) skillId = createdSkill.id;
        }

        if (skillId) {
          await supabase.from("user_skills").upsert({
            user_id: profile.id,
            skill_id: skillId,
            proficiency: sk.proficiency,
            years_experience: sk.yearsExperience || 1,
          });
        }
      }
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
    }
  }

  /**
   * Uploads an avatar image to Supabase Storage and immediately persists avatar_url to the profile database
   */
  static async uploadAndSaveAvatar(
    userId: string,
    file: File
  ): Promise<{ url?: string; error?: string }> {
    if (!file.type.startsWith("image/")) {
      return { error: "File must be an image (JPEG, PNG, WEBP, GIF)." };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { error: "Image size must be less than 5MB." };
    }

    if (isSupabaseConfigured()) {
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
          return { error: uploadError.message || "Failed to upload avatar to storage." };
        }

        // 2. Obtain permanent public URL
        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        // 3. Immediately persist avatar_url in the database
        const { error: dbError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl })
          .eq("id", userId);

        if (dbError) {
          console.error("Supabase profile avatar update error:", dbError);
          return { error: dbError.message || "Failed to save avatar reference to profile." };
        }

        // 4. Update local storage profile cache if present
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              parsed.avatarUrl = publicUrl;
              localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(parsed));
            } catch {
              // Ignore parse errors
            }
          }
        }

        return { url: publicUrl };
      } catch (err: any) {
        console.error("Storage upload exception:", err);
        return { error: err?.message || "An unexpected error occurred while saving the avatar." };
      }
    }

    // Fallback for standalone offline testing only
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              parsed.avatarUrl = base64;
              localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(parsed));
            } catch {}
          }
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
    file: File
  ): Promise<{ url?: string; error?: string }> {
    return this.uploadAndSaveAvatar(userId, file);
  }

  /**
   * Removes the avatar from the database and profile
   */
  static async removeAvatar(userId: string): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error: dbError } = await supabase
          .from("profiles")
          .update({ avatar_url: null })
          .eq("id", userId);

        if (dbError) {
          console.error("Failed to remove avatar from database:", dbError);
          return { success: false, error: dbError.message };
        }
      } catch (err: any) {
        console.error("removeAvatar exception:", err);
        return { success: false, error: err?.message };
      }
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.avatarUrl = undefined;
          localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(parsed));
        } catch {}
      }
    }

    return { success: true };
  }
}
