import { apiRequest } from "@/lib/api";

import type {
  Ticket,
  Message,
  TicketStatus,
  CreateTicketPayload,
  UpdateTicketPayload,
} from "./types";


export function getTickets(status?: TicketStatus) {
  const query = status
    ? `?status=${encodeURIComponent(status)}`
    : "";

  return apiRequest<Ticket[]>(`/tickets${query}`);
}


export function getTicket(id: number) {
  return apiRequest<Ticket>(`/tickets/${id}`);
}


export function createTicket(data: CreateTicketPayload) {
  return apiRequest<Ticket>("/tickets", {
    method: "POST",
    body: JSON.stringify(data),
  });
}


export function updateTicket(
  id: number,
  data: UpdateTicketPayload,
) {
  return apiRequest<Ticket>(`/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}


export function getTicketMessages(id: number) {
  return apiRequest<Message[]>(
    `/tickets/${id}/messages`,
  );
}