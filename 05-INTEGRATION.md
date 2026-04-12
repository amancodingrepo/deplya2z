# Unified Integration Notes (App + Web + Backend + Database)

This project is structured as one operational system:

- app: Flutter mobile client for warehouse_manager and store_manager
- web: Next.js operations console
- backend: Node.js API used by both clients
- database: Shared PostgreSQL schema and seed scripts

## Core flow implemented

1. Warehouse lists inventory from GET /inventory
2. Store requests items using POST /orders
3. Warehouse can pack/dispatch
4. Store can confirm receive

## Shared API routes

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

All routes are available on both base and `/v1` prefixes.

## Environment setup

- app/.env.example explains Flutter --dart-define usage
- web/.env.example provides NEXT_PUBLIC_API_BASE_URL
- backend/.env.example provides PORT and CORS_ORIGIN
