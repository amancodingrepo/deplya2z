# Store Module — Order Detail

## Screen: `st.orderDetail`

### Description
The detail view of a specific warehouse request. This screen is critical for the store manager to confirm receipt of dispatched goods.

### Layout
- **AppBar**: Shows the Monospace Order ID and a back button.
- **Summary Card**: Details the source (WH), destination (Store), total items, and request time.
- **Items Card**: A breakdown of the individual items in the order, displaying product name, SKU, thumbnail, and quantity.
- **Action Bar (Sticky Bottom)**: Only appears when the order is in the `dispatched` state.

### Interactive Elements
- **Button: Confirm Receipt ✓**
    - **Visible**: Only when the order status is `dispatched`.
    - **Style**: Full-width green button at the bottom of the screen.
    - **Action**: Opens the `STConfirmReceiptSheet` modal.

## Modal: `STConfirmReceiptSheet`

### Description
A checklist modal ensuring the store manager verifies all items before finalizing the receipt.

### Interactive Elements
- **Item Checklist**: Each item row can be tapped to toggle a green checkmark.
- **Button: Confirm Receipt**
    - **State**: Disabled (grey) until all items are checked. Once all items are checked, it turns green.
    - **Action**: Simulates a network request, updates the order status to `completed`, closes the modal, and navigates back to `st.myOrders`.
