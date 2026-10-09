from fastapi import HTTPException

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Ticket,
    Message,
    User,
    UserRole,
)

from app.models.enums import TicketStatus

from app.modules.tickets.schemas import (
    CreateTicketRequest,
    UpdateTicketRequest,
    MessageResponse,
)

from app.modules.tickets.policies import (
    get_authorized_ticket,
    require_customer,
    require_agent,
    require_admin,
)


ALLOWED_TRANSITIONS = {
    TicketStatus.open: {
        TicketStatus.in_progress,
    },

    TicketStatus.in_progress: {
        TicketStatus.resolved,
    },

    TicketStatus.resolved: {
        TicketStatus.closed,
    },

    TicketStatus.closed: set(),
}


def create_ticket(
    db: Session,
    user: User,
    data: CreateTicketRequest,
) -> Ticket:

    require_customer(user)

    ticket = Ticket(
        business_id=user.business_id,
        customer_id=user.id,
        subject=data.subject.strip(),
        category=data.category.strip(),
        priority=data.priority,
        status=TicketStatus.open,
    )

    try:
        db.add(ticket)
        db.flush()

        first_message = Message(
            ticket_id=ticket.id,
            sender_id=user.id,
            body=data.message.strip(),
        )

        db.add(first_message)

        db.commit()
        db.refresh(ticket)

    except Exception:
        db.rollback()
        raise

    return ticket


def list_tickets(
    db: Session,
    user: User,
    status: TicketStatus | None = None,
) -> list[Ticket]:

    stmt = select(Ticket).where(
        Ticket.business_id == user.business_id
    )

    if user.role == UserRole.customer:
        stmt = stmt.where(
            Ticket.customer_id == user.id
        )

    if status is not None:
        stmt = stmt.where(
            Ticket.status == status
        )

    stmt = stmt.order_by(
        Ticket.updated_at.desc(),
        Ticket.id.desc(),
    )

    return list(db.scalars(stmt).all())


def get_ticket(
    db: Session,
    user: User,
    ticket_id: int,
) -> Ticket:

    return get_authorized_ticket(
        db,
        ticket_id,
        user,
    )


def update_ticket(
    db: Session,
    user: User,
    ticket_id: int,
    data: UpdateTicketRequest,
) -> Ticket:

    ticket = get_authorized_ticket(
        db,
        ticket_id,
        user,
        for_update=True,
    )

    if data.take:
        require_agent(user)

        if ticket.assigned_agent_id not in (
            None,
            user.id,
        ):
            raise HTTPException(
                status_code=409,
                detail="Ticket already assigned",
            )

        ticket.assigned_agent_id = user.id

    elif data.assigned_agent_id is not None:
        require_admin(user)

        agent = db.scalar(
            select(User).where(
                User.id == data.assigned_agent_id,
                User.business_id == user.business_id,
                User.role == UserRole.agent,
            )
        )

        if agent is None:
            raise HTTPException(
                status_code=404,
                detail="Agent not found",
            )

        ticket.assigned_agent_id = agent.id

    elif data.status is not None:

        new_status = data.status

        if user.role == UserRole.customer:

            if not (
                ticket.status == TicketStatus.resolved
                and new_status == TicketStatus.open
            ):
                raise HTTPException(
                    status_code=403,
                    detail="Customer can only reopen resolved tickets",
                )

        else:
            allowed = ALLOWED_TRANSITIONS.get(
                ticket.status,
                set(),
            )

            if new_status not in allowed:
                raise HTTPException(
                    status_code=422,
                    detail="Invalid ticket status transition",
                )

        ticket.status = new_status

    try:
        db.commit()
        db.refresh(ticket)

    except Exception:
        db.rollback()
        raise

    return ticket


def get_ticket_messages(
    db: Session,
    user: User,
    ticket_id: int,
) -> list[MessageResponse]:

    ticket = get_authorized_ticket(
        db,
        ticket_id,
        user,
    )

    stmt = (
        select(Message, User)
        .join(
            User,
            User.id == Message.sender_id,
        )
        .where(
            Message.ticket_id == ticket.id
        )
        .order_by(
            Message.created_at.asc(),
            Message.id.asc(),
        )
    )

    rows = db.execute(stmt).all()

    return [
        MessageResponse(
            id=message.id,
            ticket_id=message.ticket_id,
            sender_id=message.sender_id,
            sender_name=sender.name,
            sender_role=sender.role,
            body=message.body,
            created_at=message.created_at,
        )
        for message, sender in rows
    ]