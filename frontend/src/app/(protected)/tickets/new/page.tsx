"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";

import { ArrowLeft, Send } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

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

    if (me?.user.role !== "customer") return;

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
    <div className="mx-auto max-w-3xl space-y-6">
      <Button
        variant="ghost"
        asChild
      >
        <Link href="/tickets">
          <ArrowLeft size={16} />
          Back to Tickets
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Create Ticket
        </h1>

        <p className="mt-1 text-muted-foreground">
          Describe your issue to get assistance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Information</CardTitle>
          <CardDescription>
            Provide details about your request.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div className="space-y-2">
              <label
                htmlFor="subject"
                className="text-sm font-medium"
              >
                Subject
              </label>

              <Input
                id="subject"
                placeholder="Briefly describe your issue"
                value={form.subject}
                minLength={3}
                maxLength={255}
                onChange={(event) =>
                  setForm({
                    ...form,
                    subject: event.target.value,
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="category"
                className="text-sm font-medium"
              >
                Category
              </label>

              <Input
                id="category"
                placeholder="e.g. Billing, Technical"
                value={form.category}
                minLength={2}
                maxLength={100}
                onChange={(event) =>
                  setForm({
                    ...form,
                    category: event.target.value,
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Priority
              </label>

              <Select
                value={form.priority}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    priority: value as TicketPriority,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="message"
                className="text-sm font-medium"
              >
                Description
              </label>

              <Textarea
                id="message"
                placeholder="Explain what happened..."
                className="min-h-40"
                value={form.message}
                maxLength={5000}
                onChange={(event) =>
                  setForm({
                    ...form,
                    message: event.target.value,
                  })
                }
                required
              />
            </div>

            {error && (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" asChild>
                <Link href="/tickets">Cancel</Link>
              </Button>

              <Button type="submit" disabled={loading}>
                <Send size={16} />
                {loading ? "Creating..." : "Create Ticket"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}