# Store & Warehouse Backend

Production-oriented REST API for the shared store and warehouse platform.

## Implemented endpoints

- GET /health
- GET /ready
- POST /auth/login
- POST /auth/logout
- POST /auth/refresh
- GET /inventory
- GET /inventory/low-stock
- GET /inventory/movements
- GET /products
- GET /locations
- GET /clients
- GET /orders
- POST /orders
- PATCH /orders/:id/approve
- PATCH /orders/:id/pack
- PATCH /orders/:id/dispatch
- PATCH /orders/:id/confirm-receive
- GET /bulk-orders
- POST /bulk-orders
- PATCH /bulk-orders/:id/pack
- PATCH /bulk-orders/:id/dispatch

All API routes are mounted on both `/` and `/v1` prefixes for backward compatibility.

## Production requirements

- `DATABASE_URL` must point to PostgreSQL (Neon or equivalent)
- `JWT_SECRET` must be set
- `CORS_ORIGIN` must match the web client origin
- `SEED_PASSWORD_HASH` must be set for seeded users
- `PORT`, `NODE_ENV`, and optional pool settings may be configured

## Run

1. npm install
2. Copy `.env.example` to `.env`
3. Run database migrations and seed data
4. npm run dev

Use the returned JWT as: `Authorization: Bearer <token>`

## Notes

- Backend routes are backed by PostgreSQL repositories.
- Inventory and order transitions use PRD-aligned role checks and location-code translation.
- Critical mutation endpoints enforce `Idempotency-Key` and persist replay responses in `idempotency_logs`.
- Stock movements are persisted for reserve/dispatch/receive events and exposed by `/inventory/movements`.
- For full production deployment, wire Redis-backed idempotency and background jobs.
