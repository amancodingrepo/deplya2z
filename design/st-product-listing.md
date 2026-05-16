# Store Module — Product Listing

## Screen: `st.orders` (Catalogue)

### Description
A feature-rich catalogue for store managers to browse the warehouse inventory and build restock requests.

### Layout
- **AppBar**: Contains a shopping cart icon with a variant count badge when items are added.
- **Search Bar**: Sticky search at the top.
- **Filter Chips**: Dual rows of filters for Category and Product Status.
- **Catalogue List**: Rich cards representing products and their primary variants.

### Product Card Details
- **Thumbnail**: Abstract visual generated from the variant's color. Includes an "Out of stock" overlay if applicable.
- **Status Badges**: Small chips for "Catalogue Ready", "Premium", "Sale", etc.
- **Metadata**: Title, Short Name, Brand, SKU, and a dot-row representing available color variants.
- **Stock Summary**: Displays aggregate availability across all variants.

### Interactive Elements
- **Button: + Add / View Added**
    - **Interaction**: Contextual button to add the default variant or show added count.
- **Button: ⋯ (More)**
    - **Interaction**: Opens a `BottomSheet` with actions: View Details, Add to request, Add stock, Transfer.
- **Request Bar** (Sticky Bottom)
    - **Visible**: When `totalVariants > 0`.
    - **Action**: "Review Request →" button navigating to `st.orderReview`.
