# HelpDesk Mini

A multi-tenant customer support ticketing application built with Next.js, FastAPI, PostgreSQL, and WebSocket.

HelpDesk Mini allows multiple businesses to manage customer support tickets independently through a shared platform.

Each business has its own users, support tickets, and conversations.

## Tech Stack

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Native WebSocket API

### Backend
- Python 3.12
- FastAPI
- SQLAlchemy 2
- Alembic
- PyJWT
- Argon2 password hashing

### Infrastructure
- PostgreSQL 17
- Docker Compose

### Testing
- pytest
- FastAPI TestClient
- PostgreSQL integration database

---

## Features

### Authentication
- Business registration with initial Admin account
- JWT access and refresh tokens
- Role-based authorization
- Password hashing using Argon2
- Protected frontend routes

### Ticket Management
- Customer ticket creation
- Ticket priority and category
- Role-based ticket visibility
- Ticket status filtering
- Agent self-assignment
- Admin agent assignment
- Ticket status transitions
- Customer ticket reopening

### Real-Time Messaging
- Ticket-based WebSocket rooms
- JWT-authenticated WebSocket connections
- Real-time messaging between Agents and Customers
- Persistent message history
- Real-time ticket status broadcasts
- Closed ticket message restrictions

### Multi-Tenant Isolation
- Each user belongs to one business
- Ticket queries are scoped by business_id
- Customers can access only their own tickets
- Cross-tenant resource access returns HTTP 404
- WebSocket connections validate ticket access

---

## User Roles

| Permission | Admin | Agent | Customer |
|---|---|---|---|
| View business tickets | Yes | Yes | Own only |
| Create tickets | No | No | Yes |
| Create Agent/Customer | Yes | No | No |
| Assign Agent | Yes | No | No |
| Take Ticket | No | Yes | No |
| Update Ticket Status | Yes | Yes | Reopen only |
| Send Chat Messages | No | Yes | Yes |

Admin can monitor ticket conversations but cannot send chat messages in the current implementation.

---

## Getting Started

### Prerequisites

Install:

- Docker Engine
- Docker Compose plugin
- Git

Docker Compose is the recommended way to run the application.

### 1. Clone Repository

```bash
git clone <REPOSITORY_URL>
cd helpdesk-mini
```

Replace `<REPOSITORY_URL>` with the actual GitHub repository URL.

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Generate a JWT secret:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Open `.env` and configure the required values.

Example configuration:

```env
POSTGRES_USER=helpdesk
POSTGRES_PASSWORD=change_this_local_password
POSTGRES_DB=helpdesk

DATABASE_URL=postgresql+psycopg://helpdesk:change_this_local_password@127.0.0.1:5433/helpdesk

JWT_SECRET=replace_with_generated_secret
FRONTEND_ORIGIN=http://localhost:3000
```

Use the same PostgreSQL password in `POSTGRES_PASSWORD` and `DATABASE_URL`.

The `DATABASE_URL` above is intended for local development. Docker Compose overrides it for the backend container.

Do not commit the `.env` file.

### 3. Build and Start

From the repository root:

```bash
docker compose up -d --build
```

Docker Compose starts:

- PostgreSQL
- FastAPI backend
- Next.js frontend

The backend automatically applies Alembic migrations during startup.

### 4. Access the Application

Frontend:

http://localhost:3000

Backend API:

http://localhost:8000

Swagger documentation:

http://localhost:8000/docs

Database health:

http://localhost:8000/health/db

### 5. Seed Demo Data

Run:

```bash
docker compose exec -e SEED_DEMO=1 backend python -m scripts.seed
```

The seeder creates two demo businesses and eight user accounts.

The script is idempotent. Existing matching demo records are not duplicated.

The seeder is restricted to the development database named `helpdesk`.

### 6. Stop the Application

```bash
docker compose down
```

This preserves PostgreSQL data.

To reset the database completely:

```bash
docker compose down -v
```

WARNING: The `-v` option deletes the PostgreSQL volume and all stored application data.

---

## Demo Accounts

All demo accounts use the password:

`DemoPass123!`

### Business A — Demo Coffee

| Role | Email |
|---|---|
| Admin | coffee.admin@example.com |
| Agent | coffee.agent@example.com |
| Customer 1 | coffee.customer1@example.com |
| Customer 2 | coffee.customer2@example.com |

### Business B — Demo Hotel

| Role | Email |
|---|---|
| Admin | hotel.admin@example.com |
| Agent | hotel.agent@example.com |
| Customer 1 | hotel.customer1@example.com |
| Customer 2 | hotel.customer2@example.com |

Demo credentials are intended for local evaluation only.

Do not use these accounts in production.

---

## Demo Workflow

### 1. Create a Ticket

Login as:

`coffee.customer1@example.com`

Navigate to:

`/tickets/new`

Create a support ticket.

### 2. Open the Agent Workspace

Open another browser or an incognito window.

Login as:

`coffee.agent@example.com`

Navigate to `/tickets`.

Open the ticket created by Customer 1.

### 3. Test Real-Time Messaging

Keep both browsers open on the same ticket.

Send a message from the Customer browser.

The message should appear in the Agent browser without refreshing.

Reply from the Agent browser.

The Customer browser should receive the response immediately.

### 4. Test Ticket Status

From the Agent browser, change the ticket status.

The Customer browser should receive the updated status in real time.

### 5. Verify Multi-Tenant Isolation

Login as:

