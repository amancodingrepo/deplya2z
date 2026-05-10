# Warehouse Module — Inventory

## Screen: `wh.inventory`

### Description
Warehouse stock management view showing all variants, their availability, and movement logs.

### Layout
- **AppBar**: "Inventory — WH01".
- **Search & Filter**: Search bar for products/SKUs and filters for "Low Stock" and "Out of Stock".
- **Inventory List**: Dense list of product cards with stock breakdowns.

### Inventory Card Details
- **Accent Strip**: Color-coded by stock status (Red: Out, Amber: Low, Green: In).
- **Metadata**: Title, SKU (Monospace), Brand, Category.
- **Stock Grid**: Displays "Available", "Reserved", and "Total" units.

### Interactive Elements
- **Button: + Stock**
    - **Interaction**: Opens `WHAddStockSheet`.
- **Button: Stock Movements** (via navigation or detail)
    - **Interaction**: Navigates to `wh.stockMovements`.

### Modal Sheets
- **WHAddStockSheet**: Modal to increment stock for a specific variant.
    - Includes quantity stepper (+/-) and reason selection (e.g., "New shipment", "Return").
