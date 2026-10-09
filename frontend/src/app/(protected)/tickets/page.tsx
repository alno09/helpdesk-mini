"use client";

import Link from "next/link";

import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";

import type { MeResponse } from "@/lib/api";

import { getTickets } from "@/features/tickets/api";

import type {
  Ticket,
  TicketStatus,
} from "@/features/tickets/types";


const statuses: TicketStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];


export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [status, setStatus] = useState<
    TicketStatus | ""
  >("");

  const [me, setMe] = useState<MeResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  useEffect(() => {
    apiRequest<MeResponse>("/auth/me")
      .then(setMe)
      .catch(() => {
        setError("Failed to load user information");
      });
  }, []);


  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    getTickets(status || undefined)
      .then((data) => {
        if (active) setTickets(data);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load tickets",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [status]);


  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">
          Tickets
        </h1>

        {me?.user.role === "customer" && (
          <Link
            href="/tickets/new"
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            New Ticket
          </Link>
        )}
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium">
          Filter by status
        </label>

        <select
          className="rounded border p-2"
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value as TicketStatus | "",
            )
          }
        >
          <option value="">All tickets</option>

          {statuses.map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading tickets...</p>}

      {error && (
        <p className="text-red-500">{error}</p>
      )}

      {!loading && !error && tickets.length === 0 && (
        <p>No tickets found.</p>
      )}

      <div className="space-y-3">
        {tickets.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/tickets/${ticket.id}`}
            className="block rounded-lg border p-4 transition hover:bg-gray-50"
          >
            <div className="flex justify-between gap-4">
              <div>
                <h2 className="font-semibold">
                  #{ticket.id} — {ticket.subject}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {ticket.category}
                </p>
              </div>

              <span className="text-sm">
                {ticket.status.replaceAll("_", " ")}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
              <span>
                Priority: {ticket.priority}
              </span>

              <span>
                Agent:{" "}
                {ticket.assigned_agent_id ?? "Unassigned"}
              </span>

              <span>
                Updated:{" "}
                {new Date(ticket.updated_at).toLocaleString()}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}