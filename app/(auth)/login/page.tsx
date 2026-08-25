"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UserPlus, ArrowRight } from "lucide-react";

export default function UnifiedAuthPage() {
  const { signIn, signUp, enterDemoMode } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [accountNotFound, setAccountNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setAccountNotFound(false);

    const email = identifier.trim();

    if (isSignUp) {
      // Direct Account Creation
      try {
        const res = await signUp(email, password);
        if (res.error) {
          setError(res.error);
          setLoading(false);
        } else if (res.hasProfile) {
          window.location.href = "/feed";
        } else {
          window.location.href = "/onboarding";
        }
      } catch (err: any) {
        setError(err?.message || "Account creation failed.");
        setLoading(false);
      }
    } else {
      // Existing User Login
      try {
        const res = await signIn(email, password);
        if (res.error) {
          if (
            res.error.toLowerCase().includes("invalid") ||
            res.error.toLowerCase().includes("not found")
          ) {
            setAccountNotFound(true);
            setError(null);
          } else {
            setError(res.error);
          }
          setLoading(false);
          return;
        }

        if (res.hasProfile === false) {
          window.location.href = "/onboarding";
        } else {
          window.location.href = "/feed";
        }
      } catch (err: any) {
        setError(err?.message || "Authentication failed. Please check credentials.");
        setLoading(false);
      }
    }
  };

  const handleCreateAccountWithCredentials = async () => {
    if (loading || !identifier.trim() || !password) return;
    setLoading(true);
    setError(null);
    setAccountNotFound(false);

    try {
      const res = await signUp(identifier.trim(), password);
      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else if (res.hasProfile) {
        window.location.href = "/feed";
      } else {
        window.location.href = "/onboarding";
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create account.");
      setLoading(false);
    }
  };

  const handleDemo = () => {
    enterDemoMode();
    window.location.href = "/feed";
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4 bg-grid-subtle">
      <div className="w-full max-w-sm bg-white border-hard shadow-hard-xl p-6 sm:p-8 space-y-5">
        {/* Brand Header */}
        <div className="text-center border-b-2 border-ink pb-3.5">
          <span className="bg-ink text-caca-lime px-3 py-1 border-hard text-2xl font-black font-mono inline-block">
            CACA
          </span>
          <p className="text-[11px] font-mono font-bold uppercase text-ink mt-1.5">
            {isSignUp ? "CREATE NEW STUDENT ACCOUNT" : "SIGN IN TO YOUR SQUAD"}
          </p>
        </div>

        {/* Demo Mode Button for Evaluators */}
        <div className="border-hard p-2.5 bg-canvas-subtle space-y-1.5">
          <p className="text-[9px] font-mono font-bold uppercase text-ink-muted">
            HACKATHON EVALUATOR / GUEST
          </p>
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={handleDemo}
            className="w-full text-xs h-8"
          >
            <span>TRY DEMO MODE (ALEX CHEN)</span>
          </Button>
        </div>

        {/* Unified Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Input
            label="EMAIL / PHONE"
            type="text"
            placeholder="student@university.edu"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setAccountNotFound(false);
            }}
            disabled={loading}
            required
          />

          <Input
            label="PASSWORD"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setAccountNotFound(false);
            }}
            disabled={loading}
            required
          />

          {accountNotFound && (
            <div className="p-3 bg-canvas-subtle border-hard space-y-2 text-xs font-mono">
              <p className="font-bold text-ink uppercase">ACCOUNT NOT FOUND</p>
              <p className="text-ink-muted text-[11px]">
                No account found for <span className="font-bold text-ink">{identifier}</span>.
              </p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCreateAccountWithCredentials}
                isLoading={loading}
                className="w-full flex items-center justify-center gap-1.5 text-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>CREATE ACCOUNT WITH THESE CREDENTIALS →</span>
              </Button>
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-red-50 border-hard-sm border-red-500 text-xs font-mono font-bold uppercase text-red-600 leading-snug">
              {error}
            </div>
          )}

          {!accountNotFound && (
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full flex items-center justify-center gap-1.5"
              isLoading={loading}
              disabled={loading || !identifier.trim() || !password}
            >
              <span>{isSignUp ? "CREATE ACCOUNT" : "CONTINUE"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </form>

        {/* Mode Toggle Footer */}
        <div className="border-t-2 border-ink pt-3 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setAccountNotFound(false);
            }}
            className="font-mono text-xs font-bold text-ink hover:underline uppercase inline-flex items-center gap-1"
          >
            <span>
              {isSignUp
                ? "ALREADY REGISTERED? LOG IN →"
                : "NEW TO CACA? CREATE ACCOUNT →"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
