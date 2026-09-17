import type {
  DbDepartment,
  DbDoctor,
  DbConsultationType
} from '@/types/database';
import type {
  CalculatedSlot,
  PublicAppointmentConfirmation
} from '@/types/scheduling';

export type AppointmentStep =
  | 'department'
  | 'specialist'
  | 'consultation'
  | 'date'
  | 'slot'
  | 'details'
  | 'confirmation';

export interface ActiveSlotHoldState {
  holdToken: string;
  expiresAt: string; // ISO UTC string
  slotStart: string; // ISO UTC string
  slotEnd: string;   // ISO UTC string
}

export interface PatientFormState {
  fullName: string;
  phone: string;
  email: string;
}

export interface PatientFormErrors {
  fullName?: string;
  phone?: string;
  email?: string;
}

export interface BookingFlowState {
  currentStep: AppointmentStep;
  department: DbDepartment | null;
  doctor: DbDoctor | null;
  consultationType: DbConsultationType | null;
  dateStr: string; // YYYY-MM-DD
  slot: CalculatedSlot | null;
  activeHold: ActiveSlotHoldState | null;
  patient: PatientFormState;
  confirmedAppointment: PublicAppointmentConfirmation | null;
  isSubmitting: boolean;
  submissionError: string | null;
}

export interface AppointmentLookupState {
  appointmentId: string;
  confirmationToken: string;
  isLoading: boolean;
  error: string | null;
  result: PublicAppointmentConfirmation | null;
}
