import type { 
  DbDoctorSchedule, 
  DbScheduleException, 
  DbAppointment, 
  DbSlotHold 
} from '@/types/database';
import type { 
  CalculatedSlot, 
  DayAvailability, 
  SanitizedBusyInterval 
} from '@/types/scheduling';
import { 
  parseISTToUTC, 
  getISTDayOfWeek, 
  formatISTTimeDisplay 
} from '@/lib/timezone';

export interface GenerateSlotsParams {
  doctorId: string;
  dateStr: string; // YYYY-MM-DD in Asia/Kolkata
  schedules: DbDoctorSchedule[];
  exceptions: DbScheduleException[];
  existingAppointments?: DbAppointment[];
  activeHolds?: DbSlotHold[];
  busyIntervals?: SanitizedBusyInterval[];
  customDurationMinutes?: number;
  currentTimeUtc?: Date;
  activeHoldToken?: string; // If the current user holds the slot, it appears available to them
}

export interface NormalizedBusyInterval {
  startUtc: Date;
  endUtc: Date;
  source: 'appointment' | 'hold' | 'exception';
  reason: 'booked' | 'held' | 'exception';
}

/**
 * Checks if two time intervals overlap.
 * Intervals are treated as half-open: [start, end)
 */
export function isTimeIntervalOverlapping(
  startA: Date, 
  endA: Date, 
  startB: Date, 
  endB: Date
): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

/**
 * Parses an HH:mm 24-hour time string into total minutes from midnight.
 */
export function timeStrToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Normalizes all busy interval sources (appointments, active holds, partial-day blocked exceptions,
 * or pre-sanitized RPC intervals) into a unified, chronological list.
 * Distinguishes source and reason internally while converging into a single representation.
 */
export function normalizeBusyIntervals(params: {
  dateStr: string;
  doctorId: string;
  existingAppointments?: DbAppointment[];
  activeHolds?: DbSlotHold[];
  busyIntervals?: SanitizedBusyInterval[];
  exceptions?: DbScheduleException[];
  currentTimeUtc: Date;
  activeHoldToken?: string;
}): NormalizedBusyInterval[] {
  const {
    dateStr,
    doctorId,
    existingAppointments = [],
    activeHolds = [],
    busyIntervals,
    exceptions = [],
    currentTimeUtc,
    activeHoldToken
  } = params;

  const normalized: NormalizedBusyInterval[] = [];

  // 1. Direct ingestion of pre-sanitized busy intervals (from Supabase RPC)
  if (busyIntervals && busyIntervals.length > 0) {
    for (const b of busyIntervals) {
      normalized.push({
        startUtc: new Date(b.busy_start),
        endUtc: new Date(b.busy_end),
        source: b.reason === 'booked' ? 'appointment' : 'hold',
        reason: b.reason
      });
    }
  } else {
    // 2. Ingest raw active appointments (excluding cancelled)
    for (const appt of existingAppointments) {
      if (appt.doctor_id !== doctorId || appt.status === 'cancelled') continue;
      normalized.push({
        startUtc: new Date(appt.appointment_start),
        endUtc: new Date(appt.appointment_end),
        source: 'appointment',
        reason: 'booked'
      });
    }

    // 3. Ingest active unexpired holds (excluding holder's own active token)
    for (const hold of activeHolds) {
      if (hold.doctor_id !== doctorId || hold.status !== 'active') continue;
      const expiresAt = new Date(hold.expires_at);
      if (expiresAt.getTime() <= currentTimeUtc.getTime()) continue; // Expired
      if (activeHoldToken && hold.hold_token === activeHoldToken) continue; // Held by caller

      normalized.push({
        startUtc: new Date(hold.slot_start),
        endUtc: new Date(hold.slot_end),
        source: 'hold',
        reason: 'held'
      });
    }
  }

  // 4. Ingest partial-day blocked exceptions
  for (const exc of exceptions) {
    if (exc.doctor_id !== doctorId || exc.exception_date !== dateStr) continue;
    if (exc.exception_type === 'blocked' && exc.start_time && exc.end_time) {
      const excStartMin = timeStrToMinutes(exc.start_time);
      const excEndMin = timeStrToMinutes(exc.end_time);
      if (excEndMin > excStartMin) {
        normalized.push({
          startUtc: parseISTToUTC(dateStr, exc.start_time),
          endUtc: parseISTToUTC(dateStr, exc.end_time),
          source: 'exception',
          reason: 'exception'
        });
      }
    }
  }

  // Sort intervals chronologically by start time
  normalized.sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());

  return normalized;
}

/**
 * Computes available consultation slots for a doctor on a specific calendar date in Asia/Kolkata.
 * Single authoritative implementation integrating:
 * 1. Weekly recurring schedule rules sorted chronologically
 * 2. Schedule exceptions (full-day leaves/holidays, partial blocked windows, modified hours)
 * 3. Normalized busy intervals from either Supabase RPC or local store
 * 4. Active temporary slot holds (with automatic expiration check and self-hold recognition)
 * 5. Past slot filtering against currentTimeUtc
 */
