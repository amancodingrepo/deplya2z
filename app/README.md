# Store & Warehouse Mobile App (Flutter)

This app follows the PRD for two operational roles in a single mobile client:

- Warehouse Manager: list inventory, pack, dispatch.
- Store Manager: view store inventory, request items, confirm receipt.
- Superadmin Employee App: create/list/update employee accounts.

It is designed for the same backend and database model used by the web app.

## Backend contract

The app consumes the shared REST endpoints:

- POST /auth/login
- POST /auth/refresh
- GET /inventory
- GET /orders
- POST /orders
- PATCH /orders/:id/pack
- PATCH /orders/:id/dispatch
- PATCH /orders/:id/confirm-receive
- GET /users
- POST /users
- PATCH /users/:id
- GET /locations

## Run

1. Ensure backend is running.
2. Run app with API base URL:

	flutter run --dart-define=API_BASE_URL=http://localhost:8080

If API is unavailable, login and online sync fail with backend errors while local cached data remains available.
