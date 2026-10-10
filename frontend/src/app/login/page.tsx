"use client";

import { useState, type FormEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowRight, Loader2 } from "lucide-react";

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
      description="Enter your credentials to access your support workspace."
      footer={
        <>
          Don&apos;t have a workspace?{" "}
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
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-xs font-medium"
          >
            Email address
          </label>

          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            value={email}
            disabled={loading}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10"
            required
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-xs font-medium"
          >
            Password
          </label>

          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            disabled={loading}
            onChange={(event) => setPassword(event.target.value)}
            className="h-10"
            required
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="h-10 w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}