from fastapi import (
    APIRouter,
    Depends,
    Query,
    BackgroundTasks,
)

from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_db,
    get_current_user,
)

from app.models import User
from app.models.enums import TicketStatus

from app.modules.tickets import service

from app.modules.chat.manager import manager

from app.modules.tickets.schemas import (
    CreateTicketRequest,
    UpdateTicketRequest,
    TicketResponse,
    MessageResponse,
)


router = APIRouter(
    prefix="/tickets",
    tags=["Tickets"],
)


@router.get(
    "",
    response_model=list[TicketResponse],
)
def list_tickets(
    status: TicketStatus | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    return service.list_tickets(
        db,
        user,
        status,
    )


@router.post(
    "",
    response_model=TicketResponse,
    status_code=201,
)
def create_ticket(
    data: CreateTicketRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    return service.create_ticket(
        db,
        user,
        data,
    )


@router.get(
    "/{ticket_id}",
    response_model=TicketResponse,
)
def get_ticket(
    ticket_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    return service.get_ticket(
        db,
        user,
        ticket_id,
    )


@router.patch(
    "/{ticket_id}",
    response_model=TicketResponse,
)
def update_ticket(
    ticket_id: int,
    data: UpdateTicketRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    updated_ticket = service.update_ticket(
        db,
        user,
        ticket_id,
        data,
    )

    ticket_payload = TicketResponse.model_validate(
        updated_ticket
    ).model_dump(mode="json")

    background_tasks.add_task(
        manager.broadcast,
        ticket_id,
        {
            "type": "ticket.updated",
            "ticket": ticket_payload,
        },
    )

    return updated_ticket

@router.get(
    "/{ticket_id}/messages",
    response_model=list[MessageResponse],
)
def get_messages(
    ticket_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    return service.get_ticket_messages(
        db,
        user,
        ticket_id,
    )