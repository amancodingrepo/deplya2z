# Store & Warehouse Supply Management System - Mobile App Guide

**Version:** 2.0  
**Platform:** iOS (Swift) + Android (Kotlin)  
**Framework:** React Native or Flutter (choose one for both platforms)  
**Status:** Production-Specification

---

## Executive Summary

Single mobile app for **Warehouse Managers** and **Store Managers**. Role-based UI after login. Offline-first architecture: all critical operations work without internet, sync when reconnected.

**Minimal UI philosophy:** Fast list loads, quick actions, no unnecessary animations.

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│           Mobile App Layer                   │
│  ┌─────────────────┬────────────────────┐   │
│  │  UI Layer       │  Navigation        │   │
│  │  (Screens,      │  (Role-based)      │   │
│  │   Widgets)      │                    │   │
│  └─────────────────┴────────────────────┘   │
│           ↓                                   │
│  ┌─────────────────────────────────────┐    │
│  │  State Management (Redux/Bloc)      │    │
│  │  - User state (role, location)      │    │
│  │  - Order state (local list)         │    │
│  │  - Inventory state (local cache)    │    │
│  │  - Sync queue (offline actions)     │    │
│  └─────────────────────────────────────┘    │
│           ↓                                   │
│  ┌─────────────────────────────────────┐    │
│  │  Local Storage Layer                │    │
│  │  ┌──────────────┬──────────────┐    │    │
│  │  │ SQLite DB    │ SharedPrefs  │    │    │
│  │  │ (persistent) │ (config)     │    │    │
│  │  └──────────────┴──────────────┘    │    │
│  └─────────────────────────────────────┘    │
│           ↓                                   │
│  ┌─────────────────────────────────────┐    │
│  │  Network Layer (Retrofit/Dio)       │    │
│  │  - REST API calls                   │    │
│  │  - JWT token handling               │    │
│  │  - Retry logic + timeout            │    │
│  │  - Connection detection             │    │
│  └─────────────────────────────────────┘    │
│           ↓                                   │
│           Backend API                        │
└─────────────────────────────────────────────┘
```

---

## Tech Stack Recommendation

### **Option A: React Native (Recommended)**
- Fastest to market (single codebase for iOS + Android)
- Familiar to JS/TS teams
- Libraries: Redux Toolkit, Realm (offline), React Navigation
- **Time to market:** 10 weeks realistic

### **Option B: Flutter**
- Slightly better performance
- Dart learning curve
- Libraries: Riverpod, Hive (offline), Go Router
- **Time to market:** 10-12 weeks

**Recommendation:** React Native (simpler stack, faster iteration)

---

## Storage Architecture

### **Local Database (SQLite / Realm)**

Store locally for offline access, sync on reconnect:

```
users/
├── id (uuid, primary key)
├── email
├── name
├── role
├── location_id
├── token (encrypted)

orders_local/ (store orders only)
├── id (uuid)
├── order_id (human-readable)
├── store_id
├── warehouse_id
├── status
├── items (json)
├── reserved_amount
├── created_at
├── created_by
├── sync_status (LOCAL | SYNCED | PENDING_UPLOAD)
├── sync_retry_count
├── last_sync_attempt

inventory_cache/
├── product_id
├── location_id
├── available_stock
├── reserved_stock
├── total_stock
├── cached_at (TTL: 5 minutes)

sync_queue/
├── id (uuid)
├── action_type (CREATE_ORDER | CONFIRM_RECEIVE | MARK_RECEIVED)
├── entity_type (order | transfer)
├── entity_id
├── payload (json)
├── created_at
├── status (PENDING | SYNCED | FAILED)
├── error_message
├── retry_count
```

### **Shared Preferences / Keychain**
```
- jwt_token (encrypted)
- jwt_expiry
- user_id
- user_role
- location_id
- last_sync_timestamp
- offline_mode_enabled
```

---

## Authentication Flow

### **Login Screen (All Users)**

```
User enters: email + password
    ↓
App validates offline (basic format check)
    ↓
POST /auth/login {email, password, idempotency_key}
    ↓
Response: {token, user: {id, name, role, location_id}}
    ↓
