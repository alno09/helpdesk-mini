from datetime import datetime, timedelta, timezone

import jwt
import pytest

from fastapi.testclient import TestClient
from starlette.testclient import WebSocketDenialResponse
from starlette.websockets import WebSocketDisconnect

from app.core.config import (
    JWT_SECRET,
    JWT_ALGORITHM,
)


# ============================================================
# HELPERS
# ============================================================

def auth(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
    }


def login(
    client: TestClient,
    email: str,
) -> dict:

    response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 200

    return response.json()


def assert_ws_denied(
    client: TestClient,
    url: str,
):
    with pytest.raises(
        (WebSocketDenialResponse, WebSocketDisconnect)
    ) as exc:
        with client.websocket_connect(url):
            pytest.fail(
                "Unauthorized connection was accepted"
            )

    if isinstance(exc.value, WebSocketDenialResponse):
        assert exc.value.status_code == 403
    else:
        assert exc.value.code == 1008


# ============================================================
# TEST 1 — EXPIRED ACCESS TOKEN
# ============================================================

def test_expired_access_token(
    client: TestClient,
    scenario,
):

    user_id = scenario["customer_a1"]["user"]["id"]

    now = datetime.now(timezone.utc)

    expired_token = jwt.encode(
        {
            "sub": str(user_id),
            "type": "access",
            "iat": now - timedelta(hours=1),
            "exp": now - timedelta(minutes=1),
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )

    response = client.get(
        "/auth/me",
        headers=auth(expired_token),
    )

    assert response.status_code == 401


# ============================================================
# TEST 2 — REFRESH TOKEN CANNOT ACCESS REST API
# ============================================================

def test_refresh_token_restriction(
    client: TestClient,
    scenario,
):

    tokens = login(
        client,
        "customer-a1@example.com",
    )

    refresh_token = tokens["refresh_token"]

    response = client.get(
        "/auth/me",
        headers=auth(refresh_token),
    )

    assert response.status_code == 401

    # Refresh token remains valid for its intended endpoint.
    response = client.post(
        "/auth/refresh",
        json={
            "refresh_token": refresh_token,
        },
    )

    assert response.status_code == 200
    assert "access_token" in response.json()


# ============================================================
# TEST 3 — REFRESH TOKEN CANNOT OPEN WEBSOCKET
# ============================================================

def test_websocket_rejects_refresh_token(
    client: TestClient,
    scenario,
):

    tokens = login(
        client,
        "customer-a1@example.com",
    )

    ticket_id = scenario["ticket"]["id"]

    url = (
        f"/ws/tickets/{ticket_id}"
        f"?token={tokens['refresh_token']}"
    )

    assert_ws_denied(client, url)


# ============================================================
# TEST 4 — GLOBAL EMAIL UNIQUENESS
# ============================================================

def test_duplicate_email_across_businesses(
    client: TestClient,
    scenario,
):

    admin_b_token = scenario["business_b"]["token"]

    response = client.post(
        "/users",
        headers=auth(admin_b_token),
        json={
            "name": "Duplicate User",
            "email": "customer-a1@example.com",
            "password": "TestPassword123!",
            "role": "customer",
        },
    )

    assert response.status_code == 409


# ============================================================
# TEST 5 — INVALID STATUS TRANSITION
# ============================================================

def test_invalid_ticket_status_transition(
    client: TestClient,
    scenario,
):

    ticket_id = scenario["ticket"]["id"]
    agent_token = scenario["agent_a"]["token"]

    response = client.patch(
        f"/tickets/{ticket_id}",
        headers=auth(agent_token),
        json={
            "status": "closed",
        },
    )

    assert response.status_code == 422


# ============================================================
# TEST 6 — CLOSED TICKET REJECTS MESSAGES
# ============================================================

def test_closed_ticket_rejects_messages(
    client: TestClient,
    scenario,
):

    ticket_id = scenario["ticket"]["id"]

    agent_token = scenario["agent_a"]["token"]
    customer_token = scenario["customer_a1"]["token"]

    # Move ticket through valid status transitions.
    for status in [
        "in_progress",
        "resolved",
        "closed",
    ]:
        response = client.patch(
            f"/tickets/{ticket_id}",
            headers=auth(agent_token),
            json={
                "status": status,
            },
        )

        assert response.status_code == 200

    # Get original message count.
    response = client.get(
        f"/tickets/{ticket_id}/messages",
        headers=auth(customer_token),
    )

    assert response.status_code == 200

    original_count = len(response.json())

    # Attempt to send a message to a closed ticket.
    with client.websocket_connect(
        f"/ws/tickets/{ticket_id}?token={customer_token}"
    ) as websocket:

        websocket.send_json({
            "type": "message.send",
            "body": "This should be rejected",
        })

        event = websocket.receive_json()

        assert event["type"] == "error"
        assert "closed" in event["detail"].lower()

    # Verify no new message was persisted.
    response = client.get(
        f"/tickets/{ticket_id}/messages",
        headers=auth(customer_token),
    )

    assert response.status_code == 200
    assert len(response.json()) == original_count


# ============================================================
# TEST 7 — INVALID WEBSOCKET PAYLOAD
# ============================================================

def test_invalid_websocket_payload(
    client: TestClient,
    scenario,
):

    ticket_id = scenario["ticket"]["id"]
    customer_token = scenario["customer_a1"]["token"]

    with client.websocket_connect(
        f"/ws/tickets/{ticket_id}?token={customer_token}"
    ) as websocket:

        websocket.send_json({
            "type": "message.send",
            "body": "   ",
        })

        event = websocket.receive_json()

        assert event["type"] == "error"


# ============================================================
# TEST 8 — PASSWORD HASH NOT EXPOSED
# ============================================================

def test_password_hash_not_exposed(
    client: TestClient,
    scenario,
):

    admin_token = scenario["business_a"]["token"]

    response = client.get(
        "/users",
        headers=auth(admin_token),
    )

    assert response.status_code == 200

    for user in response.json():
        assert "password_hash" not in user
        assert "password" not in user

    response = client.get(
        "/auth/me",
        headers=auth(admin_token),
    )

    assert response.status_code == 200

    assert "password_hash" not in response.json()["user"]
    assert "password" not in response.json()["user"]