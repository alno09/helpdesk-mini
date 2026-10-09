export type TicketStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed";

export type TicketPriority =
  | "low"
  | "medium"
  | "high";

export interface Ticket {
  id: number;
  business_id: number;
  customer_id: number;
  assigned_agent_id: number | null;

  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;

  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  ticket_id: number;
  sender_id: number;

  sender_name: string;
  sender_role: "admin" | "agent" | "customer";

  body: string;
  created_at: string;
}

export interface CreateTicketPayload {
  subject: string;
  category: string;
  priority: TicketPriority;
  message: string;
}

export type UpdateTicketPayload =
  | { status: TicketStatus }
  | { take: true }
  | { assigned_agent_id: number };