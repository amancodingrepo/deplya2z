# Ecosystem Sync Verification
# Store & Warehouse Supply Management System v2.0
# Flutter App ↔ Web App ↔ Backend API ↔ PostgreSQL Database

**Purpose:** Verify all four layers of the system work together as one — no layer ahead of another, no layer behind.  
**Run when:** First full deployment, after any major change, before going live.  
**Time needed:** Full run 4-5 hours. Smoke test 1 hour.  
**Tools needed:** Flutter device (or emulator), Web browser (Vercel), API tool (Postman or curl), Neon DB console open.

---

## What "In Sync" Means

The ecosystem is in sync when:

1. An action taken on the **Flutter app** immediately reflects on the **web app** without manual refresh (within the polling interval)
2. Every action on either app produces the **exact same database record** — no duplicates, no missing rows
3. The **backend enforces** every business rule that the UI presents to the user — rules are not just cosmetic
4. **Offline actions** on Flutter queue correctly and, when synced, produce the same result as if done online
5. **All four roles** see exactly their scope of data — nothing more, nothing less — on both Flutter and web

If any one of these five is broken, the ecosystem is out of sync.

---

## Setup Before Starting

### Devices and Sessions Needed

Open all of these simultaneously. Keep them visible side-by-side where possible.

| Session | What | Who Logged In |
|---------|------|---------------|
| Flutter device / emulator A | Mobile app | Warehouse Manager |
| Flutter device / emulator B | Mobile app | Store Manager |
| Flutter device / emulator C | Mobile app | Staff member |
| Web browser tab 1 | Vercel web app | Superadmin |
| Web browser tab 2 | Vercel web app | Second tab for comparison |
| Neon DB console | PostgreSQL query console | Direct DB access |
| API tool | Postman or curl | Raw API calls |

### Test Data Required

Confirm this exists before starting. Create it if missing.

| Data | Value |
|------|-------|
| Warehouse location | Main Warehouse, code WH01, geofence lat/lng set, radius 200m |
| Store location | Store 01, code ST01, geofence lat/lng set, radius 200m |
| Superadmin account | admin@test.com |
| Warehouse Manager account | warehouse@test.com, assigned to WH01 |
| Store Manager account | store@test.com, assigned to ST01 |
| Staff account (warehouse) | staff-wh@test.com, assigned to WH01, role=staff |
| Staff account (store) | staff-st@test.com, assigned to ST01, role=staff |
| Test products | At least 5 products with images, status=present |
| Warehouse stock | Samsung TV: total=30, reserved=0 at WH01 |
| Third-party client | ABC Retail Store, status=active |

### DB Console — Queries to Keep Ready

Paste these into Neon and run them throughout the test. Replace UUIDs with actual values as you find them.

```sql
-- Check order status and stock in one query
SELECT 
  so.order_id, so.status, so.reserved_amount,
  i.total_stock, i.reserved_stock, 
  i.total_stock - i.reserved_stock AS available_stock
FROM store_orders so
JOIN inventory i ON i.location_id = so.warehouse_id
JOIN order_items oi ON oi.order_id = so.id
JOIN products p ON oi.product_id = p.id
WHERE p.title ILIKE '%samsung%'
ORDER BY so.created_at DESC
LIMIT 5;

-- Last 10 stock movements
SELECT 
  sm.movement_type, sm.quantity, sm.reference_id,
  p.title AS product, 
  fl.name AS from_loc, tl.name AS to_loc,
  u.name AS actor, sm.created_at
FROM stock_movements sm
JOIN products p ON sm.product_id = p.id
LEFT JOIN locations fl ON sm.from_location_id = fl.id
LEFT JOIN locations tl ON sm.to_location_id = tl.id
LEFT JOIN users u ON sm.created_by = u.id
ORDER BY sm.created_at DESC
LIMIT 10;

-- Last 10 audit log entries
SELECT action, entity_type, actor_name, actor_role, success, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 10;

-- Today's attendance for all staff
SELECT 
  u.name, sm.employee_code,
  a.check_in_time, a.check_out_time,
  a.is_within_geofence, a.is_late, a.status
FROM attendance a
JOIN staff_members sm ON a.staff_id = sm.id
JOIN users u ON sm.user_id = u.id
WHERE a.date = CURRENT_DATE;

-- All notifications unread count per user
SELECT u.name, u.role, COUNT(*) as unread
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.read = false
GROUP BY u.name, u.role;
```

---

## SYNC TEST 1: Login and Role Routing

**Goal:** Confirm all four roles land on the correct app experience on both Flutter and web.

### 1A — All Roles Log In Simultaneously

Open all sessions and log in at the same time.

| Session | Expected Landing |
|---------|-----------------|
| Flutter (Warehouse Manager) | Warehouse dashboard — /warehouse/dashboard |
| Flutter (Store Manager) | Store dashboard — /store/dashboard |
| Flutter (Staff WH) | Staff dashboard — /staff/dashboard |
| Web (Superadmin) | Superadmin dashboard — /dashboard |

**Cross-check:**

On the superadmin web dashboard:
- [ ] "Active Stores" KPI shows Store 01 as active
- [ ] "Active Warehouses" count is correct

Run in Neon:
```sql
SELECT COUNT(*) FROM locations WHERE status = 'active' AND type = 'store';
SELECT COUNT(*) FROM locations WHERE status = 'active' AND type = 'warehouse';
```
- [ ] Counts match the web dashboard KPI cards exactly

### 1B — Wrong Role Cannot Access Wrong Route

**Flutter test:**
While logged in as Store Manager, navigate manually (via URL deep link or code change) to a warehouse route.
- [ ] Flutter redirects to store dashboard or login — warehouse screens never shown

**Web test:**
While logged in as Superadmin on web, attempt direct URL to a non-existent admin path.
- [ ] 404 or redirect to dashboard

**API test (Postman):**
Call `GET /api/v1/orders` using the store manager's JWT.
- [ ] Response only contains orders where store_id = store manager's location_id
- [ ] No other stores' orders in the response

Call `GET /api/v1/orders` using the warehouse manager's JWT.
- [ ] Response only contains orders where warehouse_id = warehouse manager's location_id

