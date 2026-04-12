# Store & Warehouse Supply Management System - Web App Guide

**Version:** 2.0  
**Framework:** Next.js 14+ (React, TypeScript)  
**Status:** Production-Specification

---

## Executive Summary

Web dashboard for **Superadmin** role. Provides system-wide oversight: product management, order approvals, user management, reporting, audit logs.

Modern, responsive UI with real-time updates. Built with Next.js for server-side rendering, SEO, and fast deployments.

---

## Technology Stack

```
Frontend:
- Next.js 14+ (React 18, TypeScript)
- TailwindCSS (styling)
- Redux Toolkit (state management)
- React Query (data fetching + caching)
- React Hook Form (form management)
- Chart.js / Recharts (dashboards)

Backend Integration:
- Axios (HTTP client with interceptors)
- NextAuth.js (session management)
- JWT tokens (stored in httpOnly cookies)

Database:
- PostgreSQL (on Neon)

Hosting:
- Vercel (deploy on `git push`, automatic CI/CD)
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│          Vercel Deployment                       │
│  ┌────────────────────────────────────────────┐  │
│  │     Next.js App (SSR/ISR/SSG)              │  │
│  │     - pages/ (file-based routing)          │  │
│  │     - components/ (reusable UI)            │  │
│  │     - lib/ (utilities, API clients)        │  │
│  │     - styles/ (TailwindCSS)                │  │
│  └────────────────────────────────────────────┘  │
│           ↓                                       │
│  ┌────────────────────────────────────────────┐  │
│  │  Redux Store                               │  │
│  │  - user (role, location, token)            │  │
│  │  - orders (list, filters)                  │  │
│  │  - inventory (products, stock)             │  │
│  │  - ui (modals, notifications)              │  │
│  └────────────────────────────────────────────┘  │
│           ↓                                       │
│  ┌────────────────────────────────────────────┐  │
│  │  React Query                               │  │
│  │  - Server state (real-time caching)        │  │
│  │  - Background refetch                      │  │
│  │  - Mutation handling                       │  │
│  └────────────────────────────────────────────┘  │
│           ↓                                       │
│           Backend API (REST)                     │
└──────────────────────────────────────────────────┘
```

---

## Project Structure

