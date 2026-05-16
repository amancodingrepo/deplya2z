# Store Module — My Orders

## Screen: `st.myOrders`

### Description
A filtered list view of all orders (requests) originating from the store, allowing the manager to track the status of their warehouse requests.

### Layout
- **AppBar**: "My Orders" title with a back button to the dashboard.
- **Filter Chips**: Horizontal toggle for "All", "Confirmed", "Packed", "Dispatched", and "Completed".
- **Order List**: A vertical list of summarized order cards.

### Order Card Details
- Cards represent warehouse requests.
- **Dispatched State**: Cards are highlighted with a yellow background (`#FFFBEB`) and amber border when they require the store manager's attention (Confirm Receipt).
- **Metadata**: Order ID, Status Badge, Items count, Units count, and relative time requested.

### Interactive Elements
- **Card Click**: Navigates to `st.orderDetail` to view the specific order and take action.
- **BottomNav**: Allows quick switching to Products, Inventory, or Dashboard.
