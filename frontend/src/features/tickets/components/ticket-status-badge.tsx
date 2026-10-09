import { Badge } from "@/components/ui/badge";

import type {
  TicketStatus,
} from "@/features/tickets/types";


const variants = {
  open: "secondary",
  in_progress: "default",
  resolved: "outline",
  closed: "outline",
} as const;


export function TicketStatusBadge({
  status,
}: {
  status: TicketStatus;
}) {
  return (
    <Badge variant={variants[status]}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}