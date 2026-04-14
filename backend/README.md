# Store & Warehouse Supply Management System - Backend API

**Version:** 2.0 Production-Ready  
**Framework:** Node.js + Express + TypeScript  
**Database:** PostgreSQL (Neon)  
**Queue:** Bull (Redis)  

---

## Overview

Production-ready backend API for managing inventory and orders between warehouses and stores. Features role-based access control, real-time stock tracking with reservations, comprehensive audit logging, and async notifications.

### Key Features

- ✅ **Role-Based Access Control**: Superadmin, Warehouse Manager, Store Manager
- ✅ **Reserved Stock Model**: Prevents overselling with row-level locking
- ✅ **Complete Audit Trail**: Every action logged with timestamp and actor
- ✅ **State Machine Enforcement**: Only valid status transitions allowed
- ✅ **Idempotency**: Prevents duplicate operations on network retries
- ✅ **Async Notifications**: Bull queue with retry logic
- ✅ **Transaction Safety**: PostgreSQL transactions with FOR UPDATE locks
- ✅ **Production Security**: bcrypt, JWT, rate limiting, helmet
- ✅ **Docker Ready**: Full containerization with docker-compose

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- npm

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env

# 3. Update .env with your database credentials
# DATABASE_URL=postgresql://user:pass@host:5432/store_warehouse

# 4. Run database migrations
psql -h localhost -U postgres -d store_warehouse -f src/database/migrations/001_initial_schema.sql
psql -h localhost -U postgres -d store_warehouse -f src/database/migrations/002_seed_data.sql

# 5. Start development server
npm run dev
```

The API will be available at `http://localhost:8080`

---

## Docker Setup

```bash
# Start all services (PostgreSQL + Redis + API)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

---

## API Endpoints

All routes mounted on `/` and `/v1` prefixes.

### Authentication
- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - Logout

### Products
- `GET /products` - List all products
- `POST /products` - Create product (superadmin)
- `PATCH /products/:id` - Update product (superadmin)

### Inventory
- `GET /inventory` - View inventory
- `GET /inventory/low-stock` - Low stock alerts
- `GET /inventory/movements` - Stock movement history

### Store Orders
- `GET /orders` - List orders
- `POST /orders` - Create order (store_manager)
- `PATCH /orders/:id/approve` - Approve (superadmin)
- `PATCH /orders/:id/pack` - Mark packed (warehouse_manager)
- `PATCH /orders/:id/dispatch` - Mark dispatched (warehouse_manager)
- `PATCH /orders/:id/confirm-receive` - Confirm receipt (store_manager)

### Bulk Orders
- `GET /bulk-orders` - List bulk orders
- `POST /bulk-orders` - Create bulk order (superadmin)
- `PATCH /bulk-orders/:id/pack` - Mark packed (warehouse_manager)
- `PATCH /bulk-orders/:id/dispatch` - Mark dispatched (warehouse_manager)

### Users & Locations
- `GET /users` - List users
- `POST /users` - Create user (superadmin)
- `PATCH /users/:id` - Update user (superadmin)
- `GET /locations` - List locations
- `GET /clients` - List client stores

---

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT signing (32+ chars)
- `REDIS_HOST` - Redis host for Bull queue
- `REDIS_PORT` - Redis port

Optional:
- `PORT` - API port (default: 8080)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - Frontend URL
- `BCRYPT_ROUNDS` - Password hashing rounds (default: 12)
- `LOG_LEVEL` - Logging level (default: info)

See `.env.example` for complete list.

---

## Default Credentials (Dev Only)

**Superadmin**: admin@storewarehouse.com / password123  
**Warehouse Manager**: warehouse@storewarehouse.com / password123  
**Store Manager**: store1@storewarehouse.com / password123  

⚠️ **Change in production!**

---

## Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── routes/          # API routes
│   │   └── middleware/      # Auth, validation, error handling
│   ├── services/            # Business logic
│   │   ├── authService.ts
│   │   ├── orderService.ts
│   │   ├── inventoryService.ts
│   │   ├── auditService.ts
│   │   └── notificationService.ts
│   ├── repositories/        # Data access layer
│   ├── database/
│   │   └── migrations/      # SQL migrations
│   ├── queue/              # Bull queue setup
│   ├── utils/              # Utilities (logger, crypto, helpers)
│   ├── shared/             # Shared types and errors
│   ├── app.ts              # Express app setup
│   └── server.ts           # Server entry point
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## Production Checklist

- [ ] Set strong `JWT_SECRET` (32+ random chars)
- [ ] Configure `DATABASE_URL` to Neon or production PostgreSQL
- [ ] Set `CORS_ORIGIN` to frontend domain
- [ ] Run database migrations
- [ ] Set up Redis for Bull queue
- [ ] Enable rate limiting
- [ ] Configure monitoring and alerts
- [ ] Set up backup strategy
- [ ] Enable HTTPS
- [ ] Change default passwords

---

## Documentation

- Full API Spec: See `04-BACKEND.md`
- Product Requirements: See `store_warehouse_prd_v2_production.json`
- Database Schema: See `src/database/migrations/001_initial_schema.sql`

---

## Support

For issues and questions, refer to the PRD and backend specification documents.
