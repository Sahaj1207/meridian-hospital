import type { 
  DbDoctor, 
  DbDepartment, 
  DbPatient, 
  DbAppointment, 
  AppointmentStatus,
  DbDoctorSchedule,
  DbScheduleException,
  DayOfWeek,
  ScheduleExceptionType
} from './database';

export interface CalculatedSlot {
  slot_start: string; // ISO 8601 UTC timestamp
  slot_end: string;   // ISO 8601 UTC timestamp
  ist_time: string;   // Formatted time in Asia/Kolkata (e.g. "10:30 AM")
  ist_date: string;   // Formatted date in Asia/Kolkata (e.g. "2026-09-20")
  duration_minutes: number;
  available: boolean;
  unavailability_reason?: 'booked' | 'held' | 'exception' | 'passed';
}

export interface DayAvailability {
  doctor_id: string;
  date: string; // YYYY-MM-DD in Asia/Kolkata
  day_of_week: number;
  is_working_day: boolean;
  exception_reason?: string;
  slots: CalculatedSlot[];
}

export type SlotHoldErrorCode =
  | 'DOCTOR_NOT_FOUND'
  | 'CONSULTATION_TYPE_NOT_FOUND'
  | 'DOCTOR_INACTIVE'
  | 'INVALID_SLOT_DURATION'
  | 'PAST_SLOT'
  | 'DOCTOR_NOT_WORKING'
  | 'EXCEPTION_BLOCKED'
  | 'SLOT_ALREADY_BOOKED'
  | 'SLOT_HELD_BY_ANOTHER'
  | 'INVALID_DATA'
  | 'DATABASE_ERROR'
  | 'CONFIGURATION_ERROR';

export interface SlotHoldRequest {
  doctor_id: string;
  slot_start: string; // ISO 8601 UTC
  slot_end: string;   // ISO 8601 UTC
  hold_duration_minutes?: number; // default 10 minutes
  consultation_type_id?: string;  // optional for scheduling/booking pre-validation
  currentTimeUtc?: Date;          // optional deterministic clock injection
}

export interface SlotHoldResult {
  success: boolean;
  hold_token?: string;
  expires_at?: string;
  error?: string;
  error_code?: SlotHoldErrorCode;
}

export interface CreateBookingRequest {
  hold_token?: string;
  doctor_id: string;
  department_id: string;
  consultation_type: string;
  slot_start: string; // ISO 8601 UTC
  slot_end: string;   // ISO 8601 UTC
  patient: {
    full_name: string;
    phone: string;
    email: string;
  };
  initial_status?: AppointmentStatus; // default 'confirmed'
}

export interface BookingResult {
  success: boolean;
  appointment_id?: string;
  confirmation_token?: string;
  appointment?: DbAppointment & {
    doctor?: DbDoctor;
    department?: DbDepartment;
    patient?: DbPatient;
  };
  error?: string;
  error_code?: 'SLOT_ALREADY_BOOKED' | 'SLOT_HELD_BY_ANOTHER' | 'SLOT_EXPIRED' | 'INVALID_DATA' | 'INTERNAL_ERROR';
}

export interface AppointmentFilter {
  doctor_id?: string;
  department_id?: string;
  status?: AppointmentStatus;
  date_from?: string; // ISO 8601 UTC
  date_to?: string;   // ISO 8601 UTC
  search_query?: string;
}

export interface SanitizedBusyInterval {
  busy_start: string; // ISO 8601 UTC timestamp
  busy_end: string;   // ISO 8601 UTC timestamp
  reason: 'booked' | 'held';
}

export interface PublicAppointmentConfirmation {
  appointment_id: string;
  doctor_id: string;
  doctor_name: string;
  department_id: string;
  department_name: string;
  consultation_type: string;
  appointment_start: string; // ISO 8601 UTC timestamp
  appointment_end: string;   // ISO 8601 UTC timestamp
  status: AppointmentStatus;
  created_at: string;
}

export type PublicAppointmentView = PublicAppointmentConfirmation;

export interface StaffAppointmentView {
  id: string;
  appointment_id: string;
  doctor_id: string;
  doctor_name: string;
  department_id: string;
  department_name: string;
  consultation_type: string;
  appointment_start: string; // ISO 8601 UTC timestamp
  appointment_end: string;   // ISO 8601 UTC timestamp
  patient_name: string;
  patient_phone: string;
  patient_email: string;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
}

export interface StaffPatientView {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  created_at?: string;
  total_appointments: number;
  recent_appointments: StaffAppointmentView[];
}

export type AppointmentManagementErrorCode =
  | 'APPOINTMENT_NOT_FOUND'
  | 'INVALID_APPOINTMENT_STATUS'
  | 'INVALID_STATUS_TRANSITION'
  | 'APPOINTMENT_ALREADY_CANCELLED'
  | 'APPOINTMENT_ALREADY_COMPLETED'
  | 'APPOINTMENT_ALREADY_NO_SHOW'
  | 'UNAUTHORIZED_APPOINTMENT_OPERATION'
  | 'CANCELLATION_NOT_ALLOWED'
  | 'RESCHEDULE_NOT_ALLOWED'
  | 'RESCHEDULE_SLOT_UNAVAILABLE'
  | 'RESCHEDULE_SLOT_IN_PAST'
  | 'RESCHEDULE_OUTSIDE_WORKING_HOURS'
  | 'INVALID_SLOT_DURATION'
  | 'DOCTOR_NOT_FOUND'
  | 'CONSULTATION_TYPE_NOT_FOUND'
  | 'DOCTOR_INACTIVE'
  | 'INVALID_DATA'
  | 'INTERNAL_ERROR';

