-- MERIDIAN HOSPITAL
-- PostgreSQL Migration: 20260918000003_public_appointment_lifecycle_rpc.sql
-- Hardened SECURITY DEFINER RPCs for patient-facing appointment cancellation and rescheduling.
-- Mediates public lifecycle operations without granting table-level privileges to anonymous callers.

-- 1. PUBLIC CANCELLATION RPC
CREATE OR REPLACE FUNCTION public.cancel_public_appointment(
    p_appointment_id TEXT,
    p_confirmation_token TEXT,
    p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_appt RECORD;
BEGIN
    -- 1. Validate parameters
    IF p_appointment_id IS NULL OR length(trim(p_appointment_id)) < 8 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid appointment reference.',
            'error_code', 'INVALID_DATA'
        );
    END IF;

    IF p_confirmation_token IS NULL OR length(trim(p_confirmation_token)) < 16 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: valid confirmation token required for public cancellation.',
            'error_code', 'UNAUTHORIZED_APPOINTMENT_OPERATION'
        );
    END IF;

    -- 2. Fetch appointment record
    SELECT * INTO v_appt
    FROM public.appointments
    WHERE appointment_id = trim(p_appointment_id);

    -- 3. Generic authorization failure (do not disclose appointment existence)
    IF v_appt IS NULL OR v_appt.confirmation_token != trim(p_confirmation_token) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Appointment not found or confirmation credentials invalid.',
            'error_code', 'UNAUTHORIZED_APPOINTMENT_OPERATION'
        );
    END IF;

    -- 4. Enforce lifecycle transition rules
    IF v_appt.status = 'completed' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Completed appointments cannot be cancelled.',
            'error_code', 'APPOINTMENT_ALREADY_COMPLETED'
        );
    END IF;

    IF v_appt.status = 'no_show' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No-show appointments cannot be cancelled.',
            'error_code', 'APPOINTMENT_ALREADY_NO_SHOW'
        );
    END IF;

    -- Idempotent handling if already cancelled
    IF v_appt.status = 'cancelled' THEN
        RETURN jsonb_build_object(
            'success', true,
            'appointment_id', v_appt.appointment_id,
            'status', 'cancelled',
            'message', 'Appointment is already cancelled.'
        );
    END IF;

    -- 5. Atomically transition appointment status to cancelled
    UPDATE public.appointments
    SET status = 'cancelled',
        updated_at = v_now
    WHERE appointment_id = v_appt.appointment_id;

    RETURN jsonb_build_object(
        'success', true,
        'appointment_id', v_appt.appointment_id,
        'status', 'cancelled',
        'message', 'Appointment cancelled successfully.'
    );
END;
$$;

