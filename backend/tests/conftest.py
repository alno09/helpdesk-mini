import os

import pytest

from sqlalchemy import text
from sqlalchemy.engine import make_url


TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

if not TEST_DATABASE_URL:
    raise RuntimeError(
        "TEST_DATABASE_URL must be configured before running tests"
    )

if make_url(TEST_DATABASE_URL).database != "helpdesk_test":
    raise RuntimeError(
        "Tests must use the dedicated helpdesk_test database"
    )


# Must be configured before importing application modules.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL


from fastapi.testclient import TestClient

from app.main import app
from app.core.database import engine


@pytest.fixture(autouse=True)
def clean_database():
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                TRUNCATE TABLE
                    messages,
                    tickets,
                    users,
                    businesses
                RESTART IDENTITY CASCADE
                """
            )
        )

    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def register_business(
    client: TestClient,
    slug: str,
) -> dict:

    email = f"admin-{slug}@example.com"

    response = client.post(
        "/auth/register-business",
        json={
            "business_name": slug,
            "business_slug": slug,
            "name": f"Admin {slug}",
            "email": email,
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 201, response.text

    login = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": "TestPassword123!",
        },
    )

    assert login.status_code == 200, login.text

    return {
        "admin": response.json()["admin"],
        "token": login.json()["access_token"],
    }


def create_user(
    client: TestClient,
    admin_token: str,
    name: str,
    email: str,
    role: str,
) -> dict:

    response = client.post(
        "/users",
        headers={
            "Authorization": f"Bearer {admin_token}",
        },
        json={
            "name": name,
            "email": email,
            "password": "TestPassword123!",
            "role": role,
        },
    )

    assert response.status_code == 201, response.text

    login = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": "TestPassword123!",
        },
    )

    assert login.status_code == 200, login.text

    return {
        "user": response.json(),
        "token": login.json()["access_token"],
    }


@pytest.fixture
def scenario(client: TestClient):

    business_a = register_business(
        client,
        "business-a",
    )

    business_b = register_business(
        client,
        "business-b",
    )

    agent_a = create_user(
        client,
        business_a["token"],
        "Agent A",
        "agent-a@example.com",
        "agent",
    )

    customer_a1 = create_user(
        client,
        business_a["token"],
        "Customer A1",
        "customer-a1@example.com",
        "customer",
    )

    customer_a2 = create_user(
        client,
        business_a["token"],
        "Customer A2",
        "customer-a2@example.com",
        "customer",
    )

    agent_b = create_user(
        client,
        business_b["token"],
        "Agent B",
        "agent-b@example.com",
        "agent",
    )

    customer_b1 = create_user(
        client,
        business_b["token"],
        "Customer B1",
        "customer-b1@example.com",
        "customer",
    )

    customer_b2 = create_user(
        client,
        business_b["token"],
        "Customer B2",
        "customer-b2@example.com",
        "customer",
    )

    response = client.post(
        "/tickets",
        headers={
            "Authorization": (
                f"Bearer {customer_a1['token']}"
            ),
        },
        json={
            "subject": "Payment failed",
            "category": "Billing",
            "priority": "high",
            "message": "My payment was not confirmed.",
        },
    )

    assert response.status_code == 201, response.text

    return {
        "business_a": business_a,
        "business_b": business_b,
        "agent_a": agent_a,
        "agent_b": agent_b,
        "customer_a1": customer_a1,
        "customer_a2": customer_a2,
        "customer_b1": customer_b1,
        "customer_b2": customer_b2,
        "ticket": response.json(),
    }