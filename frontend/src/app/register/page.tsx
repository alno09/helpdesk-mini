"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowRight,
  Loader2,
} from "lucide-react";

import { AuthShell } from "@/components/layout/auth-shell";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import { publicRequest } from "@/lib/api";

interface RegisterForm {
  business_name: string;
  business_slug: string;
  name: string;
  email: string;
  password: string;
}

const initialForm: RegisterForm = {
  business_name: "",
  business_slug: "",
  name: "",
  email: "",
  password: "",
};

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState<RegisterForm>(
    initialForm,
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(
    field: keyof RegisterForm,
    value: string,
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      await publicRequest("/auth/register-business", {
        method: "POST",
        body: JSON.stringify({
          business_name: form.business_name.trim(),
          business_slug: form.business_slug.trim(),
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });

      router.replace("/login");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your workspace"
      description="Register your business and create its administrator account."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* BUSINESS INFORMATION */}

        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold">
              Business Information
            </h2>

            <p className="text-xs text-muted-foreground">
              Your business will have its own support workspace.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="business_name"
              className="text-sm font-medium"
            >
              Business Name
            </label>

            <Input
              id="business_name"
              placeholder="e.g. Coffee House"
              value={form.business_name}
              onChange={(event) =>
                updateField(
                  "business_name",
                  event.target.value,
                )
              }
              minLength={2}
              maxLength={150}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="business_slug"
              className="text-sm font-medium"
            >
              Business Slug
            </label>

            <Input
              id="business_slug"
              placeholder="coffee-house"
              value={form.business_slug}
              onChange={(event) =>
                updateField(
                  "business_slug",
                  event.target.value.toLowerCase(),
                )
              }
              minLength={3}
              maxLength={150}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title="Use lowercase letters, numbers and hyphens."
              disabled={loading}
              required
            />

            <p className="text-xs text-muted-foreground">
              Use lowercase letters, numbers and hyphens.
              The slug must be unique.
            </p>
          </div>
        </div>

        <Separator />

        {/* ADMIN INFORMATION */}

        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold">
              Administrator Account
            </h2>

            <p className="text-xs text-muted-foreground">
              This account will manage your business users
              and support tickets.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="name"
              className="text-sm font-medium"
            >
              Full Name
            </label>

            <Input
              id="name"
              placeholder="Your full name"
              autoComplete="name"
              value={form.name}
              onChange={(event) =>
                updateField(
                  "name",
                  event.target.value,
                )
              }
              minLength={2}
              maxLength={150}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium"
            >
              Email Address
            </label>

            <Input
              id="email"
              type="email"
              placeholder="admin@company.com"
              autoComplete="email"
              value={form.email}
              onChange={(event) =>
                updateField(
                  "email",
                  event.target.value,
                )
              }
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium"
            >
              Password
            </label>

            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) =>
                updateField(
                  "password",
                  event.target.value,
                )
              }
              minLength={8}
              maxLength={128}
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
              Creating workspace...
            </>
          ) : (
            <>
              Create Workspace
              <ArrowRight size={17} />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}