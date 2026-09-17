export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

export type AppointmentStatus = 
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type SlotHoldStatus = 
  | 'active'
  | 'released'
  | 'converted';

export type ScheduleExceptionType = 
  | 'leave'
  | 'holiday'
  | 'modified_hours'
  | 'blocked';

export type UserRole = 
  | 'admin'
  | 'staff'
  | 'public';

export interface DbDepartment {
  id: string;
  name: string;
  slug: string;
  code: string;
  description: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DbDoctor {
  id: string;
  name: string;
  slug: string;
  department_id: string;
  designation: string;
  credentials: string;
  experience_years: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DbConsultationType {
  id: string;
  name: string;
  code: string;
  duration_minutes: number;
  description: string;
  active: boolean;
}

export interface DbDoctorSchedule {
  id: string;
  doctor_id: string;
  day_of_week: DayOfWeek;
  start_time: string; // HH:mm (24 hour format in Asia/Kolkata)
  end_time: string;   // HH:mm (24 hour format in Asia/Kolkata)
  consultation_duration: number; // in minutes (e.g. 15, 30, 45)
  active: boolean;
  created_at?: string;
}

export interface DbScheduleException {
  id: string;
  doctor_id: string;
  exception_date: string; // YYYY-MM-DD in Asia/Kolkata
  start_time?: string;    // optional for modified_hours
  end_time?: string;      // optional for modified_hours
  exception_type: ScheduleExceptionType;
  reason: string;
  created_at?: string;
}

export interface DbPatient {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  created_at?: string;
}

export interface DbAppointment {
  id: string;
  appointment_id: string; // Human readable booking reference e.g. MRD-2026-10492
  confirmation_token: string; // Unguessable token required for public booking lookup
  doctor_id: string;
  department_id: string;
  consultation_type: string;
  appointment_start: string; // ISO 8601 UTC timestamp
  appointment_end: string;   // ISO 8601 UTC timestamp
  patient_id: string;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
}

export interface DbSlotHold {
  id: string;
  doctor_id: string;
  slot_start: string; // ISO 8601 UTC timestamp
  slot_end: string;   // ISO 8601 UTC timestamp
  hold_token: string; // UUID token passed to booking confirmation
  held_at: string;    // ISO 8601 UTC timestamp
  expires_at: string; // ISO 8601 UTC timestamp (e.g. held_at + 10 minutes)
  status: SlotHoldStatus;
}
