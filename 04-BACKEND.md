# Store & Warehouse Supply Management System - Backend API Guide

**Version:** 2.0  
**Framework:** Node.js (Express) or Go (Echo)  
**Status:** Production-Specification

---

## Tech Stack Recommendation

### **Option A: Node.js + Express (Recommended)**
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon)
- **Queue:** Bull (Redis) for async jobs
- **Auth:** JWT + bcrypt
- **Time to market:** 10 weeks realistic
- **Team familiarity:** Higher if JS/TS team

### **Option B: Go + Echo**
- **Language:** Go
- **Performance:** Better than Node.js
- **Learning curve:** Steeper
- **Deployment:** Single binary
- **Time to market:** 10-12 weeks

**Recommendation:** Node.js + Express (ecosystem maturity, faster development)

---

## API Architecture

```
┌─────────────────────────────────────────────┐
│          REST API (Express)                  │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Routes Layer (Express)             │   │
│  │  - Authentication routes            │   │
│  │  - CRUD routes (products, orders)   │   │
│  │  - Action routes (approve, dispatch)│   │
│  └─────────────────────────────────────┘   │
│           ↓                                  │
│  ┌─────────────────────────────────────┐   │
│  │  Middleware Layer                   │   │
│  │  - Authentication (JWT verify)      │   │
│  │  - Authorization (RLS)              │   │
│  │  - Validation (request schema)      │   │
│  │  - Rate limiting                    │   │
│  │  - Error handling                   │   │
│  │  - Audit logging                    │   │
│  └─────────────────────────────────────┘   │
│           ↓                                  │
│  ┌─────────────────────────────────────┐   │
│  │  Service Layer (Business Logic)     │   │
│  │  - OrderService                     │   │
│  │  - InventoryService                 │   │
│  │  - ProductService                   │   │
│  │  - UserService                      │   │
│  └─────────────────────────────────────┘   │
│           ↓                                  │
│  ┌─────────────────────────────────────┐   │
│  │  Repository Layer (Data Access)     │   │
│  │  - OrderRepository                  │   │
│  │  - InventoryRepository              │   │
│  │  - ProductRepository                │   │
│  └─────────────────────────────────────┘   │
│           ↓                                  │
│        PostgreSQL (Neon)                    │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Queue System (Bull/Redis)          │   │
│  │  - Send notifications               │   │
│  │  - Generate reports                 │   │
│  │  - Process batch operations         │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts (login, logout, token refresh)
│   │   │   ├── products.routes.ts (CRUD)
│   │   │   ├── orders.routes.ts (store orders)
│   │   │   ├── bulk-orders.routes.ts (bulk orders)
│   │   │   ├── inventory.routes.ts (stock, movements)
│   │   │   ├── users.routes.ts (user management)
│   │   │   ├── locations.routes.ts (stores, warehouses)
│   │   │   ├── clients.routes.ts (third-party clients)
│   │   │   └── reports.routes.ts (audit, analytics)
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts (JWT verify)
│   │   │   ├── validation.middleware.ts (Joi/Zod schemas)
│   │   │   ├── authorization.middleware.ts (RLS)
│   │   │   ├── errorHandler.middleware.ts (centralized error catching)
│   │   │   ├── rateLimit.middleware.ts (100 req/min)
│   │   │   ├── audit.middleware.ts (log all actions)
│   │   │   └── idempotency.middleware.ts (prevent duplicates)
│   │   │
│   │   └── controllers/
│   │       ├── auth.controller.ts
│   │       ├── products.controller.ts
│   │       ├── orders.controller.ts
│   │       ├── inventory.controller.ts
│   │       ├── users.controller.ts
│   │       └── reports.controller.ts
│   │
│   ├── services/
│   │   ├── AuthService.ts
│   │   ├── OrderService.ts (business logic for orders)
│   │   ├── InventoryService.ts (stock operations)
│   │   ├── ProductService.ts
│   │   ├── UserService.ts
│   │   ├── NotificationService.ts (send alerts)
│   │   └── AuditService.ts (log all changes)
│   │
│   ├── repositories/
│   │   ├── BaseRepository.ts (common CRUD)
│   │   ├── OrderRepository.ts
│   │   ├── BulkOrderRepository.ts
│   │   ├── InventoryRepository.ts
│   │   ├── ProductRepository.ts
│   │   ├── UserRepository.ts
│   │   └── AuditRepository.ts
│   │
│   ├── database/
│   │   ├── connection.ts (Neon connection pool)
│   │   ├── migrations/
│   │   │   ├── 001_initial_schema.ts
│   │   │   ├── 002_rls_policies.ts
│   │   │   └── ... (versioned migrations)
│   │   └── seeders/ (test data)
│   │
│   ├── queue/
│   │   ├── jobs/
│   │   │   ├── sendNotification.job.ts
│   │   │   ├── generateReport.job.ts
│   │   │   └── cleanupIdempotency.job.ts
│   │   └── queueFactory.ts (Bull setup)
│   │
│   ├── utils/
│   │   ├── logger.ts (Winston/Pino)
│   │   ├── validators.ts (input validation)
│   │   ├── formatters.ts (response formatting)
│   │   ├── jwt.ts (token generation/verification)
│   │   ├── crypto.ts (password hashing)
│   │   ├── constants.ts (enums, status codes)
│   │   └── helpers.ts (general utilities)
│   │
│   ├── errors/
│   │   ├── AppError.ts (base error class)
│   │   ├── ValidationError.ts
│   │   ├── AuthenticationError.ts
│   │   ├── AuthorizationError.ts
│   │   └── ConflictError.ts
│   │
│   ├── types/
│   │   ├── auth.types.ts
│   │   ├── order.types.ts
│   │   ├── inventory.types.ts
│   │   ├── api.types.ts (request/response)
│   │   └── database.types.ts
│   │
│   ├── app.ts (Express app setup)
│   └── server.ts (start server)
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── OrderService.test.ts
│   │   │   └── InventoryService.test.ts
│   │   └── utils/
│   │       └── validators.test.ts
│   │
│   ├── integration/
│   │   ├── orders.integration.test.ts
│   │   └── inventory.integration.test.ts
│   │
│   └── e2e/
│       ├── order-workflow.e2e.test.ts
│       └── warehouse-operations.e2e.test.ts
│
├── .env.example
├── .env.test
├── docker-compose.yml (local dev)
├── Dockerfile (production)
├── docker-compose.prod.yml
├── package.json
├── tsconfig.json
└── jest.config.js
```

