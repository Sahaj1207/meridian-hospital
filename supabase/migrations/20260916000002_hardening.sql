-- MERIDIAN HOSPITAL
-- PostgreSQL Migration: 20260916000002_hardening.sql
-- Architecture Hardening: GiST exclusion constraints, SECURITY DEFINER RPC protection,
-- atomic slot hold expiration, sanitized availability boundary, and trusted app_metadata roles.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- 2. APPOINTMENTS CONFIRMATION TOKEN
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS confirmation_token TEXT NOT NULL DEFAULT ('conf-' || encode(extensions.gen_random_bytes(16), 'hex'));

-- Index for secure appointment confirmation lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_confirmation_lookup 
ON public.appointments (appointment_id, confirmation_token);

-- 3. AUTHORITATIVE APPOINTMENT OVERLAP EXCLUSION CONSTRAINT
-- Authoritatively prevents any overlapping active appointments for the same doctor,
-- regardless of whether consultation durations are identical or different.
-- Cancelled appointments are explicitly excluded so their intervals become available again.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_appointments'
    ) THEN
        ALTER TABLE public.appointments
        ADD CONSTRAINT no_overlapping_appointments
        EXCLUDE USING gist (
            doctor_id WITH =,
            tstzrange(appointment_start, appointment_end) WITH &&
        ) WHERE (status != 'cancelled');
    END IF;
END $$;

-- 4. SLOT HOLD OVERLAP EXCLUSION CONSTRAINT
-- Prevents active slot holds from overlapping for the same doctor.
-- Expired holds are atomically marked as released before new holds are acquired.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_active_holds'
    ) THEN
        ALTER TABLE public.slot_holds
        ADD CONSTRAINT no_overlapping_active_holds
        EXCLUDE USING gist (
            doctor_id WITH =,
            tstzrange(slot_start, slot_end) WITH &&
        ) WHERE (status = 'active');
    END IF;
END $$;

-- 5. ROW LEVEL SECURITY (RLS) HARDENING
-- Drop insecure previous policies
DROP POLICY IF EXISTS "Public can view active holds for availability checks" ON public.slot_holds;
DROP POLICY IF EXISTS "Public can view appointment by booking reference" ON public.appointments;
DROP POLICY IF EXISTS "Admins have full access to all departments" ON public.departments;
DROP POLICY IF EXISTS "Admins have full access to all doctors" ON public.doctors;
DROP POLICY IF EXISTS "Admins have full access to schedules" ON public.doctor_schedules;
DROP POLICY IF EXISTS "Admins have full access to exceptions" ON public.schedule_exceptions;
DROP POLICY IF EXISTS "Admins have full access to appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins have full access to patients" ON public.patients;

-- Secure RLS: Public catalog read remains active
-- Catalog tables: Staff can read all (including inactive); Admin has complete management control.
CREATE POLICY "Staff can view all departments" 
ON public.departments FOR SELECT 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'staff'));

CREATE POLICY "Admins have full control of departments" 
ON public.departments FOR ALL 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Staff and Admins can view all doctors" 
ON public.doctors FOR SELECT 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'staff'));

CREATE POLICY "Staff and Admins can update doctors" 
ON public.doctors FOR UPDATE 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'staff'));

CREATE POLICY "Admins have full control of doctors" 
ON public.doctors FOR ALL 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Staff and Admins have full control of doctor schedules" 
ON public.doctor_schedules FOR ALL 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'staff'));

CREATE POLICY "Staff and Admins have full control of schedule exceptions" 
ON public.schedule_exceptions FOR ALL 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'staff'));

-- Operational tables: appointments and patients
-- Public has ZERO direct SELECT, INSERT, UPDATE, or DELETE on appointments and patients.
-- Access is strictly mediated via hardened SECURITY DEFINER functions.
-- Staff can view and update appointments/patients for clinic operations.
-- Admin has full control.
CREATE POLICY "Staff can view appointments" 
ON public.appointments FOR SELECT 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'staff'));

