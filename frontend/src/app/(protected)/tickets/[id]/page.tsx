"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ArrowLeft, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  getTicketMessages,
  updateTicket,
} from "@/features/tickets/api";

import { TicketStatusBadge } from "@/features/tickets/components/ticket-status-badge";

import {
  useTicketRoom,
  type TicketRoomEvent,
} from "@/features/chat/hooks/use-ticket-room";

import type {
  Ticket,
  Message,
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
// TICKET DETAIL CONTENT
// ============================================================

function TicketDetailContent({
  ticketId,
}: {
  ticketId: number;
}) {
  const me = useAuth();

  // Ticket state
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<User[]>([]);

  // Form state
  const [draft, setDraft] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ==========================================================
  // WEBSOCKET EVENT HANDLER
  // ==========================================================

  const handleRoomEvent = useCallback(
    (event: TicketRoomEvent) => {
      switch (event.type) {
        case "message.created": {
          setMessages((previous) => {
            const exists = previous.some(
              (message) => message.id === event.message.id,
            );

            if (exists) {
              return previous;
            }

            return [...previous, event.message];
          });

          break;
        }

        case "ticket.updated": {
          setTicket(event.ticket);
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
  // INITIAL DATA FETCHING
  // ==========================================================

  useEffect(() => {
    if (!me) {
      return;
    }

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return;
    }

    let active = true;

    const agentsRequest =
      me.user.role === "admin"
        ? apiRequest<User[]>("/users")
        : Promise.resolve<User[]>([]);

    Promise.all([
      getTicket(ticketId),
      getTicketMessages(ticketId),
      agentsRequest,
    ])
      .then(([ticketData, messageData, agentsData]) => {
        if (!active) {
          return;
        }

        setTicket(ticketData);
        setMessages(messageData);

        setAgents(
          agentsData.filter(
            (user) => user.role === "agent",
          ),
        );
      })
      .catch((err: unknown) => {
        if (!active) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load ticket",
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
  }, [ticketId, me]);

  // ==========================================================
  // TICKET UPDATE HANDLER
  // ==========================================================

  async function handleUpdate(
    data: UpdateTicketPayload,
  ) {
    setSaving(true);
    setError("");

    try {
      const updated = await updateTicket(
        ticketId,
        data,
      );

      setTicket(updated);
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
  // MESSAGE HANDLER
  // ==========================================================

  function handleSendMessage(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const body = draft.trim();

    if (!body) {
      return;
    }

    const success = sendMessage(body);

    if (!success) {
      setError("WebSocket is not connected");
      return;
    }

    setDraft("");
    setError("");
  }

  // ==========================================================
  // INVALID ID
  // ==========================================================

  if (
    !Number.isInteger(ticketId) ||
    ticketId <= 0
  ) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-semibold">
          Invalid Ticket ID
        </h1>

        <p className="text-sm text-muted-foreground">
          The requested ticket ID is invalid.
        </p>

        <Button variant="outline" asChild>
          <Link href="/tickets">
            Back to Tickets
          </Link>
        </Button>
      </div>
    );
  }

  // ==========================================================
  // LOADING STATE
  // ==========================================================

  if (!me || loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-64" />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-125 w-full" />
          <Skeleton className="h-75 w-full" />
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR / NOT FOUND STATE
  // ==========================================================

  if (!ticket || ticket.id !== ticketId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">
          Unable to load ticket
        </h1>

        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {error || "Ticket not found"}
        </p>

        <Button variant="outline" asChild>
          <Link href="/tickets">
            Back to Tickets
          </Link>
        </Button>
      </div>
    );
  }

  // ==========================================================
  // ROLE & PERMISSION
  // ==========================================================

  const role = me.user.role;

  const isStaff =
    role === "admin" ||
    role === "agent";

  const allowedNextStatus =
    nextStatus[ticket.status];

  const canSend =
    role !== "admin" &&
    ticket.status !== "closed";

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6">

      {/* BACK NAVIGATION */}

      <Button variant="ghost" asChild>
        <Link href="/tickets">
          <ArrowLeft size={16} />
          Back to Tickets
        </Link>
      </Button>

      {/* PAGE HEADER */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            Ticket #{ticket.id}
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            {ticket.subject}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Created{" "}
            {new Date(
              ticket.created_at,
            ).toLocaleString()}
          </p>
        </div>

        <TicketStatusBadge
          status={ticket.status}
        />
      </div>

      {/* MAIN CONTENT */}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">

        {/* ============================================== */}
        {/* CONVERSATION PANEL */}
        {/* ============================================== */}

        <Card className="min-w-0">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>
                  Conversation
                </CardTitle>

                <CardDescription className="mt-1">
                  Ticket support messages
                </CardDescription>
              </div>

              <Badge
                variant={
                  connected
                    ? "secondary"
                    : "outline"
                }
              >
                {connected
                  ? "Connected"
                  : "Disconnected"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">

            {/* MESSAGE HISTORY */}

            <ScrollArea className="h-100 rounded-lg border p-4">
              <div className="space-y-4">

                {messages.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    No messages yet.
                  </p>
                )}

                {messages.map((message) => {
                  const isMine =
                    message.sender_id === me.user.id;

                  return (
                    <div
                      key={message.id}
                      className={[
                        "max-w-[85%] rounded-xl p-3",
                        isMine
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-muted",
                      ].join(" ")}
                    >

                      {/* MESSAGE HEADER */}

                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs opacity-80">
                        <span className="font-semibold">
                          {message.sender_name}
                        </span>

                        <span className="capitalize">
                          {message.sender_role}
                        </span>
                      </div>

                      {/* MESSAGE BODY */}

                      <p className="whitespace-pre-wrap wrap-break-word text-sm">
                        {message.body}
                      </p>

                      {/* MESSAGE TIMESTAMP */}

                      <p className="mt-2 text-right text-xs opacity-70">
                        {new Date(
                          message.created_at,
                        ).toLocaleString()}
                      </p>

                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* ERRORS */}

            {(error || socketError) && (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {error || socketError}
              </p>
            )}

            {/* MESSAGE COMPOSER */}

            {canSend ? (
              <form
                onSubmit={handleSendMessage}
                className="space-y-3"
              >
                <Textarea
                  placeholder="Write your message..."
                  value={draft}
                  maxLength={5000}
                  disabled={!connected}
                  onChange={(event) =>
                    setDraft(event.target.value)
                  }
                  className="min-h-24"
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={
                      !connected ||
                      !draft.trim()
                    }
                  >
                    <Send size={16} />
                    Send Message
                  </Button>
                </div>
              </form>
            ) : (
              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                {ticket.status === "closed"
                  ? "This ticket is closed. New messages are disabled."
                  : "Only agents and customers can send messages."}
              </div>
            )}

          </CardContent>
        </Card>

        {/* ============================================== */}
        {/* TICKET INFORMATION SIDEBAR */}
        {/* ============================================== */}

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>
              Ticket Details
            </CardTitle>

            <CardDescription>
              Information and actions
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">

            {/* TICKET INFORMATION */}

            <div className="space-y-3 text-sm">

              {/* STATUS */}

              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Status
                </span>

                <TicketStatusBadge
                  status={ticket.status}
                />
              </div>

              {/* PRIORITY */}

              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Priority
                </span>

                <span className="capitalize">
                  {ticket.priority}
                </span>
              </div>

              {/* CATEGORY */}

              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Category
                </span>

                <span>
                  {ticket.category}
                </span>
              </div>

              {/* ASSIGNED AGENT */}

              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Assigned Agent
                </span>

                <span>
                  {ticket.assigned_agent_id ??
                    "Unassigned"}
                </span>
              </div>

            </div>

            {/* ACTIONS */}

            <div className="border-t pt-5">
              <h3 className="mb-3 text-sm font-semibold">
                Actions
              </h3>

              <div className="space-y-3">

                {/* AGENT: TAKE TICKET */}

                {role === "agent" &&
                  ticket.assigned_agent_id === null && (
                    <Button
                      className="w-full"
                      disabled={saving}
                      onClick={() =>
                        handleUpdate({
                          take: true,
                        })
                      }
                    >
                      Take Ticket
                    </Button>
                  )}

                {/* STAFF: STATUS TRANSITION */}

                {isStaff &&
                  allowedNextStatus && (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={saving}
                      onClick={() =>
                        handleUpdate({
                          status: allowedNextStatus,
                        })
                      }
                    >
                      Move to{" "}
                      {allowedNextStatus.replaceAll(
                        "_",
                        " ",
                      )}
                    </Button>
                  )}

                {/* CUSTOMER: REOPEN TICKET */}

                {role === "customer" &&
                  ticket.status === "resolved" && (
                    <Button
                      className="w-full"
                      disabled={saving}
                      onClick={() =>
                        handleUpdate({
                          status: "open",
                        })
                      }
                    >
                      Reopen Ticket
                    </Button>
                  )}

                {/* ADMIN: ASSIGN AGENT */}

                {role === "admin" && (
                  <div className="space-y-3">
                    <Select
                      value={selectedAgent}
                      onValueChange={
                        setSelectedAgent
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder="Select Agent"
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
                      Assign Agent
                    </Button>
                  </div>
                )}

              </div>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}

// ============================================================
// ROUTE WRAPPER
// ============================================================

function TicketDetailRoute() {
  const params = useParams<{
    id: string;
  }>();

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
          <Skeleton className="h-10 w-64" />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Skeleton className="h-125 w-full" />
            <Skeleton className="h-75 w-full" />
          </div>
        </div>
      }
    >
      <TicketDetailRoute />
    </Suspense>
  );
}