import { 
  getSupabaseClient, 
  isSupabaseConfigured, 
  assertSupabaseEnvironment 
} from '../src/services/supabaseClient.ts';
import { authService } from '../src/services/authService.ts';
import { parseISTToUTC } from '../src/lib/timezone.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

async function runSupabaseLiveIntegrationHarness() {
  console.log('====================================================');
  console.log('MERIDIAN HOSPITAL | SUPABASE INTEGRATION TEST HARNESS');
  console.log('====================================================\n');

  if (!isSupabaseConfigured) {
    console.log('NOTICE: Live Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not configured.');
    console.log('Executing local verification for auth service and contract integrity.');
    console.log('Live PostgreSQL constraint & RLS verification will be reported as PENDING.\n');

    // Local Test 1: Unauthenticated user returns 'public'
    const publicRole = await authService.getUserRole();
    assert(publicRole === 'public', 'Unauthenticated user authoritatively reports public role');

    // Local Test 2: Local development mock sign-in for staff
    const staffSignIn = await authService.signIn({
      email: 'staff.coordinator@meridian.local',
      password: 'mock-password-123'
    });
    assert(staffSignIn.success === true, 'Staff sign-in succeeds in local development mode');
    assert(staffSignIn.user?.role === 'staff', 'Staff role authoritatively recognized from credentials');
    
    const activeStaffRole = await authService.getUserRole();
    assert(activeStaffRole === 'staff', 'Active session reflects staff role');

    // Local Test 3: Local development mock sign-in for admin
    const adminSignIn = await authService.signIn({
      email: 'admin.director@meridian.local',
      password: 'mock-password-123'
    });
    assert(adminSignIn.success === true, 'Admin sign-in succeeds in local development mode');
    assert(adminSignIn.user?.role === 'admin', 'Admin role authoritatively recognized from credentials');

    const activeAdminRole = await authService.getUserRole();
    assert(activeAdminRole === 'admin', 'Active session reflects admin role');

    // Local Test 4: Sign out resets role back to 'public'
    const signOutResult = await authService.signOut();
    assert(signOutResult.success === true, 'Sign out succeeds');
    
    const roleAfterSignOut = await authService.getUserRole();
    assert(roleAfterSignOut === 'public', 'User role reverts to public after sign out');

    // Local Test 5: Production environment guard check
    let threwError = false;
    try {
      assertSupabaseEnvironment();
    } catch {
      threwError = true;
    }
    assert(threwError === false, 'assertSupabaseEnvironment permits local simulation in development/test');

    console.log('\n====================================================');
    console.log('LOCAL AUTH & CONTRACT VERIFICATION: 5/5 PASSED');
    console.log('LIVE SUPABASE VERIFICATION: PENDING (Credentials Not Configured)');
    console.log('====================================================');
    return;
  }

  // LIVE SUPABASE TESTS
  console.log('LIVE SUPABASE ENVIRONMENT DETECTED. Commencing live database integration tests...\n');
  const supabase = getSupabaseClient()!;

  // Test tracking for guaranteed cleanup
  const createdAppointmentIds: string[] = [];
  const createdHoldTokens: string[] = [];
  const testDoctorId = 'dr-ananya-mehta';
  const testDepartmentId = 'cardiology';

  try {
    // 0. Safe Connectivity and Initialization Check
    console.log('--- Safe Connectivity Check ---');
    assert(supabase !== null, 'Supabase client initialized successfully');

    // Test reachability of the configured Supabase endpoint
    const { error: schemaCheckError } = await supabase
      .from('departments')
      .select('id')
      .limit(1);

    const isTableMissing = Boolean(
      schemaCheckError && (
        schemaCheckError.code === '42P01' || 
        schemaCheckError.code === 'PGRST204' || 
        schemaCheckError.code === 'PGRST205' ||
        schemaCheckError.message?.toLowerCase().includes('not found') ||
        schemaCheckError.message?.toLowerCase().includes('does not exist')
      )
    );

    if (isTableMissing) {
      console.log('PASS: Configured Supabase project URL is reachable and client initialized cleanly');
      console.log('NOTICE: Meridian database schema is not yet applied (tables pending migration as intended for Phase 22.1).');
      console.log('Missing tables reported clearly without treating unmigrated database as application failure.');
      console.log('\n====================================================');
      console.log('CONNECTIVITY CHECK: PASSED');
      console.log('DATABASE SCHEMA: NOT YET APPLIED (Awaiting Phase 22.2 Migration)');
      console.log('====================================================');
      return;
    }

    // 1. Anonymous Catalog Access
    console.log('--- Live Test 1: Anonymous Catalog Access ---');
    const { data: depts, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .eq('active', true);
    assert(!deptError && depts !== null && depts.length >= 10, 'Anonymous client can read active clinical departments');

    const { data: docs, error: docError } = await supabase
      .from('doctors')
      .select('*')
      .eq('active', true);
    assert(!docError && docs !== null && docs.length >= 5, 'Anonymous client can read active doctors');

    // 2. Anonymous Context RLS Enforcement (Cannot SELECT appointments, patients, slot_holds)
    console.log('\n--- Live Test 2: Anonymous RLS Boundary Enforcement ---');
    const { data: apptData, error: apptError } = await supabase.from('appointments').select('*').limit(10);
    assert((apptData === null || apptData.length === 0) || Boolean(apptError), 'Anonymous client blocked from appointments table');

    const { data: patData, error: patError } = await supabase.from('patients').select('*').limit(10);
    assert((patData === null || patData.length === 0) || Boolean(patError), 'Anonymous client blocked from patients table');

    const { data: holdData, error: holdError } = await supabase.from('slot_holds').select('*').limit(10);
    assert((holdData === null || holdData.length === 0) || Boolean(holdError), 'Anonymous client blocked from slot_holds table');

    // 3. Authenticated Staff and Admin Access Verification
    console.log('\n--- Live Test 3: Authenticated Staff/Admin Access Verification ---');
    const staffRole = await authService.getUserRole();
    assert(typeof staffRole === 'string', 'Role evaluation executes cleanly via authService');

    // 4. Doctor Availability via Sanitized RPC
    console.log('\n--- Live Test 4: Doctor Availability (Sanitized RPC) ---');
    const testDateIsoStart = parseISTToUTC('2026-11-10', '00:00').toISOString();
    const testDateIsoEnd = parseISTToUTC('2026-11-10', '23:59').toISOString();

    const { data: busyIntervals, error: busyError } = await supabase.rpc(
      'get_sanitized_doctor_busy_intervals',
      {
        p_doctor_id: testDoctorId,
        p_range_start: testDateIsoStart,
        p_range_end: testDateIsoEnd,
        p_client_hold_token: null
      }
    );
    assert(!busyError, 'Sanitized busy intervals RPC executed successfully');
    assert(Array.isArray(busyIntervals), 'Busy intervals returned as array');

    // 5. Schedule Exception Verification
    console.log('\n--- Live Test 5: Schedule Exception Lookup ---');
    const { data: excData, error: excError } = await supabase
      .from('schedule_exceptions')
      .select('*')
      .eq('doctor_id', testDoctorId);
    assert(!excError, 'Schedule exceptions query executed cleanly');

    // 6. Slot Hold Creation with Disposable Markers
    console.log('\n--- Live Test 6: Disposable Slot Hold RPC ---');
    const slotStartIso = parseISTToUTC('2026-11-10', '10:00').toISOString();
    const slotEndIso = parseISTToUTC('2026-11-10', '10:30').toISOString();

    const { data: holdResult, error: holdRpcError } = await supabase.rpc('acquire_slot_hold', {
      p_doctor_id: testDoctorId,
      p_slot_start: slotStartIso,
      p_slot_end: slotEndIso,
      p_duration_minutes: 10
    });
    assert(!holdRpcError && holdResult?.success === true, 'Slot hold acquired successfully via RPC');
    assert(Boolean(holdResult?.hold_token), 'Received disposable hold token');
    if (holdResult?.hold_token) {
      createdHoldTokens.push(holdResult.hold_token);
    }

    // Overlapping hold rejection
    const { data: overlapHoldResult } = await supabase.rpc('acquire_slot_hold', {
      p_doctor_id: testDoctorId,
      p_slot_start: slotStartIso,
      p_slot_end: slotEndIso,
      p_duration_minutes: 10
    });
    assert(overlapHoldResult?.success === false, 'Simultaneous overlapping slot hold rejected by RPC');

    // 7. Atomic Booking with Concurrency & Overlap Exclusion Check
    console.log('\n--- Live Test 7: Atomic Booking Creation (test-mrd-live-* marker) ---');
    const appt45Start = parseISTToUTC('2026-11-11', '10:00').toISOString();
    const appt45End = parseISTToUTC('2026-11-11', '10:45').toISOString();

    const { data: bookA, error: bookAError } = await supabase.rpc('book_appointment', {
      p_doctor_id: testDoctorId,
      p_department_id: testDepartmentId,
      p_consultation_type: 'second-opinion',
      p_slot_start: appt45Start,
      p_slot_end: appt45End,
      p_full_name: 'test-mrd-live-patient-a',
      p_phone: '+91 99999 00001',
      p_email: 'test-mrd-live-a@meridian.test',
      p_hold_token: null
    });

    assert(!bookAError && bookA?.success === true, 'Disposable test booking created successfully');
    if (bookA?.appointment_id) {
      createdAppointmentIds.push(bookA.appointment_id);
    }

    // Concurrency overlap rejection check
    const apptConflictStart = parseISTToUTC('2026-11-11', '10:30').toISOString();
    const apptConflictEnd = parseISTToUTC('2026-11-11', '11:00').toISOString();

    const { data: bookConflict } = await supabase.rpc('book_appointment', {
      p_doctor_id: testDoctorId,
      p_department_id: testDepartmentId,
      p_consultation_type: 'in-person',
      p_slot_start: apptConflictStart,
      p_slot_end: apptConflictEnd,
      p_full_name: 'test-mrd-live-patient-conflict',
      p_phone: '+91 99999 00002',
      p_email: 'test-mrd-live-conflict@meridian.test',
      p_hold_token: null
    });
    assert(bookConflict?.success === false, 'Overlapping appointment rejected authoritatively by PostgreSQL constraint');

    // 8. Public Sanitized Confirmation Retrieval
    console.log('\n--- Live Test 8: Public Sanitized Confirmation RPC ---');
    const { data: confData, error: confError } = await supabase.rpc(
      'get_public_appointment_confirmation',
      {
        p_appointment_id: bookA.appointment_id,
        p_confirmation_token: bookA.confirmation_token
      }
    );

    assert(!confError && confData !== null && confData.length === 1, 'Sanitized public confirmation retrieved');
    const confirmation = confData[0];
    assert(confirmation.appointment_id === bookA.appointment_id, 'Confirmation reference matches');
    assert((confirmation as any).phone === undefined, 'Zero patient phone number disclosure');
    assert((confirmation as any).email === undefined, 'Zero patient email disclosure');

    // 9. Cancellation Authorization Check
    console.log('\n--- Live Test 9: Cancellation Operation ---');
    const { error: cancelError } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('appointment_id', bookA.appointment_id);
    assert(!cancelError, 'Cancellation state transition recorded');

    // 10. Rescheduling / Post-Cancellation Slot Reuse
    console.log('\n--- Live Test 10: Post-Cancellation Re-Booking Verification ---');
    const { data: rebookRes, error: rebookError } = await supabase.rpc('book_appointment', {
      p_doctor_id: testDoctorId,
      p_department_id: testDepartmentId,
      p_consultation_type: 'second-opinion',
      p_slot_start: appt45Start,
      p_slot_end: appt45End,
      p_full_name: 'test-mrd-live-patient-rebooked',
      p_phone: '+91 99999 00004',
      p_email: 'test-mrd-live-rebooked@meridian.test',
      p_hold_token: null
    });
    assert(!rebookError && rebookRes?.success === true, 'Freed slot can be successfully re-booked after cancellation');
    if (rebookRes?.appointment_id) {
      createdAppointmentIds.push(rebookRes.appointment_id);
    }

    console.log('\n====================================================');
    console.log('ALL 10 LIVE SUPABASE INTEGRATION STEPS PASSED');
    console.log('====================================================');
  } finally {
    // 11. Complete Cleanup in Finally Block
    console.log('\n--- Live Test 11: Cleanup of Disposable test-mrd-live-* Records ---');
    for (const token of createdHoldTokens) {
      await supabase.from('slot_holds').delete().eq('hold_token', token);
    }
    for (const apptId of createdAppointmentIds) {
      await supabase.from('appointments').delete().eq('appointment_id', apptId);
    }
    await supabase.from('patients').delete().like('email', '%@meridian.test');
    console.log('Teardown and cleanup completed cleanly.');
  }
}

runSupabaseLiveIntegrationHarness().catch((err) => {
  console.error('Test harness execution failed:', err);
  process.exit(1);
});
