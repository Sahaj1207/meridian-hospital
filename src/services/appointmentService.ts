import type { 
  DbAppointment, 
  DbSlotHold, 
  DbPatient,
  AppointmentStatus
} from '@/types/database';
import type { 
  DayAvailability, 
  SlotHoldRequest, 
  SlotHoldResult, 
  SlotHoldErrorCode,
  CreateBookingRequest, 
  BookingResult, 
  AppointmentFilter,
  PublicAppointmentConfirmation,
  PublicAppointmentView,
  SanitizedBusyInterval,
  ConfirmAppointmentRequest,
  CancelAppointmentRequest,
  RescheduleAppointmentRequest,
  AppointmentOperationResult,
  RescheduleResult,
  StaffAppointmentView,
  StaffPatientView
} from '@/types/scheduling';
import { catalogService, CANONICAL_DOCTORS, CANONICAL_DEPARTMENTS } from './catalogService';
import { calculateDoctorAvailability, isTimeIntervalOverlapping } from './availabilityEngine';
import { getSupabaseClient, isSupabaseConfigured, assertSupabaseEnvironment, isProductionEnvironment } from './supabaseClient';
import { parseISTToUTC, getISTDateString, getISTDayOfWeek, isValidCalendarDate } from '@/lib/timezone';
import { authService } from './authService';
import { notificationService } from './notificationService';
import type { NotificationEventType } from '@/types/notification';

/**
 * Authoritative appointment status lifecycle transitions.
 * Terminal states (completed, cancelled, no_show) are irreversible.
 */
export const VALID_STATUS_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: []
};

export function isValidStatusTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  if (from === to) return true; // Idempotent same-state check
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}



/**
 * In-memory transactional store used for automated unit testing and offline development
 * when a live Supabase database instance is not connected.
 */
class InMemoryAppointmentStore {
  private appointments: DbAppointment[] = [];
  private slotHolds: DbSlotHold[] = [];
  private patients: DbPatient[] = [];
  private bookingCounter = 10420;

  getAppointments(): DbAppointment[] {
    return [...this.appointments];
  }

  getSlotHolds(): DbSlotHold[] {
    return [...this.slotHolds];
  }

  getPatients(): DbPatient[] {
    return [...this.patients];
  }

  /**
   * Eagerly transitions expired holds for a doctor to released status.
   * This guarantees that expired holds do not block availability or booking,
   * without requiring an asynchronous background cleanup job.
   */
  private eagerReleaseExpiredHolds(doctorId: string, now: Date): void {
    for (const hold of this.slotHolds) {
      if (
        hold.doctor_id === doctorId && 
        hold.status === 'active' && 
        new Date(hold.expires_at).getTime() <= now.getTime()
      ) {
        hold.status = 'released';
      }
    }
  }

  /**
   * Atomically acquires a temporary hold on a doctor slot.
   */
  acquireHold(request: SlotHoldRequest): SlotHoldResult {
    const now = request.currentTimeUtc || new Date();

    if (!request.doctor_id || request.doctor_id.trim().length === 0) {
      return { success: false, error: 'Doctor identifier is required.', error_code: 'INVALID_DATA' };
    }

    const reqStart = new Date(request.slot_start);
    const reqEnd = new Date(request.slot_end);

    if (isNaN(reqStart.getTime()) || isNaN(reqEnd.getTime()) || reqEnd.getTime() <= reqStart.getTime()) {
      return { success: false, error: 'Invalid slot time interval.', error_code: 'INVALID_DATA' };
    }

    const holdMinutes = request.hold_duration_minutes || 10;
    const expiresAt = new Date(now.getTime() + holdMinutes * 60 * 1000).toISOString();

    // Eagerly transition expired holds for this doctor
    this.eagerReleaseExpiredHolds(request.doctor_id, now);

    // 1. Check if slot overlaps any confirmed appointment
    const hasConflictAppt = this.appointments.some((a) => {
      if (a.doctor_id !== request.doctor_id || a.status === 'cancelled') return false;
      const apptStart = new Date(a.appointment_start);
      const apptEnd = new Date(a.appointment_end);
      return isTimeIntervalOverlapping(reqStart, reqEnd, apptStart, apptEnd);
    });

    if (hasConflictAppt) {
      return { success: false, error: 'This consultation slot has already been booked.', error_code: 'SLOT_ALREADY_BOOKED' };
    }

    // 2. Check if slot overlaps any active unexpired hold
    const hasConflictHold = this.slotHolds.some((h) => {
      if (h.doctor_id !== request.doctor_id || h.status !== 'active') return false;
      if (new Date(h.expires_at).getTime() <= now.getTime()) return false;
      const holdStart = new Date(h.slot_start);
      const holdEnd = new Date(h.slot_end);
      return isTimeIntervalOverlapping(reqStart, reqEnd, holdStart, holdEnd);
    });

    if (hasConflictHold) {
      return { success: false, error: 'This consultation slot is currently held by another patient.', error_code: 'SLOT_HELD_BY_ANOTHER' };
    }

    // 3. Create hold
    const holdToken = `hold-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newHold: DbSlotHold = {
      id: `hold-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      doctor_id: request.doctor_id,
      slot_start: request.slot_start,
      slot_end: request.slot_end,
      hold_token: holdToken,
      held_at: now.toISOString(),
      expires_at: expiresAt,
      status: 'active'
    };

