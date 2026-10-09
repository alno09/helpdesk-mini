from fastapi import HTTPException

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Ticket,
    User,
    UserRole,
)


def require_customer(user: User) -> None:
    if user.role != UserRole.customer:
        raise HTTPException(
            status_code=403,
            detail="Customer access required",
        )


def require_agent(user: User) -> None:
    if user.role != UserRole.agent:
        raise HTTPException(
            status_code=403,
            detail="Agent access required",
        )


def require_admin(user: User) -> None:
    if user.role != UserRole.admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )


def get_authorized_ticket(
    db: Session,
    ticket_id: int,
    user: User,
    for_update: bool = False,
) -> Ticket:

    stmt = select(Ticket).where(
        Ticket.id == ticket_id,
        Ticket.business_id == user.business_id,
    )

    if user.role == UserRole.customer:
        stmt = stmt.where(
            Ticket.customer_id == user.id
        )

    if for_update:
        stmt = stmt.with_for_update()

    ticket = db.scalar(stmt)

    if ticket is None:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )

    return ticket