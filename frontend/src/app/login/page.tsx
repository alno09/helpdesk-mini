"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowRight,
  Loader2,
  LockKeyhole,
  Mail,
} from "lucide-react";

import { AuthShell } from "@/components/layout/auth-shell";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  publicRequest,
  saveTokens,
  type TokenPair,
} from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const tokens = await publicRequest<TokenPair>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        },
      );

      saveTokens(tokens);

      router.replace("/tickets");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to your workspace to manage support tickets."
      footer={
        <>
          New to HelpDesk Mini?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Register your business
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* EMAIL */}

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-medium"
          >
            Email address
          </label>

          <div className="relative">
            <Mail
              size={17}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />

            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              className="pl-10"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* PASSWORD */}

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium"
          >
            Password
          </label>

          <div className="relative">
            <LockKeyhole
              size={17}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />

            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              className="pl-10"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {/* SUBMIT */}

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2
                size={17}
                className="animate-spin"
              />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight size={17} />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}