**DB check:**
- [ ] Row-level security is enabled:
```sql
SHOW row_security;
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

---

## SYNC TEST 2: Product — Flutter Search = Web List = DB Count

**Goal:** Confirm product data is identical across Flutter, web, and database.

### 2A — Product Count Matches Everywhere

**Web (superadmin at /products):**
- [ ] Note the total product count shown (e.g., "47 products")

**DB:**
```sql
SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND status = 'present';
```
- [ ] Count matches web exactly

**Flutter (warehouse manager, inventory screen):**
- [ ] Pull to refresh
- [ ] Product count in inventory matches (may differ if some products have zero stock — that is expected)

**Flutter (store manager, order create screen):**
- [ ] Only `status=present` products shown — inactive and discontinued excluded

### 2B — Product Create Syncs to Both Apps

**Action:** Create a new product on web (superadmin at /products/create) with an image.

**Immediately after saving on web:**

**Web check:**
- [ ] Product appears in product list with thumbnail
- [ ] Status badge shows "Present"

**API check (Postman):**
- Call `GET /api/v1/products?search=[new product title]`
- [ ] Product returned with `image_url` and `thumbnail_url` populated
- [ ] Both URLs point to `images.yourdomain.com/products/...` (R2 CDN)

**DB check:**
```sql
SELECT id, title, sku, image_url, thumbnail_url, status, created_at
FROM products
ORDER BY created_at DESC
LIMIT 1;
```
- [ ] Row exists with correct data
- [ ] `image_url` and `thumbnail_url` are WebP URLs from R2

**Flutter check (warehouse manager — pull to refresh on inventory):**
- [ ] New product appears in inventory list with thumbnail image loading

**Flutter check (store manager — order create, search for product):**
- [ ] New product appears in search results
- [ ] Thumbnail loads from R2 CDN
- [ ] Available stock shows "0" or correct warehouse stock

**Timing check:**
- [ ] Product appears on Flutter within the cache TTL (5 minutes max)
- [ ] After pull-to-refresh on Flutter, appears immediately

### 2C — Image Compression and CDN

Open the `thumbnail_url` from the DB in a browser tab.
- [ ] Image loads (not 404)
- [ ] Image is visually a square thumbnail (300×300)
- [ ] File type is WebP (check browser DevTools → Network → Content-Type: image/webp)
- [ ] Response header includes `Cache-Control: public, max-age=31536000`

Open the `image_url`.
- [ ] Loads as larger image (800×800 max)
- [ ] Also WebP format

---

## SYNC TEST 3: Full Order Lifecycle — Both Apps in Sync

**This is the master test.** Run this completely. Every step must pass all four layers.

### Pre-test state snapshot

Before starting, record these numbers:

| Metric | Current Value |
|--------|--------------|
| Samsung TV total_stock at WH01 | |
| Samsung TV reserved_stock at WH01 | |
| Samsung TV available_stock at WH01 | |
| Samsung TV total_stock at ST01 | |
| Pending approvals on web dashboard | |
| Orders to pack on Flutter WH dashboard | |

### STEP 3A — Store Manager Creates Order on Flutter

**Device:** Flutter (Store Manager)

**Action:** Navigate to /store/orders/create. Add 5 Samsung TVs. Submit.

**Flutter checks:**
- [ ] Samsung TV shows correct available stock from warehouse
- [ ] Cannot request more than available (try requesting 999 — should cap or error)
- [ ] Idempotency key generated (UUID) before request
- [ ] Order submitted successfully
- [ ] Redirected to orders list with new order showing status "Draft"
- [ ] Order ID displayed in JetBrains Mono format (ORD-ST01-YYYYMMDD-XXXX)

**API check (watch in network/Postman):**
- [ ] `POST /api/v1/orders` called with correct body
- [ ] `X-Idempotency-Key` header present
- [ ] Response status 201
- [ ] Response contains `order_id` in correct format

**DB check (run within 10 seconds):**
```sql
SELECT order_id, status, store_id, warehouse_id, reserved_amount, created_at
FROM store_orders
ORDER BY created_at DESC
LIMIT 1;
```
- [ ] New row exists with `status = 'draft'`
- [ ] `reserved_amount = 5`
- [ ] `store_id` = ST01's UUID
- [ ] `warehouse_id` = WH01's UUID

```sql
SELECT product_id, quantity, status
FROM order_items
WHERE order_id = (SELECT id FROM store_orders ORDER BY created_at DESC LIMIT 1);
```
- [ ] 1 row: Samsung TV, quantity 5, status 'pending'

**Inventory check — MUST NOT CHANGE:**
```sql
SELECT total_stock, reserved_stock, total_stock - reserved_stock AS available
FROM inventory
WHERE location_id = '[WH01_UUID]' AND product_id = '[SAMSUNG_TV_UUID]';
```
- [ ] `reserved_stock` unchanged from pre-test snapshot (draft = no reservation)
- [ ] `available_stock` unchanged

**Web check (superadmin, within 60 seconds or manual refresh):**
- [ ] "Pending Approvals" KPI increased by 1
- [ ] New order appears in /orders/store-orders with "Draft" status badge
- [ ] Store name shows "Store 01"
- [ ] Items shows "1 item (5 units)"

**Notification check:**
```sql
SELECT type, title, message, read, created_at
FROM notifications
WHERE type = 'order_created'
ORDER BY created_at DESC
LIMIT 1;
```
- [ ] Notification exists for superadmin

### STEP 3B — Superadmin Approves on Web

**Device:** Web browser (Superadmin at /orders/store-orders)

**Action:** Find the draft order. Click Approve. Approval modal opens. Click Confirm Approval.

**Web checks:**
- [ ] Modal shows Samsung TV: Requested 5, Available [correct number], green checkmark
- [ ] Confirm button is enabled
- [ ] After confirm: order status badge changes to "Confirmed" (blue)
- [ ] Pending Approvals KPI decreases by 1
- [ ] Success toast shown

**API check:**
- [ ] `PATCH /api/v1/orders/[order_id]/approve` called
- [ ] Response status 200
- [ ] Response body: `{ status: "confirmed" }`

**DB check — CRITICAL — run immediately:**
```sql
SELECT status, approved_by FROM store_orders WHERE order_id = '[ORDER_ID]';
```
- [ ] `status = 'confirmed'`
- [ ] `approved_by` = superadmin's UUID

**Inventory check — MUST CHANGE:**
```sql
SELECT total_stock, reserved_stock, total_stock - reserved_stock AS available
FROM inventory
WHERE location_id = '[WH01_UUID]' AND product_id = '[SAMSUNG_TV_UUID]';
```
- [ ] `reserved_stock` increased by exactly 5
- [ ] `total_stock` unchanged
- [ ] `available_stock` decreased by exactly 5

**Stock movement check:**
```sql
SELECT movement_type, quantity, reference_id, created_at
FROM stock_movements
WHERE reference_id = '[ORDER_ID]'
ORDER BY created_at DESC;
```
- [ ] 1 new row: `movement_type = 'order_reserved'`, `quantity = 5`

**Audit log check:**
```sql
SELECT action, entity_type, actor_name, details, created_at
FROM audit_logs
WHERE entity_type = 'store_order'
ORDER BY created_at DESC
LIMIT 3;
```
- [ ] New row: `action = 'approve'`, `actor_name` = superadmin name

**Flutter check (Warehouse Manager — within 60 seconds or pull to refresh):**
- [ ] "Orders to Pack" KPI increased by 1
- [ ] Order appears in "Ready to Pack" section on dashboard
- [ ] Order appears in /warehouse/orders with "Confirmed" status badge

**Notification check (Flutter — Warehouse Manager):**
- [ ] Notification bell shows unread count
- [ ] Notification says "Store order [ORDER_ID] ready to pack"

```sql
SELECT type, title, message, read
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE u.email = 'warehouse@test.com'
ORDER BY n.created_at DESC
LIMIT 1;
```
- [ ] Notification exists, `read = false`

### STEP 3C — Warehouse Manager Packs on Flutter

**Device:** Flutter (Warehouse Manager)

**Action:** Tap "Pack" on the order. Pack checklist opens. Check all items. Confirm.

**Flutter checks:**
- [ ] Pack checklist shows: Samsung TV × 5
- [ ] Confirm button disabled until checkbox checked
- [ ] After checking and confirming: order moves from pack queue
- [ ] Status shows "Packed" (amber badge)
- [ ] SnackBar: "Order marked as packed"

**API check:**
- [ ] `PATCH /api/v1/orders/[ORDER_UUID]/pack` called
- [ ] Response status 200

**DB check:**
```sql
SELECT status FROM store_orders WHERE order_id = '[ORDER_ID]';
SELECT status FROM order_items WHERE order_id = (SELECT id FROM store_orders WHERE order_id = '[ORDER_ID]');
```
- [ ] `store_orders.status = 'packed'`
- [ ] All `order_items.status = 'packed'`

**Inventory check — MUST NOT CHANGE:**
- [ ] `reserved_stock` still same as after approval (stock not deducted yet — only when dispatched)

**Web check (superadmin):**
- [ ] Order status on web changes to "Packed" within polling interval
- [ ] "Orders to Pack" count decreases on warehouse view

### STEP 3D — Warehouse Manager Dispatches on Flutter

**Device:** Flutter (Warehouse Manager)

**Action:** Tap "Dispatch" on the packed order. Add dispatch notes "All items packed securely". Confirm.

**Flutter checks:**
- [ ] Dispatch confirmation sheet shows order summary
- [ ] Notes field accepts text
- [ ] After confirming: order leaves dispatch queue
- [ ] Status shows "Dispatched" (orange badge)
- [ ] SnackBar: "Order dispatched. Store will confirm receipt."

**API check:**
- [ ] `PATCH /api/v1/orders/[ORDER_UUID]/dispatch` called with `{ dispatch_notes: "..." }`
- [ ] Response status 200
- [ ] Response contains `dispatched_at` timestamp

**DB check — CRITICAL:**
```sql
SELECT status, dispatched_at, dispatched_by, dispatch_notes
FROM store_orders WHERE order_id = '[ORDER_ID]';
```
- [ ] `status = 'dispatched'`
- [ ] `dispatched_at` has a timestamp
- [ ] `dispatched_by` = warehouse manager UUID
- [ ] `dispatch_notes` = "All items packed securely"

**Inventory check — MUST CHANGE (stock leaves warehouse):**
```sql
SELECT total_stock, reserved_stock, issued_stock,
       total_stock - reserved_stock AS available