Store in Keychain:
  - token (encrypted)
  - token_expiry (24 hours from now)
    ↓
Store in SQLite:
  - user_id, name, role, location_id
    ↓
Navigate to role-specific dashboard
```

### **Token Refresh**
- Tokens valid for 24 hours
- On app launch, check: if token_expiry - now < 2 hours, refresh
- POST /auth/refresh (no login needed, just token)
- If token expired, redirect to login

### **Logout**
- Clear Keychain (token)
- Clear SQLite (user, orders, inventory)
- Clear sync queue (data not yet synced will be lost)
- Navigate to login

---

## Role-Specific Features

### **Warehouse Manager Features**

**Main Menu:**
```
1. Dashboard
   - Pending orders (store + bulk)
   - Low stock alerts
   - Recent dispatches (today)

2. Pending Orders
   - List of store orders in "confirmed" status
   - Quick action: Mark as "Packed"

3. Bulk Orders
   - List of bulk orders in "confirmed" status
   - Quick action: Mark as "Packed"

4. Dispatch Queue
   - Orders in "packed" status, ready to ship
   - Quick action: Mark as "Dispatched"
   - Open to print/save shipping label (order_id barcode)

5. Inventory
   - Search products
   - View warehouse stock (available, reserved, total)
   - View low stock items
   - View stock movement history (this location only)

6. Settings
   - Logout
   - Change password (future)
```

### **Store Manager Features**

**Main Menu:**
```
1. Dashboard
   - My inventory (available, reserved, total)
   - Pending orders (draft or awaiting confirmation)
   - Low stock items

2. Create Order Request
   - Search products
   - Select qty
   - Review and submit
   - (Status stays as "draft" until superadmin approves)

3. My Orders
   - List of all orders (pending + completed)
   - Status badges (draft, confirmed, packed, dispatched, received)
   - Quick action on "dispatched": "Confirm Receipt"

4. Inventory
   - Search products
   - View store inventory (available, reserved, total)
   - View stock movement history (this location only)

5. Settings
   - Logout
   - Change password (future)
```

---

## Offline-First Design

### **What Works Offline**

| Action | Works Offline? | Behavior |
|--------|---|---|
| View orders | ✅ Yes | Show cached list |
| View inventory | ✅ Yes | Show cached data (5-min old) |
| Create order request | ✅ Yes | Queue locally, sync on reconnect |
| Confirm receipt | ✅ Yes | Queue locally, sync on reconnect |
| Search products | ✅ Yes (cached) | Search local cache only |
| Login | ❌ No | Show "No internet" message |
| View audit logs | ❌ No | Not available offline |

### **Sync on Reconnect**

**When network becomes available:**

```
1. Check connectivity (reachability listener)
2. Fetch latest JWT token (refresh if expired)
3. Query sync_queue for PENDING items
4. For each PENDING item:
   a. POST to backend with idempotency_key
   b. If success: mark as SYNCED, update local state
   c. If conflict (409): resolve per rules
   d. If error: mark as FAILED, set error_message
5. Re-fetch inventory cache (flush old cache, fetch fresh)
6. Update UI: refresh order list, inventory
7. Show toast: "Synced successfully" or "X items need manual review"
```

### **Conflict Resolution**

**Scenario:** Store confirms receipt offline, warehouse also marks order as dispatched offline.

```
Store confirmation (offline):
- User clicks "Confirm Receipt"
- App sets status = "store_received" locally
- Queues action to sync_queue

Warehouse dispatch (offline):
- Warehouse manager marks "Dispatched"
- Sets status = "dispatched" locally
- Both try to sync

On reconnect:
- Store sync arrives first: PATCH /orders/:id/confirm-receive
  → Backend updates to "store_received" ✓
- Warehouse sync arrives: PATCH /orders/:id/dispatch
  → But order is already "store_received", invalid transition
  → Backend returns 400 (conflict)