    this.slotHolds.push(newHold);
    return { success: true, hold_token: holdToken, expires_at: expiresAt };
  }

  /**
   * Releases an active slot hold.
   */
  releaseHold(holdToken: string): boolean {
    const hold = this.slotHolds.find((h) => h.hold_token === holdToken && h.status === 'active');
    if (hold) {
      hold.status = 'released';
      return true;
    }
    return false;
  }

  /**
   * Atomically commits a booking with anti-double-booking protection.
   */
  createBooking(request: CreateBookingRequest): BookingResult {
    const now = new Date();

    if (!request.doctor_id || !request.department_id || !request.consultation_type) {
      return {
        success: false,
        error: 'Missing required clinical identifiers.',
        error_code: 'INVALID_DATA'
      };
    }

    const reqStart = new Date(request.slot_start);
    const reqEnd = new Date(request.slot_end);

    if (isNaN(reqStart.getTime()) || isNaN(reqEnd.getTime()) || reqEnd.getTime() <= reqStart.getTime()) {
      return {
        success: false,
        error: 'Invalid appointment time interval.',
        error_code: 'INVALID_DATA'
      };
    }

    const patientValidation = validatePatientDetails(request.patient);
    if (!patientValidation.valid) {
      return {
        success: false,
        error: patientValidation.error || 'Complete patient details are required.',
        error_code: 'INVALID_DATA'
      };
    }

    // Eagerly transition expired holds for this doctor
    this.eagerReleaseExpiredHolds(request.doctor_id, now);

    // 1. Double-booking check against existing active appointments
    const doubleBooked = this.appointments.some((a) => {
      if (a.doctor_id !== request.doctor_id || a.status === 'cancelled') return false;
      const apptStart = new Date(a.appointment_start);
      const apptEnd = new Date(a.appointment_end);
      return isTimeIntervalOverlapping(reqStart, reqEnd, apptStart, apptEnd);
    });

    if (doubleBooked) {
      return {
        success: false,
        error: 'Slot is already booked for this specialist.',
        error_code: 'SLOT_ALREADY_BOOKED'
      };
    }

    // 2. Check hold ownership
    if (request.hold_token) {
      const activeHold = this.slotHolds.find((h) => h.hold_token === request.hold_token);
      if (!activeHold || activeHold.doctor_id !== request.doctor_id || activeHold.status !== 'active') {
        return {
          success: false,
          error: 'Your temporary slot hold is invalid or has expired.',
          error_code: 'SLOT_EXPIRED'
        };
      }
      if (new Date(activeHold.expires_at).getTime() <= now.getTime()) {
        activeHold.status = 'released';
        return {
          success: false,
          error: 'Your slot hold has expired. Please choose a slot again.',
          error_code: 'SLOT_EXPIRED'
        };
      }
      activeHold.status = 'converted';
    } else {
      // If booking directly without hold, ensure no other active unexpired hold exists
      const foreignHold = this.slotHolds.some((h) => {
        if (h.doctor_id !== request.doctor_id || h.status !== 'active') return false;
        if (new Date(h.expires_at).getTime() <= now.getTime()) return false;
        const holdStart = new Date(h.slot_start);
        const holdEnd = new Date(h.slot_end);
        return isTimeIntervalOverlapping(reqStart, reqEnd, holdStart, holdEnd);
      });

      if (foreignHold) {
        return {
          success: false,
          error: 'This slot is currently being held by another patient.',
          error_code: 'SLOT_HELD_BY_ANOTHER'
        };
      }
    }

    // 3. Upsert patient record
    let patient = this.patients.find((p) => p.email === request.patient.email || p.phone === request.patient.phone);
    if (!patient) {
      patient = {
        id: `pat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        full_name: request.patient.full_name,
        phone: request.patient.phone,
        email: request.patient.email,
        created_at: now.toISOString()
      };
      this.patients.push(patient);
    }

    // 4. Create authoritative appointment with unpredictable confirmation token
    this.bookingCounter += 1;
    const appointmentId = `MRD-2026-${this.bookingCounter}`;
    const confirmationToken = `conf-${Date.now()}-${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;

    const newAppointment: DbAppointment = {
      id: `appt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      appointment_id: appointmentId,
      confirmation_token: confirmationToken,
      doctor_id: request.doctor_id,
      department_id: request.department_id,
      consultation_type: request.consultation_type,
      appointment_start: request.slot_start,
      appointment_end: request.slot_end,
      patient_id: patient.id,
      status: request.initial_status || 'confirmed',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    this.appointments.push(newAppointment);

    return {
      success: true,
      appointment_id: appointmentId,
      confirmation_token: confirmationToken,
      appointment: newAppointment
    };
  }

  findAppointment(appointmentId: string): DbAppointment | undefined {
    return this.appointments.find((a) => a.appointment_id === appointmentId || a.id === appointmentId);
  }

  /**
   * Operationally confirms a pending appointment.
   */
  confirmBooking(appointmentId: string, isStaffOrAdmin: boolean = false): AppointmentOperationResult {
    if (!isStaffOrAdmin) {
      return {
        success: false,
        error: 'Unauthorized: staff credentials required to confirm appointments.',
        error_code: 'UNAUTHORIZED_APPOINTMENT_OPERATION'
      };
    }

    const appt = this.findAppointment(appointmentId);
    if (!appt) {
      return {
        success: false,
        error: 'Appointment was not found.',
        error_code: 'APPOINTMENT_NOT_FOUND'
      };
    }

    if (appt.status === 'completed') {
      return {
        success: false,
        error: 'Completed appointments cannot be confirmed.',
        error_code: 'APPOINTMENT_ALREADY_COMPLETED'
      };
    }

    if (appt.status === 'cancelled') {
      return {
        success: false,
        error: 'Cancelled appointments cannot be confirmed.',
        error_code: 'APPOINTMENT_ALREADY_CANCELLED'
      };
    }

    if (appt.status === 'no_show') {
      return {
        success: false,
        error: 'No-show appointments cannot be confirmed.',
        error_code: 'APPOINTMENT_ALREADY_NO_SHOW'
      };
    }

    if (appt.status === 'confirmed') {
      return {
        success: true,
        appointment_id: appt.appointment_id,
        status: 'confirmed',
        message: 'Appointment is already confirmed.'
      };
    }

    if (appt.status === 'pending') {
      appt.status = 'confirmed';
      appt.updated_at = new Date().toISOString();
      return {
        success: true,
        appointment_id: appt.appointment_id,
        status: 'confirmed',
        message: 'Appointment confirmed successfully.'
      };
    }

    return {
      success: false,
      error: `Invalid status transition from ${appt.status} to confirmed.`,
      error_code: 'INVALID_STATUS_TRANSITION'
    };
  }

  /**
   * Cancels an appointment with domain rule enforcement.
   */
  cancelBookingWithResult(
    appointmentId: string,
    confirmationToken?: string,
    isStaffOrAdmin: boolean = false
  ): AppointmentOperationResult {
    const appt = this.findAppointment(appointmentId);
    if (!appt) {
      return {
        success: false,
        error: 'Appointment was not found.',
        error_code: 'APPOINTMENT_NOT_FOUND'
      };
    }

    if (!isStaffOrAdmin) {
      if (!confirmationToken || confirmationToken.length < 16 || appt.confirmation_token !== confirmationToken) {
        return {
          success: false,
          error: 'Unauthorized: valid confirmation token required for public cancellation.',
          error_code: 'UNAUTHORIZED_APPOINTMENT_OPERATION'
        };
      }
    }

    if (appt.status === 'completed') {
      return {
        success: false,
        error: 'Completed appointments cannot be cancelled.',
        error_code: 'APPOINTMENT_ALREADY_COMPLETED'
      };
    }

    if (appt.status === 'cancelled') {
      return {
        success: true,
        appointment_id: appt.appointment_id,
        status: 'cancelled',
        message: 'Appointment is already cancelled.'
      };
    }

    if (appt.status === 'no_show') {
      return {
        success: false,
        error: 'No-show appointments cannot be cancelled.',
        error_code: 'APPOINTMENT_ALREADY_NO_SHOW'
      };
    }

    appt.status = 'cancelled';
    appt.updated_at = new Date().toISOString();

    return {
      success: true,
      appointment_id: appt.appointment_id,
      status: 'cancelled',
      message: 'Appointment cancelled successfully.'
    };
  }

  /**
   * Marks a confirmed appointment as completed.
   */
  completeBooking(appointmentId: string, isStaffOrAdmin: boolean = false): AppointmentOperationResult {
    if (!isStaffOrAdmin) {
      return {
        success: false,
        error: 'Unauthorized: staff credentials required to complete appointments.',
        error_code: 'UNAUTHORIZED_APPOINTMENT_OPERATION'
      };
    }

    const appt = this.findAppointment(appointmentId);
    if (!appt) {
      return {
        success: false,
        error: 'Appointment was not found.',
        error_code: 'APPOINTMENT_NOT_FOUND'
      };
    }

    if (appt.status === 'completed') {
      return {
        success: true,
        appointment_id: appt.appointment_id,
        status: 'completed',
        message: 'Appointment is already completed.'
      };
    }

    if (appt.status === 'cancelled') {
      return {
        success: false,
        error: 'Cancelled appointments cannot be marked completed.',
        error_code: 'APPOINTMENT_ALREADY_CANCELLED'
      };
    }

    if (appt.status === 'no_show') {
      return {
        success: false,
        error: 'No-show appointments cannot be marked completed.',
        error_code: 'APPOINTMENT_ALREADY_NO_SHOW'
      };
    }

    if (appt.status === 'pending') {
      return {
        success: false,
        error: 'Pending appointments must be confirmed before completion.',
        error_code: 'INVALID_STATUS_TRANSITION'
      };
    }

    appt.status = 'completed';
    appt.updated_at = new Date().toISOString();

    return {
      success: true,
      appointment_id: appt.appointment_id,
      status: 'completed',
      message: 'Appointment completed successfully.'
    };
  }

  /**
   * Marks a confirmed appointment as no-show.
   */
  recordNoShowBooking(appointmentId: string, isStaffOrAdmin: boolean = false): AppointmentOperationResult {
    if (!isStaffOrAdmin) {
      return {
        success: false,
        error: 'Unauthorized: staff credentials required to record appointment no-show.',
        error_code: 'UNAUTHORIZED_APPOINTMENT_OPERATION'
      };
    }

    const appt = this.findAppointment(appointmentId);
    if (!appt) {
      return {
        success: false,
        error: 'Appointment was not found.',
        error_code: 'APPOINTMENT_NOT_FOUND'
      };
    }

    if (appt.status === 'no_show') {
      return {
        success: true,
        appointment_id: appt.appointment_id,
        status: 'no_show',
        message: 'Appointment is already marked no-show.'
      };
    }

    if (appt.status === 'completed') {
      return {
        success: false,
        error: 'Completed appointments cannot be marked no-show.',
        error_code: 'APPOINTMENT_ALREADY_COMPLETED'
      };
    }

    if (appt.status === 'cancelled') {
      return {
        success: false,
        error: 'Cancelled appointments cannot be marked no-show.',
        error_code: 'APPOINTMENT_ALREADY_CANCELLED'
      };
    }

    if (appt.status === 'pending') {
      return {
        success: false,
        error: 'Pending appointments cannot be marked no-show.',
        error_code: 'INVALID_STATUS_TRANSITION'
      };
    }

    appt.status = 'no_show';
    appt.updated_at = new Date().toISOString();

    return {
      success: true,
      appointment_id: appt.appointment_id,
      status: 'no_show',
      message: 'Appointment marked as no-show.'
    };
  }

  /**
   * Reschedules an appointment to a new validated time window.
   */
  async rescheduleBooking(
    request: RescheduleAppointmentRequest,
    isStaffOrAdmin: boolean = false
  ): Promise<RescheduleResult> {
    const now = request.currentTimeUtc || new Date();

    const appt = this.findAppointment(request.appointment_id);
    if (!appt) {
      return {
        success: false,
        error: 'Original appointment was not found.',
        error_code: 'APPOINTMENT_NOT_FOUND'
      };
    }

    if (!isStaffOrAdmin) {
      if (!request.confirmation_token || request.confirmation_token.length < 16 || appt.confirmation_token !== request.confirmation_token) {
        return {
          success: false,
          error: 'Unauthorized: valid confirmation token required for public rescheduling.',
          error_code: 'UNAUTHORIZED_APPOINTMENT_OPERATION'
        };
      }
    }

    if (appt.status === 'completed') {
      return {
        success: false,
        error: 'Completed appointments cannot be rescheduled.',
        error_code: 'APPOINTMENT_ALREADY_COMPLETED'
      };
    }

    if (appt.status === 'cancelled') {
      return {
        success: false,
        error: 'Cancelled appointments cannot be rescheduled.',
        error_code: 'APPOINTMENT_ALREADY_CANCELLED'
      };
    }

    if (appt.status === 'no_show') {
      return {
        success: false,
        error: 'No-show appointments cannot be rescheduled.',
        error_code: 'APPOINTMENT_ALREADY_NO_SHOW'
      };
    }

    const doctorId = request.new_doctor_id || appt.doctor_id;
    const doctor = await catalogService.getDoctorById(doctorId);
    if (!doctor) {
      return {
        success: false,
        error: 'Specialist doctor was not found in catalog.',
        error_code: 'DOCTOR_NOT_FOUND'
      };
    }

    const consultationTypes = await catalogService.getConsultationTypes();
    const consType = request.new_consultation_type_id
      ? await catalogService.getConsultationTypeById(request.new_consultation_type_id)
      : consultationTypes.find((c) => c.name === appt.consultation_type || c.id === appt.consultation_type || c.code === appt.consultation_type);

    const newStart = new Date(request.new_slot_start);
    const newEnd = new Date(request.new_slot_end);

    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime()) || newEnd.getTime() <= newStart.getTime()) {
      return {
        success: false,
        error: 'Invalid rescheduled slot time interval.',
        error_code: 'INVALID_DATA'
      };
    }

    const rawStartMatch = /^(\d{4}-\d{2}-\d{2})/.exec(request.new_slot_start || '');
    const rawEndMatch = /^(\d{4}-\d{2}-\d{2})/.exec(request.new_slot_end || '');
    if (!rawStartMatch || !isValidCalendarDate(rawStartMatch[1]) || !rawEndMatch || !isValidCalendarDate(rawEndMatch[1])) {
      return {
        success: false,
        error: 'Invalid calendar date.',
        error_code: 'INVALID_DATA'
      };
    }

    const slotDurationMinutes = Math.round((newEnd.getTime() - newStart.getTime()) / (60 * 1000));
    if (consType && slotDurationMinutes !== consType.duration_minutes) {
      return {
        success: false,
        error: `Slot duration (${slotDurationMinutes}m) does not match consultation type requirement (${consType.duration_minutes}m).`,
        error_code: 'INVALID_SLOT_DURATION'
      };
    }

    if (newStart.getTime() < now.getTime()) {
      return {
        success: false,
        error: 'Cannot reschedule into a slot in the past.',
        error_code: 'RESCHEDULE_SLOT_IN_PAST'
      };
    }

    const istDateStr = getISTDateString(newStart);
    const dayOfWeek = getISTDayOfWeek(istDateStr);
    const schedules = await catalogService.getDoctorSchedules(doctorId);
    const activeSchedule = schedules.find((s) => s.day_of_week === dayOfWeek && s.active);
    if (!activeSchedule) {
      return {
        success: false,
        error: 'Doctor is not scheduled to work on this day.',
        error_code: 'RESCHEDULE_OUTSIDE_WORKING_HOURS'
      };
    }

    const shiftStart = parseISTToUTC(istDateStr, activeSchedule.start_time);
    const shiftEnd = parseISTToUTC(istDateStr, activeSchedule.end_time);
    if (newStart.getTime() < shiftStart.getTime() || newEnd.getTime() > shiftEnd.getTime()) {
      return {
        success: false,
        error: 'Requested slot falls outside doctor OPD clinic hours.',
        error_code: 'RESCHEDULE_OUTSIDE_WORKING_HOURS'
      };
    }

    const exceptions = await catalogService.getScheduleExceptions(doctorId);
    const dayExceptions = exceptions.filter((e) => e.exception_date === istDateStr);
    const fullDayBlock = dayExceptions.find((e) =>
      e.exception_type === 'leave' || e.exception_type === 'holiday' || (e.exception_type === 'blocked' && !e.start_time)
    );
    if (fullDayBlock) {
      return {
        success: false,
        error: fullDayBlock.reason ? `Doctor unavailable: ${fullDayBlock.reason}` : 'Doctor is unavailable on this date.',
        error_code: 'RESCHEDULE_SLOT_UNAVAILABLE'
      };
    }

    const partialBlocks = dayExceptions.filter((e) => e.exception_type === 'blocked' && e.start_time && e.end_time);
    for (const block of partialBlocks) {
      const blockStart = parseISTToUTC(istDateStr, block.start_time!);
      const blockEnd = parseISTToUTC(istDateStr, block.end_time!);
      if (isTimeIntervalOverlapping(newStart, newEnd, blockStart, blockEnd)) {
        return {
          success: false,
          error: block.reason ? `Slot unavailable: ${block.reason}` : 'Doctor is unavailable during this time window.',
          error_code: 'RESCHEDULE_SLOT_UNAVAILABLE'
        };
      }
    }

    const hasConflictAppt = this.appointments.some((a) => {
      if (a.appointment_id === appt.appointment_id) return false;
      if (a.doctor_id !== doctorId || a.status === 'cancelled') return false;
      const apptStart = new Date(a.appointment_start);
      const apptEnd = new Date(a.appointment_end);
      return isTimeIntervalOverlapping(newStart, newEnd, apptStart, apptEnd);
    });

    if (hasConflictAppt) {
      return {
        success: false,
        error: 'Requested reschedule slot is already occupied.',
        error_code: 'RESCHEDULE_SLOT_UNAVAILABLE'
      };
    }

    this.eagerReleaseExpiredHolds(doctorId, now);
    const hasConflictHold = this.slotHolds.some((h) => {
      if (h.doctor_id !== doctorId || h.status !== 'active') return false;
      if (new Date(h.expires_at).getTime() <= now.getTime()) return false;
      if (request.hold_token && h.hold_token === request.hold_token) return false;
      const holdStart = new Date(h.slot_start);
      const holdEnd = new Date(h.slot_end);
      return isTimeIntervalOverlapping(newStart, newEnd, holdStart, holdEnd);
    });

    if (hasConflictHold) {
      return {
        success: false,
        error: 'Requested reschedule slot is currently held by another patient.',
        error_code: 'RESCHEDULE_SLOT_UNAVAILABLE'
      };
    }

    if (request.hold_token) {
      const matchingHold = this.slotHolds.find((h) => h.hold_token === request.hold_token && h.status === 'active');
      if (matchingHold) matchingHold.status = 'converted';
    }

    this.bookingCounter += 1;
    const newAppointmentId = `MRD-2026-${this.bookingCounter}`;
    const newConfirmationToken = `conf-${Date.now()}-${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;

    const newAppointment: DbAppointment = {
      id: `appt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      appointment_id: newAppointmentId,
      confirmation_token: newConfirmationToken,
      doctor_id: doctorId,
      department_id: doctor.department_id,
      consultation_type: consType ? consType.name : appt.consultation_type,
      appointment_start: request.new_slot_start,
      appointment_end: request.new_slot_end,
      patient_id: appt.patient_id,
      status: 'confirmed',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    appt.status = 'cancelled';
    appt.updated_at = now.toISOString();

    this.appointments.push(newAppointment);

    return {
      success: true,
      original_appointment_id: appt.appointment_id,
      new_appointment_id: newAppointmentId,
      confirmation_token: newConfirmationToken,
      new_appointment: newAppointment
    };
  }

  /**
   * Retrieves operational appointments for staff/admin views.
   */
  getStaffAppointments(filter?: AppointmentFilter): StaffAppointmentView[] {
    let list = [...this.appointments];
    if (filter?.doctor_id) list = list.filter((a) => a.doctor_id === filter.doctor_id);
    if (filter?.department_id) list = list.filter((a) => a.department_id === filter.department_id);
    if (filter?.status) list = list.filter((a) => a.status === filter.status);
    if (filter?.date_from) list = list.filter((a) => a.appointment_start >= filter.date_from!);
    if (filter?.date_to) list = list.filter((a) => a.appointment_start <= filter.date_to!);

    list.sort((a, b) => new Date(a.appointment_start).getTime() - new Date(b.appointment_start).getTime());

    return list.map((appt) => {
      const doc = CANONICAL_DOCTORS.find((d) => d.id === appt.doctor_id);
      const dep = CANONICAL_DEPARTMENTS.find((d) => d.id === appt.department_id);
      const pat = this.patients.find((p) => p.id === appt.patient_id);
      return {
        id: appt.id,
        appointment_id: appt.appointment_id,
        doctor_id: appt.doctor_id,
        doctor_name: doc?.name || appt.doctor_id,
        department_id: appt.department_id,
        department_name: dep?.name || appt.department_id,
        consultation_type: appt.consultation_type,
        appointment_start: appt.appointment_start,
        appointment_end: appt.appointment_end,
        patient_name: pat?.full_name || 'Anonymous Patient',
        patient_phone: pat?.phone || '',
        patient_email: pat?.email || '',
        status: appt.status,
        created_at: appt.created_at,
        updated_at: appt.updated_at
      };
    });
  }

  /**
   * Retrieves a single operational appointment by ID for staff/admin views.
   */
  getStaffAppointmentById(appointmentId: string): StaffAppointmentView | null {
    const appt = this.findAppointment(appointmentId);
    if (!appt) return null;
    const doc = CANONICAL_DOCTORS.find((d) => d.id === appt.doctor_id);
    const dep = CANONICAL_DEPARTMENTS.find((d) => d.id === appt.department_id);
    const pat = this.patients.find((p) => p.id === appt.patient_id);
    return {
      id: appt.id,
      appointment_id: appt.appointment_id,
      doctor_id: appt.doctor_id,
      doctor_name: doc?.name || appt.doctor_id,
      department_id: appt.department_id,
      department_name: dep?.name || appt.department_id,
      consultation_type: appt.consultation_type,
      appointment_start: appt.appointment_start,
      appointment_end: appt.appointment_end,
      patient_name: pat?.full_name || 'Anonymous Patient',
      patient_phone: pat?.phone || '',
      patient_email: pat?.email || '',
      status: appt.status,
      created_at: appt.created_at,
      updated_at: appt.updated_at
    };
  }

  /**
   * Retrieves sanitized public appointment confirmation.
   * Requires matching appointment_id and confirmation_token.
   * Returns zero patient contact details, internal notes, or private identifiers.
   */
  getPublicConfirmation(appointmentId: string, confirmationToken: string): PublicAppointmentConfirmation | null {
    if (!appointmentId || !confirmationToken || confirmationToken.length < 16) {
      return null;
    }

    const appt = this.appointments.find(
      (a) => a.appointment_id === appointmentId && a.confirmation_token === confirmationToken
    );

    if (!appt) {
      return null;
    }

    const doctor = CANONICAL_DOCTORS.find((d) => d.id === appt.doctor_id);
    const department = CANONICAL_DEPARTMENTS.find((dep) => dep.id === appt.department_id);

    return {
      appointment_id: appt.appointment_id,
      doctor_id: appt.doctor_id,
      doctor_name: doctor?.name || appt.doctor_id,
      department_id: appt.department_id,
      department_name: department?.name || appt.department_id,
      consultation_type: appt.consultation_type,
      appointment_start: appt.appointment_start,
      appointment_end: appt.appointment_end,
      status: appt.status,
      created_at: appt.created_at
    };
  }

  cancelBooking(appointmentId: string): boolean {
    const res = this.cancelBookingWithResult(appointmentId, undefined, true);
    return res.success;
  }

  updateStatus(appointmentId: string, status: AppointmentStatus): boolean {
    const appt = this.findAppointment(appointmentId);
    if (appt) {
      if (!isValidStatusTransition(appt.status, status)) return false;
      appt.status = status;
      appt.updated_at = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Resets test store (used exclusively in automated testing)
   */
  clear(): void {
    this.appointments = [];
    this.slotHolds = [];
    this.patients = [];
  }

  /**
   * Adds an appointment directly to test store (used in testing and seeding)
   */
  addAppointment(appt: DbAppointment): void {
    this.appointments.push(appt);
  }
}

/**
 * Strict patient contact format validator.
 * Restricts patient fields strictly to full_name, phone, and email.
 * Ensures zero clinical, diagnostic, or medical history leakage.
 */
export function validatePatientDetails(patient?: { full_name?: string; phone?: string; email?: string }): { valid: boolean; error?: string } {
  if (!patient) {
    return { valid: false, error: 'Complete patient details are required.' };
  }

  const fullName = (patient.full_name || '').trim();
  if (fullName.length < 2 || fullName.length > 120) {
    return { valid: false, error: 'Patient name must be between 2 and 120 characters.' };
  }

  const phone = (patient.phone || '').trim();
  const phoneRegex = /^\+?[0-9\s\-()]{8,20}$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: 'Valid patient phone number is required (8 to 20 digits).' };
  }

  const email = (patient.email || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 150) {
    return { valid: false, error: 'Valid patient email address is required.' };
  }

  return { valid: true };
}

/**
 * Pre-validation for slot hold and booking operations.
 * Validates doctor existence, interval bounds, past time boundaries,
 * authentic calendar dates, optional consultation duration match,
 * doctor working schedule, and schedule exceptions.
 * Does not perform any clinical validation.
 */
export async function validateSchedulingBookingPreconditions(
  request: SlotHoldRequest
): Promise<{ valid: boolean; error?: string; error_code?: SlotHoldErrorCode }> {
  // 1. Doctor identifier
  if (!request.doctor_id || request.doctor_id.trim().length === 0) {
    return { valid: false, error: 'Doctor identifier is required.', error_code: 'INVALID_DATA' };
  }

  const doctor = await catalogService.getDoctorById(request.doctor_id, true);
  if (!doctor) {
    return { valid: false, error: 'Specialist doctor was not found in the catalog.', error_code: 'DOCTOR_NOT_FOUND' };
  }
  if (!doctor.active) {
    return { valid: false, error: 'Specialist doctor is currently inactive.', error_code: 'DOCTOR_INACTIVE' };
  }

  // 2. Slot interval and calendar date structure check
  const rawStartMatch = /^(\d{4}-\d{2}-\d{2})/.exec(request.slot_start || '');
  const rawEndMatch = /^(\d{4}-\d{2}-\d{2})/.exec(request.slot_end || '');
  if (!rawStartMatch || !isValidCalendarDate(rawStartMatch[1]) || !rawEndMatch || !isValidCalendarDate(rawEndMatch[1])) {
    return { valid: false, error: 'Invalid calendar date.', error_code: 'INVALID_DATA' };
  }

  const reqStart = new Date(request.slot_start);
  const reqEnd = new Date(request.slot_end);
  if (isNaN(reqStart.getTime()) || isNaN(reqEnd.getTime()) || reqEnd.getTime() <= reqStart.getTime()) {
    return { valid: false, error: 'Invalid slot time interval.', error_code: 'INVALID_DATA' };
  }

  // 3. Past slot check
  const nowUtc = request.currentTimeUtc || new Date();
  if (reqStart.getTime() < nowUtc.getTime()) {
    return { valid: false, error: 'Cannot hold a slot in the past.', error_code: 'PAST_SLOT' };
  }

  // 4. Calendar date validation in Asia/Kolkata
  const istDateStr = getISTDateString(reqStart);
  if (!isValidCalendarDate(istDateStr)) {
    return { valid: false, error: 'Invalid calendar date.', error_code: 'INVALID_DATA' };
  }

  // 5. Consultation type pre-validation if supplied
  if (request.consultation_type_id) {
    const consultationType = await catalogService.getConsultationTypeById(request.consultation_type_id);
    if (!consultationType) {
      return { valid: false, error: 'Consultation type was not found.', error_code: 'CONSULTATION_TYPE_NOT_FOUND' };
    }
    const slotDurationMinutes = Math.round((reqEnd.getTime() - reqStart.getTime()) / (60 * 1000));
    if (slotDurationMinutes !== consultationType.duration_minutes) {
      return {
        valid: false,
        error: `Slot duration (${slotDurationMinutes}m) does not match consultation type duration (${consultationType.duration_minutes}m).`,
        error_code: 'INVALID_SLOT_DURATION'
      };
    }
  }

  // 6. Doctor working day check
  const dayOfWeek = getISTDayOfWeek(istDateStr);
  const schedules = await catalogService.getDoctorSchedules(request.doctor_id);
  const activeSchedule = schedules.find((s) => s.day_of_week === dayOfWeek && s.active);
  if (!activeSchedule) {
    return { valid: false, error: 'Doctor is not scheduled to work on this day.', error_code: 'DOCTOR_NOT_WORKING' };
  }

  // 7. Schedule exception check
  const exceptions = await catalogService.getScheduleExceptions(request.doctor_id);
  const dayExceptions = exceptions.filter((e) => e.exception_date === istDateStr);

  // Full-day leave/holiday check
  const fullDayBlock = dayExceptions.find((e) =>
    e.exception_type === 'leave' || e.exception_type === 'holiday' || (e.exception_type === 'blocked' && !e.start_time)
  );
  if (fullDayBlock) {
    return {
      valid: false,
      error: fullDayBlock.reason ? `Doctor unavailable: ${fullDayBlock.reason}` : 'Doctor is unavailable on this date due to schedule exception.',
      error_code: 'EXCEPTION_BLOCKED'
    };
  }

  // Partial blocked check
  const partialBlocks = dayExceptions.filter((e) => e.exception_type === 'blocked' && e.start_time && e.end_time);
  for (const block of partialBlocks) {
    const blockStart = parseISTToUTC(istDateStr, block.start_time!);
    const blockEnd = parseISTToUTC(istDateStr, block.end_time!);
    if (isTimeIntervalOverlapping(reqStart, reqEnd, blockStart, blockEnd)) {
      return {
        valid: false,
        error: block.reason ? `Slot unavailable: ${block.reason}` : 'Doctor is unavailable during this time interval.',
        error_code: 'EXCEPTION_BLOCKED'
      };
    }
  }

  return { valid: true };
}

export const localAppointmentStore = new InMemoryAppointmentStore();

export class AppointmentService {
  /**
   * Calculates live available consultation slots for a doctor on a specific date in Asia/Kolkata.
   * Utilizes sanitized busy interval queries when Supabase is configured,
   * completely avoiding exposure of patient records or third-party hold tokens.
   */
  async getDoctorAvailability(
    doctorId: string, 
    dateStr: string, 
    customDurationMinutes?: number,
    holdToken?: string,
    currentTimeUtc?: Date
  ): Promise<DayAvailability> {
    assertSupabaseEnvironment();

    const [schedules, exceptions] = await Promise.all([
      catalogService.getDoctorSchedules(doctorId),
      catalogService.getScheduleExceptions(doctorId)
    ]);

    const supabase = getSupabaseClient();
    let appointments: DbAppointment[] = [];
    let holds: DbSlotHold[] = [];

    if (isSupabaseConfigured && supabase) {
      const [yearStr, monthStr, dayStr] = dateStr.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);
      const nextDateObj = new Date(Date.UTC(year, month - 1, day + 1));
      const nextDateStr = `${nextDateObj.getUTCFullYear()}-${String(nextDateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(nextDateObj.getUTCDate()).padStart(2, '0')}`;

      const rangeStartIso = parseISTToUTC(dateStr, '00:00').toISOString();
      const rangeEndIso = parseISTToUTC(nextDateStr, '00:00').toISOString();

      // Invoke hardened RPC to retrieve only sanitized busy intervals
      const { data: busyData, error } = await supabase.rpc('get_sanitized_doctor_busy_intervals', {
        p_doctor_id: doctorId,
        p_range_start: rangeStartIso,
        p_range_end: rangeEndIso,
        p_client_hold_token: holdToken || null
      });


      let busyIntervals: SanitizedBusyInterval[] | undefined = undefined;
      if (!error && busyData) {
        busyIntervals = busyData as SanitizedBusyInterval[];
      }

      return calculateDoctorAvailability({
        doctorId,
        dateStr,
        schedules,
        exceptions,
        busyIntervals,
        customDurationMinutes,
        currentTimeUtc,
        activeHoldToken: holdToken
      });
    }

    // Local fallback store
    appointments = localAppointmentStore.getAppointments();
    holds = localAppointmentStore.getSlotHolds();

    return calculateDoctorAvailability({
      doctorId,
      dateStr,
      schedules,
      exceptions,
      existingAppointments: appointments,
      activeHolds: holds,
      customDurationMinutes,
      currentTimeUtc,
      activeHoldToken: holdToken
    });
  }

  /**
   * Places an atomic temporary hold on a slot while a patient fills out details.
   * Performs scheduling/booking pre-validation (doctor existence, interval bounds, past time check,
   * authentic calendar date, consultation duration check, doctor working schedule, schedule exceptions).
   */
  async createSlotHold(request: SlotHoldRequest): Promise<SlotHoldResult> {
    try {
      assertSupabaseEnvironment();
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Configuration error',
        error_code: 'CONFIGURATION_ERROR'
      };
    }

    // 1. Scheduling / booking pre-validation
    const precheck = await validateSchedulingBookingPreconditions(request);
    if (!precheck.valid) {
      return {
        success: false,
        error: precheck.error,
        error_code: precheck.error_code
      };
    }

    // 2. Database hold acquisition
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('acquire_slot_hold', {
        p_doctor_id: request.doctor_id,
        p_slot_start: request.slot_start,
        p_slot_end: request.slot_end,
        p_duration_minutes: request.hold_duration_minutes || 10
      });

      if (error || !data || !data.success) {
        const errMsg = data?.error || error?.message || 'Unable to hold slot at this time.';
        let code: SlotHoldErrorCode = 'DATABASE_ERROR';
        if (errMsg.includes('already been booked')) {
          code = 'SLOT_ALREADY_BOOKED';
        } else if (errMsg.includes('held by another')) {
          code = 'SLOT_HELD_BY_ANOTHER';
        }
        return {
          success: false,
          error: errMsg,
          error_code: code
        };
      }

      return {
        success: true,
        hold_token: data.hold_token,
        expires_at: data.expires_at
      };
    }

    return localAppointmentStore.acquireHold(request);
  }

  /**
   * Releases an active slot hold.
   */
  async releaseSlotHold(holdToken: string): Promise<boolean> {
    assertSupabaseEnvironment();

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('slot_holds')
        .update({ status: 'released' })
        .eq('hold_token', holdToken);
      return !error;
    }

    return localAppointmentStore.releaseHold(holdToken);
  }

  /**
   * Submits a patient consultation booking with authoritative anti-double-booking protection.
   */
  async createAppointment(request: CreateBookingRequest): Promise<BookingResult> {
    try {
      assertSupabaseEnvironment();
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Configuration error',
        error_code: 'INTERNAL_ERROR'
      };
    }

    // 1. Patient format validation (strictly full_name, phone, email)
    const patientValidation = validatePatientDetails(request.patient);
    if (!patientValidation.valid) {
      return {
        success: false,
        error: patientValidation.error,
        error_code: 'INVALID_DATA'
      };
    }

    // 2. Clinical identifiers validation
    const [doc, dep] = await Promise.all([
      catalogService.getDoctorById(request.doctor_id, true),
      catalogService.getDepartmentById(request.department_id)
    ]);
    if (!doc || !dep) {
      return {
        success: false,
        error: 'Invalid doctor or department identifier.',
        error_code: 'INVALID_DATA'
      };
    }
    if (!doc.active) {
      return {
        success: false,
        error: 'Specialist doctor is currently inactive and cannot receive new bookings.',
        error_code: 'DOCTOR_INACTIVE' as any
      };
    }

    // 3. Consultation type and slot interval validation
    if (!request.consultation_type || request.consultation_type.trim().length === 0) {
      return {
        success: false,
        error: 'Consultation type is required.',
        error_code: 'INVALID_DATA'
      };
    }

    if (!request.slot_start || !request.slot_end) {
      return {
        success: false,
        error: 'Slot interval is required.',
        error_code: 'INVALID_DATA'
      };
    }

    const reqStart = new Date(request.slot_start);
    const reqEnd = new Date(request.slot_end);
    if (isNaN(reqStart.getTime()) || isNaN(reqEnd.getTime()) || reqEnd.getTime() <= reqStart.getTime()) {
      return {
        success: false,
        error: 'Invalid slot time interval.',
        error_code: 'INVALID_DATA'
      };
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('book_appointment', {
        p_doctor_id: request.doctor_id,
        p_department_id: request.department_id,
        p_consultation_type: request.consultation_type,
        p_slot_start: request.slot_start,
        p_slot_end: request.slot_end,
        p_full_name: request.patient.full_name.trim(),
        p_phone: request.patient.phone.trim(),
        p_email: request.patient.email.trim(),
        p_hold_token: request.hold_token || null
      });

      if (error || !data || !data.success) {
        return {
          success: false,
          error: data?.error || error?.message || 'Booking could not be confirmed.',
          error_code: data?.error_code || 'SLOT_ALREADY_BOOKED'
        };
      }

      if (data.appointment_id) {
        const evType: NotificationEventType = request.initial_status === 'pending' ? 'appointment.created' : 'appointment.confirmed';
        await this.dispatchLifecycleNotification(evType, data.appointment_id);
      }

      return {
        success: true,
        appointment_id: data.appointment_id,
        confirmation_token: data.confirmation_token,
        appointment: data.appointment
      };
    }

    const localResult = localAppointmentStore.createBooking(request);
    if (localResult.success && localResult.appointment_id) {
      const evType: NotificationEventType = request.initial_status === 'pending' ? 'appointment.created' : 'appointment.confirmed';
      await this.dispatchLifecycleNotification(evType, localResult.appointment_id);
    }
    return localResult;
  }

  /**
   * Dispatches lifecycle notification in a failure-safe, non-blocking manner.
   * Appointment state is authoritative; notification failures must never fail or roll back appointments.
   */
  private async dispatchLifecycleNotification(
    eventType: NotificationEventType,
    appointmentId: string,
    previousTimes?: { start?: string; end?: string }
  ): Promise<void> {
    try {
      const appt = localAppointmentStore.findAppointment(appointmentId);
      if (!appt) return;

      const p = localAppointmentStore.getPatients().find((pat) => pat.id === appt.patient_id);
      if (!p) return;

      const doc = await catalogService.getDoctorById(appt.doctor_id);
      const dep = await catalogService.getDepartmentById(appt.department_id);

      const intent = notificationService.createNotificationIntent({
        event_type: eventType,
        appointment_id: appt.appointment_id,
        doctor_name: doc?.name || appt.doctor_id,
        department_name: dep?.name || appt.department_id,
        consultation_type: appt.consultation_type,
        appointment_start: appt.appointment_start,
        appointment_end: appt.appointment_end,
        patient: {
          full_name: p.full_name,
          phone: p.phone,
          email: p.email
        },
        previous_appointment_start: previousTimes?.start,
        previous_appointment_end: previousTimes?.end
      });

      await notificationService.dispatchNotification(intent);
    } catch {
      // Safety boundary: notification delivery must never corrupt or fail the appointment operation
    }
  }

  /**
   * Retrieves sanitized public appointment confirmation.
   * Requires both the appointment reference (e.g. MRD-2026-10421) and the unguessable confirmation token.
   * Prevents booking reference enumeration and contact information harvesting.
   */
  async getPublicAppointmentConfirmation(
    appointmentId: string, 
    confirmationToken: string
  ): Promise<PublicAppointmentConfirmation | null> {
    assertSupabaseEnvironment();

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('get_public_appointment_confirmation', {
        p_appointment_id: appointmentId,
        p_confirmation_token: confirmationToken
      });

      if (error || !data || data.length === 0) {
        return null;
      }

      return data[0] as PublicAppointmentConfirmation;
    }

    return localAppointmentStore.getPublicConfirmation(appointmentId, confirmationToken);
  }

  /**
   * Helper to determine if the caller has staff or admin operational privileges.
   */
  private async isAuthorizedStaffOrAdmin(override?: boolean): Promise<boolean> {
    if (override !== undefined && !isProductionEnvironment()) {
      return override;
    }
    const role = await authService.getUserRole();
    return role === 'staff' || role === 'admin';
  }

  /**
   * Confirms an appointment (operational staff/admin action).
   * Safe against repeated confirmation.
   */
  async confirmAppointment(
    requestOrId: ConfirmAppointmentRequest | string,
    isStaffOrAdminOverride?: boolean
  ): Promise<AppointmentOperationResult> {
    try {
      assertSupabaseEnvironment();
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Configuration error',
        error_code: 'INTERNAL_ERROR'
      };
    }

    const appointmentId = typeof requestOrId === 'string' ? requestOrId : requestOrId.appointment_id;
    const isStaff = await this.isAuthorizedStaffOrAdmin(isStaffOrAdminOverride);

    if (!isStaff) {
      return {
        success: false,
        error: 'Unauthorized: staff or admin role required to confirm appointments.',
        error_code: 'UNAUTHORIZED_APPOINTMENT_OPERATION'
      };
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { data: appt, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      if (error || !appt) {
        return {
          success: false,
          error: 'Appointment was not found.',
          error_code: 'APPOINTMENT_NOT_FOUND'
        };
      }

      if (appt.status === 'completed') {
        return {
          success: false,
          error: 'Completed appointments cannot be confirmed.',
          error_code: 'APPOINTMENT_ALREADY_COMPLETED'
        };
      }

      if (appt.status === 'cancelled') {
        return {
          success: false,
          error: 'Cancelled appointments cannot be confirmed.',
          error_code: 'APPOINTMENT_ALREADY_CANCELLED'
        };
      }

      if (appt.status === 'no_show') {
        return {
          success: false,
          error: 'No-show appointments cannot be confirmed.',
          error_code: 'APPOINTMENT_ALREADY_NO_SHOW'
        };
      }

      if (appt.status === 'confirmed') {
        return {
          success: true,
          appointment_id: appt.appointment_id,
          status: 'confirmed',
          message: 'Appointment is already confirmed.'
        };
      }

      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('appointment_id', appointmentId);

      if (updateError) {
        return {
          success: false,
          error: updateError.message,
          error_code: 'INTERNAL_ERROR'
        };
      }

      await this.dispatchLifecycleNotification('appointment.confirmed', appointmentId);
      return {
        success: true,
        appointment_id: appointmentId,
        status: 'confirmed',
        message: 'Appointment confirmed successfully.'
      };
    }

    const localConfirmRes = localAppointmentStore.confirmBooking(appointmentId, isStaff);
    if (localConfirmRes.success && localConfirmRes.status === 'confirmed' && !localConfirmRes.message?.includes('already confirmed')) {
      await this.dispatchLifecycleNotification('appointment.confirmed', appointmentId);
    }
    return localConfirmRes;
  }

  /**
   * Cancels an appointment.
   * Supports both operational staff/admin cancellation and public cancellation with confirmation token.
   * Safe against repeated cancellation. Preserves historical records without physical deletion.
   */
  async cancelAppointment(
    requestOrId: CancelAppointmentRequest | string,
    confirmationToken?: string,
    isStaffOrAdminOverride?: boolean
  ): Promise<AppointmentOperationResult | boolean> {
    // Legacy single-string parameter backward compatibility (e.g. Test 10 in dev/test)
    if (typeof requestOrId === 'string' && confirmationToken === undefined && isStaffOrAdminOverride === undefined) {
      if (isProductionEnvironment()) {
        const isStaff = await this.isAuthorizedStaffOrAdmin();
        if (!isStaff) {
          return {
            success: false,
            error: 'Unauthorized: valid confirmation token or staff authorization is required for cancellation in production.',
            error_code: 'UNAUTHORIZED_APPOINTMENT_OPERATION'
          };
        }
      } else {
        return localAppointmentStore.cancelBooking(requestOrId);
      }
    }

    try {
      assertSupabaseEnvironment();
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Configuration error',
        error_code: 'INTERNAL_ERROR'
      };
    }

    const appointmentId = typeof requestOrId === 'string' ? requestOrId : requestOrId.appointment_id;
    const token = typeof requestOrId === 'string' ? confirmationToken : (requestOrId.confirmation_token || confirmationToken);
    const isStaff = await this.isAuthorizedStaffOrAdmin(isStaffOrAdminOverride);

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      if (!isStaff) {
        // Use hardened SECURITY DEFINER RPC for public patient cancellation
        const { data: rpcData, error: rpcError } = await supabase.rpc('cancel_public_appointment', {
          p_appointment_id: appointmentId,
          p_confirmation_token: token || '',
          p_cancellation_reason: typeof requestOrId === 'object' ? requestOrId.cancellation_reason : undefined
        });

        if (rpcError) {
          return {
            success: false,
            error: 'Failed to cancel appointment. Please try again.',
            error_code: 'INTERNAL_ERROR'
          };
        }

        if (rpcData && rpcData.success) {
          if (!rpcData.message?.includes('already cancelled')) {
            await this.dispatchLifecycleNotification('appointment.cancelled', appointmentId);
          }
          return {
            success: true,
            appointment_id: rpcData.appointment_id || appointmentId,
            status: 'cancelled',
            message: rpcData.message || 'Appointment cancelled successfully.'
          };
        }

        return {
          success: false,
          error: rpcData?.error || 'Appointment cancellation failed.',
          error_code: rpcData?.error_code || 'UNAUTHORIZED_APPOINTMENT_OPERATION'
        };
      }

      // Operational staff / admin path continues to use authenticated RLS update
      const { data: appt, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      if (error || !appt) {
        return {
          success: false,
          error: 'Appointment was not found.',
          error_code: 'APPOINTMENT_NOT_FOUND'
        };
      }

      if (appt.status === 'completed') {
        return {
          success: false,
          error: 'Completed appointments cannot be cancelled.',
          error_code: 'APPOINTMENT_ALREADY_COMPLETED'
        };
      }

      if (appt.status === 'cancelled') {
        return {
          success: true,
          appointment_id: appt.appointment_id,
          status: 'cancelled',
          message: 'Appointment is already cancelled.'
        };
      }

      if (appt.status === 'no_show') {
        return {
          success: false,
          error: 'No-show appointments cannot be cancelled.',
          error_code: 'APPOINTMENT_ALREADY_NO_SHOW'
        };
      }

      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('appointment_id', appointmentId);

      if (updateError) {
        return {
          success: false,
          error: updateError.message,
          error_code: 'INTERNAL_ERROR'
        };
      }

      await this.dispatchLifecycleNotification('appointment.cancelled', appointmentId);
      return {
        success: true,
        appointment_id: appointmentId,
        status: 'cancelled',
        message: 'Appointment cancelled successfully.'
      };
    }

    const localCancelRes = localAppointmentStore.cancelBookingWithResult(appointmentId, token, isStaff);
    if (localCancelRes.success && localCancelRes.status === 'cancelled' && !localCancelRes.message?.includes('already cancelled')) {
      await this.dispatchLifecycleNotification('appointment.cancelled', appointmentId);
    }
    return localCancelRes;
  }

  /**
   * Completes a confirmed appointment (operational staff/admin action).
   */
  async completeAppointment(
    appointmentId: string,
    isStaffOrAdminOverride?: boolean
  ): Promise<AppointmentOperationResult> {
    try {
      assertSupabaseEnvironment();
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Configuration error',
        error_code: 'INTERNAL_ERROR'
      };
    }

    const isStaff = await this.isAuthorizedStaffOrAdmin(isStaffOrAdminOverride);
    if (!isStaff) {
      return {
        success: false,
        error: 'Unauthorized: staff or admin role required to complete appointments.',
        error_code: 'UNAUTHORIZED_APPOINTMENT_OPERATION'
      };
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { data: appt, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      if (error || !appt) {
        return {
          success: false,
          error: 'Appointment was not found.',
          error_code: 'APPOINTMENT_NOT_FOUND'
        };
      }

      if (appt.status === 'completed') {
        return {
          success: true,
          appointment_id: appt.appointment_id,
          status: 'completed',
          message: 'Appointment is already completed.'
        };
      }

      if (appt.status === 'cancelled') {
        return {
          success: false,
          error: 'Cancelled appointments cannot be marked completed.',
          error_code: 'APPOINTMENT_ALREADY_CANCELLED'
        };
      }

      if (appt.status === 'no_show') {
        return {
          success: false,
          error: 'No-show appointments cannot be marked completed.',
          error_code: 'APPOINTMENT_ALREADY_NO_SHOW'
        };
      }

      if (appt.status === 'pending') {
        return {
          success: false,
          error: 'Pending appointments must be confirmed before completion.',
          error_code: 'INVALID_STATUS_TRANSITION'
        };
      }

      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('appointment_id', appointmentId);

      if (updateError) {
        return {
          success: false,
          error: updateError.message,
          error_code: 'INTERNAL_ERROR'
        };
      }

      await this.dispatchLifecycleNotification('appointment.completed', appointmentId);
      return {
        success: true,
        appointment_id: appointmentId,
        status: 'completed',
        message: 'Appointment completed successfully.'
      };
    }

    const localCompleteRes = localAppointmentStore.completeBooking(appointmentId, isStaff);
    if (localCompleteRes.success && localCompleteRes.status === 'completed' && !localCompleteRes.message?.includes('already completed')) {
      await this.dispatchLifecycleNotification('appointment.completed', appointmentId);
    }
    return localCompleteRes;
  }

  /**
   * Records a confirmed appointment as no-show (operational staff/admin action).
   */
  async recordNoShow(
    appointmentId: string,
    isStaffOrAdminOverride?: boolean
  ): Promise<AppointmentOperationResult> {
    try {
      assertSupabaseEnvironment();
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Configuration error',
        error_code: 'INTERNAL_ERROR'
      };
    }

    const isStaff = await this.isAuthorizedStaffOrAdmin(isStaffOrAdminOverride);
    if (!isStaff) {
      return {
        success: false,
        error: 'Unauthorized: staff or admin role required to record appointment no-show.',
        error_code: 'UNAUTHORIZED_APPOINTMENT_OPERATION'
      };
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { data: appt, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      if (error || !appt) {
        return {
          success: false,
          error: 'Appointment was not found.',
          error_code: 'APPOINTMENT_NOT_FOUND'
        };
      }

      if (appt.status === 'no_show') {
        return {
          success: true,
          appointment_id: appt.appointment_id,
          status: 'no_show',
          message: 'Appointment is already marked no-show.'
        };
      }

      if (appt.status === 'completed') {
        return {
          success: false,
          error: 'Completed appointments cannot be marked no-show.',
          error_code: 'APPOINTMENT_ALREADY_COMPLETED'
        };
      }

      if (appt.status === 'cancelled') {
        return {
          success: false,
          error: 'Cancelled appointments cannot be marked no-show.',
          error_code: 'APPOINTMENT_ALREADY_CANCELLED'
        };
      }

      if (appt.status === 'pending') {
        return {
          success: false,
          error: 'Pending appointments cannot be marked no-show.',
          error_code: 'INVALID_STATUS_TRANSITION'
        };
      }

      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'no_show', updated_at: new Date().toISOString() })
        .eq('appointment_id', appointmentId);

      if (updateError) {
        return {
          success: false,
          error: updateError.message,
          error_code: 'INTERNAL_ERROR'
        };
      }

      return {
        success: true,
        appointment_id: appointmentId,
        status: 'no_show',
        message: 'Appointment marked as no-show.'
      };
    }

    return localAppointmentStore.recordNoShowBooking(appointmentId, isStaff);
  }

  /**
   * Reschedules an appointment to a new validated time window.
   * Validates doctor schedule, exceptions, availability, and active holds.
   * Cancels the original appointment and creates a new appointment to preserve auditability.
   */
  async rescheduleAppointment(
    request: RescheduleAppointmentRequest,
    isStaffOrAdminOverride?: boolean
  ): Promise<RescheduleResult> {
    try {
      assertSupabaseEnvironment();
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Configuration error',
        error_code: 'INTERNAL_ERROR'
      };
    }

    const isStaff = await this.isAuthorizedStaffOrAdmin(isStaffOrAdminOverride);

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      if (isStaff) {
        // Dedicated authenticated staff and admin operational rescheduling RPC
        const { data: rpcData, error: rpcError } = await supabase.rpc('reschedule_staff_appointment', {
          p_appointment_id: request.appointment_id,
          p_new_slot_start: request.new_slot_start,
          p_new_slot_end: request.new_slot_end,
          p_hold_token: request.hold_token || null
        });

        if (rpcError) {
          return {
            success: false,
            error: 'Failed to reschedule appointment. Please try again.',
            error_code: 'INTERNAL_ERROR'
          };
        }

        if (rpcData && rpcData.success) {
          await this.dispatchLifecycleNotification('appointment.rescheduled', rpcData.new_appointment_id, {
            start: request.new_slot_start,
            end: request.new_slot_end
          });

          return {
            success: true,
            original_appointment_id: rpcData.original_appointment_id || request.appointment_id,
            new_appointment_id: rpcData.new_appointment_id
          };
        }

        return {
          success: false,
          error: rpcData?.error || 'Staff reschedule operation failed.',
          error_code: rpcData?.error_code || 'UNAUTHORIZED_APPOINTMENT_OPERATION'
        };
      }

      // Public patient rescheduling path using confirmation token
      const { data: rpcData, error: rpcError } = await supabase.rpc('reschedule_public_appointment', {
        p_appointment_id: request.appointment_id,
        p_confirmation_token: request.confirmation_token || '',
        p_new_slot_start: request.new_slot_start,
        p_new_slot_end: request.new_slot_end,
        p_hold_token: request.hold_token || null
      });

      if (rpcError) {
        return {
          success: false,
          error: 'Failed to reschedule appointment. Please try again.',
          error_code: 'INTERNAL_ERROR'
        };
      }

      if (rpcData && rpcData.success) {
        await this.dispatchLifecycleNotification('appointment.rescheduled', rpcData.new_appointment_id, {
          start: request.new_slot_start,
          end: request.new_slot_end
        });

        return {
          success: true,
          original_appointment_id: rpcData.original_appointment_id || request.appointment_id,
          new_appointment_id: rpcData.new_appointment_id,
          confirmation_token: rpcData.confirmation_token,
          new_appointment: rpcData.appointment
        };
      }

      return {
        success: false,
        error: rpcData?.error || 'Reschedule operation failed.',
        error_code: rpcData?.error_code || 'UNAUTHORIZED_APPOINTMENT_OPERATION'
      };
    }

    const origAppt = localAppointmentStore.findAppointment(request.appointment_id);
    const origStart = origAppt?.appointment_start;
    const origEnd = origAppt?.appointment_end;

    const rescheduleRes = await localAppointmentStore.rescheduleBooking(request, isStaff);
    if (rescheduleRes.success && rescheduleRes.new_appointment_id) {
      await this.dispatchLifecycleNotification('appointment.rescheduled', rescheduleRes.new_appointment_id, {
        start: origStart,
        end: origEnd
      });
    }
    return rescheduleRes;
  }

  /**
   * Retrieves operational appointments for staff/admin views.
   */
  async getStaffAppointments(
    filter?: AppointmentFilter,
    isStaffOrAdminOverride?: boolean
  ): Promise<StaffAppointmentView[]> {
    assertSupabaseEnvironment();

    const isStaff = await this.isAuthorizedStaffOrAdmin(isStaffOrAdminOverride);
    if (!isStaff) {
      return [];
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('appointments').select('*, doctors(*), departments(*), patients(*)');
      if (filter?.doctor_id) query = query.eq('doctor_id', filter.doctor_id);
      if (filter?.department_id) query = query.eq('department_id', filter.department_id);
      if (filter?.status) query = query.eq('status', filter.status);
      if (filter?.date_from) query = query.gte('appointment_start', filter.date_from);
      if (filter?.date_to) query = query.lte('appointment_start', filter.date_to);

      const { data, error } = await query.order('appointment_start', { ascending: true });
      if (!error && data) {
        return data.map((appt: any) => ({
          id: appt.id,
          appointment_id: appt.appointment_id,
          doctor_id: appt.doctor_id,
          doctor_name: appt.doctors?.name || appt.doctor_id,
          department_id: appt.department_id,
          department_name: appt.departments?.name || appt.department_id,
          consultation_type: appt.consultation_type,
          appointment_start: appt.appointment_start,
          appointment_end: appt.appointment_end,
          patient_name: appt.patients?.full_name || 'Anonymous Patient',
          patient_phone: appt.patients?.phone || '',
          patient_email: appt.patients?.email || '',
          status: appt.status,
          created_at: appt.created_at,
          updated_at: appt.updated_at
        }));
      }
    }

    return localAppointmentStore.getStaffAppointments(filter);
  }

  /**
   * Retrieves a single operational appointment by ID for staff/admin views.
   */
  async getStaffAppointmentById(
    appointmentId: string,
    isStaffOrAdminOverride?: boolean
  ): Promise<StaffAppointmentView | null> {
    assertSupabaseEnvironment();

    const isStaff = await this.isAuthorizedStaffOrAdmin(isStaffOrAdminOverride);
    if (!isStaff) {
      return null;
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, doctors(*), departments(*), patients(*)')
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      if (error || !data) return null;
      return {
        id: data.id,
        appointment_id: data.appointment_id,
        doctor_id: data.doctor_id,
        doctor_name: data.doctors?.name || data.doctor_id,
        department_id: data.department_id,
        department_name: data.departments?.name || data.department_id,
        consultation_type: data.consultation_type,
        appointment_start: data.appointment_start,
        appointment_end: data.appointment_end,
        patient_name: data.patients?.full_name || 'Anonymous Patient',
        patient_phone: data.patients?.phone || '',
        patient_email: data.patients?.email || '',
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    }

    return localAppointmentStore.getStaffAppointmentById(appointmentId);
  }

  /**
   * Retrieves operational patient directory for staff/admin views.
   * Avoids N+1 queries by aggregating appointments in a consolidated query.
   * Respects RLS and suppresses all confirmation tokens.
   */
  async getStaffPatients(
    searchQuery?: string,
    isStaffOrAdminOverride?: boolean
  ): Promise<StaffPatientView[]> {
    assertSupabaseEnvironment();

    const isStaff = await this.isAuthorizedStaffOrAdmin(isStaffOrAdminOverride);
    if (!isStaff) {
      return [];
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      let patientQuery = supabase
        .from('patients')
        .select('id, full_name, phone, email, created_at')
        .order('full_name', { ascending: true })
        .limit(100);

      const trimmedSearch = searchQuery?.trim();
      if (trimmedSearch) {
        patientQuery = patientQuery.or(
          `full_name.ilike.%${trimmedSearch}%,phone.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%`
        );
      }

      const { data: patientRows, error: patErr } = await patientQuery;
      if (patErr || !patientRows) {
        return [];
      }

      const patientIds = patientRows.map((p: any) => p.id);
      const apptsByPatientId: Record<string, StaffAppointmentView[]> = {};

      if (patientIds.length > 0) {
        const { data: apptRows, error: apptErr } = await supabase
          .from('appointments')
          .select('*, doctors(*), departments(*), patients(*)')
          .in('patient_id', patientIds)
          .order('appointment_start', { ascending: false });

        if (!apptErr && apptRows) {
          for (const appt of apptRows) {
            const patId = appt.patient_id;
            if (!apptsByPatientId[patId]) {
              apptsByPatientId[patId] = [];
            }
            apptsByPatientId[patId].push({
              id: appt.id,
              appointment_id: appt.appointment_id,
              doctor_id: appt.doctor_id,
              doctor_name: appt.doctors?.name || appt.doctor_id,
              department_id: appt.department_id,
              department_name: appt.departments?.name || appt.department_id,
              consultation_type: appt.consultation_type,
              appointment_start: appt.appointment_start,
              appointment_end: appt.appointment_end,
              patient_name: appt.patients?.full_name || 'Anonymous Patient',
              patient_phone: appt.patients?.phone || '',
              patient_email: appt.patients?.email || '',
              status: appt.status,
              created_at: appt.created_at,
              updated_at: appt.updated_at
            });
          }
        }
      }

      return patientRows.map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        email: p.email,
        created_at: p.created_at,
        total_appointments: apptsByPatientId[p.id]?.length || 0,
        recent_appointments: (apptsByPatientId[p.id] || []).slice(0, 5)
      }));
    }

    // Local in-memory store fallback
    const localPatients = localAppointmentStore.getPatients();
    const localAppts = localAppointmentStore.getStaffAppointments();
    const trimmed = searchQuery?.toLowerCase().trim();

    return localPatients
      .filter((p) => {
        if (!trimmed) return true;
        return (
          p.full_name.toLowerCase().includes(trimmed) ||
          p.phone.includes(trimmed) ||
          p.email.toLowerCase().includes(trimmed)
        );
      })
      .map((p) => {
        const matchingAppts = localAppts.filter(
          (a) => a.patient_name === p.full_name || a.patient_email === p.email
        );
        return {
          id: p.id,
          full_name: p.full_name,
          phone: p.phone,
          email: p.email,
          created_at: p.created_at,
          total_appointments: matchingAppts.length,
          recent_appointments: matchingAppts.slice(0, 5)
        };
      });
  }

  /**
   * Retrieves sanitized public appointment details.
   * Requires matching appointment reference and unpredictable confirmation token.
   * Never leaks internal database IDs, patient contact information, or confirmation tokens.
   */
  async getPublicAppointment(
    appointmentId: string,
    confirmationToken: string
  ): Promise<PublicAppointmentView | null> {
    return this.getPublicAppointmentConfirmation(appointmentId, confirmationToken);
  }

  /**
   * Legacy status updater (preserved for administrative backward compatibility).
   */
  async updateAppointmentStatus(appointmentId: string, status: AppointmentStatus): Promise<boolean> {
    assertSupabaseEnvironment();

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('appointment_id', appointmentId);
      return !error;
    }

    return localAppointmentStore.updateStatus(appointmentId, status);
  }

  /**
   * Retrieves raw appointments (internal backward compatibility).
   */
  async getAppointments(filter?: AppointmentFilter): Promise<DbAppointment[]> {
    assertSupabaseEnvironment();

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('appointments').select('*, doctors(*), departments(*), patients(*)');
      if (filter?.doctor_id) query = query.eq('doctor_id', filter.doctor_id);
      if (filter?.department_id) query = query.eq('department_id', filter.department_id);
      if (filter?.status) query = query.eq('status', filter.status);
      if (filter?.date_from) query = query.gte('appointment_start', filter.date_from);
      if (filter?.date_to) query = query.lte('appointment_start', filter.date_to);

      const { data, error } = await query.order('appointment_start', { ascending: true });
      if (!error && data) return data as DbAppointment[];
    }

    let results = localAppointmentStore.getAppointments();
    if (filter?.doctor_id) {
      results = results.filter((a) => a.doctor_id === filter.doctor_id);
    }
    if (filter?.department_id) {
      results = results.filter((a) => a.department_id === filter.department_id);
    }
    if (filter?.status) {
      results = results.filter((a) => a.status === filter.status);
    }
    if (filter?.date_from) {
      results = results.filter((a) => a.appointment_start >= filter.date_from!);
    }
    if (filter?.date_to) {
      results = results.filter((a) => a.appointment_start <= filter.date_to!);
    }
    return results;
  }
}

export const appointmentService = new AppointmentService();
