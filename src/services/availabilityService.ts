import type { 
  DbDoctor, 
  DbConsultationType, 
  DbDoctorSchedule, 
  DbScheduleException,
  DbAppointment,
  DbSlotHold
} from '@/types/database';
import type { 
  GetLiveAvailabilityRequest, 
  LiveAvailabilityResult, 
  SanitizedBusyInterval 
} from '@/types/scheduling';
import { catalogService } from './catalogService';
import { calculateDoctorAvailability } from './availabilityEngine';
import { getSupabaseClient, isSupabaseConfigured, assertSupabaseEnvironment } from './supabaseClient';
import { localAppointmentStore } from './appointmentService';
import { parseISTToUTC, MERIDIAN_TIMEZONE, isValidCalendarDate } from '@/lib/timezone';

export { isValidCalendarDate };

export class AvailabilityService {
  /**
   * Retrieves live available slots for a doctor and consultation type on an authentic IST calendar date.
   * Orchestrates catalog queries, live busy interval retrieval, and delegates scheduling calculations
   * strictly to the single authoritative Phase 12 availabilityEngine.
   */
  async getLiveAvailability(request: GetLiveAvailabilityRequest): Promise<LiveAvailabilityResult> {
    const { doctorId, consultationTypeId, date, currentTimeUtc, activeHoldToken } = request;

    // 1. Verify production environment configuration guard
    try {
      assertSupabaseEnvironment();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Database configuration failure.';
      return {
        success: false,
        error: message,
        error_code: 'CONFIGURATION_ERROR'
      };
    }

    // 2. Date validation (structure and authentic calendar day)
    if (!isValidCalendarDate(date)) {
      return {
        success: false,
        error: `Invalid date '${date}'. A valid calendar date in YYYY-MM-DD format is required.`,
        error_code: 'INVALID_DATE'
      };
    }

    // 3. Resolve doctor and consultation type concurrently
    let doctor: DbDoctor | null = null;
    let consultationType: DbConsultationType | null = null;

    try {
      const [docRes, consRes] = await Promise.all([
        catalogService.getDoctorById(doctorId, true),
        catalogService.getConsultationTypeById(consultationTypeId)
      ]);
      doctor = docRes;
      consultationType = consRes;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to query catalog.';
      return {
        success: false,
        error: message,
        error_code: 'DATABASE_ERROR'
      };
    }

    if (!doctor) {
      return {
        success: false,
        error: `Doctor with identifier '${doctorId}' not found.`,
        error_code: 'DOCTOR_NOT_FOUND'
      };
    }

    if (!doctor.active) {
      return {
        success: false,
        error: `Doctor '${doctor.name}' is currently inactive.`,
        error_code: 'DOCTOR_INACTIVE'
      };
    }

    if (!consultationType) {
      return {
        success: false,
        error: `Consultation type with identifier '${consultationTypeId}' not found.`,
        error_code: 'CONSULTATION_TYPE_NOT_FOUND'
      };
    }

    // 4. Validate consultation duration
    const duration = consultationType.duration_minutes;
    if (!duration || duration <= 0 || duration > 240) {
      return {
        success: false,
        error: `Consultation type '${consultationType.name}' has invalid duration of ${duration} minutes.`,
        error_code: 'INVALID_CONSULTATION_DURATION'
      };
    }

    // 5. Retrieve doctor recurring schedules and schedule exceptions
    let schedules: DbDoctorSchedule[] = [];
    let exceptions: DbScheduleException[] = [];

    try {
      const [schRes, excRes] = await Promise.all([
        catalogService.getDoctorSchedules(doctorId),
        catalogService.getScheduleExceptions(doctorId)
      ]);
      schedules = schRes;
      exceptions = excRes;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to query doctor schedules.';
      return {
        success: false,
        error: message,
        error_code: 'DATABASE_ERROR'
      };
    }

    // 6. Resolve busy intervals using the complete half-open IST day range:
    // [requested date 00:00 IST, next calendar date 00:00 IST) converted to UTC
    const [yearStr, monthStr, dayStr] = date.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    const nextCalendarDateObj = new Date(Date.UTC(year, month - 1, day + 1));
    const nextY = nextCalendarDateObj.getUTCFullYear();
    const nextM = String(nextCalendarDateObj.getUTCMonth() + 1).padStart(2, '0');
    const nextD = String(nextCalendarDateObj.getUTCDate()).padStart(2, '0');
    const nextDateStr = `${nextY}-${nextM}-${nextD}`;

    const rangeStartUtc = parseISTToUTC(date, '00:00');
    const rangeEndUtc = parseISTToUTC(nextDateStr, '00:00');

    const supabase = getSupabaseClient();
    let busyIntervals: SanitizedBusyInterval[] | undefined = undefined;
    let localAppointments: DbAppointment[] | undefined = undefined;
    let localHolds: DbSlotHold[] | undefined = undefined;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: busyData, error } = await supabase.rpc('get_sanitized_doctor_busy_intervals', {
          p_doctor_id: doctorId,
          p_range_start: rangeStartUtc.toISOString(),
          p_range_end: rangeEndUtc.toISOString(),
          p_client_hold_token: activeHoldToken || null
        });

        if (error) {
          return {
            success: false,
            error: `RPC failure: ${error.message}`,
            error_code: 'DATABASE_ERROR'
          };
        }

        busyIntervals = (busyData || []) as SanitizedBusyInterval[];
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Database RPC execution error.';
        return {
          success: false,
          error: message,
          error_code: 'DATABASE_ERROR'
        };
      }
    } else {
      // Local fallback mode: reuse existing in-memory appointment store
      localAppointments = localAppointmentStore.getAppointments();
      localHolds = localAppointmentStore.getSlotHolds();
    }

    // 7. Invoke authoritative Phase 12 availabilityEngine exactly once
    const dayAvailability = calculateDoctorAvailability({
      doctorId,
      dateStr: date,
      schedules,
      exceptions,
      existingAppointments: localAppointments,
      activeHolds: localHolds,
      busyIntervals,
      customDurationMinutes: duration,
      currentTimeUtc,
      activeHoldToken
    });

    // 8. Return sanitized API-ready response without internal metadata or secrets
    return {
      success: true,
      data: {
        ...dayAvailability,
        doctor: {
          id: doctor.id,
          name: doctor.name,
          department_id: doctor.department_id,
          designation: doctor.designation,
          credentials: doctor.credentials
        },
        consultation_type: {
          id: consultationType.id,
          name: consultationType.name,
          code: consultationType.code,
          duration_minutes: consultationType.duration_minutes,
          description: consultationType.description
        },
        timezone: MERIDIAN_TIMEZONE
      }
    };
  }
}

export const availabilityService = new AvailabilityService();