- App detects 400, shows: "Order already confirmed by store"
- User dismisses, state resolves
```

---

## UI Components & Screens

### **1. Login Screen**

**Fields:**
- Email input (with validation)
- Password input (masked)
- "Login" button
- "Forgot password?" link (future)

**Behavior:**
- Offline: Show "No internet connection" message
- Loading: Disable button, show spinner
- Error: Show error message (red text)
- Success: Navigate to dashboard

**Example Flow:**
```
User: Opens app
  → Not logged in → Navigate to LoginScreen
  → Enters email + password
  → Clicks "Login"
  → Shows spinner
  → Backend returns token + user data
  → Store token in Keychain
  → Navigate to role-specific dashboard
```

### **2. Dashboard (Warehouse Manager)**

**Layout:**
```
┌─────────────────────────────────┐
│  Store Warehouse Supply Mgmt    │
│  Warehouse Manager - Main Hub   │  (header)
├─────────────────────────────────┤
│                                 │
│  Pending Orders                 │
│  ┌─────────────────────────┐   │
│  │ 5 Store Refill Orders   │   │
│  │ 2 Bulk Orders           │   │
│  └─────────────────────────┘   │
│                                 │
│  Low Stock Alert                │
│  ┌─────────────────────────┐   │
│  │ Samsung TV: 2 units     │   │
│  │ LG Fridge: 1 unit       │   │
│  └─────────────────────────┘   │
│                                 │
│  Dispatch Queue                 │
│  ┌─────────────────────────┐   │
│  │ 3 orders ready to ship  │   │
│  └─────────────────────────┘   │
│                                 │
│  [Pending Orders] [Inventory]   │ (tab or menu)
│  [Settings]                     │
└─────────────────────────────────┘
```

**Quick Actions:**
- Tap "Pending Orders" → Go to pending orders list
- Tap "Low Stock Alert" → Go to low stock report
- Tap "Dispatch Queue" → Go to pack/dispatch workflow

### **3. Pending Orders List (Warehouse Manager)**

**Layout:**
```
┌──────────────────────────────────────────┐
│  Pending Orders (5)                      │
├──────────────────────────────────────────┤
│                                          │
│  ORD-ST01-20260412-0001                  │
│  Store 01 → Samsung TV (5 units)         │
│  Status: Confirmed                       │
│  [Mark as Packed]                        │
│                                          │
│  ORD-ST02-20260412-0003                  │
│  Store 02 → LG Fridge (2 units)          │
│  Status: Confirmed                       │
│  [Mark as Packed]                        │
│                                          │
│  ... (paginated, 10 per page)            │
│                                          │
└──────────────────────────────────────────┘
```

**Order Item Detail (on tap):**
```
┌──────────────────────────────────────────┐
│  ORD-ST01-20260412-0001                  │
│  ─────────────────────────────────────   │
│  From: Main Warehouse (WH01)             │
│  To:   Store 01 (ST01)                   │
│  Status: Confirmed                       │
│                                          │
│  Items:                                  │
│  - Samsung 55" TV (SKU-TV-001)  qty: 5  │
│  - LG 23" Monitor (SKU-MON-001) qty: 3  │
│                                          │
│  Created: 2026-04-12 10:30 AM            │
│  Approved by: Superadmin                 │
│                                          │
│  [Mark as Packed]  [View Details]        │
│  [Cancel Order]                          │
│                                          │
└──────────────────────────────────────────┘
```

**Mark as Packed Workflow:**
```
Tap [Mark as Packed]
  → Show confirmation dialog
     "Are you sure? 5 units will be reserved."
  → User confirms
  → App makes LOCAL POST to sync_queue
  → Updates status to "packed" in SQLite
  → Shows toast: "Order marked packed (syncing...)"
  → Immediately removes from "Pending Orders" list
  → When sync succeeds, status stays "packed"
  → When sync fails, shows error toast
```

### **4. Store Manager - Create Order Request**

**Screen 1: Select Products**
```
┌──────────────────────────────────────────┐
│  Create Order Request                    │
├──────────────────────────────────────────┤
│  Search: [Samsung____________]  [Search] │
│                                          │
│  Product List:                           │
│  ┌────────────────────────────────────┐ │
│  │ [Image] Samsung 55" TV             │ │
│  │         Brand: Samsung             │ │
│  │         Model: QN55Q80C            │ │
│  │         Status: In Stock (2)        │ │
│  │         Qty: [1] [+] [-]            │ │
│  │         [Add to Request]            │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ [Image] LG 23" Monitor             │ │
│  │         Brand: LG                  │ │
│  │         Available: 5                │ │
│  │         Qty: [1] [+] [-]            │ │
│  │         [Add to Request]            │ │
│  └────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

