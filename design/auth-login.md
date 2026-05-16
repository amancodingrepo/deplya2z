# Auth Module

## Login Screen (`auth.login`)
The entry point for all users.

### Description
A high-contrast login screen with a dark blue background and a white card for credentials. Includes a role switcher for demonstration purposes.

### Layout
- **Status Bar**: White text on dark blue.
- **Logo Area**: Centralized SupplyOS logo (Hexagon icon) and tagline.
- **Login Card**: White card with "Sign in" header and input fields.

### Components
- **Input Fields**: Custom styled email and password inputs with 10px radius and blue borders.
- **Password Toggle**: Toggle icon (◑/◐) to show/hide password.
- **Role Switcher**: Segmented control to choose between "Warehouse", "Store", and "Staff" roles.

### Interactive Elements
- **Button: Sign in**
    - **Label**: "Sign in"
    - **Style**: Primary blue background, full width.
    - **Interaction**: Triggers loading state (···) and then calls `onLogin`.
- **Button: Role Selection**
    - **Labels**: "Warehouse", "Store", "Staff"
    - **Interaction**: Updates the global `tweaks.role` state.
