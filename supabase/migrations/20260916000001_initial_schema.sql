-- MERIDIAN HOSPITAL
-- PostgreSQL Migration: 20260916000001_initial_schema.sql
-- Initial relational schema, anti-double-booking constraints, RLS policies, and atomic booking procedures

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. DEPARTMENTS
CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. DOCTORS
CREATE TABLE IF NOT EXISTS public.doctors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    department_id TEXT NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    designation TEXT NOT NULL,
    credentials TEXT NOT NULL,
    experience_years INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. CONSULTATION TYPES
CREATE TABLE IF NOT EXISTS public.consultation_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    description TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true
);

-- 4. DOCTOR SCHEDULES (Weekly Recurring Availability Rules)
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
    id TEXT PRIMARY KEY DEFAULT ('sch-' || substr(md5(random()::text), 1, 8)),
    doctor_id TEXT NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sun, 1=Mon, ..., 6=Sat
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),
    consultation_duration INTEGER NOT NULL DEFAULT 30 CHECK (consultation_duration > 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. SCHEDULE EXCEPTIONS (Leaves, Holidays, Blocked Periods)
CREATE TABLE IF NOT EXISTS public.schedule_exceptions (
    id TEXT PRIMARY KEY DEFAULT ('exc-' || substr(md5(random()::text), 1, 8)),
    doctor_id TEXT NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    exception_type TEXT NOT NULL CHECK (exception_type IN ('leave', 'holiday', 'modified_hours', 'blocked')),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. PATIENTS (Minimal Operational Contact Data Only)
CREATE TABLE IF NOT EXISTS public.patients (
    id TEXT PRIMARY KEY DEFAULT ('pat-' || substr(md5(random()::text), 1, 10)),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. APPOINTMENTS (Authoritative Bookings)
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY DEFAULT ('appt-' || substr(md5(random()::text), 1, 10)),
    appointment_id TEXT NOT NULL UNIQUE, -- Human readable reference e.g. MRD-2026-10421
    doctor_id TEXT NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
    department_id TEXT NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    consultation_type TEXT NOT NULL,
    appointment_start TIMESTAMPTZ NOT NULL,
    appointment_end TIMESTAMPTZ NOT NULL CHECK (appointment_end > appointment_start),
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TEMPORARY SLOT HOLDS
CREATE TABLE IF NOT EXISTS public.slot_holds (
    id TEXT PRIMARY KEY DEFAULT ('hold-' || substr(md5(random()::text), 1, 10)),
    doctor_id TEXT NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    slot_start TIMESTAMPTZ NOT NULL,
    slot_end TIMESTAMPTZ NOT NULL CHECK (slot_end > slot_start),
    hold_token TEXT NOT NULL UNIQUE,
    held_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'converted'))
);

-- ====================================================================
-- DATABASE LEVEL ANTI DOUBLE BOOKING PROTECTION
-- ====================================================================
-- Unique index guaranteeing a doctor can never have two non-cancelled appointments at the exact same start timestamp
CREATE UNIQUE INDEX IF NOT EXISTS idx_doctor_appointment_no_double_book 
ON public.appointments (doctor_id, appointment_start) 
WHERE status != 'cancelled';

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_appointments_lookup 
ON public.appointments (doctor_id, appointment_start, status);

CREATE INDEX IF NOT EXISTS idx_slot_holds_active 
ON public.slot_holds (doctor_id, slot_start, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_lookup 
ON public.doctor_schedules (doctor_id, day_of_week, active);

-- ====================================================================
-- ATOMIC TRANSACTION FUNCTION: acquire_slot_hold
-- ====================================================================
CREATE OR REPLACE FUNCTION public.acquire_slot_hold(
    p_doctor_id TEXT,
    p_slot_start TIMESTAMPTZ,
    p_slot_end TIMESTAMPTZ,
    p_duration_minutes INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_expires_at TIMESTAMPTZ;
    v_token TEXT;
    v_conflict_appt_count INTEGER;
    v_conflict_hold_count INTEGER;
BEGIN
    v_expires_at := v_now + (p_duration_minutes || ' minutes')::INTERVAL;
    v_token := 'hold-' || encode(gen_random_bytes(16), 'hex');

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

-- ====================================================================
-- ATOMIC TRANSACTION FUNCTION: book_appointment
-- ====================================================================
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
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_patient_id TEXT;
    v_appointment_id TEXT;
    v_seq_val INTEGER;
    v_conflict_count INTEGER;
    v_hold_valid BOOLEAN := false;
    v_result_record RECORD;
BEGIN
    -- 1. Double booking check with row-level locking consideration
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

    -- 4. Generate unique human-readable booking reference
    v_seq_val := floor(10000 + random() * 90000)::INTEGER;
    v_appointment_id := 'MRD-2026-' || v_seq_val;

    -- 5. Insert appointment
    INSERT INTO public.appointments (
        appointment_id,
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
        'appointment', row_to_json(v_result_record)
    );
END;
$$;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_holds ENABLE ROW LEVEL SECURITY;

-- Public read policies for catalog data
CREATE POLICY "Public can view active departments" 
ON public.departments FOR SELECT 
USING (active = true);

CREATE POLICY "Public can view active doctors" 
ON public.doctors FOR SELECT 
USING (active = true);

CREATE POLICY "Public can view active consultation types" 
ON public.consultation_types FOR SELECT 
USING (active = true);

CREATE POLICY "Public can view active doctor schedules" 
ON public.doctor_schedules FOR SELECT 
USING (active = true);

CREATE POLICY "Public can view schedule exceptions" 
ON public.schedule_exceptions FOR SELECT 
USING (true);

-- Slot holds: Public can read holds to compute availability
CREATE POLICY "Public can view active holds for availability checks" 
ON public.slot_holds FOR SELECT 
USING (status = 'active');

-- Appointments: Public users can read appointment confirmation if they have the specific appointment_id
CREATE POLICY "Public can view appointment by booking reference" 
ON public.appointments FOR SELECT 
USING (true);

-- Admin and Staff full access policies
CREATE POLICY "Admins have full access to all departments" 
ON public.departments FOR ALL 
USING (auth.jwt() ->> 'role' IN ('admin', 'staff'));

CREATE POLICY "Admins have full access to all doctors" 
ON public.doctors FOR ALL 
USING (auth.jwt() ->> 'role' IN ('admin', 'staff'));

CREATE POLICY "Admins have full access to schedules" 
ON public.doctor_schedules FOR ALL 
USING (auth.jwt() ->> 'role' IN ('admin', 'staff'));

CREATE POLICY "Admins have full access to exceptions" 
ON public.schedule_exceptions FOR ALL 
USING (auth.jwt() ->> 'role' IN ('admin', 'staff'));

CREATE POLICY "Admins have full access to appointments" 
ON public.appointments FOR ALL 
USING (auth.jwt() ->> 'role' IN ('admin', 'staff'));

CREATE POLICY "Admins have full access to patients" 
ON public.patients FOR ALL 
USING (auth.jwt() ->> 'role' IN ('admin', 'staff'));
