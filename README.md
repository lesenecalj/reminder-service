# Reminder Service

A lightweight **Node.js / TypeScript microservice** that lets clients register event reminders over **WebSocket**.  
When the reminder time is reached, the service notifies **all connected clients**.

Designed as a technical test but structured like a production-ready service:  
- **TypeScript** with type-safe DTOs (Zod validation)  
- **PostgreSQL** persistence (TypeORM)  
- **Redis + BullMQ** scheduler for scalable delayed jobs  
- **WebSocket gateway** to notify connected clients  
- **Unit tests** (Vitest) with AAA structure and mocks  
- Ready for **Docker Compose** (Postgres + Redis + App)   

## Features

- **Add a reminder**:  
  Client sends `C2S_ADD_REMINDER` with `{ name, at }`.  
  → Service validates & persists the reminder (idempotent: same `name` pending = ignored).

- **Receive events**:  
  - `S2C_REMINDER_ADDED` = Acknowledgment with `created=true|false`.  
  - `S2C_REMINDER_FIRED` = Broadcast to **all connected clients** when the reminder is due.  

- **Persistence**:  
  Reminders survive service restarts (PostgreSQL).  
  Scheduler (BullMQ) reloads pending reminders at bootstrap.

- **Scalable design**:  
  - Single instance: in-process broadcast via WebSocket.  
  - Multi-instance ready: Redis Pub/Sub could be added to fan-out messages.

## Project Structure

```
src/
 ├─ adapters/          # Infrastructure adapters (e.g. BullMQ scheduler)
 ├─ clients/           # CLI clients to interact with the service
 ├─ entities/          # TypeORM entities (Reminder)
 ├─ helpers/           # Broadcaster, utility classes
 ├─ repositories/      # ReminderRepository (DB access)
 ├─ schemas/           # Zod schemas for input/output validation
 ├─ services/          # ReminderService (business logic)
 ├─ types/             # Type-safe contracts (DTOs & WS payloads) 
 ├─ ws/                # WebSocketGateway (entrypoint for clients)
 └─ server.ts          # App bootstrap
```

## Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/lesenecalj/reminder-service.git
cd reminder-service
npm install
cp .env.example .env
```

### 2. Run with Docker Compose
Spin up **Postgres + Redis + the app**:
```bash
npm run docker:build
npm run docker:up
```

Check logs:
```bash
npm run docker:logs
```

Stop stack:
```bash
npm run docker:down
```

### 3. CLI Clients

Create a reminder:
```bash
npm run cli:create
```
You will be prompted for:
- Reminder message (name)
- Delay (in seconds)

Listen for fired events:
```bash
npm run cli:listen
```

Both scripts connect to the app’s WebSocket (`WS_URL` from `.env`).

## Configuration

Environment variables (set in `.env`):

```env
# App
WS_PORT=8080
WS_URL=ws://localhost:8080

# Database (PostgreSQL)
DATABASE_URL=postgres://reminder_user:secretpassword@db:5432/reminders

# Redis
REDIS_URL=redis://redis:6379
QUEUE_NAME=reminders
```

## Tests

Run unit tests (Vitest):

```bash
npm test
```

Tests cover:
- ReminderService (`addReminder`, `onReminderDue`, `bootstrap`)
- Input validation (Zod)

## Architecture Notes

- **ReminderService** = pure business logic  
- **Scheduler (BullMQ)** = infrastructure, delay handling  
- **Repository (TypeORM)** = persistence  
- **Broadcaster** = abstraction over WebSocket broadcast  
- **WebSocketGateway** = controller-like entrypoint  

This layering makes it easy to:
- Scale horizontally (multi-instance with Redis Pub/Sub).  

## Development Tips
- **Docker only**: scripts in `package.json` (preferred).  
- **DB Admin**:  
  - PostgreSQL: use [pgAdmin 4](https://www.pgadmin.org/)
  - Redis: use [RedisInsight](https://redis.com/redis-enterprise/redis-insight/).

> **Notice**: Use the **host port** to connect to the databases when using external UI tools (e.g., pgAdmin, RedisInsight), since they are outside of Docker.

## Example Workflow

1. Run `npm run docker:up`  
2. Start a listener: `npm run cli:listen`  
3. Create a reminder: `npm run cli:create` (e.g. “hello” in 5s)  
4. After 5s → all connected listeners receive `S2C_REMINDER_FIRED`.
