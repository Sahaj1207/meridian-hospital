-- MERIDIAN HOSPITAL
-- PostgreSQL Seed Script: seed.sql
-- Canonical departments, specialists, schedules, and consultation types

-- 1. DEPARTMENTS (15 Canonical Clinical Departments)
INSERT INTO public.departments (id, name, slug, code, description, active) VALUES
('cardiology', 'Cardiology & Cardiac Sciences', 'cardiology-cardiac-sciences', 'CARD', 'Comprehensive invasive, non-invasive, and surgical cardiovascular care including 24/7 primary angioplasty pathways.', true),
('oncology', 'Oncology', 'oncology', 'ONCO', 'Multidisciplinary tumor boards combining medical oncology, surgical oncology, and radiation planning.', true),
('neurosciences', 'Neurosciences', 'neurosciences', 'NEUR', 'Integrated neurosurgical, stroke, and clinical neurological care with dedicated neuro-intensive monitoring.', true),
('orthopaedics', 'Orthopaedics & Joint Replacement', 'orthopaedics-joint-replacement', 'ORTH', 'Computer-navigated joint reconstruction, complex trauma management, and sports medicine rehabilitation.', true),
('gastroenterology', 'Gastroenterology', 'gastroenterology', 'GAST', 'Advanced diagnostic endoscopy, therapeutic ERCP, and comprehensive clinical liver disease management.', true),
('nephrology-urology', 'Nephrology & Urology', 'nephrology-urology', 'NEPH', 'Renal replacement therapy, hemodialysis suites, and laparoscopic donor nephrectomy pathways.', true),
('womens-health', 'Women''s Health', 'womens-health', 'OBGY', 'Obstetrics, high-risk pregnancy monitoring, minimally invasive gynaecology, and preventative health screenings.', true),
('paediatrics', 'Paediatrics', 'paediatrics', 'PAED', 'Tertiary paediatric intensive care (PICU) and Level III neonatal intensive care (NICU) units.', true),
('pulmonology', 'Pulmonology', 'pulmonology', 'PULM', 'Advanced bronchoscopy, interventional pulmonology, and comprehensive chronic respiratory care.', true),
('internal-medicine', 'Internal Medicine', 'internal-medicine', 'IMED', 'Adult diagnostic medicine, multi-morbidity coordination, chronic illness protocols, and preventative checkups.', true),
('general-surgery', 'General & Minimally Invasive Surgery', 'general-surgery', 'SURG', 'Laparoscopic and open abdominal procedures, surgical wound care, and endocrine surgical interventions.', true),
('critical-care', 'Critical Care', 'critical-care', 'ICU', 'Multi-disciplinary closed intensive care unit with advanced invasive hemodynamic monitoring.', true),
('emergency-medicine', 'Emergency Medicine', 'emergency-medicine', 'EMER', 'Level 1 emergency and trauma department operating around the clock with triage protocols.', true),
('radiology-imaging', 'Radiology & Imaging', 'radiology-imaging', 'RADS', '3T MRI, dual-source cardiac CT, and interventional radiology suites operating round the clock.', true),
('pathology-laboratory', 'Pathology & Laboratory Medicine', 'pathology-laboratory-medicine', 'PATH', 'Automated core clinical biochemistry, hematology, clinical microbiology, and histopathology diagnostics.', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    code = EXCLUDED.code,
    description = EXCLUDED.description,
    active = EXCLUDED.active;

-- 2. CONSULTATION TYPES
INSERT INTO public.consultation_types (id, name, code, duration_minutes, description, active) VALUES
('in-person', 'In-Person Consultation', 'IN_PERSON', 30, 'Comprehensive face-to-face consultation at the Lower Parel clinic suite.', true),
('follow-up', 'Follow-Up Review', 'FOLLOW_UP', 20, 'Review of diagnostic tests, medication titration, and recovery progress.', true),
('second-opinion', 'Second Opinion / Complex Case Review', 'SECOND_OPINION', 45, 'Detailed multi-disciplinary review of past surgical or interventional recommendations.', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    duration_minutes = EXCLUDED.duration_minutes,
    description = EXCLUDED.description;

-- 3. CANONICAL SPECIALISTS (5 Canonical Doctors)
INSERT INTO public.doctors (id, name, slug, department_id, designation, credentials, experience_years, active) VALUES
('dr-ananya-mehta', 'Dr. Ananya Mehta', 'dr-ananya-mehta', 'cardiology', 'Medical Director & Senior Consultant, Interventional Cardiology', 'MD (Medicine), DM (Cardiology), FACC', 22, true),
('dr-vikram-oberoi', 'Dr. Vikram Oberoi', 'dr-vikram-oberoi', 'oncology', 'Director, Surgical Oncology', 'MS (General Surgery), MCh (Surgical Oncology)', 20, true),
('dr-priya-nambiar', 'Dr. Priya Nambiar', 'dr-priya-nambiar', 'critical-care', 'Head of Critical Care Medicine', 'MD (Anesthesiology), EDIC, FCCP', 18, true),
('dr-siddharth-deshmukh', 'Dr. Siddharth Deshmukh', 'dr-siddharth-deshmukh', 'orthopaedics', 'Senior Consultant, Joint Reconstruction & Orthopaedics', 'MS (Orthopaedics), MCh (Orthopaedics), Fellowship (Adult Reconstruction)', 19, true),
('dr-farida-khan', 'Dr. Farida Khan', 'dr-farida-khan', 'neurosciences', 'Senior Consultant, Clinical Neurosciences', 'MD (General Medicine), DM (Neurology)', 16, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    department_id = EXCLUDED.department_id,
    designation = EXCLUDED.designation,
    credentials = EXCLUDED.credentials,
    experience_years = EXCLUDED.experience_years,
    active = EXCLUDED.active;

-- 4. WEEKLY RECURRING SCHEDULES (OPD Clinic Hours in Asia/Kolkata)
INSERT INTO public.doctor_schedules (id, doctor_id, day_of_week, start_time, end_time, consultation_duration, active) VALUES
('sch-ananya-mon', 'dr-ananya-mehta', 1, '10:00:00', '14:00:00', 30, true),
('sch-ananya-wed', 'dr-ananya-mehta', 3, '10:00:00', '14:00:00', 30, true),
('sch-ananya-fri', 'dr-ananya-mehta', 5, '10:00:00', '14:00:00', 30, true),

('sch-vikram-tue', 'dr-vikram-oberoi', 2, '11:00:00', '15:00:00', 45, true),
('sch-vikram-thu', 'dr-vikram-oberoi', 4, '11:00:00', '15:00:00', 45, true),

('sch-siddharth-mon', 'dr-siddharth-deshmukh', 1, '09:00:00', '13:00:00', 30, true),
('sch-siddharth-thu', 'dr-siddharth-deshmukh', 4, '09:00:00', '13:00:00', 30, true),
('sch-siddharth-sat', 'dr-siddharth-deshmukh', 6, '09:00:00', '13:00:00', 30, true),

('sch-farida-tue', 'dr-farida-khan', 2, '14:00:00', '18:00:00', 30, true),
('sch-farida-wed', 'dr-farida-khan', 3, '14:00:00', '18:00:00', 30, true),
('sch-farida-fri', 'dr-farida-khan', 5, '14:00:00', '18:00:00', 30, true)
ON CONFLICT (id) DO UPDATE SET
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    consultation_duration = EXCLUDED.consultation_duration;

-- 5. INITIAL SCHEDULE EXCEPTION
INSERT INTO public.schedule_exceptions (id, doctor_id, exception_date, start_time, end_time, exception_type, reason) VALUES
('exc-ananya-symposium', 'dr-ananya-mehta', '2026-10-14', NULL, NULL, 'leave', 'National Cardiology Academic Symposium')
ON CONFLICT (id) DO NOTHING;