-- 2. PUBLIC RESCHEDULING RPC
CREATE OR REPLACE FUNCTION public.reschedule_public_appointment(
    p_appointment_id TEXT,
    p_confirmation_token TEXT,
    p_new_slot_start TIMESTAMPTZ,
    p_new_slot_end TIMESTAMPTZ,
    p_hold_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_orig_appt RECORD;
    v_new_appointment_id TEXT;
    v_new_confirmation_token TEXT;
    v_seq_val INTEGER;
    v_conflict_count INTEGER;
    v_hold_count INTEGER;
    v_matching_hold RECORD;
    v_duration_expected INTEGER;
    v_duration_actual INTEGER;
    v_new_record RECORD;
BEGIN
    -- 1. Validate parameters
    IF p_appointment_id IS NULL OR length(trim(p_appointment_id)) < 8 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid appointment reference.',
            'error_code', 'INVALID_DATA'
        );
    END IF;

    IF p_confirmation_token IS NULL OR length(trim(p_confirmation_token)) < 16 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: valid confirmation token required for public rescheduling.',
            'error_code', 'UNAUTHORIZED_APPOINTMENT_OPERATION'
        );
    END IF;

    IF p_new_slot_start IS NULL OR p_new_slot_end IS NULL OR p_new_slot_end <= p_new_slot_start THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid rescheduled slot time interval.',
            'error_code', 'INVALID_DATA'
        );
    END IF;

    IF p_new_slot_start < (v_now - INTERVAL '5 minutes') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot reschedule into a slot in the past.',
            'error_code', 'RESCHEDULE_SLOT_IN_PAST'
        );
    END IF;

    -- 2. Fetch original appointment
    SELECT * INTO v_orig_appt
    FROM public.appointments
    WHERE appointment_id = trim(p_appointment_id);

    -- 3. Authorization check
    IF v_orig_appt IS NULL OR v_orig_appt.confirmation_token != trim(p_confirmation_token) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Original appointment not found or confirmation credentials invalid.',
            'error_code', 'UNAUTHORIZED_APPOINTMENT_OPERATION'
        );
    END IF;

    -- 4. Lifecycle state validation
    IF v_orig_appt.status = 'completed' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Completed appointments cannot be rescheduled.',
            'error_code', 'APPOINTMENT_ALREADY_COMPLETED'
        );
    END IF;

    IF v_orig_appt.status = 'cancelled' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cancelled appointments cannot be rescheduled.',
            'error_code', 'APPOINTMENT_ALREADY_CANCELLED'
        );
    END IF;

    IF v_orig_appt.status = 'no_show' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No-show appointments cannot be rescheduled.',
            'error_code', 'APPOINTMENT_ALREADY_NO_SHOW'
        );
    END IF;

    -- 5. Duration verification
    v_duration_actual := round(EXTRACT(EPOCH FROM (p_new_slot_end - p_new_slot_start)) / 60)::INTEGER;
    SELECT duration_minutes INTO v_duration_expected
    FROM public.consultation_types
    WHERE name = v_orig_appt.consultation_type 
       OR id = v_orig_appt.consultation_type 
       OR code = v_orig_appt.consultation_type
    LIMIT 1;

    IF v_duration_expected IS NOT NULL AND v_duration_actual != v_duration_expected THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Slot duration does not match consultation type requirement.',
            'error_code', 'INVALID_SLOT_DURATION'
        );
    END IF;

    -- 6. Check for conflicting appointments (excluding the original appointment)
    SELECT COUNT(*) INTO v_conflict_count
    FROM public.appointments
    WHERE doctor_id = v_orig_appt.doctor_id
      AND id != v_orig_appt.id
      AND status != 'cancelled'
      AND appointment_start < p_new_slot_end
      AND appointment_end > p_new_slot_start;

    IF v_conflict_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Requested reschedule slot is already occupied.',
            'error_code', 'RESCHEDULE_SLOT_UNAVAILABLE'
        );
    END IF;

    -- 7. Slot hold verification
    -- Eagerly transition expired holds for this doctor
    UPDATE public.slot_holds
    SET status = 'released'
    WHERE doctor_id = v_orig_appt.doctor_id
      AND status = 'active'
      AND expires_at <= v_now;

    IF p_hold_token IS NOT NULL AND length(trim(p_hold_token)) > 0 THEN
        SELECT * INTO v_matching_hold
        FROM public.slot_holds
        WHERE hold_token = trim(p_hold_token)
          AND doctor_id = v_orig_appt.doctor_id
          AND status = 'active'
          AND expires_at > v_now
        LIMIT 1;

        IF v_matching_hold IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Slot hold has expired or is invalid.',
                'error_code', 'RESCHEDULE_SLOT_UNAVAILABLE'
            );
        END IF;

        UPDATE public.slot_holds
        SET status = 'converted'
        WHERE id = v_matching_hold.id;
    ELSE
        SELECT COUNT(*) INTO v_hold_count
        FROM public.slot_holds
        WHERE doctor_id = v_orig_appt.doctor_id
          AND status = 'active'
          AND expires_at > v_now
          AND slot_start < p_new_slot_end
          AND slot_end > p_new_slot_start;

        IF v_hold_count > 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Requested reschedule slot is currently held by another patient.',
                'error_code', 'RESCHEDULE_SLOT_UNAVAILABLE'
            );
        END IF;
    END IF;

    -- 8. Atomic transition: cancel original appointment and insert new appointment
    UPDATE public.appointments
    SET status = 'cancelled',
        updated_at = v_now
    WHERE id = v_orig_appt.id;

    v_seq_val := floor(10000 + random() * 90000)::INTEGER;
    v_new_appointment_id := 'MRD-2026-' || v_seq_val;
    v_new_confirmation_token := 'conf-' || encode(extensions.gen_random_bytes(16), 'hex');

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
        v_new_appointment_id,
        v_new_confirmation_token,
        v_orig_appt.doctor_id,
        v_orig_appt.department_id,
        v_orig_appt.consultation_type,
        p_new_slot_start,
        p_new_slot_end,
        v_orig_appt.patient_id,
        'confirmed',
        v_now,
        v_now
    )
    RETURNING * INTO v_new_record;

    RETURN jsonb_build_object(
        'success', true,
        'original_appointment_id', v_orig_appt.appointment_id,
        'new_appointment_id', v_new_appointment_id,
        'confirmation_token', v_new_confirmation_token,
        'appointment', row_to_json(v_new_record)
    );
END;
$$;

-- 3. EXPLICIT EXECUTE PRIVILEGES ON SECURITY DEFINER PROCEDURES
REVOKE ALL ON FUNCTION public.cancel_public_appointment(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_public_appointment(TEXT, TEXT, TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.reschedule_public_appointment(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reschedule_public_appointment(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon, authenticated;
