-- MERIDIAN HOSPITAL
-- PostgreSQL Migration: 20260918000001_public_catalog_grants.sql
-- Grant explicit table-level SELECT privilege on public clinical catalog tables to anon and authenticated roles.
-- Row Level Security (RLS) remains strictly active to filter inactive records for anonymous callers.
-- Operational tables (appointments, patients, slot_holds, doctor_schedules, schedule_exceptions) receive zero public grants.

GRANT SELECT ON public.departments TO anon, authenticated;
GRANT SELECT ON public.doctors TO anon, authenticated;
GRANT SELECT ON public.consultation_types TO anon, authenticated;
