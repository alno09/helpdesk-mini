"use client";

import { FormEvent, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";

import type { MeResponse } from "@/lib/api";

import { createTicket } from "@/features/tickets/api";

import type {
  TicketPriority,
} from "@/features/tickets/types";


export default function NewTicketPage() {
  const router = useRouter();

  const [allowed, setAllowed] = useState(false);

  const [form, setForm] = useState({
    subject: "",
    category: "",
    priority: "medium" as TicketPriority,
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  useEffect(() => {
    apiRequest<MeResponse>("/auth/me")
      .then((me) => {
        if (me.user.role !== "customer") {
          router.replace("/tickets");
          return;
        }

        setAllowed(true);
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

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


  if (!allowed) {
    return <p className="p-6">Checking access...</p>;
  }


  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Create Ticket
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input
          className="w-full rounded border p-3"
          placeholder="Subject"
          value={form.subject}
          onChange={(event) =>
            setForm({
              ...form,
              subject: event.target.value,
            })
          }
          required
        />

        <input
          className="w-full rounded border p-3"
          placeholder="Category"
          value={form.category}
          onChange={(event) =>
            setForm({
              ...form,
              category: event.target.value,
            })
          }
          required
        />

        <select
          className="w-full rounded border p-3"
          value={form.priority}
          onChange={(event) =>
            setForm({
              ...form,
              priority: event.target.value as TicketPriority,
            })
          }
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <textarea
          className="min-h-40 w-full rounded border p-3"
          placeholder="Describe your issue"
          value={form.message}
          onChange={(event) =>
            setForm({
              ...form,
              message: event.target.value,
            })
          }
          required
        />

        {error && (
          <p className="text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Ticket"}
        </button>
      </form>
    </main>
  );
}