**Screen 2: Review Order**
```
┌──────────────────────────────────────────┐
│  Confirm Order Request                   │
├──────────────────────────────────────────┤
│                                          │
│  Items in Request:                       │
│  - Samsung 55" TV          qty: 5       │
│  - LG 23" Monitor          qty: 3       │
│                                          │
│  From: Main Warehouse (WH01)             │
│  To:   My Store (ST01)                   │
│                                          │
│  [Submit Request]                        │
│  [Edit Request]                          │
│  [Cancel]                                │
│                                          │
└──────────────────────────────────────────┘
```

**Submit Behavior:**
```
Tap [Submit Request]
  → Validate qty ≤ available_stock (from cache)
  → Create order_id locally (e.g., ORD-ST01-20260412-0001)
  → Insert into SQLite with status="draft"
  → Queue POST /orders to sync_queue
  → Show toast: "Order request submitted (syncing...)"
  → Navigate to "My Orders" list
  → Show new order as "Draft - Pending Approval"
  → Poll for status change (every 10 seconds)
  → When approved, show toast: "Order approved, warehouse will pack"
```

### **5. Store Manager - My Orders**

**Layout:**
```
┌──────────────────────────────────────────┐
│  My Orders (12)                          │
│  [All] [Pending] [Completed]             │ (tabs)
├──────────────────────────────────────────┤
│                                          │
│  ORD-ST01-20260412-0001                  │
│  5x Samsung TV, 3x LG Monitor            │
│  Status: Dispatched [yellow badge]       │
│  [Confirm Receipt] [Details]             │
│                                          │
│  ORD-ST01-20260411-0005                  │
│  2x Samsung TV                           │
│  Status: Completed [green badge]         │
│  [Details]                               │
│                                          │
│  ORD-ST01-20260410-0003                  │
│  10x LG Fridge                           │
│  Status: Draft [gray badge]              │
│  [Cancel] [Details]                      │
│                                          │
└──────────────────────────────────────────┘
```

**Status Badges:**
```
draft         → Gray "Draft - Awaiting approval"
confirmed     → Blue "Warehouse will pack"
packed        → Orange "Warehouse packing"
dispatched    → Yellow "On the way - Confirm receipt"
store_received → Green "Received - Complete"
completed     → Green "Completed"
cancelled     → Red "Cancelled"
```

**Confirm Receipt Workflow:**
```
User sees order with status="dispatched"
Tap [Confirm Receipt]
  → Show dialog:
     "Please verify all items have been received:"
     - Samsung 55" TV: qty 5
     - LG Monitor: qty 3
     [Confirm] [Cancel]
  → User confirms
  → App queues PATCH /orders/:id/confirm-receive
  → Shows toast: "Receipt confirmed (syncing...)"
  → Updates status to "store_received" locally
  → When sync succeeds:
     * Update order status to "store_received"
     * Inventory updates (warehouse ↓, store ↑)
     * Show toast: "Inventory updated"
```

### **6. Inventory Screen**

