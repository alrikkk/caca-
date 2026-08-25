"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Mail, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submit
    setLoading(true);
    setError(null);

    try {
      const res = await signUp(email, password);
      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else if (res.needsEmailConfirmation) {
        setEmailSent(true);
        setLoading(false);
      } else {
        router.push("/onboarding");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create account. Please try again.");
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4 bg-grid-subtle">
        <div className="w-full max-w-sm bg-white border-hard shadow-hard-xl p-6 sm:p-8 space-y-6 text-center">
          <div className="border-b-2 border-ink pb-4">
            <span className="bg-ink text-caca-lime px-3 py-1 border-hard text-2xl font-black font-mono inline-block">
              CACA
            </span>
          </div>

          <div className="p-4 bg-canvas-subtle border-hard space-y-3">
            <div className="w-10 h-10 bg-caca-lime border-hard flex items-center justify-center mx-auto">
              <Mail className="w-5 h-5 text-ink" />
            </div>
            <h2 className="text-base font-black font-mono uppercase text-ink">
              ACCOUNT CREATED
            </h2>
            <p className="text-xs font-mono font-bold text-ink">
              CHECK YOUR EMAIL
            </p>
            <p className="text-xs font-mono text-ink-muted leading-relaxed">
              We sent a verification link to <span className="font-bold text-ink">{email}</span>. Please click the link in your inbox to verify your account, then log in.
            </p>
          </div>

          <Link href="/login">
            <Button variant="primary" size="md" className="w-full">
              <span>RETURN TO LOG IN →</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4 bg-grid-subtle">
      <div className="w-full max-w-sm bg-white border-hard shadow-hard-xl p-6 sm:p-8 space-y-6">
        <div className="text-center border-b-2 border-ink pb-4">
          <span className="bg-ink text-caca-lime px-3 py-1 border-hard text-2xl font-black font-mono inline-block">
            CACA
          </span>
          <p className="text-xs font-mono font-bold uppercase text-ink mt-2">
            NEW STUDENT ACCOUNT
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            label="EMAIL"
            type="email"
            placeholder="student@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />

          <Input
            label="PASSWORD"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />

          {error && (
            <div className="p-2.5 bg-red-50 border-hard-sm border-red-500 text-xs font-mono font-bold uppercase text-red-600 leading-snug">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            isLoading={loading}
            disabled={loading}
          >
            <span>CONTINUE TO SETUP →</span>
          </Button>
        </form>

        <div className="border-t-2 border-ink pt-3 text-center">
          <Link
            href="/login"
            className="font-mono text-xs font-bold text-ink hover:underline uppercase inline-flex items-center gap-1"
          >
            <span>ALREADY HAVE AN ACCOUNT? LOG IN</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
