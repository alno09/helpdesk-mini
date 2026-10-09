from datetime import datetime, timezone

from fastapi import HTTPException

from app.core.database import SessionLocal

from app.models import (
    Message,
    User,
    UserRole,
    TicketStatus,
)

from app.modules.tickets.policies import (
    get_authorized_ticket,
)

from app.modules.tickets.schemas import (
    MessageResponse,
)


def save_message(
    user_id: int,
    ticket_id: int,
    body: str,
) -> dict:

    with SessionLocal() as db:

        try:
            user = db.get(User, user_id)

            if user is None:
                raise HTTPException(
                    status_code=401,
                    detail="User not found",
                )

            ticket = get_authorized_ticket(
                db,
                ticket_id,
                user,
                for_update=True,
            )

            if user.role not in (
                UserRole.agent,
                UserRole.customer,
            ):
                raise HTTPException(
                    status_code=403,
                    detail="Messaging is restricted to agents and customers",
                )

            if ticket.status == TicketStatus.closed:
                raise HTTPException(
                    status_code=409,
                    detail="Closed tickets cannot receive messages",
                )

            message = Message(
                ticket_id=ticket.id,
                sender_id=user.id,
                body=body,
            )

            db.add(message)

            ticket.updated_at = datetime.now(timezone.utc)

            db.commit()
            db.refresh(message)

            response = MessageResponse(
                id=message.id,
                ticket_id=message.ticket_id,
                sender_id=message.sender_id,
                sender_name=user.name,
                sender_role=user.role,
                body=message.body,
                created_at=message.created_at,
            )

            return response.model_dump(mode="json")

        except Exception:
            db.rollback()
            raise