import asyncio

from fastapi import WebSocket, WebSocketDisconnect


class ConnectionManager:
    def __init__(self):
        self.rooms: dict[
            int,
            dict[WebSocket, asyncio.Lock],
        ] = {}

    async def connect(
        self,
        ticket_id: int,
        websocket: WebSocket,
    ) -> None:

        await websocket.accept()

        if ticket_id not in self.rooms:
            self.rooms[ticket_id] = {}

        self.rooms[ticket_id][websocket] = asyncio.Lock()

    def disconnect(
        self,
        ticket_id: int,
        websocket: WebSocket,
    ) -> None:

        room = self.rooms.get(ticket_id)

        if room is None:
            return

        room.pop(websocket, None)

        if not room:
            self.rooms.pop(ticket_id, None)

    async def send_to(
        self,
        ticket_id: int,
        websocket: WebSocket,
        payload: dict,
    ) -> None:

        lock = self.rooms.get(
            ticket_id, {}
        ).get(websocket)

        if lock is None:
            return

        try:
            async with lock:
                await websocket.send_json(payload)

        except (
            WebSocketDisconnect,
            RuntimeError,
            OSError,
        ):
            self.disconnect(ticket_id, websocket)

    async def broadcast(
        self,
        ticket_id: int,
        payload: dict,
    ) -> None:

        connections = list(
            self.rooms.get(ticket_id, {}).items()
        )

        for websocket, lock in connections:
            try:
                async with lock:
                    await websocket.send_json(payload)

            except (
                WebSocketDisconnect,
                RuntimeError,
                OSError,
            ):
                self.disconnect(ticket_id, websocket)


manager = ConnectionManager()