"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  ArrowUpRight,
  Inbox,
  Plus,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/features/auth/auth-context";
import { getTickets } from "@/features/tickets/api";

import { TicketStatusBadge } from "@/features/tickets/components/ticket-status-badge";

import type {
  Ticket,
  TicketStatus,
} from "@/features/tickets/types";

// ============================================================
// FILTER CONFIGURATION
// ============================================================

type StatusFilter = TicketStatus | "all";

const statusFilters: {
  value: StatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All tickets" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

// ============================================================
// HELPERS
// ============================================================

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

// ============================================================
// PAGE
// ============================================================

export default function TicketsPage() {
  const me = useAuth();

  const currentUserId = me?.user.id;

  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [status, setStatus] = useState<StatusFilter>("all");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ==========================================================
  // DATA FETCHING
  // ==========================================================

  useEffect(() => {
    if (currentUserId == null) return;

    let active = true;

    getTickets()
      .then((data) => {
        if (!active) return;

        setTickets(data);
        setError("");
      })
      .catch((err: unknown) => {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load tickets",
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentUserId]);

  // ==========================================================
  // STATUS COUNTS
  // ==========================================================

  const statusCounts = useMemo(() => {
    const counts: Record<TicketStatus, number> = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    };

    for (const ticket of tickets) {
      counts[ticket.status] += 1;
    }

    return counts;
  }, [tickets]);

  // ==========================================================
  // FILTERING & SORTING
  // ==========================================================

  const filteredTickets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tickets
      .filter((ticket) => {
        if (status !== "all" && ticket.status !== status) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const searchableText = [
          ticket.id,
          ticket.subject,
          ticket.category,
          ticket.priority,
          ticket.status,
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() -
          new Date(a.updated_at).getTime(),
      );
  }, [tickets, status, search]);

  const isCustomer = me?.user.role === "customer";

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Tickets
            </h1>

            {!loading && !error && (
              <span className="rounded-md border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {tickets.length}
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {isCustomer
              ? "Track and manage your support requests."
              : "View and manage customer support requests."}
          </p>
        </div>

        {isCustomer && (
          <Button asChild size="sm" className="gap-2">
            <Link href="/tickets/new">
              <Plus className="size-4" />
              New Ticket
            </Link>
          </Button>
        )}
      </header>

      {/* ======================================================
          MAIN WORKSPACE
      ====================================================== */}

      <section className="overflow-hidden rounded-lg border bg-card">
        {/* STATUS FILTERS */}

        <div
          className="flex overflow-x-auto border-b"
          role="group"
          aria-label="Filter tickets by status"
        >
          {statusFilters.map((filter) => {
            const active = status === filter.value;

            const count =
              filter.value === "all"
                ? tickets.length
                : statusCounts[filter.value];

            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={active}
                onClick={() => setStatus(filter.value)}
                className={[
                  "flex min-w-max flex-1 items-center justify-center gap-2",
                  "border-b-2 px-4 py-4",
                  "text-xs font-medium",
                  "transition-colors",
                  active
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                ].join(" ")}
              >
                <span>{filter.label}</span>

                <span
                  className={[
                    "rounded px-1.5 py-0.5 text-[10px]",
                    active
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {loading ? "—" : count}
                </span>
              </button>
            );
          })}
        </div>

        {/* TOOLBAR */}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="relative w-full max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <Input
              type="search"
              aria-label="Search tickets"
              placeholder="Search tickets..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 bg-background pl-9 text-sm"
            />
          </div>

          <p
            className="text-xs text-muted-foreground"
            aria-live="polite"
          >
            {loading || error
              ? "—"
              : `${filteredTickets.length} ${
                  filteredTickets.length === 1
                    ? "ticket"
                    : "tickets"
                }`}
          </p>
        </div>

        {/* ERROR STATE */}

        {error && (
          <div
            role="alert"
            className="border-b px-4 py-4 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {/* LOADING STATE */}

        {loading && (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="flex items-center gap-4 border-b px-5 py-5 last:border-b-0"
              >
                <Skeleton className="h-9 w-9 shrink-0 rounded-md" />

                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-48 max-w-full" />
                  <Skeleton className="h-3 w-28 max-w-full" />
                </div>

                <Skeleton className="hidden h-6 w-20 sm:block" />
              </div>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}

        {!loading && !error && filteredTickets.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 flex size-11 items-center justify-center rounded-lg border bg-muted/50">
              <Inbox className="size-5 text-muted-foreground" />
            </div>

            <h2 className="text-sm font-semibold">
              No tickets found
            </h2>

            <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
              {search.trim()
                ? "No tickets match your search. Try another keyword."
                : status !== "all"
                  ? "There are no tickets with this status."
                  : "There are no support tickets to display yet."}
            </p>

            {(search || status !== "all") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-5"
                onClick={() => {
                  setSearch("");
                  setStatus("all");
                }}
              >
                Clear filters
              </Button>
            )}

            {!search && status === "all" && isCustomer && (
              <Button asChild size="sm" className="mt-5">
                <Link href="/tickets/new">
                  <Plus className="size-4" />
                  Create your first ticket
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* ====================================================
            DESKTOP TABLE
        ==================================================== */}

        {!loading && !error && filteredTickets.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left">
                <thead className="border-b bg-muted/30">
                  <tr className="text-[11px] font-medium text-muted-foreground">
                    <th
                      scope="col"
                      className="w-[38%] px-5 py-3 font-medium"
                    >
                      Ticket
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      Status
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      Priority
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      Assignee
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      Updated
                    </th>

                    <th
                      scope="col"
                      className="w-10 px-4 py-3"
                    >
                      <span className="sr-only">Open ticket</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="transition-colors hover:bg-muted/40"
                    >
                      {/* SUBJECT */}

                      <td className="px-5 py-4">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="group block space-y-1"
                        >
                          <p className="line-clamp-1 text-[13px] font-medium text-foreground group-hover:text-primary">
                            {ticket.subject}
                          </p>

                          <p className="text-[11px] text-muted-foreground">
                            #{ticket.id}
                            <span className="mx-2">·</span>
                            <span className="capitalize">
                              {formatLabel(ticket.category)}
                            </span>
                          </p>
                        </Link>
                      </td>

                      {/* STATUS */}

                      <td className="px-4 py-4">
                        <TicketStatusBadge
                          status={ticket.status}
                        />
                      </td>

                      {/* PRIORITY */}

                      <td className="px-4 py-4">
                        <span className="text-xs capitalize text-foreground/80">
                          {formatLabel(ticket.priority)}
                        </span>
                      </td>

                      {/* ASSIGNEE */}

                      <td className="px-4 py-4">
                        <span className="text-xs text-muted-foreground">
                          {ticket.assigned_agent_id != null
                            ? `Agent #${ticket.assigned_agent_id}`
                            : "Unassigned"}
                        </span>
                      </td>

                      {/* UPDATED */}

                      <td className="whitespace-nowrap px-4 py-4">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(ticket.updated_at)}
                        </span>
                      </td>

                      {/* ACTION */}

                      <td className="px-4 py-4">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          aria-label={`Open ticket ${ticket.id}`}
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <ArrowUpRight className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ================================================
                MOBILE TICKET LIST
            ================================================ */}

            <div className="divide-y md:hidden">
              {filteredTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="block space-y-3 px-4 py-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[11px] text-muted-foreground">
                        Ticket #{ticket.id}
                      </p>

                      <h2 className="line-clamp-2 text-sm font-medium">
                        {ticket.subject}
                      </h2>
                    </div>

                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <TicketStatusBadge
                      status={ticket.status}
                    />

                    <span className="rounded-md bg-muted px-2 py-1 text-[11px] capitalize text-muted-foreground">
                      {formatLabel(ticket.priority)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                    <span className="truncate capitalize">
                      {formatLabel(ticket.category)}
                    </span>

                    <span className="shrink-0">
                      {formatDate(ticket.updated_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}