# Warehouse Module — Orders

## Screen: `wh.orders`

### Description
A filtered list of all orders assigned to the warehouse, categorized by type and status.

### Layout
- **Tabs**: Top toggle between "Store Orders" and "Bulk Orders".
- **Filter Chips**: Horizontal scroll of status filters (All, Confirmed, Packed, Dispatched, Completed).
- **Order List**: Vertical list of `OrderTileWH` cards.

### Components
- **OrderTileWH**:
    - Displays Order ID (Monospace), Status Badge, and summary info (Store, items, units, time).
    - Contains a contextual action button (Pack, Dispatch, or View).

### Interactive Elements
- **Tab Toggles**: Switch between Store and Bulk types.
- **Filter Chips**: Refine the list by status.
- **Card Click**: Navigates to `wh.orderDetail`.
- **Button: Pack →**
    - **Style**: Amber background.
    - **Action**: Opens Pack checklist.
- **Button: Dispatch →**
    - **Style**: Primary blue background.
    - **Action**: Opens Dispatch confirmation.