FROM inventory
WHERE location_id = '[WH01_UUID]' AND product_id = '[SAMSUNG_TV_UUID]';
```
- [ ] `total_stock` decreased by 5 (from pre-test snapshot value)
- [ ] `reserved_stock` decreased by 5 (reservation cleared)
- [ ] `issued_stock` increased by 5
- [ ] `available_stock` = same as after approval (reserved moved out)

**Stock movement check:**
```sql
SELECT movement_type, quantity, from_location_id
FROM stock_movements
WHERE reference_id = '[ORDER_ID]'
ORDER BY created_at DESC;
```
- [ ] New row: `movement_type = 'order_deducted'`, `quantity = 5`, `from_location_id = WH01_UUID`

**Web check (superadmin):**
- [ ] Order status on web shows "Dispatched" (orange)
- [ ] `dispatched_at` timestamp visible on order detail

**Flutter check (Store Manager — within 60 seconds or pull to refresh):**
- [ ] Action Required amber banner appears on dashboard
- [ ] "Arriving Soon" KPI shows 1
- [ ] Order appears in "Action Needed" tab on /store/orders

**Notification check (Flutter — Store Manager):**
- [ ] Notification received: "Your order [ORDER_ID] is on the way"
- [ ] Tapping notification navigates to order detail

```sql
SELECT type, message, read FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE u.email = 'store@test.com'
ORDER BY n.created_at DESC LIMIT 1;
```
- [ ] Notification exists for store manager

### STEP 3E — Store Manager Confirms Receipt on Flutter

**Device:** Flutter (Store Manager)

**Action:** Tap "Confirm Receipt" on the dispatched order. Check all items. Confirm.

**Flutter checks:**
- [ ] Checklist shows Samsung TV × 5
- [ ] Info note: "This will update your store inventory automatically"
- [ ] All items must be checked before button enables
- [ ] After confirming: order moves to Completed tab
- [ ] Status shows "Completed" (green badge)
- [ ] Action Required banner disappears from dashboard
- [ ] SnackBar: "Receipt confirmed. Store inventory updated."

**API check:**
- [ ] `PATCH /api/v1/orders/[ORDER_UUID]/confirm-receive` called
- [ ] Response status 200
- [ ] Response body contains `inventory_updated` array

**DB check — FINAL CRITICAL:**
```sql
SELECT status, received_at, received_by
FROM store_orders WHERE order_id = '[ORDER_ID]';
```
- [ ] `status = 'completed'`
- [ ] `received_at` has timestamp
- [ ] `received_by` = store manager UUID

```sql
SELECT status FROM order_items
WHERE order_id = (SELECT id FROM store_orders WHERE order_id = '[ORDER_ID]');
```
- [ ] All items `status = 'received'`

**Store inventory check — NEW STOCK:**
```sql
SELECT total_stock, reserved_stock, issued_stock
FROM inventory
WHERE location_id = '[ST01_UUID]' AND product_id = '[SAMSUNG_TV_UUID]';
```
- [ ] `total_stock` = 5 (or previous value + 5 if product was already at store)
- [ ] New row created if this was first receipt of this product at ST01

**Warehouse inventory — UNCHANGED since dispatch:**
```sql
SELECT total_stock, reserved_stock
FROM inventory
WHERE location_id = '[WH01_UUID]' AND product_id = '[SAMSUNG_TV_UUID]';
```
- [ ] Values same as after dispatch step — store receipt does not change warehouse inventory

**Stock movement check:**
```sql
SELECT movement_type, quantity, to_location_id
FROM stock_movements
WHERE reference_id = '[ORDER_ID]'
ORDER BY created_at ASC;
```
- [ ] 3 total movements for this order:
  1. `order_reserved` — qty 5, no from/to (reservation)
  2. `order_deducted` — qty 5, from WH01
  3. `order_issued` — qty 5, to ST01

**Web check (superadmin):**
- [ ] Order status on web shows "Completed" (green)
- [ ] Order detail shows received_at timestamp

**Flutter check (Store Manager — /st/inventory):**
- [ ] Samsung TV now appears in store inventory
- [ ] `available_stock = 5` (or previous + 5)

**Flutter check (Web — Superadmin analytics):**
- [ ] "Dispatched Today" KPI includes this order
- [ ] Analytics charts (if refreshed) include today's order data

### STEP 3F — Full Inventory Math Audit

After the complete order cycle, verify the numbers add up perfectly.

**Pre-test → Post-test comparison:**

| Metric | Pre-test | After Approval | After Dispatch | After Receipt |
|--------|----------|---------------|----------------|---------------|
| WH01 total_stock | [X] | [X] | [X-5] | [X-5] |
| WH01 reserved_stock | [0] | [5] | [0] | [0] |
| WH01 available_stock | [X] | [X-5] | [X-5] | [X-5] |
| WH01 issued_stock | [Y] | [Y] | [Y+5] | [Y+5] |
| ST01 total_stock | [Z] | [Z] | [Z] | [Z+5] |

Fill in the actual numbers. Every cell must match what you see in the database.

---

## SYNC TEST 4: Bulk Order — Web Creates, Flutter Fulfills

### 4A — Superadmin Creates Bulk Order on Web

**Device:** Web (Superadmin at /orders/bulk-orders/create)

**Action:** Select ABC Retail Store. Add 10 Samsung TVs. Submit.

**Web checks:**
- [ ] Client selector shows ABC Retail Store as active
- [ ] Stock check shows "Available: [current]" next to Samsung TV
- [ ] Cannot exceed available stock
- [ ] On submit: order status is "Confirmed" immediately (no draft/approval step)
- [ ] Order appears in bulk orders list

**DB check:**
```sql
SELECT order_id, status, client_store_id, warehouse_id, reserved_amount
FROM bulk_orders ORDER BY created_at DESC LIMIT 1;
```
- [ ] `status = 'confirmed'` (auto-confirmed)
- [ ] `reserved_amount = 10`

**Inventory check:**
- [ ] `reserved_stock` at WH01 increased by 10 from current value

**Flutter check (Warehouse Manager — within 60 seconds):**
- [ ] Notification received: "Bulk order [BULK-...] for ABC Retail Store"
- [ ] Order appears in /warehouse/orders Bulk Orders tab
- [ ] Shows client name "ABC Retail Store" instead of a store name

### 4B — Warehouse Dispatches Bulk Order on Flutter

**Action:** Pack then dispatch the bulk order on Flutter.

**After dispatch:**

**DB check:**
```sql
SELECT status, dispatched_at FROM bulk_orders WHERE order_id = '[BULK_ORDER_ID]';
```
- [ ] `status = 'completed'` (bulk orders complete on dispatch — no receipt step)

**Inventory check:**
- [ ] WH01 `total_stock` decreased by 10
- [ ] WH01 `reserved_stock` decreased by 10
- [ ] WH01 `issued_stock` increased by 10

**Critical difference from store orders:**
```sql
SELECT COUNT(*) FROM inventory
WHERE location_id = '[ST01_UUID]' AND product_id = '[SAMSUNG_TV_UUID]';
```
- [ ] Store inventory NOT updated — bulk goes to external client, no internal stock movement

**Stock movements:**
- [ ] Only 2 movements for this bulk order (order_reserved + order_deducted)
- [ ] NO order_issued movement (no store to credit)

---

## SYNC TEST 5: Staff Attendance — GPS Validation Across All Layers

### 5A — Staff Checks In on Flutter

**Device:** Flutter (Staff — warehouse)

**Pre-condition:** Staff's assigned location (WH01) has geo_lat, geo_lng, and geofence_radius set in the database.

**Action:** Open staff dashboard. GPS acquires location. Tap Check In.

**Flutter checks:**
- [ ] GPS loading indicator appears
- [ ] Location acquired (green indicator "You are at Main Warehouse")
- [ ] OR if testing outside geofence: orange indicator + warning dialog
- [ ] Check In button active
- [ ] After tapping: card changes to "Checked in at [time]"
- [ ] Checkout button appears

**API check:**
- [ ] `POST /api/v1/attendance/check-in` called with `{ lat, lng }`
- [ ] Response status 200

**DB check:**
```sql
SELECT 
  a.check_in_time, a.check_in_lat, a.check_in_lng,
  a.check_in_distance_meters, a.is_within_geofence,
  a.is_late, a.late_by_minutes, a.status
