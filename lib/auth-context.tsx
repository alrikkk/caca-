"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "./supabase/client";
import { StudentProfile } from "@/types/user";
import { CURRENT_USER } from "./mock-data";
import { ProfileService } from "@/services/profile-service";
import type { User, Session } from "@supabase/supabase-js";

export function formatAuthError(errMessage: string): string {
  const lower = (errMessage || "").toLowerCase();
  if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("over_email_send_rate_limit") ||
    lower.includes("rate_limit_exceeded")
  ) {
    return "TOO MANY ATTEMPTS. Please wait a little before trying again.";
  }
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid username or password") ||
    lower.includes("invalid_grant")
  ) {
    return "INVALID EMAIL OR PASSWORD. Please check your credentials or create an account.";
  }
  if (
    lower.includes("user already registered") ||
    lower.includes("already registered") ||
    lower.includes("already in use")
  ) {
    return "ACCOUNT ALREADY EXISTS. Please enter your password to log in.";
  }
  if (lower.includes("email not confirmed")) {
    return "EMAIL NOT CONFIRMED. Please verify your email before logging in.";
  }
  if (lower.includes("password should be at least")) {
    return "PASSWORD TOO SHORT. Must be at least 6 characters.";
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "NETWORK CONNECTION ISSUE. Please check your connection and try again.";
  }
  return errMessage;
}