**Layout:**
```
┌──────────────────────────────────────────┐
│  Inventory                               │
│  My Store (ST01)                         │
├──────────────────────────────────────────┤
│  Search: [Samsung____________]  [Filter] │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Samsung 55" TV (SKU-TV-001)       │ │
│  │ Status: In Stock                   │ │
│  │ Available: 2   Reserved: 1   Total: 3  │ │
│  │ [Request More] [View History]     │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ LG Monitor 23" (SKU-MON-001)       │ │
│  │ Status: Low Stock (⚠️ 1 unit)      │ │
│  │ Available: 1   Reserved: 0   Total: 1  │ │
│  │ [Request More] [View History]     │ │
│  └────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

**Stock Movement History (on tap "View History"):**
```
┌──────────────────────────────────────────┐
│  Samsung 55" TV - Movement History       │
│  (Last 30 days)                          │
├──────────────────────────────────────────┤
│                                          │
│  Apr 12, 2026  10:45 AM                  │
│  +5 units (Order ORD-ST01-20260412-0001) │
│  Received from warehouse                 │
│                                          │
│  Apr 11, 2026  2:30 PM                   │
│  -2 units (Manual sale, not tracked)     │
│  Reason: Customer return                 │
│                                          │
│  Apr 10, 2026  9:00 AM                   │
│  +10 units (Transfer)                    │
│  From warehouse                          │
│                                          │
└──────────────────────────────────────────┘
```

---

## Navigation Structure

### **Warehouse Manager Navigation**

```
LoginScreen
  ↓ (on login success)
WarehouseManagerDashboard
  ├── PendingOrdersScreen
  │   ├── OrderListScreen
  │   └── OrderDetailScreen
  │       ├── MarkAsPackedAction
  │       └── CancelOrderAction
  ├── BulkOrdersScreen
  │   ├── OrderListScreen
  │   └── OrderDetailScreen
  │       ├── MarkAsPackedAction
  │       └── CancelOrderAction
  ├── DispatchQueueScreen
  │   ├── OrderListScreen (packed status)
  │   └── OrderDetailScreen
  │       ├── MarkAsDispatchedAction
  │       └── PrintShippingLabelAction
  ├── InventoryScreen
  │   ├── ProductListScreen (warehouse only)
  │   ├── ProductDetailScreen
  │   └── StockMovementHistoryScreen
  └── SettingsScreen
      ├── LogoutAction
      └── ChangePasswordScreen (future)
```

### **Store Manager Navigation**

```
LoginScreen
  ↓ (on login success)
StoreManagerDashboard
  ├── CreateOrderRequestScreen
  │   ├── ProductSearchScreen
  │   ├── SelectQuantityScreen
  │   └── ReviewOrderScreen
  │       └── SubmitOrderAction
  ├── MyOrdersScreen
  │   ├── OrderListScreen (filter by status)
  │   ├── OrderDetailScreen
  │   │   ├── ConfirmReceiptAction (if dispatched)
  │   │   └── CancelOrderAction (if draft/confirmed)
  │   └── StockMovementHistoryScreen
  ├── InventoryScreen
  │   ├── ProductListScreen (store only)
  │   ├── ProductDetailScreen
  │   └── StockMovementHistoryScreen
  └── SettingsScreen
      ├── LogoutAction
      └── ChangePasswordScreen (future)
```

---

## API Integration Points

### **Key Endpoints Used by Mobile**

| Endpoint | Method | Used By | Purpose |
|----------|--------|---------|---------|
| `/auth/login` | POST | Both | Login |
| `/products` | GET | Both | List products (search, filter) |
| `/inventory?location_id` | GET | Both | Get inventory snapshot |
| `/inventory/movements?location_id` | GET | Both | Stock history |
| `/orders` | GET | Both | List orders |
| `/orders` | POST | Store | Create order request |
| `/orders/:id/approve` | PATCH | (Web only) | Approve order |
| `/orders/:id/dispatch` | PATCH | Warehouse | Mark as dispatched |
| `/orders/:id/confirm-receive` | PATCH | Store | Confirm receipt |
| `/bulk-orders` | GET | Warehouse | List bulk orders |
| `/bulk-orders/:id/dispatch` | PATCH | Warehouse | Dispatch bulk order |

### **Request/Response Format**

**Login Request:**
```json
{
  "email": "manager@warehouse.com",
  "password": "securepassword",
  "idempotency_key": "uuid-here"
}
```

**Login Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "John Warehouse Manager",
    "role": "warehouse_manager",
    "location_id": "uuid"
  }
}
```

**Create Order Request (Store Manager):**
```json
{
  "store_id": "uuid",
  "warehouse_id": "uuid",
  "items": [
    {"product_id": "uuid", "qty": 5},
    {"product_id": "uuid", "qty": 3}
  ],
  "idempotency_key": "uuid-here"
}
```