```
store-warehouse-web/
├── pages/
│   ├── _app.tsx (global layout, Redux provider)
│   ├── _document.tsx (HTML wrapper)
│   ├── index.tsx (dashboard redirect)
│   ├── login.tsx (login page)
│   ├── dashboard.tsx (superadmin dashboard)
│   │
│   ├── products/
│   │   ├── index.tsx (product list)
│   │   ├── [id]/edit.tsx (edit product)
│   │   └── create.tsx (new product)
│   │
│   ├── orders/
│   │   ├── store-orders.tsx (store refill orders list)
│   │   │   ├── [id]/view.tsx (order detail)
│   │   │   └── [id]/approve.tsx (approval workflow)
│   │   │
│   │   └── bulk-orders.tsx (bulk orders list)
│   │       └── [id]/view.tsx (bulk order detail)
│   │
│   ├── inventory/
│   │   ├── index.tsx (inventory by location)
│   │   └── movements.tsx (stock movement report)
│   │
│   ├── users/
│   │   ├── index.tsx (user list)
│   │   ├── [id]/edit.tsx (edit user)
│   │   └── create.tsx (new user)
│   │
│   ├── locations/
│   │   ├── index.tsx (stores + warehouses)
│   │   ├── [id]/edit.tsx (edit location)
│   │   └── create.tsx (new location)
│   │
│   ├── clients/
│   │   ├── index.tsx (third-party stores)
│   │   ├── [id]/edit.tsx (edit client)
│   │   └── create.tsx (new client)
│   │
│   ├── reports/
│   │   ├── inventory.tsx (stock levels)
│   │   ├── orders.tsx (order fulfillment)
│   │   ├── movements.tsx (stock movements)
│   │   └── audit.tsx (audit logs)
│   │
│   └── settings/
│       └── index.tsx (system settings)
│
├── components/
│   ├── Header.tsx (top navigation)
│   ├── Sidebar.tsx (left navigation)
│   ├── Modal.tsx (reusable modal)
│   ├── Toast.tsx (notifications)
│   ├── Table.tsx (reusable table with sorting, pagination)
│   ├── Form.tsx (reusable form wrapper)
│   │
│   ├── orders/
│   │   ├── OrderList.tsx
│   │   ├── OrderDetail.tsx
│   │   ├── OrderApprovalModal.tsx
│   │   └── OrderCancelModal.tsx
│   │
│   ├── products/
│   │   ├── ProductList.tsx
│   │   ├── ProductForm.tsx
│   │   └── ProductCard.tsx
│   │
│   ├── inventory/
│   │   ├── InventoryTable.tsx
│   │   ├── StockAdjustmentModal.tsx
│   │   └── MovementChart.tsx
│   │
│   ├── users/
│   │   ├── UserList.tsx
│   │   ├── UserForm.tsx
│   │   └── RoleSelect.tsx
│   │
│   └── dashboard/
│       ├── OrderSummary.tsx
│       ├── InventoryWidget.tsx
│       ├── RecentActivity.tsx
│       └── MetricsChart.tsx
│
├── lib/
│   ├── api/
│   │   ├── client.ts (Axios instance + interceptors)
│   │   ├── auth.ts (login, logout, token refresh)
│   │   ├── orders.ts (order CRUD + actions)
│   │   ├── products.ts (product CRUD)
│   │   ├── inventory.ts (stock operations)
│   │   ├── users.ts (user management)
│   │   ├── locations.ts (location CRUD)
│   │   ├── clients.ts (third-party client CRUD)
│   │   └── reports.ts (audit logs, reports)
│   │
│   ├── hooks/
│   │   ├── useAuth.ts (get current user, login, logout)
│   │   ├── useOrders.ts (fetch, create, update orders)
│   │   ├── useProducts.ts (fetch, create, update products)
│   │   ├── useInventory.ts (stock queries)
│   │   └── useNotification.ts (show toast/modal)
│   │
│   ├── store/
│   │   ├── authSlice.ts (Redux user state)
│   │   ├── ordersSlice.ts (Redux orders state)
│   │   ├── productsSlice.ts (Redux products state)
│   │   ├── uiSlice.ts (Redux modals, toasts)
│   │   └── store.ts (Redux store configuration)
│   │
│   ├── utils/
│   │   ├── formatters.ts (date, currency, status)
│   │   ├── validators.ts (form validation)
│   │   ├── constants.ts (enums, status colors)
│   │   └── helpers.ts (general utilities)
│   │
│   └── middleware/
│       ├── auth.ts (NextAuth session verification)
│       └── errorHandler.ts (centralized error handling)
│
├── styles/
│   ├── globals.css (TailwindCSS imports)
│   ├── components.css (component-specific styles)
│   └── tailwind.config.ts (TailwindCSS configuration)
│
├── public/
│   ├── logo.svg
│   ├── favicon.ico
│   └── assets/ (images, icons)
│
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

---

## Authentication & Authorization

### **Login Flow**

```
User opens app
  → Middleware checks if session exists
  → If no session, redirect to /login
  → User enters email + password
  → Click "Login"
  → POST /auth/login {email, password}
  → Backend returns {token, user}
  → Store token in httpOnly cookie (NextAuth)
  → Store user in Redux
  → Redirect to /dashboard
```

### **NextAuth.js Setup**

```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        const res = await fetch(`${process.env.API_URL}/auth/login`, {
          method: "POST",
          body: JSON.stringify(credentials),
        });
        const data = await res.json();
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          location_id: data.user.location_id,
          token: data.token,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.location_id = user.location_id;
        token.token = user.token;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      session.user.location_id = token.location_id;
      session.user.token = token.token;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