interface AuthContextType {
  user: User | null;
  profile: StudentProfile | null;
  session: Session | null;
  isLoading: boolean;
  isDemoMode: boolean;
  signIn: (email: string, pass: string) => Promise<{ error?: string; hasProfile?: boolean }>;
  signUp: (
    email: string,
    pass: string
  ) => Promise<{
    error?: string;
    data?: { user: User | null; session: Session | null } | null;
    isExistingUser?: boolean;
    hasProfile?: boolean;
  }>;
  signOut: () => Promise<void>;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  setProfile: (profile: StudentProfile) => void;
  updateProfileState: (profile: StudentProfile) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfileState] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Initialize auth state safely
  const initAuth = async () => {
    try {
      // 1. Check if user is explicitly in Demo Mode
      if (typeof window !== "undefined") {
        const isDemo =
          localStorage.getItem("caca_is_demo_mode") === "true" &&
          document.cookie.includes("caca_demo_mode=true");
        if (isDemo) {
          setIsDemoMode(true);
          setProfileState(CURRENT_USER);
          setUser(null);
          setSession(null);
          setIsLoading(false);
          return;
        }
      }

      // 2. Check Supabase session if configured
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { data: { session: activeSession }, error } = await supabase.auth.getSession();

        if (activeSession?.user && !error) {
          setSession(activeSession);
          setUser(activeSession.user);
          setIsDemoMode(false);

          // Non-blocking profile hydration
          ProfileService.getCurrentProfile(activeSession.user.id)
            .then((loadedProfile) => {
              if (loadedProfile) {
                setProfileState(loadedProfile);
              } else {
                setProfileState({
                  id: activeSession.user.id,
                  email: activeSession.user.email || "",
                  fullName: activeSession.user.email?.split("@")[0] || "Student",
                  college: "Unassigned College",
                  major: "General",
                  gradYear: 2027,
                  experienceLevel: "sophomore",
                  workingStyle: "collaborative",
                  skills: [],
                  interests: [],
                  availability: {
                    hoursPerWeek: 10,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                    prefersRemote: true,
                    weekendAvailability: true,
                    weekdayEvenings: true,
                  },
                });
              }
            })
            .catch((err) => {
              console.error("AuthContext.initAuth (profile hydration) failed:", err);
            });

          setIsLoading(false);
          return;
        }
      }

      // 3. Fallback: check local active profile for offline session
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("caca_active_profile");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.id) {
              setProfileState(parsed);
              setUser({
                id: parsed.id,
                app_metadata: {},
                user_metadata: {},
                aud: "authenticated",
                created_at: new Date().toISOString(),
                email: parsed.email || "student@caca.app",
              });
              setIsDemoMode(false);
              setIsLoading(false);
              return;
            }
          } catch (err) {
            console.error("AuthContext.initAuth (local parse) failed:", err);
          }
        }
      }

      // 4. Default unauthenticated state
      setUser(null);
      setSession(null);
      setProfileState(null);
      setIsDemoMode(false);
    } catch (err) {
      console.error("AuthContext.initAuth failed:", err);
      setUser(null);
      setProfileState(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (event === "SIGNED_IN" && newSession?.user) {
            setSession(newSession);
            setUser(newSession.user);
            setIsDemoMode(false);
            if (typeof window !== "undefined") {
              localStorage.setItem("caca_is_demo_mode", "false");
              document.cookie = "caca_demo_mode=; path=/; max-age=0";
              document.cookie = "caca_demo_session=; path=/; max-age=0";
            }
            const p = await ProfileService.getCurrentProfile(newSession.user.id);
            if (p) setProfileState(p);
          } else if (event === "SIGNED_OUT") {
            setUser(null);
            setSession(null);
            setProfileState(null);
            setIsDemoMode(false);
            if (typeof window !== "undefined") {
              localStorage.removeItem("caca_active_profile");
              localStorage.removeItem("caca_is_demo_mode");
              document.cookie = "caca_demo_mode=; path=/; max-age=0";
              document.cookie = "caca_demo_session=; path=/; max-age=0";
            }
          }
        }
      );

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
          return { error: formatAuthError(error.message) };
        }

        loggedInUser = data.user;
        setSession(data.session);
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
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                prefersRemote: true,
                weekendAvailability: true,
                weekdayEvenings: true,
              },
            });
            hasProfile = false;
          }
        } catch (err) {
          console.error("AuthContext.signIn (profile hydration) failed:", err);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("AuthContext.signIn failed:", err);
      return { error: formatAuthError(message || "Failed to log in") };
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
          return { error: formatAuthError(error.message) };
        }

        // If user already exists in auth.users, try direct login with the given password
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          const signInRes = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: pass,
          });
          if (signInRes.data?.user && signInRes.data?.session) {
            setUser(signInRes.data.user);
            setSession(signInRes.data.session);
            setIsDemoMode(false);
            const p = await ProfileService.getCurrentProfile(signInRes.data.user.id);
            if (p) setProfileState(p);
            return { data: signInRes.data, isExistingUser: true, hasProfile: Boolean(p) };
          }
          return { error: "ACCOUNT ALREADY EXISTS. Please enter your password to log in." };
        }

        // If data.session is null, do NOT authenticate user or allow onboarding
        if (data.user && !data.session) {
          setUser(null);
          setSession(null);
          return { error: "ACCOUNT CREATED. Please check your email to confirm your account before logging in." };
        }

        if (data.user && data.session) {
          setUser(data.user);
          setSession(data.session);
          setIsDemoMode(false);

          if (typeof window !== "undefined") {
            localStorage.setItem("caca_is_demo_mode", "false");
            document.cookie = "caca_demo_mode=; path=/; max-age=0";
            document.cookie = "caca_demo_session=; path=/; max-age=0";
          }
        }

        return { data };
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
        setIsDemoMode(false);
        return { data: { user: newStudentUser, session: null } };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("AuthContext.signUp failed:", err);
      return { error: formatAuthError(message || "Failed to create account") };
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
      setUser(null);
      setSession(null);
      setProfileState(null);
      setIsDemoMode(false);

      if (typeof window !== "undefined") {
        localStorage.removeItem("caca_active_profile");
        localStorage.removeItem("caca_is_demo_mode");
        document.cookie = "caca_demo_mode=; path=/; max-age=0";
        document.cookie = "caca_demo_session=; path=/; max-age=0";
      }
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    setProfileState(CURRENT_USER);
    setUser(null);
    setSession(null);

    if (typeof window !== "undefined") {
      localStorage.setItem("caca_is_demo_mode", "true");
      document.cookie = "caca_demo_mode=true; path=/; max-age=86400; SameSite=Lax";
      document.cookie = "caca_demo_session=evaluator; path=/; max-age=86400; SameSite=Lax";
    }
  };

  const exitDemoMode = () => {
    setIsDemoMode(false);
    setProfileState(null);
    setUser(null);
    setSession(null);

    if (typeof window !== "undefined") {
      localStorage.removeItem("caca_is_demo_mode");
      document.cookie = "caca_demo_mode=; path=/; max-age=0";
      document.cookie = "caca_demo_session=; path=/; max-age=0";
    }
  };

  const updateProfileState = (newProfile: StudentProfile) => {
    setProfileState(newProfile);
    if (typeof window !== "undefined") {
      localStorage.setItem("caca_active_profile", JSON.stringify(newProfile));
    }
  };

  const refreshSession = async () => {
    await initAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isDemoMode,
        signIn,
        signUp,
        signOut,
        enterDemoMode,
        exitDemoMode,
        setProfile: updateProfileState,
        updateProfileState,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