---

## Authentication & JWT

### **Auth Service**

```typescript
// src/services/AuthService.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserRepository } from '@/repositories/UserRepository';

export class AuthService {
  constructor(private userRepository: UserRepository) {}

  async login(email: string, password: string) {
    // Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new AuthenticationError('Invalid credentials');

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) throw new AuthenticationError('Invalid credentials');

    // Check status
    if (user.status !== 'active') {
      throw new AuthenticationError('Account is blocked or inactive');
    }

    // Generate JWT
    const token = this.generateToken(user);

    // Update last_login_at
    await this.userRepository.update(user.id, { last_login_at: new Date() });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        location_id: user.location_id,
      },
    };
  }

  async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      const user = await this.userRepository.findById(decoded.id);
      
      if (!user || user.status !== 'active') {
        throw new AuthenticationError('Token invalid or user inactive');
      }

      return {
        token: this.generateToken(user),
      };
    } catch (error) {
      throw new AuthenticationError('Invalid or expired token');
    }
  }

  private generateToken(user: any) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        location_id: user.location_id,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
  }

  async logout(token: string) {
    // Optional: Blacklist token (if using Redis)
    // await redisClient.setex(`blacklist:${token}`, 86400, 'true');
    return { success: true };
  }
}
```

### **Auth Routes**

```typescript
// src/api/routes/auth.routes.ts
import express from 'express';
import { AuthController } from '@/api/controllers/auth.controller';
import { validateRequest } from '@/api/middleware/validation.middleware';
import { verifyJWT } from '@/api/middleware/auth.middleware';

const router = express.Router();
const authController = new AuthController();

// Login (no auth required)
router.post('/login', 
  validateRequest({
    body: {
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
    },
  }),
  (req, res, next) => authController.login(req, res).catch(next)
);

// Refresh token
router.post('/refresh', 
  verifyJWT,
  (req, res, next) => authController.refreshToken(req, res).catch(next)
);

// Logout
router.post('/logout', 
  verifyJWT,
  (req, res, next) => authController.logout(req, res).catch(next)
);

export default router;
```

### **Bulk Orders Routes**