export default NextAuth(authOptions);
```

### **Protected Routes**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("next-auth.session-token");
  
  // Redirect to login if no session
  if (!session && request.nextUrl.pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect to login if on login page and already logged in
  if (session && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/orders/:path*",
    "/products/:path*",
    "/inventory/:path*",
    "/users/:path*",
    "/locations/:path*",
    "/clients/:path*",
    "/reports/:path*",
  ],
};
```

---

## Superadmin Dashboard

### **Dashboard Layout**

```
┌──────────────────────────────────────────────────────┐
│  Store & Warehouse Supply Management System          │
│  Superadmin Dashboard                               │
├──────────────────┬──────────────────────────────────┤
│                  │                                   │
│  SIDEBAR         │  MAIN CONTENT                     │
│  ┌────────────┐  │  ┌──────────────────────────┐    │
│  │ Dashboard  │  │  │  Today's Metrics         │    │
│  │ Orders ▼   │  │  ├──────────────────────────┤    │
│  │  - Store   │  │  │ Pending Orders: 5        │    │
│  │  - Bulk    │  │  │ Low Stock Items: 3       │    │
│  │ Products   │  │  │ Orders Approved: 12      │    │
│  │ Inventory  │  │  │ Dispatches Today: 8      │    │
│  │ Users      │  │  └──────────────────────────┘    │
│  │ Locations  │  │                                   │
│  │ Clients    │  │  ┌──────────────────────────┐    │
│  │ Reports    │  │  │  Pending Approvals       │    │
│  │ Settings   │  │  ├──────────────────────────┤    │
│  │ Logout     │  │  │ ORD-ST01-20260412-0001  │    │
│  └────────────┘  │  │ Store 01 → 5x TV         │    │
│                  │  │ [Approve] [Reject]       │    │
│                  │  │                          │    │
│                  │  │ ORD-ST02-20260412-0003  │    │
│                  │  │ Store 02 → 2x Fridge     │    │
│                  │  │ [Approve] [Reject]       │    │
│                  │  └──────────────────────────┘    │
│                  │                                   │
│                  │  ┌──────────────────────────┐    │
│                  │  │  Recent Activity         │    │
│                  │  ├──────────────────────────┤    │
│                  │  │ 10:30 AM - Order created │    │
│                  │  │ 10:15 AM - Stock updated │    │
│                  │  │ 09:45 AM - User login    │    │
│                  │  └──────────────────────────┘    │
│                  │                                   │
└──────────────────┴──────────────────────────────────┘
```

### **Dashboard Components**

**Metrics Cards:**
```typescript
// components/dashboard/OrderSummary.tsx
export function OrderSummary() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card title="Pending Orders" value="5" icon="⏳" />
      <Card title="Dispatched Today" value="8" icon="📦" />
      <Card title="Awaiting Confirmation" value="3" icon="✋" />
      <Card title="Completed Today" value="12" icon="✅" />
    </div>
  );
}
```

**Pending Approvals Section:**
```typescript
// components/orders/PendingApprovals.tsx
export function PendingApprovals() {
  const { data: orders } = useOrders({ status: "draft" });
  
  return (
    <div className="bg-white rounded-lg p-6">
      <h3 className="text-lg font-bold mb-4">Pending Approvals</h3>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left">Order ID</th>
            <th className="text-left">Store</th>
            <th className="text-left">Items</th>
            <th className="text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders?.map(order => (
            <tr key={order.id} className="border-b hover:bg-gray-50">
              <td className="py-2">{order.order_id}</td>
              <td>{order.store_name}</td>
              <td>{order.items.length} items</td>
              <td>
                <button onClick={() => approveOrder(order.id)} 
                  className="px-3 py-1 bg-green-500 text-white rounded">
                  Approve
                </button>
                <button onClick={() => rejectOrder(order.id)} 
                  className="px-3 py-1 bg-red-500 text-white rounded">
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Store Orders Management

### **Store Orders List Page**

```typescript
// pages/orders/store-orders.tsx
import { useState } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import OrderList from "@/components/orders/OrderList";
import OrderFilter from "@/components/orders/OrderFilter";

