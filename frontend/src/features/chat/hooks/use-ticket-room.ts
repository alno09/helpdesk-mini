"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  Message,
  Ticket,
} from "@/features/tickets/types";


export type TicketRoomEvent =
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


export function useTicketRoom(
  ticketId: number,
  enabled: boolean,
  onEvent: (event: TicketRoomEvent) => void,
) {
  const socketRef = useRef<WebSocket | null>(null);
  const eventHandlerRef = useRef(onEvent);

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");


  useEffect(() => {
    eventHandlerRef.current = onEvent;
  }, [onEvent]);


  useEffect(() => {
    if (!enabled || !Number.isInteger(ticketId) || ticketId <= 0) {
      return;
    }

    const token = sessionStorage.getItem("access_token");

    if (!token) {
      return;
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
      setConnected(true);
      setError("");
    };


    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(
          event.data,
        ) as TicketRoomEvent;

        if (
          payload.type === "message.created" ||
          payload.type === "ticket.updated" ||
          payload.type === "error"
        ) {
          eventHandlerRef.current(payload);
        }
      } catch {
        setError("Invalid WebSocket event");
      }
    };


    socket.onerror = () => {
      setError("WebSocket connection error");
    };


    socket.onclose = () => {
      setConnected(false);
    };


    return () => {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      socket.close();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [ticketId, enabled]);


  const sendMessage = useCallback((body: string) => {
    const socket = socketRef.current;
    const message = body.trim();

    if (
      !message ||
      !socket ||
      socket.readyState !== WebSocket.OPEN
    ) {
      return false;
    }

    socket.send(
      JSON.stringify({
        type: "message.send",
        body: message,
      })
    );

    return true;
  }, []);


  return {
    connected,
    error,
    sendMessage,
  };
}