```typescript
// src/api/routes/bulk-orders.routes.ts
import express from 'express';
import { OrderController } from '@/api/controllers/orders.controller';
import { validateRequest } from '@/api/middleware/validation.middleware';
import { verifyJWT } from '@/api/middleware/auth.middleware';
import { requireRole } from '@/api/middleware/auth.middleware';

const router = express.Router();
const orderController = new OrderController();

// Create bulk order (superadmin only)
router.post('/',
  verifyJWT,
  requireRole('superadmin'),
  validateRequest({
    body: {
      client_store_id: Joi.string().uuid().required(),
      warehouse_id: Joi.string().uuid().required(),
      items: Joi.array().items(
        Joi.object({
          product_id: Joi.string().uuid().required(),
          qty: Joi.number().integer().min(1).required(),
        })
      ).min(1).required(),
    },
  }),
  (req, res, next) => orderController.createBulkOrder(req, res).catch(next)
);

// Get bulk orders (superadmin, warehouse_manager)
router.get('/',
  verifyJWT,
  requireRole('superadmin', 'warehouse_manager'),
  (req, res, next) => orderController.getBulkOrders(req, res).catch(next)
);

// Mark as packed (warehouse_manager)
router.patch('/:id/pack',
  verifyJWT,
  requireRole('warehouse_manager'),
  (req, res, next) => orderController.markBulkPacked(req, res).catch(next)
);

// Dispatch bulk order (warehouse_manager)
router.patch('/:id/dispatch',
  verifyJWT,
  requireRole('warehouse_manager'),
  validateRequest({
    body: {
      dispatch_notes: Joi.string().optional(),
    },
  }),
  (req, res, next) => orderController.dispatchBulkOrder(req, res).catch(next)
);

export default router;
```

### **Order Controller**

```typescript
// src/api/controllers/orders.controller.ts
import { OrderService } from '@/services/OrderService';
import { Request, Response } from 'express';

export class OrderController {
  constructor(private orderService: OrderService) {}

  async createStoreOrder(req: Request, res: Response) {
    const order = await this.orderService.createStoreOrder(req.body, req.user.id);
    res.status(201).json(order);
  }

  async approveOrder(req: Request, res: Response) {
    const order = await this.orderService.approveOrder(req.params.id, req.user.id);
    res.json(order);
  }

  async markPacked(req: Request, res: Response) {
    const order = await this.orderService.markPacked(req.params.id, req.user.id);
    res.json(order);
  }

  async dispatchOrder(req: Request, res: Response) {
    const order = await this.orderService.markDispatched(req.params.id, req.user.id, req.body.dispatch_notes);
    res.json(order);
  }

  async confirmReceived(req: Request, res: Response) {
    const order = await this.orderService.confirmReceived(req.params.id, req.user.id);
    res.json(order);
  }

  async getOrders(req: Request, res: Response) {
    const orders = await this.orderService.getOrders(req.query);
    res.json(orders);
  }

  async createBulkOrder(req: Request, res: Response) {
    const order = await this.orderService.createBulkOrder(req.body, req.user.id);
    res.status(201).json(order);
  }

  async markBulkPacked(req: Request, res: Response) {
    const order = await this.orderService.markBulkPacked(req.params.id, req.user.id);
    res.json(order);
  }

  async dispatchBulkOrder(req: Request, res: Response) {
    const order = await this.orderService.dispatchBulkOrder(req.params.id, req.user.id, req.body.dispatch_notes);
    res.json(order);
  }

  async getBulkOrders(req: Request, res: Response) {
    const orders = await this.orderService.getBulkOrders(req.query);
    res.json(orders);
  }
}
```

---

## Core Services

### **Order Service (Store Orders)**

