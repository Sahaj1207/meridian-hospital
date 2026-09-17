# Meridian Hospital: Production Deployment Checklist

This checklist provides an operational guide for deploying the Meridian Hospital digital platform to production with real Supabase infrastructure.

---

## 1. Environment Configuration
- [ ] Create a dedicated Supabase production project in Asia/South (Mumbai: ap-south-1 preferred).
- [ ] Set `VITE_SUPABASE_URL` to your production Supabase project URL (e.g. `https://<project-id>.supabase.co`).
- [ ] Set `VITE_SUPABASE_ANON_KEY` to the public anonymous API key from API settings.
- [ ] Set `VITE_HOSPITAL_TIMEZONE` to `Asia/Kolkata`.
- [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` is NEVER committed to git, never placed in client `.env`, and never exposed to the frontend bundle.
- [ ] Verify `.env.example` contains placeholders only and `.env` is listed in `.gitignore`.

---

## 2. Database Migrations
Execute migrations sequentially in SQL Editor or via Supabase CLI:
1. `supabase/migrations/20260916000001_initial_schema.sql`
   - Provisions 8 core tables: departments, doctors, consultation_types, doctor_schedules, schedule_exceptions, patients, appointments, slot_holds.
   - Creates anti-double-booking unique indexes.
   - Enables Row Level Security (RLS) on all tables.
2. `supabase/migrations/20260916000002_hardening.sql`
   - Enables `btree_gist` extension.
   - Enforces GiST exclusion constraints: `no_overlapping_appointments` and `no_overlapping_active_holds`.
   - Adds `confirmation_token` column and unique lookup index.
   - Deploys hardened RLS policies evaluating `auth.jwt() -> 'app_metadata' ->> 'role'`.
   - Deploys 4 hardened SECURITY DEFINER RPCs with explicit `SET search_path = public, pg_temp`:
     - `acquire_slot_hold`
     - `book_appointment`
     - `get_sanitized_doctor_busy_intervals`
     - `get_public_appointment_confirmation`
   - Revokes PUBLIC execution and grants EXECUTE to `anon, authenticated`.

---

## 3. Row Level Security (RLS)
- [ ] Verify `departments`, `doctors`, `consultation_types`, `doctor_schedules`, `schedule_exceptions` permit public `SELECT` for active records only.
- [ ] Verify `appointments`, `patients`, `slot_holds` have zero direct `SELECT`, `INSERT`, `UPDATE`, `DELETE` grants for public/anonymous users.
- [ ] Verify all patient and appointment access for anonymous users occurs strictly through the 4 hardened RPCs.
- [ ] Verify staff users can view all operational records and update appointment statuses (`confirmed`, `completed`, `cancelled`, `no_show`).
- [ ] Verify admin users have full management control.

---

## 4. Authentication & Role Provisioning
- [ ] Roles are defined as `public`, `staff`, and `admin`.
- [ ] Authorization strictly checks `app_metadata.role` (server-managed).
- [ ] User profile `user_metadata` is completely ignored for authorization.
- [ ] Provision initial hospital administrator in Supabase Dashboard (Authentication > Users > Add User) with `{"role": "admin"}` in raw App Metadata.
- [ ] Provision clinic staff with `{"role": "staff"}` in raw App Metadata.
- [ ] Verify unconfigured production auth fails safely (`assertSupabaseEnvironment` guard).

---

## 5. Canonical Seed Data
- [ ] Run `supabase/seed.sql` to populate canonical hospital data:
  - 15 clinical departments (Cardiology, Oncology, Neurosciences, Orthopaedics, Gastroenterology, Nephrology & Urology, Women's Health, Paediatrics, Pulmonology, Internal Medicine, General Surgery, Critical Care, Emergency Medicine, Radiology & Imaging, Pathology & Laboratory Medicine).
  - 3 standard consultation formats: In-Person (30m), Follow-Up (20m), Second Opinion (45m).
  - 5 canonical specialist doctors:
    - Dr. Ananya Mehta (`dr-ananya-mehta`)
    - Dr. Vikram Oberoi (`dr-vikram-oberoi`)
    - Dr. Priya Nambiar (`dr-priya-nambiar`)
    - Dr. Siddharth Deshmukh (`dr-siddharth-deshmukh`)
    - Dr. Farida Khan (`dr-farida-khan`)
  - Canonical recurring OPD weekly schedules.
  - Initial symposium leave exception.
- [ ] Confirm zero speculative doctors or external affiliations are present.

---

## 6. Booking Concurrency & Integrity
- [ ] Double booking protection enforced authoritatively at database level via `no_overlapping_appointments` GiST exclusion constraint.
- [ ] Simultaneous slot hold conflict protection enforced via `no_overlapping_active_holds` GiST exclusion constraint.
- [ ] Slot hold expiration automatically transitions stale holds (`expires_at <= now()`) to `released`.
- [ ] Converted holds cannot be reused (`UPDATE ... status = 'converted' WHERE status = 'active'`).
- [ ] Public appointment confirmation requires unguessable 32-character hexadecimal `confirmation_token`.
- [ ] Public confirmation RPC response never leaks patient phone, email, or hold tokens.

---

## 7. Notifications
- [ ] Current notification architecture is decoupled: Event -> Intent -> Template -> Provider Adapter.
- [ ] Local simulation provider is active for development and automated testing.
- [ ] Production external delivery status: `LIVE EMAIL/SMS DELIVERY: NOT CONFIGURED` until external transactional provider (e.g. Resend, Twilio, SendGrid) credentials are integrated via backend webhook or edge function.
- [ ] Notification delivery failures must never block, cancel, or corrupt authoritative appointment booking transactions.

---

## 8. Reminder Scheduler
- [ ] Reminder evaluation engine is timezone-aware (`Asia/Kolkata`, UTC conversion).
- [ ] Default 24-hour lead time window.
- [ ] Ineligible records excluded: cancelled, completed, and no-show appointments.
- [ ] Production reminder automation requires an external cron runner (e.g. Supabase pg_cron or Edge Function scheduled invocation) invoking `evaluateDueReminders` / `processDueReminders`.

---

## 9. Operational Telemetry & Analytics
- [ ] Analytics console at `/admin` requires authenticated `staff` or `admin` role.
- [ ] Public/unauthenticated visits render institutional restricted telemetry gate.
- [ ] Demo staff switcher button is hidden in production runtime (`!isProductionEnvironment()`).
- [ ] Consolidated snapshot (`getCompleteReport`) acquires data in a single authoritative query to prevent redundant database scans.
- [ ] 24-hour peak hour analysis covers hours 00:00 through 23:00 without dropping off-hours appointments.

---

## 10. Security & Static Verification
- [ ] Strict TypeScript typecheck: `npx tsc -b` exits with code 0.
- [ ] Production bundle build: `npm run build` succeeds.
- [ ] Automated regression suite: `npm test` passes all 214 tests with zero regressions.
- [ ] Code scan: Zero occurrences of `service_role` secrets in client code.
- [ ] Secret scan: Zero private JWTs, passwords, or tokens hardcoded in source.
- [ ] Character standard: Zero em dash (`\u2014`) and zero en dash (`\u2013`) characters repository-wide.

---

## 11. Post-Deployment Smoke Test
Perform following manual smoke tests against the deployed URL:
1. **Catalog Browsing**: Navigate to `/find-care`, `/specialists`, `/departments`. Verify doctor profiles and departments render cleanly.
2. **Availability Query**: Select Dr. Ananya Mehta, pick an authentic future date, verify live consultation slots load.
3. **Slot Hold**: Click an available slot. Verify the 10-minute hold countdown timer begins.
4. **Booking Submission**: Complete patient details form with valid details and submit. Verify confirmation view renders with human-readable appointment ID (e.g. `MRD-2026-XXXXX`).
5. **Confirmation Lookup**: Navigate to `/appointment`, enter the booking reference and confirmation token. Verify sanitized appointment details load without leaking phone or email.
6. **Cancellation**: Perform cancellation using the confirmation token. Verify appointment status transitions to cancelled.
7. **Admin Gate**: Navigate to `/admin` as an unauthenticated visitor. Verify restricted access gate is rendered and operational telemetry is hidden.
8. **Invalid Route**: Navigate to `/non-existent-page`. Verify institutional 404 notice renders without raw stack traces or blank screens.