FROM attendance a
JOIN staff_members sm ON a.staff_id = sm.id
JOIN users u ON sm.user_id = u.id
WHERE u.email = 'staff-wh@test.com' AND a.date = CURRENT_DATE;
```
- [ ] 1 row exists for today
- [ ] `check_in_time` has timestamp
- [ ] `check_in_lat` and `check_in_lng` match what Flutter sent
- [ ] `is_within_geofence` = true (if testing from within radius)
- [ ] `status = 'present'`

**Web check (superadmin or warehouse manager):**
- [ ] Staff member appears as "Present" in today's attendance summary on staff list screen (if manager is on web — superadmin accesses attendance via reports)

**Manager Flutter check (Warehouse Manager):**
- [ ] On /warehouse/staff, staff member's attendance badge updates to "Present · [time]"

### 5B — Duplicate Check-In Rejected

**Action:** Try to check in again on the same day.

**Flutter checks:**
- [ ] Error shown: "You have already checked in today"
- [ ] Check-in button becomes disabled after first check-in

**API check:**
- [ ] `POST /api/v1/attendance/check-in` returns 409
- [ ] `code: "ALREADY_CHECKED_IN"`

**DB check:**
```sql
SELECT COUNT(*) FROM attendance
WHERE staff_id = '[STAFF_UUID]' AND date = CURRENT_DATE;
```
- [ ] Still only 1 row (no duplicate created)

### 5C — Outside Geofence Check-In

**Action:** Disable device GPS, mock a location that is definitely outside the geofence radius. Attempt check-in.

**Flutter checks:**
- [ ] Orange GPS indicator: "You are outside the work area ([X]m away)"
- [ ] Warning dialog appears before proceeding
- [ ] "Check In Anyway" option available

**If "Check In Anyway" is tapped:**

**DB check:**
```sql
SELECT is_within_geofence, check_in_distance_meters
FROM attendance
WHERE staff_id = '[STAFF_UUID]' AND date = CURRENT_DATE;
```
- [ ] `is_within_geofence = false`
- [ ] `check_in_distance_meters` shows the actual distance (greater than radius)

**Manager notification:**
```sql
SELECT type, message FROM notifications
WHERE type = 'staff_outside_geofence'
ORDER BY created_at DESC LIMIT 1;
```
- [ ] Notification exists for warehouse manager

### 5D — Staff Checks Out

**Action:** Staff taps Check Out after working hours.

**Flutter checks:**
- [ ] GPS acquired for checkout location
- [ ] Card shows "Checked out at [time]"
- [ ] Duration displayed: "Worked for Xh Ym"
- [ ] Card state: "COMPLETED"

**DB check:**
```sql
SELECT check_in_time, check_out_time,
       EXTRACT(EPOCH FROM (check_out_time - check_in_time))/3600 AS hours_worked