export interface ConfirmAppointmentRequest {
  appointment_id: string;
}

export interface CancelAppointmentRequest {
  appointment_id: string;
  confirmation_token?: string; // Required for public cancellations
  cancellation_reason?: string; // Optional operational reason
}

export interface RescheduleAppointmentRequest {
  appointment_id: string;
  new_slot_start: string; // ISO 8601 UTC
  new_slot_end: string;   // ISO 8601 UTC
  new_doctor_id?: string; // Optional: defaults to existing doctor
  new_consultation_type_id?: string; // Optional: defaults to existing consultation type
  confirmation_token?: string; // Required for public rescheduling
  hold_token?: string; // Optional hold token if slot was held in advance
  currentTimeUtc?: Date; // Optional deterministic clock injection
}

export interface AppointmentOperationResult {
  success: boolean;
  appointment_id?: string;
  status?: AppointmentStatus;
  message?: string;
  error?: string;
  error_code?: AppointmentManagementErrorCode;
}

export interface RescheduleResult {
  success: boolean;
  original_appointment_id?: string;
  new_appointment_id?: string;
  confirmation_token?: string;
  new_appointment?: DbAppointment;
  error?: string;
  error_code?: AppointmentManagementErrorCode;
}

export type AvailabilityErrorCode =
  | 'DOCTOR_NOT_FOUND'
  | 'CONSULTATION_TYPE_NOT_FOUND'
  | 'DOCTOR_INACTIVE'
  | 'INVALID_CONSULTATION_DURATION'
  | 'INVALID_DATE'
  | 'DATABASE_ERROR'
  | 'CONFIGURATION_ERROR';

export interface GetLiveAvailabilityRequest {
  doctorId: string;
  consultationTypeId: string;
  date: string; // YYYY-MM-DD in Asia/Kolkata
  currentTimeUtc?: Date; // Deterministic clock injection
  activeHoldToken?: string; // Optional client hold token
}

export interface PublicDoctorSummary {
  id: string;
  name: string;
  department_id: string;
  designation: string;
  credentials: string;
}

export interface PublicConsultationSummary {
  id: string;
  name: string;
  code: string;
  duration_minutes: number;
  description: string;
}

export interface LiveAvailabilityResult {
  success: boolean;
  data?: DayAvailability & {
    doctor: PublicDoctorSummary;
    consultation_type: PublicConsultationSummary;
    timezone: string;
  };
  error?: string;
  error_code?: AvailabilityErrorCode;
}

export type ScheduleManagementErrorCode =
  | 'DOCTOR_NOT_FOUND'
  | 'DEPARTMENT_NOT_FOUND'
  | 'CONSULTATION_TYPE_NOT_FOUND'
  | 'DOCTOR_INACTIVE'
  | 'INVALID_SCHEDULE_DAY'
  | 'INVALID_SCHEDULE_TIME'
  | 'INVALID_SCHEDULE_RANGE'
  | 'OVERLAPPING_SCHEDULE_WINDOWS'
  | 'SCHEDULE_CONFLICTS_WITH_APPOINTMENTS'
  | 'SCHEDULE_CONFLICTS_WITH_HOLDS'
  | 'EXCEPTION_INVALID_RANGE'
  | 'EXCEPTION_CONFLICT'
  | 'UNAUTHORIZED_SCHEDULE_OPERATION'
  | 'DATABASE_ERROR'
  | 'CONFIGURATION_ERROR';

export interface CreateDoctorInput {
  id: string;
  name: string;
  slug?: string;
  department_id: string;
  designation: string;
  credentials: string;
  experience_years?: number;
  active?: boolean;
}

export interface UpdateDoctorInput {
  name?: string;
  slug?: string;
  department_id?: string;
  designation?: string;
  credentials?: string;
  experience_years?: number;
  active?: boolean;
}

export interface DoctorOperationResult {
  success: boolean;
  doctor?: DbDoctor;
  error?: string;
  error_code?: ScheduleManagementErrorCode;
}

export interface ScheduleWindowInput {
  day_of_week: DayOfWeek;
  start_time: string; // HH:mm (24 hour format in Asia/Kolkata)
  end_time: string;   // HH:mm (24 hour format in Asia/Kolkata)
  consultation_duration?: number;
  active?: boolean;
}

export interface DoctorScheduleOperationResult {
  success: boolean;
  schedules?: DbDoctorSchedule[];
  schedule?: DbDoctorSchedule;
  error?: string;
  error_code?: ScheduleManagementErrorCode;
}

export interface CreateScheduleExceptionInput {
  doctor_id: string;
  exception_date: string; // YYYY-MM-DD in Asia/Kolkata
  start_time?: string;
  end_time?: string;
  exception_type: ScheduleExceptionType;
  reason: string;
}

export interface UpdateScheduleExceptionInput {
  exception_date?: string;
  start_time?: string;
  end_time?: string;
  exception_type?: ScheduleExceptionType;
  reason?: string;
}

export interface ScheduleExceptionOperationResult {
  success: boolean;
  exception?: DbScheduleException;
  error?: string;
  error_code?: ScheduleManagementErrorCode;
}

