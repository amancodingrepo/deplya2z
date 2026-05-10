# Store Module — Product Detail

## Screen: `st.productDetail`

### Description
An immersive product view for detailed inventory inspection and variant selection.

### Layout
- **Hero Area**: Large variant-colored thumbnail with stock status pill and variant switcher dots.
- **Title Section**: Full product title, description, and metadata.
- **Variant Selectors**:
    - **Color Selector**: Horizontal chips with color swatches.
    - **Model/Size Selector**: Grid of buttons for specific models (e.g., "55-inch", "65-inch").
- **Tab Content**: Toggle between "Info", "Stock", and "History".

### Tab Details
- **Info**: Technical specs and a summary list of all available variants.
- **Stock**: Detailed breakdown of Available vs Reserved units with a progress bar visualization.
- **History**: Audit trail of stock movements specifically filtered for this product category.

### Interactive Elements
- **Button: Add to Request** (Sticky Bottom)
    - **Action**: Adds the selected variant to the cart.
- **Action Menu (⋮)**: AppBar menu for editing, transferring, or discontinuing the product.
- **Stock Actions**: "Add Stock", "Transfer", "Adjust" buttons within the Stock tab.