**Mark as Dispatched Request (Warehouse Manager):**
```json
{
  "dispatch_notes": "All items packed and ready",
  "idempotency_key": "uuid-here"
}
```

**Error Response:**
```json
{
  "code": "INSUFFICIENT_STOCK",
  "message": "Not enough stock available. Available: 2, Requested: 5",
  "details": {
    "available": 2,
    "requested": 5,
    "product_id": "uuid"
  }
}
```

---

## Notifications

### **Local Notifications (Scheduled)**

```
iOS: UNUserNotificationCenter
Android: NotificationManager

Events that trigger notifications:
1. Order status changed (remote via push)
2. Low stock alert (local check every 30 min)
3. App reminder to confirm receipt (24h after dispatch)
```

### **Push Notifications (From Backend)**

```
Warehouse Manager receives:
- "New order ready to pack: ORD-ST01-20260412-0001"
- "Bulk order created: BULK-WH01-20260412-0007"
- "Stock low: Samsung TV (2 units remaining)"

Store Manager receives:
- "Your order dispatched: ORD-ST01-20260412-0001"
- "Unconfirmed order after 24 hours"
```

---

## Testing Strategy for Mobile

### **Unit Tests**
```
✓ Offline sync queue logic
✓ Conflict resolution (concurrent updates)
✓ Local inventory cache expiration
✓ Status transition validation
✓ Order form validation (qty > 0, etc.)
✓ Date/time formatting
✓ Token refresh logic
```

### **Integration Tests**
```
✓ Full order creation flow (offline then sync)
✓ Full confirmation flow (dispatch + receive)
✓ Inventory cache updates after sync
✓ Notification delivery on status change
✓ Role-based navigation (store manager can't access warehouse screens)
```

### **Manual Testing Checklist**
```
OFFLINE SCENARIOS:
□ Create order without internet, sync when back online
□ Confirm receipt without internet, verify stock updated when synced
□ Search products offline, cache works

ROLE ISOLATION:
□ Store manager cannot create bulk orders
□ Warehouse manager cannot confirm receipt
□ Login redirects to correct role-specific dashboard

STOCK VALIDATION:
□ Cannot request more than available_stock
□ Show error: "Only 2 units available, you requested 5"

REAL-TIME UPDATES:
□ Order status changes on backend, app reflects within 30 seconds (polling)
□ Inventory updates after sync, list refreshes

EDGE CASES:
□ Network drops mid-request, retry on reconnect
□ Duplicate sync attempt, idempotency prevents double-action
□ Token expires during request, auto-refresh, retry
```

---

## Deployment Checklist for Mobile

### **Before Release**

- [ ] All unit + integration tests passing
- [ ] Manual testing checklist completed
- [ ] Offline sync tested with 10+ orders queued
- [ ] Conflict resolution tested (concurrent updates)
- [ ] Role isolation verified (all 2 roles tested)
- [ ] Notification delivery verified
- [ ] App crash testing (force kill during sync)
- [ ] Performance testing (list load < 2s, search < 500ms)
- [ ] Battery drain testing (background sync)

### **Build & Submit**

- [ ] Increment version number (semantic versioning)
- [ ] Compile release builds (iOS: .ipa, Android: .apk)
- [ ] Sign with production certificates
- [ ] Test on real devices (iPhone 12+, Pixel 5+)
- [ ] Submit to App Store (iOS) + Google Play (Android)
- [ ] Add release notes describing features, bug fixes

### **Post-Release Monitoring**

- [ ] Monitor crash reports (Crashlytics)
- [ ] Monitor API error rates from mobile
- [ ] Check user feedback (ratings, reviews)
- [ ] Monitor sync failure rates
- [ ] Be ready to hotfix critical bugs (24-hour response)

---

## Future Enhancements

- [ ] Barcode scanning (pack orders faster)
- [ ] QR code scanning (order IDs, products)
- [ ] GPS-based attendance (if payroll added later)
- [ ] Photo capture (order damage documentation)
- [ ] Voice commands (mark order packed hands-free)
- [ ] Dark mode (battery efficiency)
- [ ] Offline maps (warehouse layout, location-based tasks)
