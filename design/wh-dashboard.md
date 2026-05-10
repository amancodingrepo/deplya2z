# Warehouse Module — Dashboard

## Screen: `wh.dashboard`

### Description
The operational command center for warehouse managers. Shows high-level KPIs and immediate action queues.

### Layout
- **AppBar**: Displays greeting ("Good morning, Raj") and a notification bell with a badge.
- **KPI Grid**: 2x2 grid of key performance indicators.
- **Queues**: List sections for "Pack Queue" and "Dispatch Queue".
- **Low Stock Section**: Highlights items needing replenishment.

### KPI Cards
| KPI | Color | Source |
| :--- | :--- | :--- |
| **To Pack** | Blue | Orders with `confirmed` status. |
| **Dispatch Ready** | Amber | Orders with `packed` status. |
| **Low Stock** | Red | Variants below threshold. |
| **Dispatched Today** | Green | Orders with `dispatched` or `completed` status. |

### Interactive Elements
- **Button: View all (Pack Queue)**
    - **Interaction**: Navigates to `wh.orders`.
- **Button: Pack →** (in OrderTile)
    - **Interaction**: Navigates to Pack Checklist sheet.
- **Button: Dispatch →** (in OrderTile)
    - **Interaction**: Navigates to Dispatch Confirm sheet.
- **Navigation**: BottomNav provides access to Orders, Inventory, and Staff.