`hotel.agent@example.com`

Attempt to access the ticket belonging to Demo Coffee.

The backend must reject the request with HTTP 404.

---

## Project Structure

```text
helpdesk-mini/
├── frontend/
│   └── src/
│       ├── app/
│       ├── components/
│       │   ├── ui/
│       │   └── layout/
│       ├── features/
│       │   ├── auth/
│       │   ├── users/
│       │   ├── tickets/
│       │   └── chat/
│       └── lib/
│
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── models/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── tickets/
│   │   │   └── chat/
│   │   └── main.py
│   ├── alembic/
│   ├── scripts/
│   └── tests/
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API Endpoints

### Authentication

| Method | Endpoint |
|---|---|
| POST | /auth/register-business |
| POST | /auth/login |
| POST | /auth/refresh |
| GET | /auth/me |

### User Management

| Method | Endpoint |
|---|---|
| GET | /users |
| POST | /users |

### Tickets

| Method | Endpoint |
|---|---|
| GET | /tickets |
| POST | /tickets |
| GET | /tickets/{id} |
| PATCH | /tickets/{id} |
| GET | /tickets/{id}/messages |

### WebSocket

```text
/ws/tickets/{id}?token=<ACCESS_TOKEN>
```

Supported events:

```text
message.send
message.created
ticket.updated
error
```

Complete REST API documentation is available through Swagger.

---

## Database Design

The application uses four primary tables:

### businesses
Stores registered business tenants.

### users
Stores users and their associated business and role.

### tickets
Stores support tickets, assignment information, and status.

### messages
Stores persistent ticket conversations.

The `tickets` table includes `business_id` to support direct tenant-scoped queries.

Database schemas are managed through Alembic migrations.

---

## Security

### Multi-Tenant Isolation

Ticket access is validated in the backend using the authenticated user's `business_id`.

Customers are additionally restricted by `customer_id`.

Unauthorized access to another tenant's ticket returns HTTP 404.

### Authentication

Passwords are hashed using Argon2.

JWT access tokens expire after 15 minutes.

JWT refresh tokens expire after 7 days.

Token types are validated to prevent refresh tokens from being used as access tokens.

### WebSocket Authorization

WebSocket connections require valid JWT access tokens.

Ticket ownership and business access are validated before the connection is accepted.

Authorization is also checked when messages are persisted.

---

## Testing

The backend includes automated integration tests using pytest.

The test suite covers:

- Authentication enforcement
- Role authorization
- Multi-tenant isolation
- Customer ticket ownership
- Agent assignment restrictions
- Ticket lifecycle
- WebSocket authorization
- Real-time message delivery
- Message persistence
- Ticket status broadcasting

Tests use a separate PostgreSQL database named `helpdesk_test`.

### Test Environment

Create the test database using PostgreSQL.

Apply Alembic migrations to the test database.

Set `TEST_DATABASE_URL` to the dedicated testing database.

Then run from `backend/`:

```bash
python -m pytest tests/ -v
```

The existing integration suite contains 13 tests.

Never point `TEST_DATABASE_URL` to the development database because the test fixtures reset database records.

---

## Technical Decisions

### Modular Monolith

The backend follows a modular monolith architecture.

Each feature module separates:

- Router
- Service
- Schemas

Database entities and shared infrastructure are maintained separately.

This provides clear module boundaries without introducing unnecessary distributed-system complexity.

### Shared PostgreSQL Database

All tenants share one relational database.

Tenant isolation is enforced at the application layer using business-scoped queries and authorization policies.

### WebSocket Connection Manager

WebSocket connections are grouped by ticket ID using an in-memory connection manager.

This approach is appropriate for the assessment's single-instance deployment.

### Database Transactions

Ticket creation and its initial message are persisted within one transaction.

Ticket updates and message persistence use transactional database operations.

Row locking helps coordinate concurrent modifications.

---

## Trade-offs and Known Limitations

### 1. Single-Instance WebSocket

The in-memory connection manager does not support broadcasting across multiple backend processes or instances.

A production-scale system could use Redis Pub/Sub or another message broker.

### 2. Refresh Token Management

Refresh tokens are JWT-based and do not currently support server-side revocation or rotation.

Production authentication would benefit from refresh-token rotation and session management.

### 3. Frontend Token Storage

Authentication tokens are currently stored using browser sessionStorage.

This simplifies the assessment implementation but exposes tokens to JavaScript.

A production system should consider secure HttpOnly cookies and stronger session handling.

### 4. Ticket Assignment Workflow

Agents can currently update ticket status without first assigning the ticket to themselves.

A stricter workflow would require an Agent to take ownership before changing the status.

This improvement was intentionally deferred to prioritize the mandatory requirements.

### 5. WebSocket Reconnection

The frontend does not currently implement automatic WebSocket reconnection after a network interruption.

Users can reconnect by refreshing the ticket page.

### 6. Deployment

The application is designed for reproducible local execution through Docker Compose.

Cloud deployment is not included in the current implementation.

---

## Demo Video

Demo video: `<ADD_VIDEO_LINK>`

The video demonstrates:

1. Customer and Agent real-time messaging.
2. Ticket status updates.
3. Cross-business access rejection.

---

## Assessment Notes

The implementation prioritizes:

1. Mandatory feature completeness.
2. Backend authorization and tenant isolation.
3. Real-time communication.
4. Maintainable code organization.
5. Reproducible setup and documentation.

Known limitations and technical trade-offs are documented above.