export default function StoreOrdersPage() {
  const [filters, setFilters] = useState({ status: "all" });
  const { data: orders, isLoading } = useOrders(filters);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Store Orders</h1>
      
      <OrderFilter onFilter={setFilters} />
      
      {isLoading ? <Spinner /> : <OrderList orders={orders} />}
    </div>
  );
}
```

### **Order Approval Workflow**

**Approval Modal:**
```typescript
// components/orders/OrderApprovalModal.tsx
export function OrderApprovalModal({ order, onClose }) {
  const { mutate: approveOrder, isLoading } = useMutation(
    (id) => api.approveOrder(id),
    {
      onSuccess: () => {
        showNotification("Order approved successfully");
        onClose();
      },
    }
  );

  return (
    <Modal isOpen onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Approve Order</h2>
        
        <div className="mb-6 bg-gray-50 p-4 rounded">
          <p className="mb-2"><strong>Order ID:</strong> {order.order_id}</p>
          <p className="mb-2"><strong>Store:</strong> {order.store_name}</p>
          <p className="mb-4"><strong>Items:</strong></p>
          <ul className="ml-4">
            {order.items.map(item => (
              <li key={item.id}>
                {item.product_name} × {item.qty}
              </li>
            ))}
          </ul>
          
          <p className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500">
            ⚠️ Stock will be reserved: {order.reserved_amount} units
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => approveOrder(order.id)}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            {isLoading ? "Approving..." : "Approve"}
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

**Order Detail Page:**
```typescript
// pages/orders/store-orders/[id]/view.tsx
import { useRouter } from "next/router";
import { useOrder } from "@/lib/hooks/useOrders";
import OrderApprovalModal from "@/components/orders/OrderApprovalModal";
import { useState } from "react";

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: order, isLoading } = useOrder(id as string);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  if (isLoading) return <Spinner />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Order {order.order_id}</h1>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg">
          <h3 className="font-bold text-lg mb-4">Order Details</h3>
          <p className="mb-2"><strong>Store:</strong> {order.store_name}</p>
          <p className="mb-2"><strong>Warehouse:</strong> {order.warehouse_name}</p>
          <p className="mb-2">
            <strong>Status:</strong> 
            <span className={`badge-${order.status}`}>{order.status}</span>
          </p>
          <p className="mb-2"><strong>Created:</strong> {formatDate(order.created_at)}</p>
          <p className="mb-4"><strong>Created By:</strong> {order.created_by_name}</p>
          
          {order.status === "draft" && (
            <button 
              onClick={() => setShowApprovalModal(true)}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded"
            >
              Approve Order
            </button>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg">
          <h3 className="font-bold text-lg mb-4">Items</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left">Product</th>
                <th className="text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map(item => (
                <tr key={item.id} className="border-b">
                  <td>{item.product_name}</td>
                  <td className="text-right">{item.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 font-bold">Total: {order.reserved_amount} units</p>
        </div>
      </div>

      {showApprovalModal && (
        <OrderApprovalModal 
          order={order} 
          onClose={() => setShowApprovalModal(false)} 
        />
      )}
    </div>
  );
}
```

---

## Products Management

### **Product List Page**

```typescript
// pages/products/index.tsx
import { useState } from "react";
import { useProducts } from "@/lib/hooks/useProducts";
import ProductList from "@/components/products/ProductList";
import Link from "next/link";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ status: "all" });
  const { data: products, isLoading } = useProducts({ search, ...filter });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/products/create">
          <button className="px-4 py-2 bg-blue-500 text-white rounded">
            + New Product
          </button>
        </Link>
      </div>
      
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border rounded"
        />
        <select
          value={filter.status}
          onChange={(e) => setFilter({ status: e.target.value })}
          className="px-4 py-2 border rounded"
        >
          <option value="all">All Status</option>
          <option value="present">Present</option>
          <option value="inactive">Inactive</option>
          <option value="discontinued">Discontinued</option>
        </select>
      </div>

      {isLoading ? <Spinner /> : <ProductList products={products} />}
    </div>
  );
}
```

### **Product Card Component**

```typescript
// components/products/ProductCard.tsx
export function ProductCard({ product, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow">
      <img 
        src={product.image_url} 
        alt={product.title}
        className="w-full h-40 object-cover"
      />
      <div className="p-4">
        <h3 className="font-bold text-lg">{product.title}</h3>
        <p className="text-sm text-gray-600">{product.short_name}</p>
        <p className="text-sm text-gray-500">{product.brand} • {product.model}</p>
        
        <div className="mt-4 flex justify-between">
          <span className={`badge-${product.status}`}>{product.status}</span>
          <div className="flex gap-2">
            <button 
              onClick={() => onEdit(product.id)}
              className="px-2 py-1 text-sm bg-blue-500 text-white rounded"
            >
              Edit
            </button>
            <button 
              onClick={() => onDelete(product.id)}
              className="px-2 py-1 text-sm bg-red-500 text-white rounded"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Inventory Management

### **Inventory Overview Page**

```typescript
// pages/inventory/index.tsx
import { useInventory } from "@/lib/hooks/useInventory";
import InventoryTable from "@/components/inventory/InventoryTable";

export default function InventoryPage() {
  const [location, setLocation] = useState("all");
  const { data: inventory } = useInventory({ location_id: location });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Inventory</h1>
      
      <div className="mb-6">
        <label className="block font-bold mb-2">Filter by Location:</label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="all">All Locations</option>
          <option value="WH01">Warehouse 1</option>
          <option value="ST01">Store 1</option>
          <option value="ST02">Store 2</option>
        </select>
      </div>

      <InventoryTable inventory={inventory} />
    </div>
  );
}
```

### **Inventory Table Component**

```typescript
// components/inventory/InventoryTable.tsx
export function InventoryTable({ inventory }) {
  return (
    <div className="bg-white rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr className="border-b">
            <th className="text-left px-6 py-3">Product</th>
            <th className="text-left px-6 py-3">Location</th>
            <th className="text-right px-6 py-3">Available</th>
            <th className="text-right px-6 py-3">Reserved</th>
            <th className="text-right px-6 py-3">Total</th>
            <th className="text-left px-6 py-3">Status</th>
            <th className="text-left px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map(item => (
            <tr key={item.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-3">{item.product_name}</td>
              <td className="px-6 py-3">{item.location_name}</td>
              <td className="px-6 py-3 text-right">{item.available_stock}</td>
              <td className="px-6 py-3 text-right text-orange-600">
                {item.reserved_stock}
              </td>
              <td className="px-6 py-3 text-right font-bold">{item.total_stock}</td>
              <td className="px-6 py-3">
                {item.available_stock < item.low_stock_threshold ? (
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                    Low Stock
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                    OK
                  </span>
                )}
              </td>
              <td className="px-6 py-3">
                <Link href={`/inventory/${item.id}/movements`}>
                  <a className="text-blue-500 hover:underline">History</a>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## User Management

### **User List Page**

```typescript
// pages/users/index.tsx
import { useUsers } from "@/lib/hooks/useUsers";
import UserList from "@/components/users/UserList";
import Link from "next/link";

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <Link href="/users/create">
          <button className="px-4 py-2 bg-blue-500 text-white rounded">
            + New User
          </button>
        </Link>
      </div>

      {isLoading ? <Spinner /> : <UserList users={users} />}
    </div>
  );
}
```

### **User Form Component**

```typescript
// components/users/UserForm.tsx
import { useForm } from "react-hook-form";

export function UserForm({ user, onSubmit }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: user,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
      <div className="mb-4">
        <label className="block font-bold mb-2">Email</label>
        <input
          {...register("email", { required: "Email is required" })}
          type="email"
          className="w-full px-4 py-2 border rounded"
        />
        {errors.email && <span className="text-red-500">{errors.email.message}</span>}
      </div>

      <div className="mb-4">
        <label className="block font-bold mb-2">Full Name</label>
        <input
          {...register("name", { required: "Name is required" })}
          type="text"
          className="w-full px-4 py-2 border rounded"
        />
        {errors.name && <span className="text-red-500">{errors.name.message}</span>}
      </div>

      <div className="mb-4">
        <label className="block font-bold mb-2">Role</label>
        <select
          {...register("role", { required: "Role is required" })}
          className="w-full px-4 py-2 border rounded"
        >
          <option value="">Select Role</option>
          <option value="superadmin">Superadmin</option>
          <option value="warehouse_manager">Warehouse Manager</option>
          <option value="store_manager">Store Manager</option>
        </select>
        {errors.role && <span className="text-red-500">{errors.role.message}</span>}
      </div>

      <div className="mb-4">
        <label className="block font-bold mb-2">Assign Location</label>
        <select
          {...register("location_id")}
          className="w-full px-4 py-2 border rounded"
        >
          <option value="">None (Superadmin)</option>
          <option value="WH01">Warehouse 1</option>
          <option value="ST01">Store 1</option>
          <option value="ST02">Store 2</option>
        </select>
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Save User
      </button>
    </form>
  );
}
```

---

## Reports & Audit

### **Audit Log Page**

```typescript
// pages/reports/audit.tsx
import { useAuditLogs } from "@/lib/hooks/useReports";

export default function AuditPage() {
  const [filters, setFilters] = useState({
    action: "all",
    entity_type: "all",
    date_from: null,
    date_to: null,
  });
  const { data: logs, isLoading } = useAuditLogs(filters);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Audit Log</h1>
      
      <div className="mb-6 bg-white p-4 rounded-lg">
        <h3 className="font-bold mb-4">Filters</h3>
        <div className="grid grid-cols-4 gap-4">
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="px-4 py-2 border rounded"
          >
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="approve">Approve</option>
            <option value="dispatch">Dispatch</option>
          </select>

          <select
            value={filters.entity_type}
            onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
            className="px-4 py-2 border rounded"
          >
            <option value="all">All Entity Types</option>
            <option value="order">Order</option>
            <option value="product">Product</option>
            <option value="inventory">Inventory</option>
            <option value="user">User</option>
          </select>

          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            className="px-4 py-2 border rounded"
          />

          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            className="px-4 py-2 border rounded"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="border-b">
              <th className="text-left px-6 py-3">Timestamp</th>
              <th className="text-left px-6 py-3">User</th>
              <th className="text-left px-6 py-3">Action</th>
              <th className="text-left px-6 py-3">Entity</th>
              <th className="text-left px-6 py-3">Details</th>
              <th className="text-left px-6 py-3">IP Address</th>
              <th className="text-left px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map(log => (
              <tr key={log.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 text-sm">{formatDateTime(log.created_at)}</td>
                <td className="px-6 py-3">{log.actor_name}</td>
                <td className="px-6 py-3 font-semibold">{log.action}</td>
                <td className="px-6 py-3">{log.entity_type}: {log.entity_id}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{log.details}</td>
                <td className="px-6 py-3 text-sm">{log.ip_address}</td>
                <td className="px-6 py-3">
                  {log.success ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                      Success
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                      Failed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## API Integration

### **Axios Setup with Interceptors**

```typescript
// lib/api/client.ts
import axios, { AxiosError } from "axios";
import { getSession } from "next-auth/react";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
});

// Request interceptor: add token
apiClient.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.user?.token) {
    config.headers.Authorization = `Bearer ${session.user.token}`;
  }
  return config;
});

