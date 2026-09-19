-- MERIDIAN HOSPITAL
-- PostgreSQL Migration: 20260918000002_operational_table_grants.sql
-- Grant explicit table-level DML privileges on operational tables to the authenticated role.
-- Row Level Security (RLS) remains strictly active to enforce staff and admin authorization boundaries.
-- The anon role receives zero grants on these operational tables, preserving anonymous isolation.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slot_holds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_exceptions TO authenticated;