```typescript
// src/services/OrderService.ts
import { OrderRepository } from '@/repositories/OrderRepository';
import { BulkOrderRepository } from '@/repositories/BulkOrderRepository';
import { InventoryService } from './InventoryService';
import { AuditService } from './AuditService';
import { NotificationService } from './NotificationService';
import { v4 as uuidv4 } from 'uuid';

export class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private bulkOrderRepository: BulkOrderRepository,
    private inventoryService: InventoryService,
    private auditService: AuditService,
    private notificationService: NotificationService
  ) {}

  async createStoreOrder(data: CreateStoreOrderRequest, userId: string) {
    const { store_id, warehouse_id, items } = data;

    // Validate items exist and are available
    for (const item of items) {
      const available = await this.inventoryService.getAvailableStock(
        item.product_id,
        warehouse_id
      );
      if (available < item.qty) {
        throw new ValidationError(
          `Insufficient stock for product ${item.product_id}. ` +
          `Available: ${available}, Requested: ${item.qty}`
        );
      }
    }

    // Generate order_id
    const order_id = await this.generateOrderId('ORD', store_id);

    // Create order (status: draft)
    const order = await this.orderRepository.create({
      order_id,
      store_id,
      warehouse_id,
      status: 'draft',
      items: items.map(i => ({ product_id: i.product_id, qty: i.qty, status: 'pending' })),
      reserved_amount: items.reduce((sum, i) => sum + i.qty, 0),
      created_by: userId,
    });

    // Audit log
    await this.auditService.log({
      actor_user_id: userId,
      action: 'create',
      entity_type: 'store_order',
      entity_id: order.id,
      details: `Store order ${order_id} created`,
      success: true,
    });

    return order;
  }

  async approveOrder(orderId: string, userId: string) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found');
    if (order.status !== 'draft') {
      throw new ValidationError(`Order is not in draft status (current: ${order.status})`);
    }

    // Reserve stock
    const reserved_amount = order.reserved_amount;
    await this.inventoryService.reserveStock(
      order.warehouse_id,
      order.items,
      orderId
    );

    // Update order
    const updated = await this.orderRepository.update(orderId, {
      status: 'confirmed',
      approved_by: userId,
    });

    // Audit log
    await this.auditService.log({
      actor_user_id: userId,
      action: 'approve',
      entity_type: 'store_order',
      entity_id: orderId,
      before_value: { status: 'draft' },
      after_value: { status: 'confirmed' },
      details: `Order ${order.order_id} approved, stock reserved (${reserved_amount} units)`,
      success: true,
    });

    // Notify warehouse
    await this.notificationService.queue('order_confirmed', {
      warehouse_id: order.warehouse_id,
      order_id: order.order_id,
      message: `New order ready to pack: ${order.order_id}`,
    });

    return updated;
  }

  async markDispatched(orderId: string, userId: string, dispatch_notes?: string) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found');
    if (order.status !== 'packed') {
      throw new ValidationError(`Order must be in packed status (current: ${order.status})`);
    }

    // Deduct stock from warehouse
    await this.inventoryService.deductStock(
      order.warehouse_id,
      order.items,
      orderId,
      'order_deducted'
    );

    // Update order
    const updated = await this.orderRepository.update(orderId, {
      status: 'dispatched',
      dispatched_at: new Date(),
      dispatch_notes,
    });

    // Audit log
    await this.auditService.log({
      actor_user_id: userId,
      action: 'dispatch',
      entity_type: 'store_order',
      entity_id: orderId,
      details: `Order ${order.order_id} dispatched, stock deducted from warehouse`,
      success: true,
    });

    // Notify store manager
    await this.notificationService.queue('order_dispatched', {
      store_id: order.store_id,
      order_id: order.order_id,
      message: `Your order ${order.order_id} is on the way. Please confirm receipt.`,
    });

    return updated;
  }

  async confirmReceived(orderId: string, userId: string) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found');
    if (order.status !== 'dispatched') {
      throw new ValidationError(`Order must be dispatched to confirm (current: ${order.status})`);
    }

    // Add stock to store
    await this.inventoryService.addStoreStock(
      order.store_id,
      order.items,
      orderId
    );

    // Update order
    const updated = await this.orderRepository.update(orderId, {
      status: 'store_received',
      received_at: new Date(),
    });

    // Mark as completed
    await this.orderRepository.update(orderId, { status: 'completed' });

    // Audit log
    await this.auditService.log({
      actor_user_id: userId,
      action: 'confirm_receive',
      entity_type: 'store_order',
      entity_id: orderId,
      details: `Order ${order.order_id} received by store, stock added to store inventory`,
      success: true,
    });

    return updated;
  }

  private async generateOrderId(prefix: string, store_id: string): Promise<string> {
    // Get location code from store_id
    const location = await this.locationRepository.findById(store_id);
    const location_code = location.location_code;

    // Get today's date in YYYYMMDD format
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');

    // Get count of orders created today
    const count = await this.orderRepository.countByDateAndLocation(store_id, date);
    const incrementing_number = String(count + 1).padStart(4, '0');

    const order_id = `${prefix}-${location_code}-${date}-${incrementing_number}`;

    // Verify uniqueness (database constraint will also check)
    const exists = await this.orderRepository.findByOrderId(order_id);
    if (exists) {
      throw new ConflictError('Order ID already exists');
    }

    return order_id;
  }

  async createBulkOrder(data: CreateBulkOrderRequest, userId: string) {
    const { client_store_id, warehouse_id, items } = data;

    // Validate items exist and are available
    for (const item of items) {
      const available = await this.inventoryService.getAvailableStock(
        item.product_id,
        warehouse_id
      );
      if (available < item.qty) {
        throw new ValidationError(
          `Insufficient stock for product ${item.product_id}. ` +
          `Available: ${available}, Requested: ${item.qty}`
        );
      }
    }

    // Generate order_id
    const order_id = await this.generateBulkOrderId('BULK', warehouse_id);

    // Create order (status: confirmed, auto-approved)
    const order = await this.bulkOrderRepository.create({
      order_id,
      client_store_id,
      warehouse_id,
      status: 'confirmed',
      items: items.map(i => ({ product_id: i.product_id, qty: i.qty })),
      reserved_amount: items.reduce((sum, i) => sum + i.qty, 0),
      created_by: userId,
    });

    // Reserve stock
    await this.inventoryService.reserveStock(
      warehouse_id,
      items,
      order.id
    );

    // Audit log
    await this.auditService.log({
      actor_user_id: userId,
      action: 'create',
      entity_type: 'bulk_order',
      entity_id: order.id,
      details: `Bulk order ${order_id} created and confirmed, stock reserved (${order.reserved_amount} units)`,
      success: true,
    });

    // Notify warehouse
    await this.notificationService.queue('bulk_order_created', {
      warehouse_id,
      order_id,
      message: `Bulk order ${order_id} for client store ready to pack`,
    });

    return order;
  }

  async markBulkPacked(orderId: string, userId: string) {
    const order = await this.bulkOrderRepository.findById(orderId);
    if (!order) throw new NotFoundError('Bulk order not found');
    if (order.status !== 'confirmed') {
      throw new ValidationError(`Bulk order must be in confirmed status (current: ${order.status})`);
    }

    // Update order
    const updated = await this.bulkOrderRepository.update(orderId, {
      status: 'packed',
    });

    // Audit log
    await this.auditService.log({
      actor_user_id: userId,
      action: 'pack',
      entity_type: 'bulk_order',
      entity_id: orderId,
      details: `Bulk order ${order.order_id} marked as packed`,
      success: true,
    });

    return updated;
  }

  async dispatchBulkOrder(orderId: string, userId: string, dispatch_notes?: string) {
    const order = await this.bulkOrderRepository.findById(orderId);
    if (!order) throw new NotFoundError('Bulk order not found');
    if (order.status !== 'packed') {
      throw new ValidationError(`Bulk order must be in packed status (current: ${order.status})`);
    }

    // Deduct stock from warehouse
    await this.inventoryService.deductStock(
      order.warehouse_id,
      order.items,
      orderId,
      'order_deducted'
    );

    // Update order
    const updated = await this.bulkOrderRepository.update(orderId, {
      status: 'dispatched',
      dispatched_at: new Date(),
      dispatch_notes,
    });

    // Mark as completed (no store confirmation for bulk orders)
    await this.bulkOrderRepository.update(orderId, { status: 'completed' });

    // Audit log
    await this.auditService.log({
      actor_user_id: userId,
      action: 'dispatch',
      entity_type: 'bulk_order',
      entity_id: orderId,
      details: `Bulk order ${order.order_id} dispatched and completed, stock deducted from warehouse`,
      success: true,
    });

    return updated;
  }

  private async generateBulkOrderId(prefix: string, warehouse_id: string): Promise<string> {
    // Get location code from warehouse_id
    const location = await this.locationRepository.findById(warehouse_id);
    const location_code = location.location_code;

    // Get today's date in YYYYMMDD format
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');

    // Get count of bulk orders created today
    const count = await this.bulkOrderRepository.countByDateAndWarehouse(warehouse_id, date);
    const incrementing_number = String(count + 1).padStart(4, '0');

    const order_id = `${prefix}-${location_code}-${date}-${incrementing_number}`;

    // Verify uniqueness
    const exists = await this.bulkOrderRepository.findByOrderId(order_id);
    if (exists) {
      throw new ConflictError('Bulk order ID already exists');
    }

    return order_id;
  }

  async getOrders(filters: any) {
    return this.orderRepository.findAll(filters);
  }

  async getBulkOrders(filters: any) {
    return this.bulkOrderRepository.findAll(filters);
  }
}
```

