"use client";

import { Suspense, useEffect, useState, useRef, type FormEvent } from "react";

import { useParams } from "next/navigation";

import { apiRequest } from "@/lib/api";

import type {
  MeResponse,
  User,
} from "@/lib/api";

import {
  getTicket,
  getTicketMessages,
  updateTicket,
} from "@/features/tickets/api";

import type {
  Ticket,
  Message,
  TicketStatus,
  UpdateTicketPayload,
} from "@/features/tickets/types";


const nextStatus: Partial<
  Record<TicketStatus, TicketStatus>
> = {
  open: "in_progress",
  in_progress: "resolved",
  resolved: "closed",
};

type TicketSocketEvent =
  | {
      type: "message.created";
      message: Message;
    }
  | {
      type: "ticket.updated";
      ticket: Ticket;
    }
  | {
      type: "error";
      detail: string;
    };


function TicketDetailContent() {
  const params = useParams<{ id: string }>();

  const ticketId = Number(params.id);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [agents, setAgents] = useState<User[]>([]);

  const [selectedAgent, setSelectedAgent] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const socketRef = useRef<WebSocket | null>(null);

  const [draft, setDraft] = useState("");

  const [socketConnected, setSocketConnected] = useState(false);

  const [socketError, setSocketError] = useState("");


  useEffect(() => {
    let active = true;

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      setError("Invalid ticket ID");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const [ticketData, messageData, meData] =
          await Promise.all([
            getTicket(ticketId),
            getTicketMessages(ticketId),
            apiRequest<MeResponse>("/auth/me"),
          ]);

        if (!active) return;

        setTicket(ticketData);
        setMessages(messageData);
        setMe(meData);

        if (meData.user.role === "admin") {
          const users = await apiRequest<User[]>("/users");

          if (active) {
            setAgents(
              users.filter((user) => user.role === "agent"),
            );
          }
        }

        const token = sessionStorage.getItem("access_token");

        if (!token) {
          throw new Error("Access token not found");
        }

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL ??
          "http://localhost:8000";

        const wsUrl = apiUrl.replace(/^http/, "ws");

        const socket = new WebSocket(
          `${wsUrl}/ws/tickets/${ticketId}?token=${encodeURIComponent(token)}`
        );

        socketRef.current = socket;

        socket.onopen = () => {
          if (!active) return;

          setSocketConnected(true);
          setSocketError("");
        };

        socket.onmessage = (event: MessageEvent<string>) => {
          if (!active) return;

          try {
            const payload = JSON.parse(
              event.data
            ) as TicketSocketEvent;

            switch (payload.type) {
              case "message.created":
                setMessages((previous) => {
                  const exists = previous.some(
                    (message) => message.id === payload.message.id
                  );

                  if (exists) return previous;

                  return [...previous, payload.message];
                });

                break;

              case "ticket.updated":
                setTicket(payload.ticket);
                break;

              case "error":
                setSocketError(payload.detail);
                break;
            }
          } catch {
            setSocketError("Invalid WebSocket event");
          }
        };

        socket.onerror = () => {
          if (!active) return;

          setSocketError("WebSocket connection error");
        };

        socket.onclose = () => {
          if (!active) return;

          setSocketConnected(false);
        };
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load ticket",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;

      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [ticketId]);


  async function handleUpdate(data: UpdateTicketPayload) {
    setSaving(true);
    setError("");

    try {
      const updated = await updateTicket(ticketId, data);
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

  function handleSendMessage(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const body = draft.trim();

    if (!body) return;

    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setSocketError("WebSocket is not connected");
      return;
    }

    socket.send(
      JSON.stringify({
        type: "message.send",
        body,
      })
    );

    setDraft("");
    setSocketError("");
  }


  if (loading) {
    return <p className="p-6">Loading ticket...</p>;
  }

  if (!ticket || !me) {
    return (
      <p className="p-6 text-red-500">
        {error || "Ticket not found"}
      </p>
    );
  }


  const role = me.user.role;

  const isStaff = role === "admin" || role === "agent";

  const allowedNextStatus = nextStatus[ticket.status];


  return (
    <main className="mx-auto grid max-w-6xl gap-6 p-6 md:grid-cols-[1fr_300px]">

      <section>
        <h1 className="mb-2 text-2xl font-bold">
          #{ticket.id} — {ticket.subject}
        </h1>

        <p className="mb-6 text-sm text-gray-500">
          {ticket.category}
        </p>

        <div className="rounded-lg border p-4">
          <h2 className="mb-4 font-semibold">
            Conversation
          </h2>

          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className="rounded-lg bg-gray-50 p-3"
              >
                <div className="mb-2 flex flex-wrap justify-between gap-2">
                  <span className="font-medium">
                    {message.sender_name}
                    {" "}
                    ({message.sender_role})
                  </span>

                  <span className="text-xs text-gray-500">
                    {new Date(
                      message.created_at,
                    ).toLocaleString()}
                  </span>
                </div>

                <p className="whitespace-pre-wrap">
                  {message.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t pt-4">
            <div className="mb-4 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  socketConnected
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />

              <span className="text-sm text-gray-500">
                {socketConnected
                  ? "Connected"
                  : "Disconnected"}
              </span>
            </div>

            {socketError && (
              <p className="mb-3 text-sm text-red-500">
                {socketError}
              </p>
            )}

            {ticket.status === "closed" ? (
              <div className="rounded-lg bg-gray-100 p-4 text-sm text-gray-600">
                This ticket is closed. New messages are disabled.
              </div>
            ) : role === "admin" ? (
              <div className="rounded-lg bg-gray-100 p-4 text-sm text-gray-600">
                Admin can monitor this conversation.
                Messaging is available to agents and customers.
              </div>
            ) : (
              <form
                onSubmit={handleSendMessage}
                className="flex gap-3"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(event) =>
                    setDraft(event.target.value)
                  }
                  placeholder="Type your message..."
                  maxLength={5000}
                  disabled={!socketConnected}
                  className="flex-1 rounded-lg border p-3 disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={
                    !socketConnected ||
                    !draft.trim()
                  }
                  className="rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <aside className="h-fit rounded-lg border p-4">
        <h2 className="mb-4 font-semibold">
          Ticket Information
        </h2>

        <div className="space-y-3 text-sm">
          <p>Status: {ticket.status}</p>
          <p>Priority: {ticket.priority}</p>
          <p>Category: {ticket.category}</p>

          <p>
            Assigned Agent:{" "}
            {ticket.assigned_agent_id ?? "Unassigned"}
          </p>
        </div>

        <div className="mt-6 space-y-3">

          {role === "agent" &&
            ticket.assigned_agent_id === null && (
              <button
                disabled={saving}
                onClick={() =>
                  handleUpdate({ take: true })
                }
                className="w-full rounded bg-blue-600 p-3 text-white disabled:opacity-50"
              >
                Take Ticket
              </button>
            )}

          {isStaff && allowedNextStatus && (
            <button
              disabled={saving}
              onClick={() =>
                handleUpdate({
                  status: allowedNextStatus,
                })
              }
              className="w-full rounded bg-green-600 p-3 text-white disabled:opacity-50"
            >
              Move to{" "}
              {allowedNextStatus.replaceAll("_", " ")}
            </button>
          )}

          {role === "customer" &&
            ticket.status === "resolved" && (
              <button
                disabled={saving}
                onClick={() =>
                  handleUpdate({
                    status: "open",
                  })
                }
                className="w-full rounded bg-orange-600 p-3 text-white disabled:opacity-50"
              >
                Reopen Ticket
              </button>
            )}

          {role === "admin" && (
            <div className="space-y-2">
              <select
                className="w-full rounded border p-2"
                value={selectedAgent}
                onChange={(event) =>
                  setSelectedAgent(event.target.value)
                }
              >
                <option value="">
                  Select Agent
                </option>

                {agents.map((agent) => (
                  <option
                    key={agent.id}
                    value={agent.id}
                  >
                    {agent.name}
                  </option>
                ))}
              </select>

              <button
                disabled={saving || !selectedAgent}
                onClick={() =>
                  handleUpdate({
                    assigned_agent_id:
                      Number(selectedAgent),
                  })
                }
                className="w-full rounded bg-blue-600 p-3 text-white disabled:opacity-50"
              >
                Assign Agent
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-500">
            {error}
          </p>
        )}
      </aside>
    </main>
  );
}

export default function TicketDetailPage() {
  return (
    <Suspense fallback={<TicketDetailSkeleton />}>
      <TicketDetailContent />
    </Suspense>
  );
}

function TicketDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-gray-200" />
        <div className="h-4 w-40 rounded bg-gray-200" />
        <div className="h-96 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}