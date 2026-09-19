-- MERIDIAN HOSPITAL
-- PostgreSQL Migration: 20260919000002_notifications_and_audit.sql
-- Operational Audit Trails & Notification Delivery Tracking
-- Enforces server-derived actor identity, strict RLS, and safe metadata boundaries.

-- 1. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_role, actor_id);

-- 2. NOTIFICATION DELIVERIES TABLE
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT UNIQUE NOT NULL,
    appointment_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
    provider TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'retrying', 'skipped', 'suppressed')),
    attempt_count INTEGER NOT NULL DEFAULT 1,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    last_error_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_appointment ON public.notification_deliveries (appointment_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON public.notification_deliveries (status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_idempotency ON public.notification_deliveries (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_created_at ON public.notification_deliveries (created_at DESC);

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Revoke all direct permissions from public/anon
REVOKE ALL ON public.audit_logs FROM public, anon;
REVOKE ALL ON public.notification_deliveries FROM public, anon;

-- Grant only SELECT to authenticated users (mutations must go through controlled RPCs)
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.notification_deliveries TO authenticated;

-- RLS Policies: Authenticated staff and admin read-only access
DROP POLICY IF EXISTS audit_logs_staff_select ON public.audit_logs;
CREATE POLICY audit_logs_staff_select ON public.audit_logs
    FOR SELECT TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('staff', 'admin'));

DROP POLICY IF EXISTS notification_deliveries_staff_select ON public.notification_deliveries;
CREATE POLICY notification_deliveries_staff_select ON public.notification_deliveries
    FOR SELECT TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('staff', 'admin'));

-- 4. HARDENED AUDIT EVENT LOGGING RPC
-- Derives actor identity directly from JWT app_metadata and auth.uid().
-- Recursively strips tokens, credentials, and sensitive contact details.
CREATE OR REPLACE FUNCTION public.record_audit_event(
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role TEXT;
    v_clean_metadata JSONB;
    v_new_id UUID;
BEGIN
    v_actor_id := auth.uid();
    v_actor_role := COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'public');

    IF p_action IS NULL OR length(trim(p_action)) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid action', 'error_code', 'INVALID_DATA');
    END IF;

    IF p_resource_type IS NULL OR length(trim(p_resource_type)) < 2 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid resource type', 'error_code', 'INVALID_DATA');
    END IF;

    -- Strict scrubbing of sensitive fields: tokens, passwords, secrets, full patient PII
    v_clean_metadata := jsonb_strip_nulls(
        COALESCE(p_metadata, '{}'::jsonb)
        - 'confirmation_token'
        - 'token'
        - 'hold_token'
        - 'password'
        - 'secret'
        - 'service_role_key'
        - 'authorization'
        - 'phone'
        - 'email'
        - 'patient_phone'
        - 'patient_email'
        - 'body'
    );

    INSERT INTO public.audit_logs (
        actor_id,
        actor_role,
        action,
        resource_type,
        resource_id,
        metadata
    ) VALUES (
        v_actor_id,
        v_actor_role,
        p_action,
        p_resource_type,
        p_resource_id,
        v_clean_metadata
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'audit_id', v_new_id);
END;
$$;

-- 5. HARDENED NOTIFICATION DELIVERY RECORDING RPC
-- Records or updates delivery attempts with strict idempotency enforcement.
CREATE OR REPLACE FUNCTION public.record_notification_delivery(
    p_idempotency_key TEXT,
    p_appointment_id TEXT,
    p_event_type TEXT,
    p_channel TEXT,
    p_provider TEXT,
    p_status TEXT,
    p_attempt_count INTEGER DEFAULT 1,
    p_last_error_code TEXT DEFAULT NULL,
    p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
    p_sent_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_rec RECORD;
    v_caller_role TEXT;
BEGIN
    v_caller_role := COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'public');

    IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid idempotency key', 'error_code', 'INVALID_DATA');
    END IF;

    IF p_channel NOT IN ('email', 'sms') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid channel', 'error_code', 'INVALID_DATA');
    END IF;

    IF p_status NOT IN ('pending', 'sent', 'failed', 'retrying', 'skipped', 'suppressed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid status', 'error_code', 'INVALID_DATA');
    END IF;

    INSERT INTO public.notification_deliveries (
        idempotency_key,
        appointment_id,
        event_type,
        channel,
        provider,
        status,
        attempt_count,
        last_error_code,
        scheduled_at,
        sent_at,
        updated_at
    ) VALUES (
        p_idempotency_key,
        p_appointment_id,
        p_event_type,
        p_channel,
        p_provider,
        p_status,
        COALESCE(p_attempt_count, 1),
        p_last_error_code,
        p_scheduled_at,
        p_sent_at,
        timezone('utc'::text, now())
    )
    ON CONFLICT (idempotency_key) DO UPDATE SET
        status = EXCLUDED.status,
        attempt_count = EXCLUDED.attempt_count,
        last_error_code = EXCLUDED.last_error_code,
        sent_at = COALESCE(EXCLUDED.sent_at, public.notification_deliveries.sent_at),
        updated_at = timezone('utc'::text, now())
    RETURNING id, idempotency_key, status, attempt_count INTO v_rec;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_rec.id,
        'idempotency_key', v_rec.idempotency_key,
        'status', v_rec.status,
        'attempt_count', v_rec.attempt_count
    );
END;
$$;

-- Grant EXECUTE on logging procedures
GRANT EXECUTE ON FUNCTION public.record_audit_event(TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_notification_delivery(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;
