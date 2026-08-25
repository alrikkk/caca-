"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signUp(email, password);
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/onboarding");
    }
  };

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
            required
          />

          <Input
            label="PASSWORD"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="p-2.5 bg-red-50 border-hard-sm border-red-500 text-xs font-mono font-bold uppercase text-red-600">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            isLoading={loading}
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
