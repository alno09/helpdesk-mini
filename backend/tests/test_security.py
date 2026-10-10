from fastapi.testclient import TestClient


def auth(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
    }


def test_unauthenticated_ticket_access(
    client: TestClient,
    scenario,
):
    ticket_id = scenario["ticket"]["id"]

    response = client.get(
        f"/tickets/{ticket_id}"
    )

    assert response.status_code == 401


def test_cross_tenant_ticket_isolation(
    client: TestClient,
    scenario,
):
    ticket_id = scenario["ticket"]["id"]

    agent_b_token = scenario["agent_b"]["token"]

    response = client.get(
        f"/tickets/{ticket_id}",
        headers=auth(agent_b_token),
    )

    assert response.status_code == 404

    response = client.get(
        f"/tickets/{ticket_id}/messages",
        headers=auth(agent_b_token),
    )

    assert response.status_code == 404

    response = client.patch(
        f"/tickets/{ticket_id}",
        headers=auth(agent_b_token),
        json={
            "status": "in_progress",
        },
    )

    assert response.status_code == 404


def test_customer_ownership_isolation(
    client: TestClient,
    scenario,
):
    ticket_id = scenario["ticket"]["id"]

    customer_a2_token = scenario["customer_a2"]["token"]

    response = client.get(
        f"/tickets/{ticket_id}",
        headers=auth(customer_a2_token),
    )

    assert response.status_code == 404

    response = client.get(
        "/tickets",
        headers=auth(customer_a2_token),
    )

    assert response.status_code == 200
    assert response.json() == []


def test_agent_can_access_business_tickets(
    client: TestClient,
    scenario,
):
    ticket_id = scenario["ticket"]["id"]

    agent_a_token = scenario["agent_a"]["token"]

    response = client.get(
        f"/tickets/{ticket_id}",
        headers=auth(agent_a_token),
    )

    assert response.status_code == 200
    assert response.json()["id"] == ticket_id


def test_customer_cannot_assign_ticket(
    client: TestClient,
    scenario,
):
    ticket_id = scenario["ticket"]["id"]

    customer_token = scenario["customer_a1"]["token"]

    response = client.patch(
        f"/tickets/{ticket_id}",
        headers=auth(customer_token),
        json={
            "assigned_agent_id": scenario["agent_a"]["user"]["id"],
        },
    )

    assert response.status_code == 403


def test_admin_cannot_assign_foreign_agent(
    client: TestClient,
    scenario,
):
    ticket_id = scenario["ticket"]["id"]

    admin_a_token = scenario["business_a"]["token"]

    foreign_agent_id = scenario["agent_b"]["user"]["id"]

    response = client.patch(
        f"/tickets/{ticket_id}",
        headers=auth(admin_a_token),
        json={
            "assigned_agent_id": foreign_agent_id,
        },
    )

    assert response.status_code == 404


def test_ticket_lifecycle(
    client: TestClient,
    scenario,
):
    ticket_id = scenario["ticket"]["id"]

    agent_token = scenario["agent_a"]["token"]
    customer_token = scenario["customer_a1"]["token"]

    for new_status in ["in_progress", "resolved"]:

        response = client.patch(
            f"/tickets/{ticket_id}",
            headers=auth(agent_token),
            json={
                "status": new_status,
            },
        )

        assert response.status_code == 200
        assert response.json()["status"] == new_status

    # Customer reopens a resolved ticket.
    response = client.patch(
        f"/tickets/{ticket_id}",
        headers=auth(customer_token),
        json={
            "status": "open",
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "open"


def test_role_restrictions(
    client: TestClient,
    scenario,
):
    agent_token = scenario["agent_a"]["token"]
    customer_token = scenario["customer_a1"]["token"]

    response = client.get(
        "/users",
        headers=auth(agent_token),
    )

    assert response.status_code == 403

    response = client.post(
        "/tickets",
        headers=auth(agent_token),
        json={
            "subject": "Unauthorized ticket",
            "category": "Test",
            "priority": "low",
            "message": "Should be rejected",
        },
    )

    assert response.status_code == 403

    response = client.get(
        "/tickets",
        headers=auth(customer_token),
    )

    assert response.status_code == 200
    assert len(response.json()) == 1