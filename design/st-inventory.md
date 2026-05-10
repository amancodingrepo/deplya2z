# Store Module — Inventory

## Screen: `st.inventory`

### Description
A localized view of the stock available at the specific store.

### Layout
- **AppBar**: "Inventory — ST01".
- **Summary Header**: A persistent top bar showing aggregate metrics: Total SKUs, Total Available, and Total Reserved units.
- **Search Bar**: Input for quickly finding local products.
- **Inventory List**: Scrollable list of products showing local stock levels.

### Inventory Card Details
- **Visuals**: Product thumbnail, name, model, color, and SKU.
- **Status Indicator**: A vertical color strip on the left edge indicating stock health (Green/Amber/Red).
- **Stock Grid**: Detailed breakdown of "Available" vs. "Reserved" units.

### Interactive Elements
- **Card Click**: Navigates to `st.productDetail` for an in-depth view of the specific product and variant.
- **Button: Request More**
    - **Action**: A shortcut that navigates the user directly to `st.orders` (the catalogue) so they can add the item to a new warehouse request.
