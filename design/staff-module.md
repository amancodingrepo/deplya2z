# Staff Module

## Screen: `staff.dashboard`
Personal portal for field/warehouse staff.

### Description
Focuses on "Check-in/Out" workflow using simulated GPS geofencing and task prioritization.

### Layout
- **Check-in Card**: Dynamic card that changes based on state:
    1. **Not Checked In**: Shows "Waiting for GPS".
    2. **Ready**: Shows "Within work area" and a large Amber "Check In" button.
    3. **Checked In**: Shows a timer (Hours/Mins/Secs) and a "Check Out" button.
- **Stats Row**: Cards for "This Month", "Late Days", and "Open Tasks".
- **Today's Tasks**: Quick list of tasks due today.

### Interactive Elements
- **Button: Check In / Check Out**
    - **Logic**: Simulates GPS location and updates work duration.
- **Task Tile**: Navigates to task details or allows quick completion.

## Screen: `staff.attendance`

### Description
A calendar-based view for staff to review their work history and verify attendance records.

### Layout
- **Month Selector**: Horizontal pill-style month switcher.
- **Calendar Grid**: Monthly view with status dots (Green: Present, Amber: Late, Red: Absent).
- **Day Detail**: Inline card showing specific check-in/out times for the selected date.

## Screen: `staff.tasks`

### Description
A task management board with tabbed filtering by status.

### Layout
- **Tabs**: All, Pending, In Progress, Completed.
- **Task Cards**: Include priority markers (color strips), status badges, and assignment info.

### Interactive Elements
- **Button: Start →**
    - **Action**: Moves task to "In Progress".
- **Button: Mark Done →**
    - **Action**: Opens `StaffCompleteTaskSheet` modal for final notes.

## Screen: `staff.profile`

### Description
Personal settings and performance summary.

### Layout
- **Profile Header**: Large avatar and employee details.
- **Performance Cards**: Counts for "Days Present" and "Tasks Done".
- **Settings**: Toggle for "Notifications" and "Logout" button.