### **BulkOrderRepository**

```typescript
// src/repositories/BulkOrderRepository.ts
import { BaseRepository } from './BaseRepository';

export class BulkOrderRepository extends BaseRepository {
  async create(data: any) {
    const query = `
      INSERT INTO bulk_orders (order_id, client_store_id, warehouse_id, status, items, reserved_amount, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [data.order_id, data.client_store_id, data.warehouse_id, data.status, JSON.stringify(data.items), data.reserved_amount, data.created_by];
    return this.query(query, values);
  }

  async findById(id: string) {
    const query = 'SELECT * FROM bulk_orders WHERE id = $1';
    return this.query(query, [id]);
  }

  async findByOrderId(order_id: string) {
    const query = 'SELECT * FROM bulk_orders WHERE order_id = $1';
    return this.query(query, [order_id]);
  }

  async update(id: string, data: any) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `UPDATE bulk_orders SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
    return this.query(query, [id, ...values]);
  }

  async countByDateAndWarehouse(warehouse_id: string, date: string) {
    const query = `
      SELECT COUNT(*) as count
      FROM bulk_orders
      WHERE warehouse_id = $1 AND DATE(created_at) = $2
    `;
    const result = await this.query(query, [warehouse_id, date]);
    return parseInt(result.rows[0].count);
  }

  async findAll(filters: any) {
    let query = 'SELECT * FROM bulk_orders WHERE 1=1';
    const values = [];
    let index = 1;

    if (filters.status) {
      query += ` AND status = $${index}`;
      values.push(filters.status);
      index++;
    }

    if (filters.warehouse_id) {
      query += ` AND warehouse_id = $${index}`;
      values.push(filters.warehouse_id);
      index++;
    }

    query += ' ORDER BY created_at DESC';

    return this.query(query, values);
  }
}
```

