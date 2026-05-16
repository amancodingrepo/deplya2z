# Warehouse Module — Staff Management

## Screen: `wh.staff`

### Description
View for managers to track their team's attendance, status, and task load.

### Layout
- **Summary Banner**: Displays aggregate counts of "Present", "Late", and "Absent" staff.
- **Filter Chips**: All, Present, Late, Absent.
- **Staff List**: Cards showing staff avatars, roles, employee IDs, and status badges.

### Interactive Elements
- **Card Click**: Navigates to `wh.staffDetail`.
- **BottomNav**: Access to dashboard, orders, and inventory.

## Screen: `wh.staffDetail`

### Description
Deep dive into an individual staff member's performance and attendance.

### Layout
- **AppBar**: Staff name with a "+ Task" button in the right slot.
- **Profile Card**: Avatar, Emp ID, Role, and Join Date.
- **Attendance Card**: Today's timings and monthly aggregate stats (Present/Absent/Late/Leave).
- **Tasks Card**: List of currently assigned open tasks.

### Interactive Elements
- **Button: + Task**
    - **Action**: Opens `WHCreateTaskSheet`.
- **Button: Override** (Attendance)
    - **Action**: Allows manager to manually adjust check-in/out times.
