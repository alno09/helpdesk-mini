"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Plus, Ticket as TicketIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/features/auth/auth-context";
import { getTickets } from "@/features/tickets/api";

import { TicketStatusBadge } from "@/features/tickets/components/ticket-status-badge";

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
  const me = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [status, setStatus] = useState<
    TicketStatus | "all"
  >("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  useEffect(() => {
    if (!me) return;

    let active = true;

    getTickets(status === "all" ? undefined : status)
      .then((data) => {
        if (active) setTickets(data);
      })
      .catch((err: unknown) => {
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
  }, [status, me]);


  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Tickets
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track support requests.
          </p>
        </div>

        {me?.user.role === "customer" && (
          <Button asChild>
            <Link href="/tickets/new">
              <Plus size={16} />
              New Ticket
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Tickets found
            </p>

            <p className="text-2xl font-bold">
              {loading ? "..." : tickets.length}
            </p>
          </div>

          <Select
            value={status}
            onValueChange={(value) => {
              setLoading(true);
              setError("");
              setStatus(value as TicketStatus | "all");
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                All statuses
              </SelectItem>

              {statuses.map((item) => (
                <SelectItem key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <Skeleton
              key={item}
              className="h-28 w-full"
            />
          ))}
        </div>
      ) : !error && tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <TicketIcon
              size={36}
              className="text-muted-foreground"
            />

            <h2 className="font-semibold">
              No tickets found
            </h2>

            <p className="text-sm text-muted-foreground">
              There are no tickets matching this filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/tickets/${ticket.id}`}
              className="block"
            >
              <Card className="transition-colors hover:bg-accent/40">
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        TICKET #{ticket.id}
                      </p>

                      <h2 className="mt-1 font-semibold">
                        {ticket.subject}
                      </h2>
                    </div>

                    <TicketStatusBadge
                      status={ticket.status}
                    />
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                    <span>
                      Category: {ticket.category}
                    </span>

                    <span>
                      Priority: {ticket.priority}
                    </span>

                    <span>
                      Agent:{" "}
                      {ticket.assigned_agent_id ?? "Unassigned"}
                    </span>

                    <span>
                      Updated:{" "}
                      {new Date(
                        ticket.updated_at,
                      ).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}