### **Inventory Service**

```typescript
// src/services/InventoryService.ts
import { InventoryRepository } from '@/repositories/InventoryRepository';
import { AuditService } from './AuditService';

export class InventoryService {
  constructor(
    private inventoryRepository: InventoryRepository,
    private auditService: AuditService
  ) {}

  async getAvailableStock(product_id: string, location_id: string): Promise<number> {
    const inventory = await this.inventoryRepository.findByProductLocation(
      product_id,
      location_id
    );
    if (!inventory) return 0;
    return inventory.total_stock - inventory.reserved_stock;
  }

  async reserveStock(location_id: string, items: any[], reference_id: string) {
    // Use transaction to lock inventory rows
    const client = await this.inventoryRepository.getConnection();
    try {
      await client.query('BEGIN');

      for (const item of items) {
        // SELECT FOR UPDATE (row-level lock)
        const result = await client.query(
          'SELECT * FROM inventory WHERE product_id = $1 AND location_id = $2 FOR UPDATE',
          [item.product_id, location_id]
        );

        if (result.rows.length === 0) {
          throw new ValidationError(`No inventory found for product ${item.product_id}`);
        }

        const inventory = result.rows[0];
        const available = inventory.total_stock - inventory.reserved_stock;

        if (available < item.qty) {
          throw new ValidationError(
            `Insufficient stock. Available: ${available}, Requested: ${item.qty}`
          );
        }

        // Update reserved stock
        await client.query(
          'UPDATE inventory SET reserved_stock = reserved_stock + $1 WHERE id = $2',
          [item.qty, inventory.id]
        );

        // Log movement
        await client.query(
          'INSERT INTO stock_movements (product_id, to_location_id, quantity, movement_type, reference_type, reference_id, created_by) ' +
          'VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [item.product_id, location_id, item.qty, 'order_reserved', 'store_order', reference_id, 'system']
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deductStock(location_id: string, items: any[], reference_id: string, movement_type: string) {
    const client = await this.inventoryRepository.getConnection();
    try {
      await client.query('BEGIN');

      for (const item of items) {
        // SELECT FOR UPDATE
        const result = await client.query(
          'SELECT * FROM inventory WHERE product_id = $1 AND location_id = $2 FOR UPDATE',
          [item.product_id, location_id]
        );

        if (result.rows.length === 0) {
          throw new ValidationError(`No inventory found for product ${item.product_id}`);
        }

        const inventory = result.rows[0];

        // Deduct from total stock
        await client.query(
          'UPDATE inventory SET total_stock = total_stock - $1, issued_stock = issued_stock + $1 WHERE id = $2',
          [item.qty, inventory.id]
        );

        // Log movement
        await client.query(
          'INSERT INTO stock_movements (product_id, from_location_id, to_location_id, quantity, movement_type, reference_type, reference_id, created_by) ' +
          'VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [item.product_id, location_id, null, item.qty, movement_type, 'store_order', reference_id, 'system']
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async addStoreStock(location_id: string, items: any[], reference_id: string) {
    const client = await this.inventoryRepository.getConnection();
    try {
      await client.query('BEGIN');

      for (const item of items) {
        // Get or create inventory record
        const result = await client.query(
          'SELECT * FROM inventory WHERE product_id = $1 AND location_id = $2 FOR UPDATE',
          [item.product_id, location_id]
        );

        if (result.rows.length === 0) {
          // Create new inventory record
          await client.query(
            'INSERT INTO inventory (product_id, location_id, total_stock, reserved_stock) VALUES ($1, $2, $3, $4)',
            [item.product_id, location_id, item.qty, 0]
          );
        } else {
          // Update existing record
          await client.query(
            'UPDATE inventory SET total_stock = total_stock + $1 WHERE id = $2',
            [item.qty, result.rows[0].id]
          );
        }

        // Log movement
        await client.query(
          'INSERT INTO stock_movements (product_id, from_location_id, to_location_id, quantity, movement_type, reference_type, reference_id, created_by) ' +
          'VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [item.product_id, null, location_id, item.qty, 'order_issued', 'store_order', reference_id, 'system']
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

---

## Middleware

### **Validation Middleware**

```typescript
// src/api/middleware/validation.middleware.ts
import Joi from 'joi';

