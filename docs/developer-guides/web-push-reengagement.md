# Web Push re-engagement (PWA)

Inactive users who opted into browser notifications can receive a prize reminder
while the app is closed. This is **separate** from in-app broadcast notifications.

## Safety / scope

- **New** table only: `public.push_subscriptions`
- **New** RPCs: `upsert_push_subscription`, `delete_push_subscription`
- Does **not** alter `profiles`, `notifications`, quiz/scoring tables, or existing RPCs
- Edge Function only **reads** `profiles.updated_at` and writes/deletes rows on `push_subscriptions`

## Setup checklist

1. Run migration: `supabase/migrations/20260801120000_push_subscriptions.sql` in the SQL Editor (or via CLI).
2. Generate VAPID keys (once):

   ```bash
   npx web-push generate-vapid-keys
   ```

3. Frontend (`.env.local` + hosting env):

   ```
   VITE_VAPID_PUBLIC_KEY=<public key>
   ```

4. Deploy Edge Function `send-reengagement-push` (JWT verification stays **on**;
   callers send the anon key, and the cron blast adds the `x-reengagement-secret` header):

   ```bash
   supabase functions deploy send-reengagement-push
   ```

   Set secrets:


   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (e.g. `mailto:support@smartlineman.in`)
   - `REENGAGEMENT_CRON_SECRET` (long random string)
   - `SUPABASE_SERVICE_ROLE_KEY` (usually already present)
   - `SUPABASE_URL` (usually already present)

5. GitHub Actions secrets (for daily cron):

   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `REENGAGEMENT_CRON_SECRET` (same as above)

6. Manual dry run:

   ```bash
   curl -X POST "$SUPABASE_URL/functions/v1/send-reengagement-push" \
     -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
     -H "x-reengagement-secret: $REENGAGEMENT_CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"dryRun":true,"inactiveDays":7}'
   ```

## Admin panel test

In **Admin → Manage → Push reminder test**:

1. **Enable on this device** — asks permission and saves a row in `push_subscriptions`
2. **Local preview** — shows a notification via the service worker (no server)
3. **Send real test push** — calls Edge Function `mode: admin_test` (verifies admin role; does not use cron secret; does not update `last_pushed_at`)

Optional phone field sends the real test to another user already loaded on the Team page.

**Show devices** lists that user's subscriptions with a browser/OS label, push provider host,
a short endpoint tail, and when each was added / last pushed. A subscription is per browser
**and** per origin, so `localhost` and the live site count as separate devices.

Run also:

- `supabase/migrations/20260801123000_admin_push_test_rpc.sql` — subscriber stats
- `supabase/migrations/20260801130000_admin_push_devices_rpc.sql` — device list

## Notes

- iOS Web Push requires the app installed to Home Screen (PWA).
- Users must allow notifications when prompted.
- Existing Admin “Send Notification” broadcasts remain in-app only.
