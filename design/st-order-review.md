# Store Module — Order Review

## Screen: `st.orderReview`

### Description
The final step before submitting a warehouse request. Allows for quantity adjustment and review.

### Layout
- **Header**: Summary of total items and units.
- **Review List**: List of added variants with product name, SKU, and price/qty.
- **Quantity Steppers**: +/- buttons to adjust unit counts for each item.

### Interactive Elements
- **Button: Submit Request** (Sticky Bottom)
    - **Interaction**: Triggers `createOrder` logic, clears the cart, and navigates to `st.myOrders`.
- **Button: Remove** (Swipe or Trash icon)
    - **Interaction**: Removes item from the request.
