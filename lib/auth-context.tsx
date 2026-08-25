"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "./supabase/client";
import { StudentProfile } from "@/types/user";
import { ProfileService } from "@/services/profile-service";
import { CURRENT_USER } from "./mock-data";

interface AuthContextType {
  user: User | null;
  profile: StudentProfile | null;
  isDemoMode: boolean;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error?: string }>;
  signUp: (email: string, pass: string) => Promise<{ data?: any; error?: string }>;
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
      setProfileState(p);
    } else {
      const p = await ProfileService.getCurrentProfile();
      setProfileState(p);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const isDemo =
          typeof window !== "undefined" &&
          (localStorage.getItem("caca_is_demo_mode") === "true" ||
            document.cookie.includes("caca_demo_session=true"));

        if (isDemo) {
          setIsDemoMode(true);
          setProfileState(CURRENT_USER);
          setIsLoading(false);
          return;
        }

        if (isSupabaseConfigured()) {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            const p = await ProfileService.getCurrentProfile(session.user.id);
            setProfileState(p);
          } else {
            const p = await ProfileService.getCurrentProfile();
            if (p) setProfileState(p);
          }
        } else {
          // Standalone mode: load saved local profile session if present
          const p = await ProfileService.getCurrentProfile();
          if (p) {
            setUser({
              id: p.id,
              app_metadata: {},
              user_metadata: {},
              aud: "authenticated",
              created_at: new Date().toISOString(),
              email: p.email,
            });
            setProfileState(p);
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
        if (session?.user) {
          setUser(session.user);
          setIsDemoMode(false);
          if (typeof window !== "undefined") {
            localStorage.setItem("caca_is_demo_mode", "false");
            document.cookie = "caca_demo_session=; path=/; max-age=0";
          }
          const p = await ProfileService.getCurrentProfile(session.user.id);
          setProfileState(p);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfileState(null);
          setIsDemoMode(false);
          if (typeof window !== "undefined") {
            localStorage.removeItem("caca_active_profile");
            localStorage.removeItem("caca_is_demo_mode");
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
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) {
          return { error: error.message };
        }
        setUser(data.user);
        const p = await ProfileService.getCurrentProfile(data.user?.id);
        setProfileState(p);
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
        }
      }

      setIsDemoMode(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("caca_is_demo_mode", "false");
        document.cookie = "caca_demo_session=true; path=/; max-age=86400";
      }
      return {};
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
          email,
          password: pass,
        });
        if (error) {
          return { error: error.message };
        }
        setUser(data.user);
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
        document.cookie = "caca_demo_session=true; path=/; max-age=86400";
      }
      return {};
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
        document.cookie = "caca_demo_session=; path=/; max-age=0";
      }
      setIsLoading(false);
    }
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    setProfileState(CURRENT_USER);
    if (typeof window !== "undefined") {
      localStorage.setItem("caca_is_demo_mode", "true");
      document.cookie = "caca_demo_session=true; path=/; max-age=86400";
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