export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = Joi.object(schema).validate({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (error) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: error.details.map(d => d.message).join(', '),
      });
    }

    // Replace req values with validated ones
    req.body = value.body;
    req.query = value.query;
    req.params = value.params;
    next();
  };
}
```

### **Auth Middleware**

```typescript
// src/api/middleware/auth.middleware.ts
import jwt from 'jsonwebtoken';

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded as any;
    next();
  } catch (error) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: `This action requires one of these roles: ${roles.join(', ')}`,
      });
    }
    next();
  };
}
```

### **Idempotency Middleware**

```typescript
// src/api/middleware/idempotency.middleware.ts
export function idempotency(req: Request, res: Response, next: NextFunction) {
  const idempotency_key = req.headers['x-idempotency-key'] as string;
  
  if (!idempotency_key) {
    return next(); // Idempotency is optional for GET requests
  }

  // Check if this idempotency_key was already processed
  const cachedResponse = idempotencyCache.get(idempotency_key);
  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  // Capture the original res.json to cache the response
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    idempotencyCache.set(idempotency_key, data, 86400); // 24-hour TTL
    return originalJson(data);
  };

  next();
}
```

### **Error Handler Middleware**

```typescript
// src/api/middleware/errorHandler.middleware.ts
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('[Error]', error);

  // Log error
  auditService.log({
    actor_user_id: req.user?.id,
    action: 'error',
    entity_type: 'system',
    details: error.message,
    success: false,
    error_message: error.message,
  });

  if (error instanceof ValidationError) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: error.message,
    });
  }

  if (error instanceof AuthenticationError) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: error.message,
    });
  }

  if (error instanceof AuthorizationError) {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: error.message,
    });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: error.message,
    });
  }

  if (error instanceof ConflictError) {
    return res.status(409).json({
      code: 'CONFLICT',
      message: error.message,
    });
  }

  // Generic 500 error
  res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Something went wrong',
  });
}
```

---

## Queue & Jobs

### **Bull Queue Setup**

```typescript
// src/queue/queueFactory.ts
import Queue from 'bull';
import redis from 'redis';

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT!) || 6379,
});

export const notificationQueue = new Queue('notifications', {
  redis: { host: 'localhost', port: 6379 },
});

export const reportQueue = new Queue('reports', {
  redis: { host: 'localhost', port: 6379 },
});

// Process jobs
notificationQueue.process(async (job) => {
  const { type, data } = job.data;
  
  if (type === 'order_confirmed') {
    await sendPushNotification(data.warehouse_id, data.message);
    await sendEmailNotification(data.warehouse_email, data.message);
  } else if (type === 'order_dispatched') {
    await sendPushNotification(data.store_id, data.message);
    await sendEmailNotification(data.store_email, data.message);
  }
});

