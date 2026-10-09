from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text

from app.core.config import FRONTEND_ORIGIN
from app.core.database import engine

from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router
from app.modules.tickets.router import router as tickets_router


app = FastAPI(
    title="HelpDesk Mini API",
    version="1.0.0",
    description="Multi-tenant ticketing application",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(tickets_router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "helpdesk-api",
    }


@app.get("/health/db")
def database_health():

    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {
        "status": "ok",
        "database": "connected",
    }