// Response interceptor: handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### **Order API Hooks**

```typescript
// lib/hooks/useOrders.ts
import { useMutation, useQuery, useQueryClient } from "react-query";
import apiClient from "@/lib/api/client";

export function useOrders(filters = {}) {
  return useQuery(
    ["orders", filters],
    () => apiClient.get("/orders", { params: filters }),
    { staleTime: 30000, refetchInterval: 60000 }
  );
}

export function useOrder(id: string) {
  return useQuery(
    ["order", id],
    () => apiClient.get(`/orders/${id}`),
    { staleTime: 30000 }
  );
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation(
    (data) => apiClient.post("/orders", data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("orders");
      },
    }
  );
}

export function useApproveOrder() {
  const queryClient = useQueryClient();
  return useMutation(
    (id: string) => apiClient.patch(`/orders/${id}/approve`, {}),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("orders");
      },
    }
  );
}
```

---

## Deployment to Vercel

### **Setup**

```bash
# Install Vercel CLI
npm install -g vercel

# Link project
vercel link

# Set environment variables
vercel env add NEXT_PUBLIC_API_URL
vercel env add NEXTAUTH_URL
vercel env add NEXTAUTH_SECRET
vercel env add API_URL

# Deploy
vercel deploy --prod
```

### **Vercel Configuration (vercel.json)**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "env": [
    "NEXT_PUBLIC_API_URL",
    "NEXTAUTH_URL",
    "NEXTAUTH_SECRET",
    "API_URL"
  ]
}
```

---

## Testing Strategy

### **Unit Tests (Jest + React Testing Library)**

```typescript
// components/__tests__/OrderApprovalModal.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import OrderApprovalModal from "@/components/orders/OrderApprovalModal";

