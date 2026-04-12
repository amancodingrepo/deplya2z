# Store & Warehouse Web

This Next.js app uses the same backend contract and database model as mobile.

## Purpose of this scaffold

- Show warehouse inventory listing flow.
- Show store item request flow.
- Keep one shared backend and data model.

## Run

1. Start backend on http://localhost:8080
2. Copy .env.example to .env.local
3. In this folder: npm install
4. npm run dev
5. Open role pages:
	- /warehouse
	- /store
	- /bulk-orders
	- /store-request

## Environment

Set NEXT_PUBLIC_API_BASE_URL if backend is not localhost:8080/v1.