export function calculateDoctorAvailability(params: GenerateSlotsParams): DayAvailability {
  const {
    doctorId,
    dateStr,
    schedules,
    exceptions,
    existingAppointments = [],
    activeHolds = [],
    busyIntervals,
    customDurationMinutes,
    currentTimeUtc = new Date(),
    activeHoldToken
  } = params;

  const dayOfWeek = getISTDayOfWeek(dateStr);

  // Find recurring schedules for this weekday and active status
  const doctorSchedulesForDay = schedules.filter(
    (s) => s.doctor_id === doctorId && s.day_of_week === dayOfWeek && s.active
  );

  // Check for day-level exceptions for this specific doctor and date
  const dayExceptions = exceptions.filter(
    (e) => e.doctor_id === doctorId && e.exception_date === dateStr
  );

  // 1. Full-day exception precedence: leave, holiday, or full-day block overrides all schedules
  const fullDayOffException = dayExceptions.find(
    (e) => 
      e.exception_type === 'leave' || 
      e.exception_type === 'holiday' || 
      (e.exception_type === 'blocked' && (!e.start_time || !e.end_time))
  );

  if (fullDayOffException) {
    return {
      doctor_id: doctorId,
      date: dateStr,
      day_of_week: dayOfWeek,
      is_working_day: false,
      exception_reason: fullDayOffException.reason || 'Doctor unavailable',
      slots: []
    };
  }

  // 2. Off-day: no recurring OPD hours for this day of week
  if (doctorSchedulesForDay.length === 0) {
    return {
      doctor_id: doctorId,
      date: dateStr,
      day_of_week: dayOfWeek,
      is_working_day: false,
      exception_reason: 'No scheduled OPD hours on this day',
      slots: []
    };
  }

  // 3. Check for modified hours exception (replaces normal window start/end on this date)
  const modifiedHoursException = dayExceptions.find(
    (e) => e.exception_type === 'modified_hours' && Boolean(e.start_time) && Boolean(e.end_time)
  );

  // 4. Sort schedules chronologically by start time
  const sortedSchedules = [...doctorSchedulesForDay].sort((a, b) => 
    a.start_time.localeCompare(b.start_time)
  );

  // 5. Normalize all busy intervals into unified sorted representation
  const normalizedBusyIntervals = normalizeBusyIntervals({
    dateStr,
    doctorId,
    existingAppointments,
    activeHolds,
    busyIntervals,
    exceptions: dayExceptions,
    currentTimeUtc,
    activeHoldToken
  });

  const generatedSlots: CalculatedSlot[] = [];

  for (const schedule of sortedSchedules) {
    const duration = customDurationMinutes || schedule.consultation_duration || 30;

    // Determine window boundaries in minutes from midnight
    let startTotalMinutes = timeStrToMinutes(schedule.start_time);
    let endTotalMinutes = timeStrToMinutes(schedule.end_time);

    // Apply modified_hours exception if defined
    if (modifiedHoursException && modifiedHoursException.start_time && modifiedHoursException.end_time) {
      const modStartMin = timeStrToMinutes(modifiedHoursException.start_time);
      const modEndMin = timeStrToMinutes(modifiedHoursException.end_time);
      if (modEndMin > modStartMin) {
        startTotalMinutes = modStartMin;
        endTotalMinutes = modEndMin;
      }
    }

    if (endTotalMinutes <= startTotalMinutes || duration <= 0) {
      continue;
    }

    for (let currentMin = startTotalMinutes; currentMin + duration <= endTotalMinutes; currentMin += duration) {
      const slotStartH = String(Math.floor(currentMin / 60)).padStart(2, '0');
      const slotStartM = String(currentMin % 60).padStart(2, '0');
      const slotEndMin = currentMin + duration;
      const slotEndH = String(Math.floor(slotEndMin / 60)).padStart(2, '0');
      const slotEndM = String(slotEndMin % 60).padStart(2, '0');

      const slotStartTimeStr = `${slotStartH}:${slotStartM}`;
      const slotEndTimeStr = `${slotEndH}:${slotEndM}`;

      const slotStartUtc = parseISTToUTC(dateStr, slotStartTimeStr);
      const slotEndUtc = parseISTToUTC(dateStr, slotEndTimeStr);

      const slotStartIso = slotStartUtc.toISOString();
      const slotEndIso = slotEndUtc.toISOString();

      // Check if slot has already passed
      if (slotStartUtc.getTime() <= currentTimeUtc.getTime()) {
        generatedSlots.push({
          slot_start: slotStartIso,
          slot_end: slotEndIso,
          ist_time: formatISTTimeDisplay(slotStartUtc, false),
          ist_date: dateStr,
          duration_minutes: duration,
          available: false,
          unavailability_reason: 'passed'
        });
        continue;
      }

      // Check collision against normalized busy intervals
      const conflictingInterval = normalizedBusyIntervals.find((inv) =>
        isTimeIntervalOverlapping(slotStartUtc, slotEndUtc, inv.startUtc, inv.endUtc)
      );

      if (conflictingInterval) {
        generatedSlots.push({
          slot_start: slotStartIso,
          slot_end: slotEndIso,
          ist_time: formatISTTimeDisplay(slotStartUtc, false),
          ist_date: dateStr,
          duration_minutes: duration,
          available: false,
          unavailability_reason: conflictingInterval.reason
        });
        continue;
      }

      // Slot is fully available
      generatedSlots.push({
        slot_start: slotStartIso,
        slot_end: slotEndIso,
        ist_time: formatISTTimeDisplay(slotStartUtc, false),
        ist_date: dateStr,
        duration_minutes: duration,
        available: true
      });
    }
  }

  return {
    doctor_id: doctorId,
    date: dateStr,
    day_of_week: dayOfWeek,
    is_working_day: true,
    slots: generatedSlots
  };
}
