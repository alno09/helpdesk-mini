"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  ArrowLeft,
  ArrowUpRight,
  Clock3,
  Inbox,
  Search,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { apiRequest, type User } from "@/lib/api";
import { useAuth } from "@/features/auth/auth-context";

import {
  getTicket,
  getTickets,
  getTicketMessages,
  updateTicket,
} from "@/features/tickets/api";

import { TicketStatusBadge } from "@/features/tickets/components/ticket-status-badge";

import {
  useTicketRoom,
  type TicketRoomEvent,
} from "@/features/chat/hooks/use-ticket-room";

import type {
  Message,
  Ticket,
  TicketStatus,
  UpdateTicketPayload,
} from "@/features/tickets/types";

// ============================================================
// CONSTANTS
// ============================================================

const nextStatus: Partial<
  Record<TicketStatus, TicketStatus>
> = {
  open: "in_progress",
  in_progress: "resolved",
  resolved: "closed",
};

// ============================================================
// HELPERS
// ============================================================

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

// ============================================================
// PAGE CONTENT
// ============================================================

function TicketDetailContent({
  ticketId,
}: {
  ticketId: number;
}) {
  const me = useAuth();

  const currentUserId = me?.user.id;
  const currentRole = me?.user.role;

  // Ticket data
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<User[]>([]);

  // Ticket navigator
  const [nearbyTickets, setNearbyTickets] = useState<Ticket[]>([]);
  const [ticketSearch, setTicketSearch] = useState("");
  const [listLoading, setListLoading] = useState(true);

  // Forms
  const [draft, setDraft] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");

  // UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ==========================================================
  // WEBSOCKET EVENTS
  // ==========================================================

  const handleRoomEvent = useCallback(
    (event: TicketRoomEvent) => {
      switch (event.type) {
        case "message.created": {
          setMessages((previous) => {
            const exists = previous.some(
              (message) => message.id === event.message.id,
            );

            if (exists) return previous;

            return [...previous, event.message];
          });

          break;
        }

        case "ticket.updated": {
          setTicket(event.ticket);

          setNearbyTickets((previous) =>
            previous.map((item) =>
              item.id === event.ticket.id
                ? event.ticket
                : item,
            ),
          );

          break;
        }

        case "error": {
          setError(event.detail);
          break;
        }
      }
    },
    [],
  );

  // ==========================================================
  // WEBSOCKET CONNECTION
  // ==========================================================

  const {
    connected,
    error: socketError,
    sendMessage,
  } = useTicketRoom(
    ticketId,
    Boolean(me && ticket?.id === ticketId),
    handleRoomEvent,
  );

  // ==========================================================
  // INITIAL TICKET DATA
  // ==========================================================

  useEffect(() => {
    if (currentUserId == null) return;

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return;
    }

    let active = true;

    const agentsRequest =
      currentRole === "admin"
        ? apiRequest<User[]>("/users")
        : Promise.resolve<User[]>([]);

    Promise.all([
      getTicket(ticketId),
      getTicketMessages(ticketId),
      agentsRequest,
    ])
      .then(([ticketData, messageData, agentsData]) => {
        if (!active) return;

        setTicket(ticketData);
        setMessages(messageData);

        setAgents(
          agentsData.filter(
            (user) => user.role === "agent",
          ),
        );

        setError("");
      })
      .catch((err: unknown) => {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load ticket",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [ticketId, currentUserId, currentRole]);

  // ==========================================================
  // TICKET NAVIGATOR DATA
  // ==========================================================

  useEffect(() => {
    if (currentUserId == null) return;

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return;
    }

    let active = true;

    getTickets()
      .then((data) => {
        if (active) {
          setNearbyTickets(data);
        }
      })
      .catch(() => {
        if (active) {
          setNearbyTickets([]);
        }
      })
      .finally(() => {
        if (active) {
          setListLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentUserId, ticketId]);

  // ==========================================================
  // FILTER NAVIGATOR
  // ==========================================================

  const filteredNearbyTickets = useMemo(() => {
    const query = ticketSearch.trim().toLowerCase();

    return nearbyTickets
      .filter((item) => {
        if (!query) return true;

        return (
          item.subject.toLowerCase().includes(query) ||
          String(item.id).includes(query)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() -
          new Date(a.updated_at).getTime(),
      );
  }, [nearbyTickets, ticketSearch]);

  // ==========================================================
  // AUTO SCROLL CONVERSATION
  // ==========================================================

  useEffect(() => {
    if (loading) return;

    const container = messagesContainerRef.current;

    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, [messages.length, loading]);

  // ==========================================================
  // UPDATE TICKET
  // ==========================================================

  async function handleUpdate(
    payload: UpdateTicketPayload,
  ) {
    setSaving(true);
    setError("");

    try {
      const updated = await updateTicket(
        ticketId,
        payload,
      );

      setTicket(updated);

      setNearbyTickets((previous) =>
        previous.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update ticket",
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  function handleSendMessage(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const body = draft.trim();

    if (!body) return;

    const success = sendMessage(body);

    if (!success) {
      setError("WebSocket is not connected.");
      return;
    }

    setDraft("");
    setError("");
  }

  // ==========================================================
  // INVALID TICKET ID
  // ==========================================================

  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">
          Invalid ticket ID
        </h1>

        <Button variant="outline" asChild>
          <Link href="/tickets">
            <ArrowLeft className="size-4" />
            Back to Tickets
          </Link>
        </Button>
      </div>
    );
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (!me || loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-44" />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_248px]">
          <Skeleton className="h-[550px] w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  // ==========================================================
  // NOT FOUND
  // ==========================================================

  if (!ticket || ticket.id !== ticketId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">
          Unable to load ticket
        </h1>

        <p role="alert" className="text-sm text-destructive">
          {error || "Ticket not found."}
        </p>

        <Button variant="outline" asChild>
          <Link href="/tickets">
            <ArrowLeft className="size-4" />
            Back to Tickets
          </Link>
        </Button>
      </div>
    );
  }

  // ==========================================================
  // PERMISSIONS
  // ==========================================================

  const role = me.user.role;

  const isStaff =
    role === "admin" ||
    role === "agent";

  const allowedNextStatus = nextStatus[ticket.status];

  const canSend =
    role !== "admin" &&
    ticket.status !== "closed";

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4">

      {/* TOP NAVIGATION */}

      <div className="flex items-center justify-between gap-4">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All tickets
        </Link>

        <span className="text-xs text-muted-foreground">
          Ticket #{ticket.id}
        </span>
      </div>

      {/* WORKSPACE */}

      <div
        className="
          grid min-w-0 items-start gap-4
          xl:grid-cols-[minmax(0,1fr)_248px]
          2xl:grid-cols-[220px_minmax(0,1fr)_248px]
        "
      >

        {/* ====================================================
            LEFT — TICKET NAVIGATOR
        ==================================================== */}

        <aside
          aria-label="Ticket navigator"
          className="
            hidden h-[min(760px,calc(100vh-9rem))]
            min-h-[480px] flex-col
            overflow-hidden rounded-lg border bg-card
            2xl:flex
          "
        >
          <div className="border-b px-4 py-4">
            <h2 className="text-xs font-semibold">
              All tickets
            </h2>

            <p className="mt-1 text-[11px] text-muted-foreground">
              Switch conversations
            </p>

            <div className="relative mt-4">
              <Search
                className="
                  pointer-events-none absolute
                  top-1/2 left-2.5 size-3.5
                  -translate-y-1/2 text-muted-foreground
                "
              />

              <Input
                type="search"
                placeholder="Search tickets..."
                aria-label="Search ticket navigator"
                value={ticketSearch}
                onChange={(event) =>
                  setTicketSearch(event.target.value)
                }
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {listLoading ? (
              <div className="space-y-4 p-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredNearbyTickets.length === 0 ? (
              <div className="p-5 text-center">
                <Inbox className="mx-auto size-5 text-muted-foreground" />

                <p className="mt-3 text-xs text-muted-foreground">
                  No tickets found.
                </p>
              </div>
            ) : (
              <nav className="divide-y">
                {filteredNearbyTickets.map((item) => {
                  const active = item.id === ticketId;

                  return (
                    <Link
                      key={item.id}
                      href={`/tickets/${item.id}`}
                      aria-current={
                        active ? "page" : undefined
                      }
                      className={[
                        "block space-y-2 px-4 py-3",
                        "transition-colors",
                        active
                          ? "bg-accent"
                          : "hover:bg-muted/50",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          #{item.id}
                        </span>

                        {active && (
                          <span className="size-1.5 rounded-full bg-primary" />
                        )}
                      </div>

                      <p className="line-clamp-2 text-xs font-medium leading-relaxed">
                        {item.subject}
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[10px] capitalize text-muted-foreground">
                          {formatLabel(item.status)}
                        </span>

                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(item.updated_at)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
        </aside>

        {/* ====================================================
            CENTER — CONVERSATION
        ==================================================== */}

        <section
          aria-label="Ticket conversation"
          className="
            flex h-[640px] min-h-[480px] min-w-0
            flex-col overflow-hidden rounded-lg
            border bg-card
            xl:h-[min(760px,calc(100vh-9rem))]
          "
        >
          {/* CONVERSATION HEADER */}

          <header className="border-b px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Conversation · #{ticket.id}
                </p>

                <h1 className="wrap-break-word text-lg font-semibold tracking-tight">
                  {ticket.subject}
                </h1>

                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock3 className="size-3" />

                  Created {formatDate(ticket.created_at)}
                </p>
              </div>

              <TicketStatusBadge
                status={ticket.status}
              />
            </div>
          </header>

          {/* MESSAGE HISTORY */}

          <div
            ref={messagesContainerRef}
            className="min-h-0 flex-1 overflow-y-auto px-5 py-5"
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                  <Inbox className="size-5 text-muted-foreground" />
                </div>

                <p className="mt-3 text-sm font-medium">
                  No messages yet
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  The conversation will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((message) => {
                  const isMine =
                    message.sender_id === me.user.id;

                  return (
                    <div
                      key={message.id}
                      className={[
                        "flex min-w-0 gap-3",
                        isMine ? "flex-row-reverse" : "",
                      ].join(" ")}
                    >
                      {/* AVATAR */}

                      <div
                        className="
                          flex size-8 shrink-0 items-center justify-center
                          rounded-full border bg-muted
                          text-[11px] font-semibold
                        "
                      >
                        {message.sender_name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      {/* MESSAGE CONTENT */}

                      <div
                        className={[
                          "flex min-w-0 max-w-[82%] flex-col gap-1.5",
                          isMine ? "items-end" : "items-start",
                        ].join(" ")}
                      >
                        {/* SENDER */}

                        <div
                          className={[
                            "flex flex-wrap items-center gap-2",
                            isMine ? "flex-row-reverse" : "",
                          ].join(" ")}
                        >
                          <span className="text-[11px] font-semibold">
                            {isMine
                              ? "You"
                              : message.sender_name}
                          </span>

                          <span className="text-[10px] capitalize text-muted-foreground">
                            {message.sender_role}
                          </span>
                        </div>

                        {/* BUBBLE */}

                        <div
                          className={[
                            "min-w-0 rounded-lg px-3.5 py-2.5",
                            "text-[13px] leading-relaxed",
                            isMine
                              ? "bg-primary text-primary-foreground"
                              : "border bg-muted/60 text-foreground",
                          ].join(" ")}
                        >
                          <p className="whitespace-pre-wrap wrap-break-word">
                            {message.body}
                          </p>
                        </div>

                        {/* TIME */}

                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CONNECTION / ERRORS */}

          {(error || socketError) && (
            <div
              role="alert"
              className="border-t bg-destructive/5 px-4 py-2 text-xs text-destructive"
            >
              {error || socketError}
            </div>
          )}

          {/* MESSAGE COMPOSER */}

          <div className="border-t bg-card px-4 py-4">
            {canSend ? (
              <form
                onSubmit={handleSendMessage}
                className="space-y-3"
              >
                <Textarea
                  value={draft}
                  onChange={(event) =>
                    setDraft(event.target.value)
                  }
                  placeholder={
                    connected
                      ? "Write a message..."
                      : "Waiting for connection..."
                  }
                  aria-label="Message"
                  maxLength={5000}
                  disabled={!connected}
                  className="
                    min-h-20 resize-none
                    border bg-background
                    text-[13px]
                  "
                />

                <div className="flex items-center justify-between gap-3">
                  {/* CONNECTION INDICATOR */}

                  <div
                    aria-live="polite"
                    className="flex items-center gap-2"
                  >
                    <span
                      className={[
                        "size-1.5 rounded-full",
                        connected
                          ? "bg-emerald-500"
                          : "bg-muted-foreground",
                      ].join(" ")}
                    />

                    <span className="text-[11px] text-muted-foreground">
                      {connected
                        ? "Connected"
                        : "Disconnected"}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      !connected ||
                      !draft.trim()
                    }
                    className="gap-2"
                  >
                    <Send className="size-3.5" />

                    Send message
                  </Button>
                </div>
              </form>
            ) : (
              <div className="rounded-md bg-muted px-4 py-3 text-xs text-muted-foreground">
                {ticket.status === "closed"
                  ? "This ticket is closed. New messages are disabled."
                  : "Conversation is read-only for administrators."}
              </div>
            )}
          </div>
        </section>

        {/* ====================================================
            RIGHT — TICKET PROPERTIES
        ==================================================== */}

        <aside
          aria-label="Ticket details"
          className="
            overflow-hidden rounded-lg border
            bg-card
          "
        >
          {/* PANEL HEADER */}

          <div className="border-b px-4 py-4">
            <h2 className="text-sm font-semibold">
              Ticket details
            </h2>

            <p className="mt-1 text-[11px] text-muted-foreground">
              Properties and actions
            </p>
          </div>

          {/* PROPERTIES */}

          <div className="space-y-5 px-4 py-5">
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">
                Status
              </p>

              <TicketStatusBadge
                status={ticket.status}
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">
                Priority
              </p>

              <p className="text-xs font-medium capitalize">
                {formatLabel(ticket.priority)}
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">
                Category
              </p>

              <p className="text-xs font-medium capitalize">
                {formatLabel(ticket.category)}
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">
                Assigned agent
              </p>

              <p className="text-xs font-medium">
                {ticket.assigned_agent_id != null
                  ? `Agent #${ticket.assigned_agent_id}`
                  : "Unassigned"}
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">
                Customer
              </p>

              <p className="text-xs font-medium">
                Customer #{ticket.customer_id}
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">
                Last updated
              </p>

              <p className="text-xs font-medium">
                {formatDate(ticket.updated_at)}
              </p>
            </div>
          </div>

          {/* ACTIONS */}

          <div className="border-t px-4 py-5">
            <h3 className="mb-4 text-xs font-semibold">
              Actions
            </h3>

            <div className="space-y-3">

              {/* AGENT TAKE TICKET */}

              {role === "agent" &&
                ticket.assigned_agent_id === null && (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    disabled={saving}
                    onClick={() =>
                      handleUpdate({ take: true })
                    }
                  >
                    Take ticket
                  </Button>
                )}

              {/* STAFF STATUS TRANSITION */}

              {isStaff && allowedNextStatus && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full capitalize"
                  disabled={saving}
                  onClick={() =>
                    handleUpdate({
                      status: allowedNextStatus,
                    })
                  }
                >
                  Move to {formatLabel(allowedNextStatus)}
                </Button>
              )}

              {/* CUSTOMER REOPEN */}

              {role === "customer" &&
                ticket.status === "resolved" && (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    disabled={saving}
                    onClick={() =>
                      handleUpdate({
                        status: "open",
                      })
                    }
                  >
                    Reopen ticket
                  </Button>
                )}

              {/* ADMIN ASSIGN AGENT */}

              {role === "admin" && (
                <div className="space-y-3">
                  <Select
                    value={selectedAgent}
                    onValueChange={setSelectedAgent}
                  >
                    <SelectTrigger
                      className="w-full text-xs"
                      aria-label="Select agent"
                    >
                      <SelectValue
                        placeholder="Select an agent"
                      />
                    </SelectTrigger>

                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem
                          key={agent.id}
                          value={String(agent.id)}
                        >
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    disabled={
                      saving ||
                      !selectedAgent
                    }
                    onClick={() =>
                      handleUpdate({
                        assigned_agent_id:
                          Number(selectedAgent),
                      })
                    }
                  >
                    Assign agent
                  </Button>
                </div>
              )}

              {!isStaff &&
                !(
                  role === "customer" &&
                  ticket.status === "resolved"
                ) && (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    No ticket actions available.
                  </p>
                )}
            </div>
          </div>

          {/* FOOTER */}

          <div className="border-t px-4 py-3">
            <Link
              href="/tickets"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View all tickets
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </aside>

      </div>
    </div>
  );
}

// ============================================================
// ROUTE WRAPPER
// ============================================================

function TicketDetailRoute() {
  const params = useParams<{ id: string }>();

  return (
    <TicketDetailContent
      key={params.id}
      ticketId={Number(params.id)}
    />
  );
}

// ============================================================
// PAGE EXPORT
// ============================================================

export default function TicketDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-[550px] w-full" />
        </div>
      }
    >
      <TicketDetailRoute />
    </Suspense>
  );
}