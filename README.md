# HelpDesk Mini

Multi-tenant support tickets with role-based access and real-time chat.

[Live demo](https://helpdesk.chaomelo.online) | [Demo video](https://drive.google.com/file/d/1s9Qe5z78sNTd5PiHJ1kmek3xF3-pgte_/view?usp=sharing)

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui, FastAPI, SQLAlchemy, Alembic, PostgreSQL 17, WebSocket, and Docker Compose. Authentication uses JWT and Argon2 password hashing.

## Features

- Business registration with an initial Admin account.
- Business-scoped users, tickets, and conversations.
- Tickets with subject, category, priority, an initial message, and status filtering.
- Admin assignment and Agent self-assignment.
- Persisted chat and live status updates for open ticket pages.

## Roles

| Action | Admin | Agent | Customer |
| --- | --- | --- | --- |
| View tickets and history | Business-wide | Business-wide | Own only |
| Create tickets | No | No | Yes |
| List/create Agents and Customers | Yes | No | No |
| Assign tickets | Yes | Take ownership | No |
| Update status | Yes | Yes | Reopen only |
| Send messages | No | Yes | Own tickets |

Admins and Agents follow `open -> in_progress -> resolved -> closed`. Customers can reopen their own resolved tickets (`resolved -> open`). Closed tickets reject new messages.

## Local Setup

Requires Git, Docker Engine, and the Docker Compose plugin.

```bash
git clone https://github.com/alno09/helpdesk-mini.git
cd helpdesk-mini
cp .env.example .env
```

In `.env`, replace `POSTGRES_PASSWORD` and `JWT_SECRET`. Keep the password in `DATABASE_URL` consistent. You can generate a secret with:

```bash
openssl rand -hex 48
```

```bash
docker compose up -d --build
```

Backend startup applies migrations automatically.

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| API docs | http://localhost:8000/docs |
| Database health | http://localhost:8000/health/db |

`compose.yml` sets the container database URL, frontend build argument `NEXT_PUBLIC_API_URL`, and backend `FRONTEND_ORIGIN`. To change frontend/API addresses, edit Compose and rebuild. The `.env` database URL uses host port `5433` for running the backend outside Docker.

Stop with `docker compose down`; database data is preserved.

## Demo Accounts

```bash
docker compose exec -e SEED_DEMO=1 backend python -m scripts.seed
```

Seeding is repeatable and requires the database name `helpdesk`. It creates two businesses and eight users, all with password `DemoPass123!`.

| Role | Demo Coffee | Demo Hotel |
| --- | --- | --- |
| Admin | coffee.admin@example.com | hotel.admin@example.com |
| Agent | coffee.agent@example.com | hotel.agent@example.com |
| Customer 1 | coffee.customer1@example.com | hotel.customer1@example.com |
| Customer 2 | coffee.customer2@example.com | hotel.customer2@example.com |

Open separate browsers for Customer and Agent accounts to try chat and status updates. Use sample data in the shared live demo.

## API

See `/docs` for REST endpoints. `/users` requires Admin access.

Ticket WebSocket: `/ws/tickets/{id}?token=<ACCESS_TOKEN>`

Events: `message.send`, `message.created`, `ticket.updated`, and `error`. Connections require a valid access token and ticket access.

## Tests

Install `backend/requirements.txt`. Create a PostgreSQL database named `helpdesk_test`, set `DATABASE_URL` to its connection string, and apply migrations from `backend/` with `python -m alembic upgrade head`. Set `TEST_DATABASE_URL` to the same connection string, then run:

```bash
python -m pytest tests/ -v
```

Tests cover authentication, permissions, tenant isolation, ticket transitions, and WebSocket behavior. Fixtures clear test data before each test.

## Structure

```text
frontend/src/       Next.js pages, components, features, and helpers
backend/app/        Models, core configuration, auth/users/tickets/chat modules
backend/alembic/    Database migrations
backend/scripts/    Demo seed script
backend/tests/      Integration tests
compose.yml        Local Docker stack
```

## Limitations

- WebSocket rooms are in memory and require a single backend process.
- Agents must refresh the ticket list to see new tickets.
- WebSocket connections do not reconnect automatically; reload the ticket page.
- Agents can update any ticket status within their business, regardless of assignment. Taking ownership does not change status.
- Tokens use browser `sessionStorage`; refresh tokens have no server-side revocation or rotation.