FROM attendance
WHERE staff_id = '[STAFF_UUID]' AND date = CURRENT_DATE;
```
- [ ] `check_out_time` populated
- [ ] Hours worked = reasonable number

### 5E — Attendance Visible on Manager's Flutter and Web

**Manager Flutter check:**
In /warehouse/staff/attendance, select today:
- [ ] Staff member appears in the list with check-in and check-out times
- [ ] Correct attendance status badge

**Attendance report screen:**
- [ ] This month's count for this staff member increments correctly

---

## SYNC TEST 6: Task Management — Manager Assigns, Staff Completes

### 6A — Manager Creates Task on Flutter

**Device:** Flutter (Warehouse Manager)

**Action:** Navigate to /warehouse/staff. Open a staff member's detail. Tap "+ New Task". Fill: Title "Sort Samsung TV shipment", Priority High, Due today. Submit.

**Flutter checks:**
- [ ] Task appears on the staff member's detail screen
- [ ] Task shows in /warehouse/staff/tasks

**API check:**
- [ ] `POST /api/v1/tasks` called with correct body
- [ ] Response status 201
- [ ] Response contains `task_code` (TSK-WH01-YYYYMMDD-0001)

**DB check:**
```sql
SELECT task_code, title, priority, status, assigned_to, assigned_by, due_date
FROM tasks ORDER BY created_at DESC LIMIT 1;
```
- [ ] All fields correct
- [ ] `status = 'pending'`
- [ ] `assigned_to` = staff member UUID
- [ ] `assigned_by` = warehouse manager UUID

**Staff Flutter notification:**
```sql
SELECT type, title, message FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE u.email = 'staff-wh@test.com'
ORDER BY n.created_at DESC LIMIT 1;
```
- [ ] Notification: "New task: Sort Samsung TV shipment. Due today."

### 6B — Staff Receives and Starts Task on Flutter

**Device:** Flutter (Staff)

**Flutter checks:**
- [ ] Notification received (bell badge)
- [ ] Task appears on staff dashboard "Today's Tasks"
- [ ] Task appears on /staff/tasks with "Pending" status

**Action:** Tap "Start Task".

**Flutter checks:**
- [ ] Status changes to "In Progress"
- [ ] "Mark Done" button appears

**DB check:**
```sql
SELECT status FROM tasks ORDER BY created_at DESC LIMIT 1;
```
- [ ] `status = 'in_progress'`

**Manager notification:**
- [ ] Warehouse manager receives "Staff started task: Sort Samsung TV shipment"

### 6C — Staff Completes Task with Note

**Action:** Staff taps "Mark Done". Adds note "Sorted and placed on shelf B3". Confirms.

**Flutter checks:**
- [ ] Task moves to Completed tab
- [ ] Green "Completed ✓" shown

**DB check:**
```sql
SELECT status, completed_at, completion_note
FROM tasks ORDER BY created_at DESC LIMIT 1;
```
- [ ] `status = 'completed'`
- [ ] `completed_at` has timestamp
- [ ] `completion_note = 'Sorted and placed on shelf B3'`

**Manager Flutter check:**
- [ ] Notification: "Ravi Kumar completed: Sort Samsung TV shipment"
- [ ] Task disappears from "Pending" tab on task management screen
- [ ] Task appears in "Completed" tab

---

## SYNC TEST 7: Offline → Online Sync

**This tests the most critical mobile reliability feature.**

### 7A — Create Order While Offline, Sync When Online

**Setup:** Turn off WiFi and mobile data on the Flutter store manager device.

**Flutter checks:**
- [ ] Connectivity banner appears: "You are offline. Actions will sync when internet returns."
- [ ] Offline queue badge shows in app bar (initially 0)

**Action:** Create an order for 3 Samsung TVs.

**Flutter checks:**
- [ ] Order creation proceeds without error
- [ ] Success feedback shown with "Will sync when online" indication
- [ ] Order appears in orders list with "Draft" status
- [ ] Offline queue badge increases to 1

**Local DB check (SQLite on device — use Flutter DevTools):**
- [ ] `local_orders` table has the new order with `sync_status = 'PENDING_UPLOAD'`
- [ ] `sync_queue` table has 1 row with `action_type = 'CREATE_ORDER'`, `status = 'PENDING'`

**Backend DB check — MUST NOT HAVE CHANGED:**
```sql
SELECT COUNT(*) FROM store_orders WHERE created_at > NOW() - INTERVAL '5 minutes';
```
- [ ] Count did NOT increase (order not on server yet)

**Action:** Turn WiFi back on.

**Flutter checks (within 30 seconds):**
- [ ] Sync triggers automatically
- [ ] Offline queue badge decreases to 0
- [ ] Order status may update if superadmin has done anything (or stays Draft)
- [ ] SnackBar: "Synced 1 action" (optional)

**Backend DB check — NOW MUST EXIST:**
```sql
SELECT order_id, status, created_at FROM store_orders
ORDER BY created_at DESC LIMIT 1;
```
- [ ] Order now exists in backend database
- [ ] `status = 'draft'`
- [ ] `order_id` matches what Flutter showed

**Idempotency check:**
Simulate the retry by submitting again with the same idempotency key (check sync_queue table for the key, resend via Postman).
```sql
SELECT idempotency_key, response_status FROM idempotency_logs
ORDER BY created_at DESC LIMIT 1;
```
- [ ] Key exists
- [ ] Backend returns the same 201 response without creating a duplicate

```sql
SELECT COUNT(*) FROM store_orders
WHERE order_id = '[THE_ORDER_ID]';
```
- [ ] Still only 1 row — not 2

### 7B — Confirm Receipt While Offline, Sync When Online

**Setup:** There is an order in "dispatched" status waiting for store confirmation. Turn off internet.

**Action:** Store manager confirms receipt on Flutter while offline.

**Flutter checks:**
- [ ] Confirmation sheet opens
- [ ] After confirming: order shows "Completed" locally
- [ ] Queue badge shows 1 pending

**Local DB check:**
- [ ] `local_orders` status = 'completed' (local optimistic update)
- [ ] `sync_queue` has row with `action_type = 'CONFIRM_RECEIPT'`, `status = 'PENDING'`

**Backend DB check (while offline):**
```sql
SELECT status FROM store_orders WHERE order_id = '[ORDER_ID]';
```
- [ ] Still `status = 'dispatched'` — backend has not been updated yet

**Action:** Turn internet on.

**Backend DB check (after sync):**
```sql
SELECT status, received_at FROM store_orders WHERE order_id = '[ORDER_ID]';
```
- [ ] `status = 'completed'`
- [ ] `received_at` populated
- [ ] Store inventory updated

**Web check (superadmin):**
- [ ] Order status on web now shows "Completed"

### 7C — Offline Check-In Syncs Correctly

**Setup:** Turn off internet on staff device. Attempt check-in.

**Flutter checks:**
- [ ] GPS still works (GPS is device-hardware, not internet)
- [ ] Check-in proceeds with offline indicator
- [ ] Queue badge shows 1 pending
- [ ] Card shows "Checked in (pending sync)"

**Local DB check:**
- [ ] `local_attendance` has today's record (local)
- [ ] `sync_queue` has `action_type = 'CHECK_IN'`

**Backend DB check (while offline):**
```sql
SELECT COUNT(*) FROM attendance WHERE date = CURRENT_DATE AND staff_id = '[STAFF_UUID]';
```
- [ ] 0 rows — not synced yet

**Action:** Turn internet on.

**Backend DB check (after sync):**
```sql
SELECT check_in_time, is_within_geofence FROM attendance
WHERE staff_id = '[STAFF_UUID]' AND date = CURRENT_DATE;
```
- [ ] Row exists with correct check_in_time (the offline time, not the sync time)
- [ ] GPS data correctly preserved

---

## SYNC TEST 8: Real-Time Dashboard Sync

**Goal:** Changes on one device appear on the other within the polling window.

### 8A — Approval on Web Appears on Flutter Within 60 Seconds

**Setup:** Have Flutter (Warehouse Manager) dashboard open and visible. Note "Orders to Pack" count.

**Action:** On web (Superadmin), approve a pending store order.

**Start timer.**

**Flutter check (without manual refresh):**
- [ ] Within 60 seconds: "Orders to Pack" KPI increases by 1
- [ ] New order appears in pack queue section

Note the actual time it took: _______ seconds

### 8B — Dispatch on Flutter Appears on Web Within 60 Seconds

**Action:** On Flutter (Warehouse Manager), dispatch a packed order.

**Start timer.**

**Web check (Superadmin at /orders/store-orders, without manual refresh):**
- [ ] Within 60 seconds: order status changes to "Dispatched"

Note the actual time: _______ seconds

### 8C — Stock Number Consistency

After each dispatch, check stock numbers simultaneously on:

| Where | Samsung TV Available Stock |
|-------|--------------------------|
| Web /inventory | |
| Flutter WH inventory | |
| Database | |

- [ ] All three show the same number

---

## SYNC TEST 9: Data Isolation — No Cross-Contamination

**Goal:** Prove that role-based data isolation works at every layer simultaneously.

### 9A — Store Cannot See Other Store's Orders

**Setup:** Create an order from Store 01. Create another order from Store 02 (use a second store manager account).

**Flutter check (logged in as Store 01 Manager):**
- [ ] /store/orders shows ONLY Store 01's orders
- [ ] Store 02 order_id never appears

**API check:**
Call `GET /api/v1/orders` using Store 01 Manager's JWT via Postman.
- [ ] Response contains only Store 01's orders
- [ ] `store_id` in every returned order = Store 01's UUID

**DB check:**
```sql
-- Simulate what the API should return for Store 01
SELECT order_id, store_id, status
FROM store_orders
WHERE store_id != '[STORE_01_UUID]';
```
- [ ] Count = number of orders from other stores
- [ ] None of these appear in the Flutter or API response for Store 01

### 9B — Warehouse Cannot See Other Warehouse's Inventory

**Setup:** Two warehouses exist. Log in as Warehouse 01 Manager.

**Flutter check:**
- [ ] /warehouse/inventory shows only WH01 products
- [ ] WH02 inventory lines not visible

**API check:**
```
GET /api/v1/inventory with Warehouse 01 Manager's JWT
```
- [ ] Every row in response has `location_id = WH01_UUID`

### 9C — Staff Cannot See Other Staff's Attendance

**Flutter check (Staff device):**
- [ ] /staff/attendance only shows this staff member's records

**API check:**
```
GET /api/v1/attendance with Staff JWT
```
- [ ] Only returns records where `staff_id` = this staff's ID
- [ ] 403 if trying to pass a different staff_id as query param

---

## SYNC TEST 10: Notification Delivery Verification

**Goal:** Every critical event triggers a notification on the correct device.

### Notification Matrix — Verify All

For each event, trigger it and verify the notification appears on the correct device within 60 seconds:

| Event | Triggered On | Notification Expected On | Expected Message |
|-------|-------------|------------------------|-----------------|
| Store order created | Flutter (Store Manager) | Web (Superadmin) | "New order request from Store 01" |
| Order approved | Web (Superadmin) | Flutter (Warehouse Manager) | "Order ready to pack: [ORDER_ID]" |
| Order dispatched | Flutter (Warehouse Manager) | Flutter (Store Manager) | "Your order is on the way. Confirm receipt." |
| Receipt confirmed | Flutter (Store Manager) | Web (Superadmin) | "Store 01 confirmed receipt of [ORDER_ID]" |
| Bulk order created | Web (Superadmin) | Flutter (Warehouse Manager) | "Bulk order for ABC Retail ready to pack" |
| Task assigned | Flutter (Warehouse Manager) | Flutter (Staff) | "New task: [title]. Due [date]." |
| Task completed | Flutter (Staff) | Flutter (Warehouse Manager) | "[Name] completed: [task title]" |
| Staff outside geofence | Flutter (Staff checking in) | Flutter (Warehouse Manager) | "[Name] checked in outside work area" |
| Low stock | Automatic (inventory drops) | Flutter (Warehouse Manager) | "Samsung TV low stock (2 units remaining)" |

**For each row:**
- [ ] Notification appears on the correct device
- [ ] Message contains correct order ID or name
- [ ] Tapping navigates to the correct screen
- [ ] Notification shows as unread (badge count)
- [ ] After tapping: notification marked as read

**DB check after all notifications:**
```sql
SELECT type, COUNT(*) FROM notifications
GROUP BY type
ORDER BY COUNT(*) DESC;
```
- [ ] All notification types have rows
- [ ] No notification type is missing

---

## SYNC TEST 11: Audit Trail — Complete and Immutable

**Goal:** Every action leaves an audit log entry. No entry can be modified.

### 11A — All Actions Logged

Count how many critical actions were taken during this entire test session. Then:

```sql
SELECT action, entity_type, actor_name, success, created_at
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '5 hours'
ORDER BY created_at ASC;
```

Check that every action taken has a corresponding log entry:
- [ ] All login events (success + failures)
- [ ] Product created
- [ ] Order created (store)
- [ ] Order approved
- [ ] Order packed
- [ ] Order dispatched
- [ ] Receipt confirmed
- [ ] Bulk order created
- [ ] Bulk order dispatched
- [ ] Stock adjustments
- [ ] Attendance check-in
- [ ] Attendance check-out
- [ ] Task created
- [ ] Task started
- [ ] Task completed

### 11B — Audit Logs Cannot Be Modified

**Attempt (in Neon console):**
```sql
UPDATE audit_logs SET details = 'tampered' WHERE id = (SELECT id FROM audit_logs ORDER BY created_at DESC LIMIT 1);
```
- [ ] Error: "This table is immutable. Records cannot be updated or deleted."

```sql
DELETE FROM audit_logs WHERE id = (SELECT id FROM audit_logs ORDER BY created_at DESC LIMIT 1);
```
- [ ] Same error

### 11C — Stock Movements Cannot Be Modified

```sql
UPDATE stock_movements SET quantity = 999 WHERE id = (SELECT id FROM stock_movements ORDER BY created_at DESC LIMIT 1);
```
- [ ] Error: immutability trigger fires

### 11D — Audit Log Visible on Web

**Web (Superadmin at /reports):**
- [ ] All audit log entries from this test session appear
- [ ] Filter by action "approve" shows only approval events
- [ ] Filter by actor shows only that user's actions
- [ ] Expand row shows before_value / after_value JSON diff
- [ ] Timestamps match what you see in the database

---

## SYNC TEST 12: Image Pipeline — End-to-End

**Goal:** Images uploaded on web appear correctly on Flutter with compression.

### 12A — Upload Image on Web, See on Flutter

**Action:** Upload a large JPG (4MB+) when creating a product on web.

**Web check after upload:**
- [ ] Image preview shows compressed/resized version
- [ ] `thumbnail_url` in API response ends in `_thumb.webp`

**DB check:**
```sql
SELECT image_url, thumbnail_url FROM products ORDER BY created_at DESC LIMIT 1;
```
- [ ] Both URLs populated with R2 CDN domain

**Flutter check (warehouse manager — inventory list):**
- [ ] After pull-to-refresh: product thumbnail loads
- [ ] Image loads from `thumbnail_url` (smaller file, faster load)
- [ ] No broken image placeholder

**File size verification:**
Open both URLs in browser DevTools → Network tab:
- [ ] Full image: significantly smaller than original (95%+ reduction from 4MB source)
- [ ] Thumbnail: under 50KB
- [ ] Both content-type: `image/webp`
- [ ] Cache-Control header present with long TTL

### 12B — Image Appears on Product Create Screen (Flutter)

**Action:** Warehouse manager taps "Add Product" on Flutter. Upload image (camera or gallery).

**Flutter checks:**
- [ ] Image picker opens
- [ ] After selecting: upload progress shows
- [ ] `POST /api/v1/upload/product-image` called
- [ ] Preview shows the compressed version after upload
- [ ] After saving: product appears in inventory with thumbnail

**Web check (superadmin — /products):**
- [ ] Product appears with correct thumbnail image

---

## SYNC TEST 13: Analytics Data Accuracy

**Goal:** Analytics charts show correct aggregated data.

### 13A — Orders Over Time Chart

**Action:** As superadmin on web at /reports/analytics, select "Today" range.

**Web check:**
- [ ] Today's bar shows the number of orders created during this test session

**DB check:**
```sql
SELECT COUNT(*) FROM store_orders WHERE created_at >= CURRENT_DATE;
SELECT COUNT(*) FROM bulk_orders WHERE created_at >= CURRENT_DATE;
```
- [ ] Store orders count matches today's store orders bar
- [ ] Bulk orders count matches today's bulk orders bar

### 13B — Inventory Health Donut

**Web check:**
- [ ] "In Stock" segment count matches:
```sql
SELECT COUNT(DISTINCT product_id) FROM inventory
WHERE total_stock - reserved_stock > 0;
```
- [ ] "Low Stock" segment matches products below threshold
- [ ] "Out of Stock" matches products with available = 0

### 13C — Top Products Chart

**Web check:**
- [ ] Samsung TV should be in the top products if ordered multiple times during testing
- [ ] Product ranked by total units ordered

**DB check:**
```sql
SELECT p.title, SUM(oi.quantity) AS total_units
FROM order_items oi
JOIN products p ON oi.product_id = p.id
GROUP BY p.title
ORDER BY total_units DESC
LIMIT 10;
```
- [ ] Top 10 products match the chart order and values

---

## SMOKE TEST — 1 Hour Version

Run these 15 checks when you need a fast go/no-go signal. Skip all database checks. Web + API + Flutter only.

| # | Check | Pass / Fail |
|---|-------|-------------|
| 1 | All 4 roles log in on correct apps and land on correct dashboards | |
| 2 | New product with image appears on both Flutter and web after refresh | |
| 3 | Store manager creates order on Flutter — appears as Draft on web immediately | |
| 4 | Superadmin approves on web — warehouse manager sees it on Flutter within 60 seconds | |
| 5 | Warehouse packs on Flutter — status updates on both apps | |
| 6 | Warehouse dispatches on Flutter — store manager sees action required banner | |
| 7 | Store confirms receipt on Flutter — order shows Completed on web | |
| 8 | Store inventory shows +5 Samsung TVs after receipt | |
| 9 | Warehouse inventory shows -5 Samsung TVs after dispatch | |
| 10 | Staff checks in on Flutter — appears Present in manager's staff list | |
| 11 | Manager assigns task on Flutter — staff receives notification | |
| 12 | Staff completes task — manager sees it completed | |
| 13 | Turn off internet on Flutter, create order, turn on — order syncs to backend | |
| 14 | Audit log on web shows all actions taken in this session | |
| 15 | All 7 notification types delivered to the correct device during this test | |

All 15 pass = system is in sync and ready for use.

---

## Common Failure Patterns and What They Mean

| Symptom | Likely Cause | Where to Look |
|---------|-------------|---------------|
| Flutter shows data that web doesn't | Flutter cache not expired / web not refreshing | Check cache TTL in Flutter, check polling interval on web |
| Web shows data Flutter doesn't | Flutter local DB not synced | Check sync_queue for PENDING items, check connectivity |
| Order status stuck on Flutter | Sync failed silently | Check sync_queue table on device, look at error_message column |
| Stock numbers differ across apps | Race condition or missed transaction | Check stock_movements for the order, verify transaction completed |
| Notification not received | Notification queue failure | Check notifications table in DB, check notification polling on app |
| Image not loading on Flutter | R2 URL wrong, CDN not configured, cache expired | Test URL directly in browser, check R2 bucket public access settings |
| GPS check-in failing | Geofence not set on location, location permission denied | Check locations table for geo_lat/geo_lng, check device permissions |
| Offline sync duplicates data | Idempotency not implemented or key not sent | Check idempotency_logs table, verify X-Idempotency-Key header in requests |
| Audit log missing entries | AuditService not called in some code paths | Check each service method — every mutation must call audit service |
| Role can access wrong routes | Auth middleware not applied to route, RLS policy missing | Check GoRouter guards, check middleware chain on API routes |

---

## Sign-Off

| Test | Status | Time Taken | Notes |
|------|--------|-----------|-------|
| Test 1: Login and Role Routing | | | |
| Test 2: Product Sync | | | |
| Test 3: Full Order Lifecycle | | | |
| Test 4: Bulk Order | | | |
| Test 5: Staff Attendance GPS | | | |
| Test 6: Task Management | | | |
| Test 7: Offline → Online Sync | | | |
| Test 8: Real-Time Dashboard | | | |
| Test 9: Data Isolation | | | |
| Test 10: Notification Delivery | | | |
| Test 11: Audit Trail | | | |
| Test 12: Image Pipeline | | | |
| Test 13: Analytics Accuracy | | | |

**All 13 tests passed:** YES / NO  
**Smoke test passed (15/15):** YES / NO  
**System ready for production:** YES / NO  
**Verified by:** _______________  
**Date:** _______________  
**Build versions tested:**  
- Flutter app version: _______________  
- Web app version (Vercel deployment): _______________  
- Backend API version: _______________  
- Database migration version: _______________
