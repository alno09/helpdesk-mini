from fastapi import (
    APIRouter,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
)

from pydantic import ValidationError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.core.config import FRONTEND_ORIGIN
from app.core.database import SessionLocal
from app.core.security import decode_token

from app.models import User

from app.modules.tickets.policies import (
    get_authorized_ticket,
)

from app.modules.chat.schemas import (
    SendMessageEvent,
)

from app.modules.chat.service import (
    save_message,
)

from app.modules.chat.manager import (
    manager,
)


router = APIRouter(
    tags=["Chat"],
)


def authorize_connection(
    db: Session,
    ticket_id: int,
    user_id: int,
) -> None:

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found",
        )

    get_authorized_ticket(
        db,
        ticket_id,
        user,
    )


@router.websocket("/ws/tickets/{ticket_id}")
async def ticket_websocket(
    websocket: WebSocket,
    ticket_id: int,
):

    token = websocket.query_params.get("token")

    origin = websocket.headers.get("origin")

    if origin is not None and origin != FRONTEND_ORIGIN:
        await websocket.close(code=1008)
        return

    if not token:
        await websocket.close(code=1008)
        return

    try:
        user_id = decode_token(
            token,
            expected_type="access",
        )

        with SessionLocal() as db:
            authorize_connection(
                db,
                ticket_id,
                user_id,
            )

    except HTTPException:
        await websocket.close(code=1008)
        return

    await manager.connect(
        ticket_id,
        websocket,
    )

    try:
        while True:

            raw_message = await websocket.receive_text()

            try:
                payload = SendMessageEvent.model_validate_json(
                    raw_message
                )

            except ValidationError:
                await manager.send_to(
                    ticket_id,
                    websocket,
                    {
                        "type": "error",
                        "detail": "Invalid message payload",
                    },
                )

                continue

            try:
                # Revalidate the access token.
                decode_token(
                    token,
                    expected_type="access",
                )

                message = await run_in_threadpool(
                    save_message,
                    user_id,
                    ticket_id,
                    payload.body,
                )

            except HTTPException as exc:

                if exc.status_code in (401, 403, 404):
                    await websocket.close(code=1008)
                    break

                await manager.send_to(
                    ticket_id,
                    websocket,
                    {
                        "type": "error",
                        "detail": str(exc.detail),
                    },
                )

                continue

            await manager.broadcast(
                ticket_id,
                {
                    "type": "message.created",
                    "message": message,
                },
            )

    except WebSocketDisconnect:
        pass

    finally:
        manager.disconnect(
            ticket_id,
            websocket,
        )