"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "./supabase/client";
import { StudentProfile } from "@/types/user";
import { ProfileService } from "@/services/profile-service";
import { CURRENT_USER } from "./mock-data";

interface AuthContextType {
  user: User | null;
  profile: StudentProfile | null;
  isDemoMode: boolean;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error?: string; hasProfile?: boolean }>;
  signUp: (email: string, pass: string) => Promise<{ data?: any; needsEmailConfirmation?: boolean; error?: string }>;
  signOut: () => Promise<void>;
  enterDemoMode: () => void;
  setProfile: (p: StudentProfile) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfileState] = useState<StudentProfile | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    if (isDemoMode) {
      setProfileState(CURRENT_USER);
      return;
    }
    if (user) {
      const p = await ProfileService.getCurrentProfile(user.id);
      if (p) {
        setProfileState(p);
      } else {
        setProfileState({
          id: user.id,
          email: user.email || "",
          fullName: user.email?.split("@")[0] || "Student",
          college: "Unassigned College",
          major: "General",
          gradYear: 2027,
          experienceLevel: "sophomore",
          workingStyle: "collaborative",
          skills: [],
          interests: [],
          availability: {
            hoursPerWeek: 10,
            timezone: "UTC",
            prefersRemote: true,
            weekendAvailability: true,
            weekdayEvenings: true,
          },
        });
      }
    } else {
      const p = await ProfileService.getCurrentProfile();
      if (p) setProfileState(p);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const isDemo =
          typeof window !== "undefined" &&
          localStorage.getItem("caca_is_demo_mode") === "true" &&
          document.cookie.includes("caca_demo_mode=true");

        if (isDemo) {
          setIsDemoMode(true);
          setUser(null);
          setProfileState(CURRENT_USER);
          setIsLoading(false);
          return;
        }

        if (isSupabaseConfigured()) {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          const authUser = session?.user;

          if (authUser) {
            setUser(authUser);
            setIsDemoMode(false);
            if (typeof window !== "undefined") {
              localStorage.setItem("caca_is_demo_mode", "false");
              document.cookie = "caca_demo_mode=; path=/; max-age=0";
              document.cookie = "caca_demo_session=; path=/; max-age=0";
            }

            const p = await ProfileService.getCurrentProfile(authUser.id);
            if (p) {
              setProfileState(p);
            } else {
              setProfileState({
                id: authUser.id,
                email: authUser.email || "",
                fullName: authUser.email?.split("@")[0] || "Student",
                college: "Unassigned College",
                major: "General",
                gradYear: 2027,
                experienceLevel: "sophomore",
                workingStyle: "collaborative",
                skills: [],
                interests: [],
                availability: {
                  hoursPerWeek: 10,
                  timezone: "UTC",
                  prefersRemote: true,
                  weekendAvailability: true,
                  weekdayEvenings: true,
                },
              });
            }
          } else {
            setUser(null);
            setProfileState(null);
          }
        } else {
          // Standalone local offline fallback
          const localProfile = await ProfileService.getCurrentProfile();
          if (localProfile) {
            setUser({
              id: localProfile.id,
              app_metadata: {},
              user_metadata: {},
              aud: "authenticated",
              created_at: new Date().toISOString(),
              email: localProfile.email,
            });
            setProfileState(localProfile);
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" || (session?.user && event !== "SIGNED_OUT")) {
          const authUser = session?.user;
          if (authUser) {
            setUser(authUser);
            setIsDemoMode(false);
            if (typeof window !== "undefined") {
              localStorage.setItem("caca_is_demo_mode", "false");
              document.cookie = "caca_demo_mode=; path=/; max-age=0";
              document.cookie = "caca_demo_session=; path=/; max-age=0";
            }
            try {
              const p = await ProfileService.getCurrentProfile(authUser.id);
              if (p) {
                setProfileState(p);
              }
            } catch {
              // Handled
            }
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfileState(null);
          setIsDemoMode(false);
          if (typeof window !== "undefined") {
            localStorage.removeItem("caca_active_profile");
            localStorage.removeItem("caca_is_demo_mode");
            localStorage.removeItem("caca_applications");
            document.cookie = "caca_demo_mode=; path=/; max-age=0";
            document.cookie = "caca_demo_session=; path=/; max-age=0";
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const signIn = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      let loggedInUser: User | null = null;
      let hasProfile = false;

      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pass,
        });

        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            return { error: "Email not confirmed. Please check your inbox and verify your email first." };
          }
          if (error.message.toLowerCase().includes("invalid login credentials")) {
            return { error: "Invalid email or password. Please try again." };
          }
          return { error: error.message };
        }

        loggedInUser = data.user;
        setUser(loggedInUser);
        setIsDemoMode(false);

        if (typeof window !== "undefined") {
          localStorage.setItem("caca_is_demo_mode", "false");
          document.cookie = "caca_demo_mode=; path=/; max-age=0";
          document.cookie = "caca_demo_session=; path=/; max-age=0";
        }

        try {
          const p = await ProfileService.getCurrentProfile(loggedInUser?.id);
          if (p) {
            setProfileState(p);
            hasProfile = true;
          } else {
            setProfileState({
              id: loggedInUser.id,
              email: loggedInUser.email || email,
              fullName: loggedInUser.email?.split("@")[0] || "Student",
              college: "Unassigned College",
              major: "General",
              gradYear: 2027,
              experienceLevel: "sophomore",
              workingStyle: "collaborative",
              skills: [],
              interests: [],
              availability: {
                hoursPerWeek: 10,
                timezone: "UTC",
                prefersRemote: true,
                weekendAvailability: true,
                weekdayEvenings: true,
              },
            });
            hasProfile = false;
          }
        } catch {
          hasProfile = false;
        }
      } else {
        // Standalone offline account verification
        const localProfile = await ProfileService.getCurrentProfile();
        const studentUser: User = {
          id: localProfile?.id || `usr_${Date.now()}`,
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
          email,
        };
        setUser(studentUser);
        if (localProfile) {
          setProfileState(localProfile);
          hasProfile = true;
        }
      }

      setIsDemoMode(false);
      return { hasProfile };
    } catch (err: any) {
      return { error: err?.message || "Failed to log in" };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pass,
        });

        if (error) {
          return { error: error.message };
        }

        // If email confirmation is required by Supabase project settings
        if (data.user && !data.session) {
          return { needsEmailConfirmation: true, data };
        }

        if (data.user) {
          setUser(data.user);
        }
      } else {
        // Standalone account creation
        const newStudentUser: User = {
          id: `usr_${Date.now()}`,
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
          email,
        };
        setUser(newStudentUser);
      }

      setIsDemoMode(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("caca_is_demo_mode", "false");
        document.cookie = "caca_demo_mode=; path=/; max-age=0";
        document.cookie = "caca_demo_session=; path=/; max-age=0";
      }
      return { needsEmailConfirmation: false };
    } catch (err: any) {
      return { error: err?.message || "Failed to sign up" };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
    } catch {
      // Ignored
    } finally {
      setUser(null);
      setProfileState(null);
      setIsDemoMode(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem("caca_active_profile");
        localStorage.removeItem("caca_is_demo_mode");
        localStorage.removeItem("caca_applications");
        document.cookie = "caca_demo_mode=; path=/; max-age=0";
        document.cookie = "caca_demo_session=; path=/; max-age=0";
      }
      setIsLoading(false);
    }
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    setUser(null);
    setProfileState(CURRENT_USER);
    if (typeof window !== "undefined") {
      localStorage.setItem("caca_is_demo_mode", "true");
      document.cookie = "caca_demo_mode=true; path=/; max-age=86400";
    }
  };

  const setProfile = (p: StudentProfile) => {
    setProfileState(p);
    ProfileService.updateProfile(p);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isDemoMode,
        isLoading,
        signIn,
        signUp,
        signOut,
        enterDemoMode,
        setProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