CREATE POLICY "Staff can update appointments" 
ON public.appointments FOR UPDATE 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'staff'));

CREATE POLICY "Admins have full control of appointments" 
ON public.appointments FOR ALL 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Staff can view patients" 
ON public.patients FOR SELECT 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'staff'));

CREATE POLICY "Staff can update patients" 
ON public.patients FOR UPDATE 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'staff'));

CREATE POLICY "Admins have full control of patients" 
ON public.patients FOR ALL 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Slot holds table:
-- Public has ZERO direct table access.
-- Staff and Admin can view/manage holds.
CREATE POLICY "Staff and Admin can view slot holds" 
ON public.slot_holds FOR SELECT 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'staff'));

CREATE POLICY "Staff and Admin can update slot holds" 
ON public.slot_holds FOR UPDATE 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'staff'));

CREATE POLICY "Admins have full control of slot holds" 
ON public.slot_holds FOR ALL 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 6. HARDENED TRANSACTIONAL RPC: acquire_slot_hold
CREATE OR REPLACE FUNCTION public.acquire_slot_hold(
    p_doctor_id TEXT,
    p_slot_start TIMESTAMPTZ,
    p_slot_end TIMESTAMPTZ,
    p_duration_minutes INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_expires_at TIMESTAMPTZ;
    v_token TEXT;
    v_conflict_appt_count INTEGER;
    v_conflict_hold_count INTEGER;
BEGIN
    -- Input validation
    IF p_doctor_id IS NULL OR length(trim(p_doctor_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Doctor identifier is required.');
    END IF;

    IF p_slot_start IS NULL OR p_slot_end IS NULL OR p_slot_end <= p_slot_start THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid slot time interval.');
    END IF;

    IF p_duration_minutes IS NULL OR p_duration_minutes < 1 OR p_duration_minutes > 120 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid hold duration.');
    END IF;

    IF p_slot_start < (v_now - INTERVAL '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot hold a slot in the past.');
    END IF;

    -- Eagerly transition expired holds for this doctor to released.
    -- This prevents expired holds from triggering the active exclusion constraint.
    UPDATE public.slot_holds
    SET status = 'released'
    WHERE doctor_id = p_doctor_id
      AND status = 'active'
      AND expires_at <= v_now;

    v_expires_at := v_now + (p_duration_minutes || ' minutes')::INTERVAL;
    v_token := 'hold-' || encode(extensions.gen_random_bytes(16), 'hex');

    -- 1. Check if slot overlaps any confirmed appointment
    SELECT COUNT(*) INTO v_conflict_appt_count
    FROM public.appointments
    WHERE doctor_id = p_doctor_id
      AND status != 'cancelled'
      AND appointment_start < p_slot_end
      AND appointment_end > p_slot_start;

    IF v_conflict_appt_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'This consultation slot has already been booked.');
    END IF;

    -- 2. Check if slot overlaps any active unexpired hold
    SELECT COUNT(*) INTO v_conflict_hold_count
    FROM public.slot_holds
    WHERE doctor_id = p_doctor_id
      AND status = 'active'
      AND expires_at > v_now
      AND slot_start < p_slot_end
      AND slot_end > p_slot_start;

    IF v_conflict_hold_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'This consultation slot is currently held by another patient.');
    END IF;

    -- 3. Insert temporary hold
    INSERT INTO public.slot_holds (doctor_id, slot_start, slot_end, hold_token, held_at, expires_at, status)
    VALUES (p_doctor_id, p_slot_start, p_slot_end, v_token, v_now, v_expires_at, 'active');

    RETURN jsonb_build_object(
        'success', true,
        'hold_token', v_token,
        'expires_at', v_expires_at
    );
END;
$$;

-- 7. HARDENED TRANSACTIONAL RPC: book_appointment
CREATE OR REPLACE FUNCTION public.book_appointment(
    p_doctor_id TEXT,
    p_department_id TEXT,
    p_consultation_type TEXT,
    p_slot_start TIMESTAMPTZ,
    p_slot_end TIMESTAMPTZ,
    p_full_name TEXT,
    p_phone TEXT,
    p_email TEXT,
    p_hold_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_patient_id TEXT;
    v_appointment_id TEXT;
    v_confirmation_token TEXT;
    v_seq_val INTEGER;
    v_conflict_count INTEGER;
    v_result_record RECORD;
BEGIN
    -- Input validation
    IF p_doctor_id IS NULL OR length(trim(p_doctor_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Doctor identifier is required.');
    END IF;

    IF p_department_id IS NULL OR length(trim(p_department_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Department identifier is required.');
    END IF;

    IF p_slot_start IS NULL OR p_slot_end IS NULL OR p_slot_end <= p_slot_start THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid appointment time window.');
    END IF;

    IF p_full_name IS NULL OR length(trim(p_full_name)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patient name is required.');
    END IF;

    IF p_phone IS NULL OR length(trim(p_phone)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patient phone is required.');
    END IF;

    IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patient email is required.');
    END IF;

    -- Eagerly transition expired holds for this doctor to released.
    UPDATE public.slot_holds
    SET status = 'released'
    WHERE doctor_id = p_doctor_id
      AND status = 'active'
      AND expires_at <= v_now;

    -- 1. Double booking check with time interval overlap
    SELECT COUNT(*) INTO v_conflict_count
    FROM public.appointments
    WHERE doctor_id = p_doctor_id
      AND status != 'cancelled'
      AND appointment_start < p_slot_end
      AND appointment_end > p_slot_start;

    IF v_conflict_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Slot is already booked for this specialist.',
            'error_code', 'SLOT_ALREADY_BOOKED'
        );
    END IF;

    -- 2. Verify hold token if supplied
    IF p_hold_token IS NOT NULL THEN
        UPDATE public.slot_holds
        SET status = 'converted'
        WHERE hold_token = p_hold_token
          AND doctor_id = p_doctor_id
          AND status = 'active'
          AND expires_at > v_now;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Slot hold has expired or is invalid. Please select slot again.',
                'error_code', 'SLOT_EXPIRED'
            );
        END IF;
    ELSE
        -- Ensure slot is not held by another patient
        SELECT COUNT(*) INTO v_conflict_count
        FROM public.slot_holds
        WHERE doctor_id = p_doctor_id
          AND status = 'active'
          AND expires_at > v_now
          AND slot_start < p_slot_end
          AND slot_end > p_slot_start;

        IF v_conflict_count > 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'This slot is currently being held by another patient.',
                'error_code', 'SLOT_HELD_BY_ANOTHER'
            );
        END IF;
    END IF;

    -- 3. Upsert patient record
    SELECT id INTO v_patient_id FROM public.patients WHERE email = p_email OR phone = p_phone LIMIT 1;
    IF v_patient_id IS NULL THEN
        v_patient_id := 'pat-' || substr(md5(random()::text), 1, 10);
        INSERT INTO public.patients (id, full_name, phone, email, created_at)
        VALUES (v_patient_id, p_full_name, p_phone, p_email, v_now);
    END IF;

    -- 4. Generate unique human-readable booking reference and unguessable confirmation token
    v_seq_val := floor(10000 + random() * 90000)::INTEGER;
    v_appointment_id := 'MRD-2026-' || v_seq_val;
    v_confirmation_token := 'conf-' || encode(extensions.gen_random_bytes(16), 'hex');

    -- 5. Insert appointment
    INSERT INTO public.appointments (
        appointment_id,
        confirmation_token,
        doctor_id,
        department_id,
        consultation_type,
        appointment_start,
        appointment_end,
        patient_id,
        status,
        created_at,
        updated_at
    )
    VALUES (
        v_appointment_id,
        v_confirmation_token,
        p_doctor_id,
        p_department_id,
        p_consultation_type,
        p_slot_start,
        p_slot_end,
        v_patient_id,
        'confirmed',
        v_now,
        v_now
    )
    RETURNING * INTO v_result_record;

    RETURN jsonb_build_object(
        'success', true,
        'appointment_id', v_appointment_id,
        'confirmation_token', v_confirmation_token,
        'appointment', row_to_json(v_result_record)
    );
END;
$$;

-- 8. HARDENED RPC: get_sanitized_doctor_busy_intervals
-- Returns only anonymous interval start/end and busy reason.
-- Omits all patient information, hold tokens, and internal IDs.
CREATE OR REPLACE FUNCTION public.get_sanitized_doctor_busy_intervals(
    p_doctor_id TEXT,
    p_range_start TIMESTAMPTZ,
    p_range_end TIMESTAMPTZ,
    p_client_hold_token TEXT DEFAULT NULL
)
RETURNS TABLE (
    busy_start TIMESTAMPTZ,
    busy_end TIMESTAMPTZ,
    reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    -- Eagerly transition expired holds for this doctor to released.
    UPDATE public.slot_holds
    SET status = 'released'
    WHERE doctor_id = p_doctor_id
      AND status = 'active'
      AND expires_at <= v_now;

    RETURN QUERY
    -- Confirmed active appointments
    SELECT a.appointment_start AS busy_start, a.appointment_end AS busy_end, 'booked'::TEXT AS reason
    FROM public.appointments a
    WHERE a.doctor_id = p_doctor_id
      AND a.status != 'cancelled'
      AND a.appointment_start < p_range_end
      AND a.appointment_end > p_range_start

    UNION ALL

    -- Active unexpired holds not held by the requesting caller
    SELECT h.slot_start AS busy_start, h.slot_end AS busy_end, 'held'::TEXT AS reason
    FROM public.slot_holds h
    WHERE h.doctor_id = p_doctor_id
      AND h.status = 'active'
      AND h.expires_at > v_now
      AND (p_client_hold_token IS NULL OR h.hold_token != p_client_hold_token)
      AND h.slot_start < p_range_end
      AND h.slot_end > p_range_start;
END;
$$;

-- 9. HARDENED RPC: get_public_appointment_confirmation
-- Public confirmation lookup strictly requires both appointment_id and confirmation_token.
-- Returns only sanitized operational details (no patient phone, no email, no internal IDs).
CREATE OR REPLACE FUNCTION public.get_public_appointment_confirmation(
    p_appointment_id TEXT,
    p_confirmation_token TEXT
)
RETURNS TABLE (
    appointment_id TEXT,
    doctor_id TEXT,
    doctor_name TEXT,
    department_id TEXT,
    department_name TEXT,
    consultation_type TEXT,
    appointment_start TIMESTAMPTZ,
    appointment_end TIMESTAMPTZ,
    status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_appointment_id IS NULL OR length(trim(p_appointment_id)) < 8 THEN
        RETURN;
    END IF;

    IF p_confirmation_token IS NULL OR length(trim(p_confirmation_token)) < 16 THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        a.appointment_id,
        a.doctor_id,
        doc.name AS doctor_name,
        a.department_id,
        dep.name AS department_name,
        a.consultation_type,
        a.appointment_start,
        a.appointment_end,
        a.status,
        a.created_at
    FROM public.appointments a
    JOIN public.doctors doc ON a.doctor_id = doc.id
    JOIN public.departments dep ON a.department_id = dep.id
    WHERE a.appointment_id = p_appointment_id
      AND a.confirmation_token = p_confirmation_token
    LIMIT 1;
END;
$$;

-- 10. EXPLICIT EXECUTE PRIVILEGES ON SECURITY DEFINER PROCEDURES
REVOKE ALL ON FUNCTION public.acquire_slot_hold(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acquire_slot_hold(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.book_appointment(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_appointment(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_sanitized_doctor_busy_intervals(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sanitized_doctor_busy_intervals(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_public_appointment_confirmation(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_appointment_confirmation(TEXT, TEXT) TO anon, authenticated;