describe("OrderApprovalModal", () => {
  it("should approve order on button click", async () => {
    const mockOnClose = jest.fn();
    const mockOrder = {
      id: "123",
      order_id: "ORD-ST01-20260412-0001",
      items: [{ id: "1", product_name: "Samsung TV", qty: 5 }],
    };

    render(
      <OrderApprovalModal order={mockOrder} onClose={mockOnClose} />
    );

    const approveButton = screen.getByText("Approve");
    fireEvent.click(approveButton);

    // Assert API call was made
    // Assert success notification shown
  });
});
```

### **E2E Tests (Playwright)**

```typescript
// e2e/order-approval.spec.ts
import { test, expect } from "@playwright/test";

test("Superadmin can approve store order", async ({ page }) => {
  // Login
  await page.goto("/login");
  await page.fill("[name=email]", "admin@test.com");
  await page.fill("[name=password]", "password123");
  await page.click("button:has-text('Login')");

  // Navigate to orders
  await page.click("text=Store Orders");
  
  // Approve first order
  await page.click("button:has-text('Approve')");
  await page.click("button:has-text('Confirm')");

  // Verify success
  expect(await page.locator("text=Order approved").isVisible()).toBeTruthy();
});
```

---

## Performance Optimization

### **Image Optimization**

```typescript
import Image from "next/image";

export function ProductCard({ product }) {
  return (
    <Image
      src={product.image_url}
      alt={product.title}
      width={300}
      height={300}
      priority={false}
    />
  );
}
```

### **Code Splitting**

```typescript
import dynamic from "next/dynamic";

const OrderApprovalModal = dynamic(
  () => import("@/components/orders/OrderApprovalModal"),
  { loading: () => <Spinner /> }
);
```

### **API Response Caching**

```typescript
const { data: orders } = useQuery(
  ["orders"],
  fetchOrders,
  {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  }
);
```

---

## Future Enhancements

- [ ] Dark mode
- [ ] Advanced filtering (saved filters)
- [ ] Bulk actions (approve multiple orders)
- [ ] Export reports to CSV/PDF
- [ ] Real-time WebSocket updates (avoid polling)
- [ ] Advanced analytics charts
- [ ] Multi-language support
- [ ] Mobile-responsive design improvements
