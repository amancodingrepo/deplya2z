# Database

This folder contains SQL artifacts for the shared backend used by:

- Mobile app (warehouse manager, store manager)
- Web app (superadmin and operations dashboards)

## Files

- schema.sql: Core PRD-aligned schema for locations, users, products, inventory, store orders, and idempotency logs.
- seed.sql: Development seed records for warehouse listing and store request workflows.
  Includes one active third-party client store for bulk order testing.

## Production notes

- Enable row-level security policies per role and location.
- Use transactional locks (`SELECT ... FOR UPDATE`) during approve/dispatch/receive stock transitions.
- Store idempotency responses in Redis for 24-hour TTL and keep audit rows in PostgreSQL.
- Current scaffold stores idempotency replay payloads in PostgreSQL `idempotency_logs` (Redis recommended for production scale).

## Neon Setup

Run these commands from [backend](backend):

```bash
# Use your Neon connection string with sslmode=require
psql "$DATABASE_URL" -f src/database/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f src/database/migrations/002_seed_data.sql
```

Local-only alternative using this folder:

```bash
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/seed.sql
```
