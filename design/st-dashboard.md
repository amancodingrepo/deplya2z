# Store Module — Dashboard

## Screen: `st.dashboard`

### Description
The landing page for store managers. Prioritizes incoming stock alerts and low inventory warnings.

### Layout
- **Action Banner**: A prominent yellow warning banner appears when orders are "Dispatched" and awaiting confirmation.
- **KPI Grid**:
    - **Pending Orders**: Requests sent to the warehouse.
    - **Arriving Soon**: Orders packed and ready.
    - **Products**: Total catalog count.
    - **Low Stock**: Local store items needing restock.
- **Recent Orders**: Summary list of the latest warehouse requests.
- **Restock CTA**: A large primary-colored card encouraging users to browse and request products.

### Interactive Elements
- **Button: Confirm Receipt →** (in Banner)
    - **Interaction**: Navigates directly to the relevant `st.orderDetail`.
- **Button: Browse Products →**
    - **Interaction**: Navigates to `st.orders` (Product Listing).
- **Navigation**: BottomNav provides access to Products, My Orders, Local Inventory, and Home.
