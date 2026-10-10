"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/features/auth/auth-context";
import { createTicket } from "@/features/tickets/api";

import type {
  TicketPriority,
} from "@/features/tickets/types";

export default function NewTicketPage() {
  const router = useRouter();
  const me = useAuth();

  const [form, setForm] = useState({
    subject: "",
    category: "",
    priority: "medium" as TicketPriority,
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (me && me.user.role !== "customer") {
      router.replace("/tickets");
    }
  }, [me, router]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading || me?.user.role !== "customer") {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const ticket = await createTicket(form);

      router.push(`/tickets/${ticket.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create ticket",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!me || me.user.role !== "customer") {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* BREADCRUMB */}

      <Link
        href="/tickets"
        className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All tickets
      </Link>

      {/* HEADER */}

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          New ticket
        </h1>

        <p className="text-sm text-muted-foreground">
          Describe your request and start a support conversation.
        </p>
      </header>

      {/* FORM */}

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">
            Ticket information
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Provide the details needed to understand your issue.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 p-5 sm:p-6">
            {/* SUBJECT */}

            <div className="space-y-2">
              <label
                htmlFor="subject"
                className="text-xs font-medium"
              >
                Subject
              </label>

              <Input
                id="subject"
                placeholder="Briefly describe your issue"
                value={form.subject}
                minLength={3}
                maxLength={255}
                disabled={loading}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    subject: event.target.value,
                  }))
                }
                className="h-10"
                required
              />
            </div>

            {/* CATEGORY AND PRIORITY */}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="category"
                  className="text-xs font-medium"
                >
                  Category
                </label>

                <Input
                  id="category"
                  placeholder="e.g. Billing, Technical"
                  value={form.category}
                  minLength={2}
                  maxLength={100}
                  disabled={loading}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      category: event.target.value,
                    }))
                  }
                  className="h-10"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="priority"
                  className="text-xs font-medium"
                >
                  Priority
                </label>

                <Select
                  value={form.priority}
                  disabled={loading}
                  onValueChange={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      priority: value as TicketPriority,
                    }))
                  }
                >
                  <SelectTrigger
                    id="priority"
                    className="h-10! w-full"
                  >
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* DESCRIPTION */}

            <div className="space-y-2">
              <label
                htmlFor="message"
                className="text-xs font-medium"
              >
                Description
              </label>

              <Textarea
                id="message"
                placeholder="Explain what happened and how we can help..."
                value={form.message}
                maxLength={5000}
                disabled={loading}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    message: event.target.value,
                  }))
                }
                className="min-h-44 resize-y text-sm"
                required
              />

              <p className="text-[11px] text-muted-foreground">
                This message will start your ticket conversation.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
              >
                {error}
              </div>
            )}
          </div>

          {/* ACTION BAR */}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-4 sm:px-6">
            <p className="text-[11px] text-muted-foreground">
              All fields are required.
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <Link href="/tickets">
                  Cancel
                </Link>
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={loading}
              >
                <Send className="size-3.5" />

                {loading
                  ? "Creating..."
                  : "Create ticket"}
              </Button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}