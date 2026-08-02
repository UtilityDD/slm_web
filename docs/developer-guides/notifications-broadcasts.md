# Broadcast notifications

Admin-managed announcements that appear as an in-app modal on app open/login, and as a top toast on realtime inserts.

## File map

- `src/components/Admin.jsx`
  - Admin UI for create/list/activate/deactivate/delete notices
  - Uses RPC functions (not direct table writes) for admin actions
- `src/SmartLinemanUI.jsx`
  - Loads active notifications via RPC
  - Shows startup modal with the latest active notice
  - Handles realtime updates for insert/update/delete
- `supabase/migrations/notifications_admin_rpc.sql`
  - Security definer RPCs for notifications

## Current RPC contract

Defined in `notifications_admin_rpc.sql`:

- `get_active_notifications_public()`
  - Returns active rows (`is_active = true`) ordered by latest first
  - Used by app startup fetch
- `get_notifications_admin(p_caller_id uuid)`
  - Returns notification list for admin panel
- `admin_create_notification(p_caller_id uuid, p_title text, p_message text, p_type text)`
  - Inserts a new notification with `is_active = true`
- `admin_set_notification_active(p_caller_id uuid, p_notification_id uuid, p_is_active boolean)`
  - Activate/deactivate
- `admin_delete_notification(p_caller_id uuid, p_notification_id uuid)`
  - Delete row

All admin RPCs enforce:

- caller exists in `public.profiles`
- `trim(lower(role)) = 'admin'`

## App behavior

### Startup modal

In `SmartLinemanUI.jsx`:

- On `user?.id` available:
  - force-fetch active notifications via `get_active_notifications_public()`
- If there is at least one active notice:
  - show modal with latest item once per app load session

Important:

- This is **in-app modal delivery**, not OS push notification.
- Users see it when they open/reload/login to the app.
- For closed-app prize reminders (PWA Web Push), see `docs/developer-guides/web-push-reengagement.md`.

### Realtime

- Insert active row: toast appears immediately and history updates.
- Update row:
  - if inactive -> remove from list
  - if active -> update list row
- Delete row: remove from list

Realtime requires Supabase replication enabled for `public.notifications`.

## Admin panel behavior

In `Admin.jsx`:

- "Send Notification" modal creates notice through `admin_create_notification`.
- "Broadcast notices" card lists recent notices from `get_notifications_admin`.
- Action buttons:
  - Activate/Deactivate via `admin_set_notification_active`
  - Delete via `admin_delete_notification`

If RPC is missing or permission fails, UI shows warning with migration hint.

## Setup checklist (production)

1. Run `supabase/migrations/notifications_admin_rpc.sql`.
2. Confirm `public.profiles.role` contains `admin` for admins.
3. Confirm at least one active row in `public.notifications`.
4. Confirm app env points to correct Supabase project.
5. (Optional but recommended) Enable realtime publication for `public.notifications`.

## Quick verification flow

1. Login as admin.
2. Create a notice.
3. Confirm it appears in "Broadcast notices" list.
4. Logout/login or reload as any user.
5. Confirm startup modal appears.
6. Deactivate notice as admin.
7. Reload as user; modal should no longer appear.

## Gotchas

- If admin list works but user modal does not, check that migration with `get_active_notifications_public()` is applied in the same Supabase project.
- If send button seems to do nothing, inspect RPC errors and admin role mapping in `profiles`.
- If realtime events do not show instantly but reload works, replication is likely not enabled for `notifications`.