// Retry logic
notificationQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
  job.retry(); // Built-in retry
});
```

### **Notification Job**

```typescript
// src/queue/jobs/sendNotification.job.ts
export class SendNotificationJob {
  static async handle(type: string, data: any) {
    await notificationQueue.add(
      { type, data },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
  }
}
```

---

## Testing

### **Unit Tests**

```typescript
// tests/unit/services/OrderService.test.ts
import { OrderService } from '@/services/OrderService';

describe('OrderService', () => {
  let orderService: OrderService;
  let mockOrderRepository: jest.Mocked<OrderRepository>;

  beforeEach(() => {
    mockOrderRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    } as any;

    orderService = new OrderService(
      mockOrderRepository,
      mockInventoryService,
      mockAuditService,
      mockNotificationService
    );
  });

  describe('approveOrder', () => {
    it('should approve draft order and reserve stock', async () => {
      const orderId = 'uuid';
      const order = {
        id: orderId,
        status: 'draft',
        reserved_amount: 5,
        items: [{ product_id: 'prod1', qty: 5 }],
      };

      mockOrderRepository.findById.mockResolvedValue(order);

      const result = await orderService.approveOrder(orderId, 'admin-user-id');

      expect(mockOrderRepository.update).toHaveBeenCalledWith(orderId, {
        status: 'confirmed',
        approved_by: 'admin-user-id',
      });
    });

    it('should throw error if order not in draft status', async () => {
      const order = { id: 'uuid', status: 'confirmed' };
      mockOrderRepository.findById.mockResolvedValue(order);

      await expect(orderService.approveOrder('uuid', 'admin')).rejects.toThrow(
        'Order is not in draft status'
      );
    });
  });
});
```

### **Integration Tests**

```typescript
// tests/integration/orders.integration.test.ts
describe('Order Workflow Integration', () => {
  it('should complete full order workflow: create → approve → dispatch → receive', async () => {
    // 1. Create order as store manager
    const createResponse = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${storeManagerToken}`)
      .send({
        store_id: 'store-1',
        warehouse_id: 'warehouse-1',
        items: [{ product_id: 'prod-1', qty: 5 }],
      });

    expect(createResponse.status).toBe(201);
    const orderId = createResponse.body.id;

    // 2. Approve order as superadmin
    const approveResponse = await request(app)
      .patch(`/orders/${orderId}/approve`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({});

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.status).toBe('confirmed');

    // 3. Mark as packed as warehouse manager
    const packResponse = await request(app)
      .patch(`/orders/${orderId}/pack`)
      .set('Authorization', `Bearer ${warehouseManagerToken}`)
      .send({});

    expect(packResponse.status).toBe(200);

    // 4. Mark as dispatched
    const dispatchResponse = await request(app)
      .patch(`/orders/${orderId}/dispatch`)
      .set('Authorization', `Bearer ${warehouseManagerToken}`)
      .send({});

    expect(dispatchResponse.status).toBe(200);

    // 5. Confirm receipt as store manager
    const receiveResponse = await request(app)
      .patch(`/orders/${orderId}/confirm-receive`)
      .set('Authorization', `Bearer ${storeManagerToken}`)
      .send({});

    expect(receiveResponse.status).toBe(200);
    expect(receiveResponse.body.status).toBe('completed');

    // Verify inventory was updated
    const inventoryResponse = await request(app)
      .get('/inventory?location_id=store-1&product_id=prod-1')
      .set('Authorization', `Bearer ${storeManagerToken}`);

    expect(inventoryResponse.body.total_stock).toBe(5);
  });
});
```

---

## Deployment

### **Docker Setup**

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

**docker-compose.yml (local):**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: store_warehouse
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build: .
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/store_warehouse
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your_secret_here
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    volumes:
      - .:/app

volumes:
  postgres_data:
```

### **Deployment to Railway / Render**

```bash
# 1. Build Docker image
docker build -t store-warehouse-api:latest .

# 2. Push to registry
docker push your-registry/store-warehouse-api:latest

# 3. Deploy to Railway
railway link
railway up

# 4. Set environment variables
railway variables set DATABASE_URL=...
railway variables set JWT_SECRET=...
```

---

## Monitoring & Logging

### **Logging Setup**

```typescript
// src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'store-warehouse-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

export default logger;
```

### **Health Check Endpoint**

```typescript
// src/api/routes/health.routes.ts
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbCheck = await database.query('SELECT 1');
    
    // Check Redis connection
    const redisCheck = await redis.ping();
    
    res.json({
      status: 'healthy',
      database: 'connected',
      redis: redisCheck === 'PONG' ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});
```

---

## Production Checklist

- [ ] All environment variables set (DATABASE_URL, JWT_SECRET, REDIS_URL)
- [ ] Database migrations run (flyway or knex)
- [ ] Connection pooling configured (PgBouncer)
- [ ] Redis configured for job queue
- [ ] Logging configured (Winston, Pino)
- [ ] Error handling middleware in place
- [ ] Rate limiting configured
- [ ] Auth middleware protecting routes
- [ ] Audit logging enabled
- [ ] Tests passing (unit + integration)
- [ ] Load testing completed
- [ ] Security headers added (helmet.js)
- [ ] CORS configured properly
- [ ] Backup strategy in place
- [ ] Monitoring alerts configured
- [ ] Health check endpoint working

---

## Performance Optimization Tips

1. **Use Database Indexes Wisely:**
   - Index on foreign keys (product_id, location_id, user_id)
   - Index on status fields (for filtering)
   - Index on created_at (for sorting/pagination)

2. **Query Optimization:**
   - Use EXPLAIN ANALYZE to find slow queries
   - Avoid N+1 queries (use JOIN instead of loops)
   - Use LIMIT + OFFSET for pagination

3. **Caching:**
   - Cache inventory snapshots (5-minute TTL)
   - Cache user permissions (15-minute TTL)
   - Use Redis for session storage

4. **API Response Size:**
   - Return only required fields in list endpoints
   - Paginate large result sets (50 items per page)
   - Use gzip compression

5. **Job Queue:**
   - Move notifications to async jobs
   - Batch report generation jobs
   - Set reasonable retry limits

