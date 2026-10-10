import pytest

from fastapi.testclient import TestClient

from starlette.testclient import WebSocketDenialResponse
from starlette.websockets import WebSocketDisconnect


def ws_url(ticket_id: int, token: str) -> str:
    return f"/ws/tickets/{ticket_id}?token={token}"


def assert_websocket_denied(
    client: TestClient,
    url: str,
):
    try:
        with client.websocket_connect(url):
            pytest.fail(
                "Unauthorized WebSocket connection was accepted"
            )

    except WebSocketDenialResponse as exc:
        assert exc.status_code == 403

    except WebSocketDisconnect as exc:
        assert exc.code == 1008


def test_websocket_rejects_missing_token(
    client: TestClient,
    scenario,
):
    ticket_id = scenario["ticket"]["id"]

    assert_websocket_denied(
        client,
        f"/ws/tickets/{ticket_id}",
    )


def test_websocket_rejects_cross_tenant_user(
    client: TestClient,
    scenario,
):
    ticket_id = scenario["ticket"]["id"]

    token = scenario["agent_b"]["token"]

    assert_websocket_denied(
        client,
        ws_url(ticket_id, token),
    )


def test_websocket_rejects_other_customer(
    client: TestClient,
    scenario,
):
    ticket_id = scenario["ticket"]["id"]

    token = scenario["customer_a2"]["token"]

    assert_websocket_denied(
        client,
        ws_url(ticket_id, token),
    )


def test_websocket_message_delivery(
    client: TestClient,
    scenario,
):
    ticket_id = scenario["ticket"]["id"]

    customer_token = scenario["customer_a1"]["token"]
    agent_token = scenario["agent_a"]["token"]

    with client.websocket_connect(
        ws_url(ticket_id, customer_token)
    ) as customer_ws:

        with client.websocket_connect(
            ws_url(ticket_id, agent_token)
        ) as agent_ws:

            customer_ws.send_json({
                "type": "message.send",
                "body": "Hello Agent!",
            })

            customer_event = customer_ws.receive_json()
            agent_event = agent_ws.receive_json()

            assert customer_event["type"] == "message.created"
            assert agent_event["type"] == "message.created"

            assert (
                customer_event["message"]["body"]
                == "Hello Agent!"
            )

            assert (
                agent_event["message"]["body"]
                == "Hello Agent!"
            )

    # Verify database persistence through REST API.
    response = client.get(
        f"/tickets/{ticket_id}/messages",
        headers={
            "Authorization": f"Bearer {customer_token}",
        },
    )

    assert response.status_code == 200

    bodies = [
        message["body"]
        for message in response.json()
    ]

    assert "Hello Agent!" in bodies


def test_websocket_status_broadcast(
    client: TestClient,
    scenario,
):
    ticket_id = scenario["ticket"]["id"]

    customer_token = scenario["customer_a1"]["token"]
    agent_token = scenario["agent_a"]["token"]

    with client.websocket_connect(
        ws_url(ticket_id, customer_token)
    ) as customer_ws:

        with client.websocket_connect(
            ws_url(ticket_id, agent_token)
        ) as agent_ws:

            response = client.patch(
                f"/tickets/{ticket_id}",
                headers={
                    "Authorization": f"Bearer {agent_token}",
                },
                json={
                    "status": "in_progress",
                },
            )

            assert response.status_code == 200

            customer_event = customer_ws.receive_json()
            agent_event = agent_ws.receive_json()

            assert customer_event["type"] == "ticket.updated"
            assert agent_event["type"] == "ticket.updated"

            assert (
                customer_event["ticket"]["status"]
                == "in_progress"
            )

            assert (
                agent_event["ticket"]["status"]
                == "in_progress"
            )