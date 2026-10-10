"use client";

import { useState, type FormEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowRight, Loader2 } from "lucide-react";

import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      description="Set up a dedicated support workspace for your business."
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
        className="space-y-6"
      >
        {/* BUSINESS INFORMATION */}

        <section className="space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-xs font-semibold">
              Business information
            </h2>

            <p className="mt-1 text-[11px] text-muted-foreground">
              Basic details about your organization.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="business_name"
              className="text-xs font-medium"
            >
              Business name
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
              className="h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="business_slug"
              className="text-xs font-medium"
            >
              Workspace identifier
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
              className="h-10"
              required
            />

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Use lowercase letters, numbers, and hyphens.
              This identifier must be unique.
            </p>
          </div>
        </section>

        {/* ADMIN INFORMATION */}

        <section className="space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-xs font-semibold">
              Administrator account
            </h2>

            <p className="mt-1 text-[11px] text-muted-foreground">
              The initial account for managing your workspace.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="name"
              className="text-xs font-medium"
            >
              Full name
            </label>

            <Input
              id="name"
              placeholder="Your full name"
              autoComplete="name"
              value={form.name}
              onChange={(event) =>
                updateField("name", event.target.value)
              }
              minLength={2}
              maxLength={150}
              disabled={loading}
              className="h-10"
              required
            />
          </div>

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
              placeholder="admin@company.com"
              autoComplete="email"
              value={form.email}
              onChange={(event) =>
                updateField("email", event.target.value)
              }
              disabled={loading}
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
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) =>
                updateField("password", event.target.value)
              }
              minLength={8}
              maxLength={128}
              disabled={loading}
              className="h-10"
              required
            />
          </div>
        </section>

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
              Creating workspace...
            </>
          ) : (
            <>
              Create workspace
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}