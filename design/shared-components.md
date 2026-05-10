# Shared Components

SupplyOS uses a set of consistent shared components across all screens.

## AppBar
The standard header for all screens.
- **Props**: `title`, `onBack`, `right` (element), `mono` (boolean), `subtitle`, `bg`.
- **Layout**: Fixed height (56px), background (usually white).
- **Buttons**:
    - **Back Button**: Left-aligned, uses `‹` icon.
    - **Right Action**: Custom slot for buttons, avatars, or icons.

## BottomNav
The main navigation bar for each role.
- **Role Variants**: `wh` (Warehouse), `st` (Store), `staff` (Staff).
- **Tabs**: 4 icons per role with labels.
- **Interactions**: Navigates to main module screens. Highlighting indicates the active screen.

## Card
General-purpose container for content.
- **Props**: `children`, `style`, `onClick`, `pad` (boolean).
- **Aesthetics**: White background, 12px border radius, subtle shadow.

## BottomSheet
Slide-up panel for actions and confirmations.
- **Props**: `open`, `onClose`, `title`, `subtitle`, `children`.
- **Aesthetics**: 20px top border radius, backdrop overlay, slide animation.

## StatusBadge
Contextual badge for displaying statuses.
- **Mapping**: uses `STATUS_MAP`.
- **States**: `draft`, `confirmed`, `packed`, `dispatched`, `completed`, `pending`, `in_stock`, `low_stock`, `out_stock`, `present`, `absent`, etc.

## Avatar
User identity component.
- **Logic**: Generates initials from name and a deterministic background color.
- **Props**: `name`, `size`.

## SearchBar
Input field for filtering lists.
- **Props**: `placeholder`.
- **Aesthetics**: Grey background, rounded corners (10px), search icon.
