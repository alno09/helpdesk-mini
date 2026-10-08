from fastapi import FastAPI

from sqlalchemy import text

from app.database import engine


app = FastAPI(
    title="HelpDesk Mini API",
    version="1.0.0",
    description="Multi-tenant ticketing application",
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "helpdesk-api"
    }


@app.get("/health/db")
def database_health():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {
        "status": "ok",
        "database": "connected"
    }