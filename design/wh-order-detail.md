# Warehouse Module — Order Detail

## Screen: `wh.orderDetail`

### Description
A comprehensive view of a single order, providing full traceability and execution actions.

### Layout
- **AppBar**: Displays the Order ID in monospace font with a back button.
- **Order Info Card**: Key metadata (Store, WH, Creator, Timestamps).
- **Items Card**: List of products included in the order with SKU and quantity.
- **Timeline Card**: Vertical progress tracker showing historical and pending status steps.

### Status Timeline
Visualizes the journey of an order:
- Created → Approved → Confirmed → Packed → Dispatched → Store Received → Completed.
- Uses circles and lines; filled green/blue for completed steps, outlined for pending.

### Interactive Elements
- **Button: Mark as Packed** (Sticky Bottom)
    - **Visible**: Only when status is `confirmed`.
    - **Action**: Opens `WHPackSheet`.
- **Button: Mark as Dispatched** (Sticky Bottom)
    - **Visible**: Only when status is `packed`.
    - **Action**: Opens `WHDispatchSheet`.

### Modal Sheets
- **WHPackSheet**: Checklist modal where every item must be checked off before "Confirm Packed" becomes active.
- **WHDispatchSheet**: Confirmation modal with optional notes and destination summary.
