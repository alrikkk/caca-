"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, enterDemoMode } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn(email, password);
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/feed");
    }
  };

  const handleDemo = () => {
    enterDemoMode();
    router.push("/feed");
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4 bg-grid-subtle">
      <div className="w-full max-w-sm bg-white border-hard shadow-hard-xl p-6 sm:p-8 space-y-6">
        {/* Brand */}
        <div className="text-center border-b-2 border-ink pb-4">
          <span className="bg-ink text-caca-lime px-3 py-1 border-hard text-2xl font-black font-mono inline-block">
            CACA
          </span>
        </div>

        {/* Demo Mode Button */}
        <div className="border-hard p-3 bg-canvas-subtle space-y-2">
          <p className="text-[10px] font-mono font-bold uppercase text-ink-muted">
            HACKATHON JUDGE / EVALUATOR
          </p>
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={handleDemo}
            className="w-full text-xs"
          >
            <span>TRY DEMO MODE (ALEX CHEN)</span>
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
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
            <span>LOG IN</span>
          </Button>
        </form>

        {/* Create Account Link */}
        <div className="border-t-2 border-ink pt-3 text-center">
          <Link
            href="/signup"
            className="font-mono text-xs font-bold text-ink hover:underline uppercase inline-flex items-center gap-1"
          >
            <span>CREATE ACCOUNT</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
