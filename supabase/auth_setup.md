# MERIDIAN HOSPITAL | AUTHENTICATION & ROLE PROVISIONING

## Overview
Meridian Hospital uses Supabase Auth with server-managed claims stored in `app_metadata` to authorize administrative and staff operations.
Row Level Security (RLS) policies in PostgreSQL enforce access controls authoritatively by inspecting:
`auth.jwt() -> 'app_metadata' ->> 'role'`

---

## 1. Security Foundations

### A. Role Hierarchy
- **`admin`**: Full management control across all tables (departments, doctors, consultation types, recurring schedules, exceptions, appointments, patients, slot holds).
- **`staff`**: Operational clinic access only (read all catalog items; read and update appointments and patient records for clinic operations). Staff cannot alter departments, doctors, or doctor schedules.
- **`public`**: Unauthenticated client. Access to active catalog endpoints and availability RPCs only. Zero direct table access to appointments, patients, or slot holds.

### B. App Metadata vs User Metadata
- **`app_metadata` (Server-Managed)**: Secure claims that can only be written by the Supabase service role or Supabase Dashboard. Users cannot modify their own `app_metadata` via client APIs. This is the only valid location for authorization roles.
- **`user_metadata` (Client-Modifiable)**: User profile data that can be updated by authenticated users via `supabase.auth.updateUser()`. It must NEVER be used for authorization or role enforcement.

### C. Credential Isolation
- The browser and Vite client bundle MUST ONLY have access to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- The `SUPABASE_SERVICE_ROLE_KEY` has administrative bypass privileges and must NEVER be placed in client code, committed to source control, or exposed in `.env` files accessible by Vite.

---

## 2. Provisioning Procedures

### Option 1: Supabase Dashboard (Recommended for Initial Setup)
1. Log in to your Supabase project dashboard.
2. Navigate to **Authentication** > **Users**.
3. Click **Add User** > **Create User**.
4. Enter the user email and a secure initial password. Toggle **Auto Confirm User** to active.
5. After creation, select the user to open the details view.
6. Under **User Metadata**, locate **App Metadata** (Raw App Meta Data).
7. Set the role claim:
   - For an administrator:
     ```json
     {
       "role": "admin"
     }
     ```
   - For a clinic staff member:
     ```json
     {
       "role": "staff"
     }
     ```
8. Save changes. On subsequent logins, the user JWT will carry `app_metadata.role`.

---

### Option 2: Secure Server-Side Script (Outside Vite Bundle)
Run this script using Node.js or Deno in a secure administrative environment with the service role key.

```typescript
import { createClient } from '@supabase/supabase-js';

// Load service role key securely in backend runtime (never in browser/Vite)
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function provisionStaffUser(email: string, password: string, role: 'admin' | 'staff') {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      role: role
    }
  });

  if (error) {
    console.error('Provisioning failed:', error.message);
    return null;
  }

  console.log(`User ${data.user.email} provisioned with role: ${role}`);
  return data.user;
}
```

---

## 3. Verification Procedure

To verify that an account possesses the correct `app_metadata` claim and satisfies PostgreSQL RLS policies:

### SQL Verification in Supabase SQL Editor
Run the following query in the Supabase SQL Editor (as database administrator):

```sql
SELECT 
    id, 
    email, 
    raw_app_meta_data->>'role' AS assigned_role,
    created_at
FROM auth.users
WHERE email = 'staff.member@meridianhospital.in';
```

Expected result:
- `assigned_role` must be `'staff'` or `'admin'`.
- If `assigned_role` is null or stored in `raw_user_meta_data`, RLS policies will reject administrative requests.

### Client-Side Verification
When authenticated via `authService.signIn({ email, password })`, inspect:
```typescript
const role = await authService.getUserRole();
console.log('Active session role:', role);
```
`role` will report `'admin'` or `'staff'` derived directly from the verified session token.
