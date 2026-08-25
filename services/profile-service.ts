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
      // Fast single row query with maybeSingle to never throw on missing profile
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
      };

      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(mappedProfile));
      }

      return mappedProfile;
    } catch {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
        if (stored) return JSON.parse(stored);
      }
      return null;
    }
  }

  /**
   * Fetches any student profile by ID (demo student or real Supabase student)
   * Strictly never exposes private email, phone, or credentials in public lookup
   */
  static async getProfileById(userId: string): Promise<StudentProfile | null> {
    // 1. Check fictional mock students for Demo browsing
    const mockMatch = MOCK_STUDENTS.find((s) => s.id === userId);
    if (mockMatch) {
      return {
        ...mockMatch,
        email: "",
        phoneNumber: undefined,
      };
    }

    // 2. Check local stored active profile
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

    // 3. Query Supabase profiles table if live
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
            email: "", // Never expose email in public profile lookup
            fullName: profileData.full_name,
            headline: profileData.headline,
            college: profileData.college,
            major: profileData.major,
            gradYear: profileData.grad_year,
            experienceLevel: profileData.experience_level,
            workingStyle: profileData.working_style || "collaborative",
            bio: profileData.bio || undefined,
            phoneNumber: undefined, // Never expose phone in public profile lookup
            avatarUrl: profileData.avatar_url || undefined,
            githubUrl: profileData.github_url || undefined,
            portfolioUrl: profileData.portfolio_url || undefined,
            linkedinUrl: profileData.linkedin_url || undefined,
            skills,
            interests,
            availability: avail,
          };
        }
      } catch {
        // Fallback to null
      }
    }

    return null;
  }

  /**
   * Search real student profiles from Supabase or curated mock list
   * Strictly protects private fields (email, phone, passwords)
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
          s.skills.some((sk) => sk.name.toLowerCase().includes(lower))
      ).map((s) => ({
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
            user_skills (
              proficiency,
              skills ( name )
            )
          `)
          .or(`full_name.ilike.%${q}%,college.ilike.%${q}%,major.ilike.%${q}%`)
          .limit(15);

        if (!error && data && data.length > 0) {
          return data.map((p: any) => ({
            id: p.id,
            email: "", // Privacy protected
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
      } catch {
        // Fallback
      }
    }

    // Fallback to searching mock students
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
   * Completes the first-time onboarding profile setup
   */
  static async completeOnboarding(
    userId: string,
    email: string,
    data: OnboardingData
  ): Promise<StudentProfile> {
    const newProfile: StudentProfile = {
      id: userId,
      email,
      fullName: data.fullName,
      college: data.college,
      major: data.major,
      gradYear: data.gradYear,
      experienceLevel: data.experienceLevel,
      workingStyle: data.workingStyle,
      bio: data.bio || undefined,
      phoneNumber: data.phoneNumber || undefined,
      avatarUrl: data.avatarUrl || undefined,
      githubUrl: data.githubUrl || undefined,
      portfolioUrl: data.portfolioUrl || undefined,
      linkedinUrl: data.linkedinUrl || undefined,
      skills: data.skills.map((s, idx) => ({
        id: `sk_onboard_${idx}`,
        name: s.name,
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
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from("profiles").upsert({
          id: userId,
          email,
          full_name: data.fullName,
          college: data.college,
          major: data.major,
          grad_year: data.gradYear,
          experience_level: data.experienceLevel,
          working_style: data.workingStyle,
          bio: data.bio || null,
          phone_number: data.phoneNumber || null,
          avatar_url: data.avatarUrl || null,
          github_url: data.githubUrl || null,
          portfolio_url: data.portfolioUrl || null,
          linkedin_url: data.linkedinUrl || null,
        });

        await supabase.from("availability").upsert({
          user_id: userId,
          hours_per_week: data.hoursPerWeek,
          timezone: newProfile.availability.timezone,
          prefers_remote: true,
          weekend_availability: true,
          weekday_evenings: true,
        });
      } catch {
        // Fallback
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
   * Updates an existing profile
   */
  static async updateProfile(profile: StudentProfile): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from("profiles").update({
          full_name: profile.fullName,
          bio: profile.bio || null,
          phone_number: profile.phoneNumber || null,
          avatar_url: profile.avatarUrl || null,
          working_style: profile.workingStyle,
          github_url: profile.githubUrl || null,
          portfolio_url: profile.portfolioUrl || null,
          linkedin_url: profile.linkedinUrl || null,
        }).eq("id", profile.id);

        await supabase.from("availability").upsert({
          user_id: profile.id,
          hours_per_week: profile.availability.hoursPerWeek,
          timezone: profile.availability.timezone || "UTC",
          prefers_remote: profile.availability.prefersRemote,
          weekend_availability: profile.availability.weekendAvailability,
          weekday_evenings: profile.availability.weekdayEvenings,
        });
      } catch {
        // Fallback
      }
    }
  }

  /**
   * Uploads an avatar image to Supabase Storage (with local base64 fallback)
   */
  static async uploadAvatar(
    userId: string,
    file: File
  ): Promise<{ url?: string; error?: string }> {
    if (!file.type.startsWith("image/")) {
      return { error: "File must be an image (JPEG, PNG, WEBP, GIF)" };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { error: "Image size must be less than 5MB" };
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const fileExt = file.name.split(".").pop() || "png";
        const filePath = `${userId}/avatar_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
          });

        if (uploadError) {
          console.warn("Supabase storage upload error:", uploadError.message);
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ url: reader.result as string });
            reader.onerror = () => resolve({ error: "Failed to read image" });
            reader.readAsDataURL(file);
          });
        }

        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        return { url: publicUrl };
      } catch (err: any) {
        console.warn("Storage exception, falling back to local:", err?.message);
      }
    }

    // Local base64 data URL fallback
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string });
      reader.onerror = () => resolve({ error: "Failed to read image" });
      reader.readAsDataURL(file);
    });
  }
}
