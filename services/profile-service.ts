import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { StudentProfile, UserSkill, Availability, WorkingStyle, ExperienceLevel } from "@/types/user";
import { CURRENT_USER } from "@/lib/mock-data";

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
  githubUrl?: string;
  portfolioUrl?: string;
  hoursPerWeek: number;
  skills: { name: string; category: string; proficiency: number }[];
}

export class ProfileService {
  /**
   * Fetches the current user profile from Supabase or active local session
   */
  static async getCurrentProfile(userId?: string): Promise<StudentProfile | null> {
    if (!userId || !isSupabaseConfigured()) {
      if (typeof window !== "undefined") {
        const isDemo = localStorage.getItem(LOCAL_STORAGE_DEMO_KEY) === "true";
        if (isDemo) return CURRENT_USER;

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
        .single();

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

      const avail: Availability = profileData.availability?.[0] || {
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
      githubUrl: data.githubUrl || undefined,
      portfolioUrl: data.portfolioUrl || undefined,
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
          github_url: data.githubUrl || null,
          portfolio_url: data.portfolioUrl || null,
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
      document.cookie = "caca_demo_session=true; path=/; max-age=86400";
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
          working_style: profile.workingStyle,
          github_url: profile.githubUrl || null,
          portfolio_url: profile.portfolioUrl || null,
        }).eq("id", profile.id);

        await supabase.from("availability").update({
          hours_per_week: profile.availability.hoursPerWeek,
        }).eq("user_id", profile.id);
      } catch {
        // Fallback
      }
    }
  }
}
