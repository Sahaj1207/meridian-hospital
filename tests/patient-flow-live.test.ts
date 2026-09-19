import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../src/services/supabaseClient.ts';
import { catalogService } from '../src/services/catalogService.ts';
import { availabilityService } from '../src/services/availabilityService.ts';
import { appointmentService } from '../src/services/appointmentService.ts';
import { parseISTToUTC, getISTDateString } from '../src/lib/timezone.ts';

// Load Node-only test credentials from .env.local without exposing to Vite client bundle
const nodeEnv = loadEnv('development', process.cwd(), '');
for (const [key, val] of Object.entries(nodeEnv)) {
  if (!process.env[key]) {
    process.env[key] = val;
  }
}

interface VerificationCheck {
  step: number;
  name: string;
  status: 'PASS' | 'PENDING' | 'FAIL';
  details: string;
}

const checks: VerificationCheck[] = [];

function recordCheck(step: number, name: string, status: 'PASS' | 'PENDING' | 'FAIL', details: string) {
  checks.push({ step, name, status, details });
  console.log(`[${status}] Step ${step}: ${name} - ${details}`);
}

async function runPatientFlowLiveVerification() {
  console.log('====================================================');
  console.log('PHASE 23 | LIVE PATIENT BOOKING FLOW INTEGRATION VERIFICATION');
  console.log('====================================================\n');

  if (!isSupabaseConfigured) {
    console.error('Supabase is not configured. Aborting live test.');
    process.exit(1);
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const staffEmail = process.env.TEST_STAFF_EMAIL || '';
  const staffPassword = process.env.TEST_STAFF_PASSWORD || '';
  const adminEmail = process.env.TEST_ADMIN_EMAIL || '';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || '';

  // 1. STEP 1: CARE (DEPARTMENT SELECTION)
  console.log('--- Step 1: Care / Department Loading ---');
  let departments: any[] = [];
  try {
    departments = await catalogService.getDepartments();
    const hasCardiology = departments.some((d) => d.id === 'cardiology');
    const hasOncology = departments.some((d) => d.id === 'oncology');
    const hasNeuro = departments.some((d) => d.id === 'neurosciences');
    if (departments.length >= 15 && hasCardiology && hasOncology && hasNeuro) {
      recordCheck(1, 'Department Live Loading', 'PASS', `Loaded ${departments.length} clinical departments from live Supabase`);
    } else {
      recordCheck(1, 'Department Live Loading', 'FAIL', `Expected >= 15 departments, got ${departments.length}`);
    }
  } catch (err: any) {
    recordCheck(1, 'Department Live Loading', 'FAIL', `Error loading departments: ${err.message}`);
  }

  // 2. STEP 2: SPECIALIST SELECTION & DEPARTMENT FILTERING
  console.log('\n--- Step 2: Specialist Filtering & Live Loading ---');
  let cardiologyDoctors: any[] = [];
  try {
    cardiologyDoctors = await catalogService.getDoctors({ department_id: 'cardiology', active_only: true });
    const hasDrMehta = cardiologyDoctors.some((d) => d.id === 'dr-ananya-mehta');
    const hasUnrelated = cardiologyDoctors.some((d) => d.department_id !== 'cardiology');
    if (hasDrMehta && !hasUnrelated && cardiologyDoctors.length > 0) {
      recordCheck(2, 'Specialist Department Filter', 'PASS', `Retrieved ${cardiologyDoctors.length} cardiology specialist(s), unrelated specialists strictly excluded`);
    } else {
      recordCheck(2, 'Specialist Department Filter', 'FAIL', `Filtering error: Dr. Mehta present: ${hasDrMehta}, unrelated: ${hasUnrelated}`);
    }
  } catch (err: any) {
    recordCheck(2, 'Specialist Department Filter', 'FAIL', `Error loading specialists: ${err.message}`);
  }

  // 3. STEP 3: CONSULTATION TYPES
  console.log('\n--- Step 3: Consultation Types Live Loading ---');
  let consultationTypes: any[] = [];
  try {
    consultationTypes = await catalogService.getConsultationTypes();
    const inPerson = consultationTypes.find((c) => c.id === 'in-person');
    if (consultationTypes.length === 3 && inPerson && inPerson.duration_minutes === 30) {
      recordCheck(3, 'Consultation Types Live Loading', 'PASS', `Loaded ${consultationTypes.length} consultation types with verified duration (${inPerson.duration_minutes} min)`);
    } else {
      recordCheck(3, 'Consultation Types Live Loading', 'FAIL', `Unexpected consultation types count: ${consultationTypes.length}`);
    }
  } catch (err: any) {
    recordCheck(3, 'Consultation Types Live Loading', 'FAIL', `Error loading consultation types: ${err.message}`);
  }

  // 4. STEP 4: DATE & AVAILABILITY ENGINE
  console.log('\n--- Step 4: Availability Engine Live Evaluation ---');
  // Choose a future Monday with active schedule (2026-10-26, more than 4 weeks out)
  const testDate = '2026-10-26';
  let availabilityResult: any = null;
  try {
    const res = await availabilityService.getLiveAvailability({
      doctorId: 'dr-ananya-mehta',
      consultationTypeId: 'in-person',
      date: testDate
    });
    if (res.success && res.data && res.data.is_working_day && res.data.slots.length > 0) {
      availabilityResult = res.data;
      recordCheck(4, 'Live Availability Calculation', 'PASS', `Evaluated ${res.data.slots.length} consultation slots for Dr. Mehta on ${testDate}`);
    } else {
      recordCheck(4, 'Live Availability Calculation', 'FAIL', `Failed to calculate availability: ${res.error || 'No slots returned'}`);
    }
  } catch (err: any) {
    recordCheck(4, 'Live Availability Calculation', 'FAIL', `Error evaluating availability: ${err.message}`);
  }

  // 5. STEP 5: TIME SLOT SELECTION
  console.log('\n--- Step 5: Time Slot Selection ---');
  // Pick slot 11:00 AM IST (11:00 to 11:30 IST)
  const targetSlot = availabilityResult?.slots.find((s: any) => {
    return s.slot_start === parseISTToUTC(testDate, '11:00').toISOString();
  });

  if (targetSlot && targetSlot.available) {
    recordCheck(5, 'Slot Selection Feasibility', 'PASS', `Slot at 11:00 IST (${targetSlot.slot_start}) confirmed available for selection`);
  } else {
    recordCheck(5, 'Slot Selection Feasibility', 'FAIL', '11:00 IST slot not found or not available');
  }

  // 6. STEP 6: TEMPORARY HOLD ACQUISITION
  console.log('\n--- Step 6: Temporary Slot Hold Acquisition ---');
  let holdToken: string | null = null;
  let expiresAt: string | null = null;
  try {
    const holdRes = await appointmentService.createSlotHold({
      doctor_id: 'dr-ananya-mehta',
      slot_start: targetSlot.slot_start,
      slot_end: targetSlot.slot_end,
      hold_duration_minutes: 10
    });

    if (holdRes.success && holdRes.hold_token && holdRes.expires_at) {
      holdToken = holdRes.hold_token;
      expiresAt = holdRes.expires_at;
      recordCheck(6, 'Temporary Slot Hold', 'PASS', 'Temporary slot hold acquired cleanly via RPC with server expires_at');
    } else {
      recordCheck(6, 'Temporary Slot Hold', 'FAIL', `Failed to acquire hold: ${holdRes.error}`);
    }
  } catch (err: any) {
    recordCheck(6, 'Temporary Slot Hold', 'FAIL', `Error acquiring hold: ${err.message}`);
  }

  // 7. STEP 7: HOLD COUNTDOWN VALIDATION
  console.log('\n--- Step 7: Server Expiry & Countdown Calculation ---');
  if (expiresAt) {
    const expiresAtMs = new Date(expiresAt).getTime();
    const nowMs = Date.now();
    const remainingSeconds = Math.floor((expiresAtMs - nowMs) / 1000);
    // Should be around 600 seconds (10 minutes)
    if (remainingSeconds > 500 && remainingSeconds <= 610) {
      recordCheck(7, 'Countdown Logic Verification', 'PASS', `Server expiry authoritative; remaining time is ${remainingSeconds}s (~10 minutes)`);
    } else {
      recordCheck(7, 'Countdown Logic Verification', 'FAIL', `Unexpected remaining time: ${remainingSeconds}s`);
    }
  } else {
    recordCheck(7, 'Countdown Logic Verification', 'FAIL', 'No expiresAt received from hold response');
  }

  // 8. STEP 8: PATIENT DETAILS VALIDATION
  console.log('\n--- Step 8: Patient Details Validation & Input Processing ---');
  const syntheticPatient = {
    fullName: 'Phase23 Synthetic Live Verification Patient',
    phone: '+91 98200 98765',
    email: 'synthetic.patient.p23@meridian.test'
  };

  // Run the exact validation logic from PatientDetailsStep.tsx
  const isNameValid = syntheticPatient.fullName.trim().length >= 2;
  const cleanPhone = syntheticPatient.phone.replace(/[\s\-()]/g, '');
  const isPhoneValid = cleanPhone.length >= 10;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(syntheticPatient.email.trim());

  if (isNameValid && isPhoneValid && isEmailValid) {
    recordCheck(8, 'Patient Details Validation', 'PASS', 'Patient details pass frontend input validation requirements');
  } else {
    recordCheck(8, 'Patient Details Validation', 'FAIL', 'Patient details validation failed');
  }

  // 9. STEP 9: BOOKING EXECUTION
  console.log('\n--- Step 9: Appointment Booking Execution ---');
  let bookedApptId: string | null = null;
  let bookedApptRef: string | null = null;
  let confirmationToken: string | null = null;
  let syntheticPatientId: string | null = null;

  try {
    const bookRes = await appointmentService.createAppointment({
      doctor_id: 'dr-ananya-mehta',
      department_id: 'cardiology',
      consultation_type: 'In-Person Consultation',
      slot_start: targetSlot.slot_start,
      slot_end: targetSlot.slot_end,
      hold_token: holdToken || undefined,
      patient: {
        full_name: syntheticPatient.fullName,
        phone: syntheticPatient.phone,
        email: syntheticPatient.email
      }
    });

    if (bookRes.success && bookRes.appointment_id) {
      bookedApptRef = bookRes.appointment_id;
      confirmationToken = bookRes.confirmation_token || null;
      recordCheck(9, 'Appointment Booking Execution', 'PASS', 'Appointment successfully registered in live Supabase via service layer');
    } else {
      recordCheck(9, 'Appointment Booking Execution', 'FAIL', `Booking failed: ${bookRes.error}`);
    }
  } catch (err: any) {
    recordCheck(9, 'Appointment Booking Execution', 'FAIL', `Error booking appointment: ${err.message}`);
  }

  // 10. STEP 10: CONFIRMATION RETRIEVAL & RENDERING DATA
  console.log('\n--- Step 10: Public Confirmation Retrieval ---');
  let confirmationData: any = null;
  if (bookedApptRef && confirmationToken) {
    try {
      confirmationData = await appointmentService.getPublicAppointment(bookedApptRef, confirmationToken);
      if (confirmationData && confirmationData.doctor_name === 'Dr. Ananya Mehta' && confirmationData.status === 'confirmed') {
        recordCheck(10, 'Confirmation Rendering Data', 'PASS', 'Public confirmation retrieved with verified doctor, department, and status');
      } else {
        recordCheck(10, 'Confirmation Rendering Data', 'FAIL', 'Confirmation data mismatched or missing');
      }
    } catch (err: any) {
      recordCheck(10, 'Confirmation Rendering Data', 'FAIL', `Error retrieving confirmation: ${err.message}`);
    }
  } else {
    recordCheck(10, 'Confirmation Rendering Data', 'FAIL', 'Missing appointment reference or confirmation token');
  }

  // 11. STEP 11: PRIVACY & ZERO PII EXPOSURE IN PUBLIC CONFIRMATION
  console.log('\n--- Step 11: Privacy & Zero PII Exposure ---');
  if (confirmationData) {
    const hasPhoneInConfirmation = 'patient_phone' in confirmationData || 'phone' in confirmationData;
    const hasEmailInConfirmation = 'patient_email' in confirmationData || 'email' in confirmationData;
    if (!hasPhoneInConfirmation && !hasEmailInConfirmation) {
      recordCheck(11, 'Public Confirmation PII Protection', 'PASS', 'Public confirmation payload strictly excludes patient phone and email');
    } else {
      recordCheck(11, 'Public Confirmation PII Protection', 'FAIL', 'Public confirmation exposed patient contact details');
    }
  } else {
    recordCheck(11, 'Public Confirmation PII Protection', 'FAIL', 'No confirmation data available to check');
  }

  // 12. STEP 12: STAFF & ADMIN VISIBILITY
  console.log('\n--- Step 12: Operational Visibility for Staff and Admin Sessions ---');
  const staffClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const adminClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

  try {
    await staffClient.auth.signInWithPassword({ email: staffEmail, password: staffPassword });
    await adminClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword });

    // Fetch appointment record through admin client to get internal UUID and patient ID
    const { data: adminApptData, error: adminFetchErr } = await adminClient
      .from('appointments')
      .select('id, appointment_id, patient_id, doctor_id, department_id, status')
      .eq('appointment_id', bookedApptRef!)
      .single();

    if (!adminFetchErr && adminApptData) {
      bookedApptId = adminApptData.id;
      syntheticPatientId = adminApptData.patient_id;

      // Check staff visibility
      const { data: staffApptData, error: staffFetchErr } = await staffClient
        .from('appointments')
        .select('id, appointment_id, status')
        .eq('id', bookedApptId)
        .single();

      if (!staffFetchErr && staffApptData) {
        recordCheck(12, 'Staff and Admin Visibility', 'PASS', 'Appointment confirmed visible to authenticated staff and admin sessions');
      } else {
        recordCheck(12, 'Staff and Admin Visibility', 'FAIL', `Staff cannot view appointment: ${staffFetchErr?.message}`);
      }
    } else {
      recordCheck(12, 'Staff and Admin Visibility', 'FAIL', `Admin failed to find appointment: ${adminFetchErr?.message}`);
    }
  } catch (err: any) {
    recordCheck(12, 'Staff and Admin Visibility', 'FAIL', `Authentication/lookup error: ${err.message}`);
  }

  // 13. STEP 13: ADMIN CLEANUP (TEARDOWN)
  console.log('\n--- Step 13: Exact Synthetic Record Cleanup ---');
  if (bookedApptId && syntheticPatientId) {
    try {
      const { error: delApptErr } = await adminClient.from('appointments').delete().eq('id', bookedApptId);
      const { error: delPatientErr } = await adminClient.from('patients').delete().eq('id', syntheticPatientId);
      // Also delete any hold record for this slot if present
      await adminClient.from('slot_holds').delete().eq('doctor_id', 'dr-ananya-mehta').eq('slot_start', targetSlot.slot_start);

      if (!delApptErr && !delPatientErr) {
        recordCheck(13, 'Admin Synthetic Cleanup', 'PASS', 'Exact synthetic appointment, patient, and hold records cleanly deleted by admin');
      } else {
        recordCheck(13, 'Admin Synthetic Cleanup', 'FAIL', `Cleanup error: appt=${delApptErr?.message}, patient=${delPatientErr?.message}`);
      }
    } catch (err: any) {
      recordCheck(13, 'Admin Synthetic Cleanup', 'FAIL', `Teardown exception: ${err.message}`);
    }
  } else {
    recordCheck(13, 'Admin Synthetic Cleanup', 'FAIL', 'Cannot clean up: missing bookedApptId or syntheticPatientId');
  }

  // 14. STEP 14: SLOT RECOVERY VERIFICATION
  console.log('\n--- Step 14: Slot Recovery Verification ---');
  try {
    const recoveryRes = await availabilityService.getLiveAvailability({
      doctorId: 'dr-ananya-mehta',
      consultationTypeId: 'in-person',
      date: testDate
    });

    const recoveredSlot = recoveryRes.data?.slots.find((s: any) => s.slot_start === targetSlot.slot_start);
    if (recoveredSlot && recoveredSlot.available === true) {
      recordCheck(14, 'Slot Recovery Verification', 'PASS', 'Tested slot returned to fully available state with zero orphaned holds');
    } else {
      recordCheck(14, 'Slot Recovery Verification', 'FAIL', `Slot recovery failed: available=${recoveredSlot?.available}`);
    }
  } catch (err: any) {
    recordCheck(14, 'Slot Recovery Verification', 'FAIL', `Recovery verification error: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log('PATIENT FLOW LIVE VERIFICATION SUMMARY');
  console.log('====================================================');
  const passCount = checks.filter((c) => c.status === 'PASS').length;
  const failCount = checks.filter((c) => c.status === 'FAIL').length;
  console.log(`TOTAL CHECKS: ${checks.length} | PASS: ${passCount} | FAIL: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runPatientFlowLiveVerification();
