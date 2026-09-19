import { departments } from '@/data/departments';
import { specialists } from '@/data/specialists';
import type { 
  DbDepartment, 
  DbDoctor, 
  DbDoctorSchedule, 
  DbScheduleException,
  DbConsultationType,
  DbAppointment,
  DbSlotHold
} from '@/types/database';
import type {
  CreateDoctorInput,
  UpdateDoctorInput,
  DoctorOperationResult,
  ScheduleWindowInput,
  DoctorScheduleOperationResult,
  CreateScheduleExceptionInput,
  UpdateScheduleExceptionInput,
  ScheduleExceptionOperationResult,
  ScheduleManagementErrorCode
} from '@/types/scheduling';
import { getSupabaseClient, isSupabaseConfigured, isProductionEnvironment } from './supabaseClient';
import { authService } from './authService';
import { localAppointmentStore } from './appointmentService';
import { 
  parseISTToUTC, 
  getISTDateString, 
  getISTDayOfWeek, 
  isValidCalendarDate 
} from '@/lib/timezone';
import { timeStrToMinutes, isTimeIntervalOverlapping } from './availabilityEngine';

/**
 * Standard consultation types at Meridian Hospital
 */
export const STANDARD_CONSULTATION_TYPES: DbConsultationType[] = [
  {
    id: 'in-person',
    name: 'In-Person Consultation',
    code: 'IN_PERSON',
    duration_minutes: 30,
    description: 'Comprehensive face-to-face consultation at the Lower Parel clinic suite.',
    active: true
  },
  {
    id: 'follow-up',
    name: 'Follow-Up Review',
    code: 'FOLLOW_UP',
    duration_minutes: 20,
    description: 'Review of diagnostic tests, medication titration, and recovery progress.',
    active: true
  },
  {
    id: 'second-opinion',
    name: 'Second Opinion / Complex Case Review',
    code: 'SECOND_OPINION',
    duration_minutes: 45,
    description: 'Detailed multi-disciplinary review of past surgical or interventional recommendations.',
    active: true
  }
];

/**
 * Maps static frontend specialists into database schema format
 */
export const CANONICAL_DOCTORS: DbDoctor[] = specialists.map((s) => ({
  id: s.id,
  name: s.name,
  slug: s.id,
  department_id: s.departmentId,
  designation: s.role,
  credentials: s.qualifications,
  experience_years: s.experienceYears,
  active: true,
  created_at: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  updated_at: new Date('2026-01-01T00:00:00.000Z').toISOString()
}));

/**
 * Maps static frontend departments into database schema format
 */
export const CANONICAL_DEPARTMENTS: DbDepartment[] = departments.map((d) => ({
  id: d.id,
  name: d.name,
  slug: d.slug,
  code: d.code,
  description: d.shortDescription,
  active: true,
  created_at: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  updated_at: new Date('2026-01-01T00:00:00.000Z').toISOString()
}));

/**
 * Canonical doctor weekly recurring schedules derived from OPD clinic days
 */
export const CANONICAL_SCHEDULES: DbDoctorSchedule[] = [
  // Dr. Ananya Mehta (Cardiology): Mon, Wed, Fri 10:00 to 14:00 (30 min consultations)
  { id: 'sch-ananya-mon', doctor_id: 'dr-ananya-mehta', day_of_week: 1, start_time: '10:00', end_time: '14:00', consultation_duration: 30, active: true },
  { id: 'sch-ananya-wed', doctor_id: 'dr-ananya-mehta', day_of_week: 3, start_time: '10:00', end_time: '14:00', consultation_duration: 30, active: true },
  { id: 'sch-ananya-fri', doctor_id: 'dr-ananya-mehta', day_of_week: 5, start_time: '10:00', end_time: '14:00', consultation_duration: 30, active: true },

  // Dr. Vikram Oberoi (Oncology): Tue, Thu 11:00 to 15:00 (45 min consultations)
  { id: 'sch-vikram-tue', doctor_id: 'dr-vikram-oberoi', day_of_week: 2, start_time: '11:00', end_time: '15:00', consultation_duration: 45, active: true },
  { id: 'sch-vikram-thu', doctor_id: 'dr-vikram-oberoi', day_of_week: 4, start_time: '11:00', end_time: '15:00', consultation_duration: 45, active: true },

  // Dr. Siddharth Deshmukh (Orthopaedics): Mon, Thu, Sat 09:00 to 13:00 (30 min consultations)
  { id: 'sch-siddharth-mon', doctor_id: 'dr-siddharth-deshmukh', day_of_week: 1, start_time: '09:00', end_time: '13:00', consultation_duration: 30, active: true },
  { id: 'sch-siddharth-thu', doctor_id: 'dr-siddharth-deshmukh', day_of_week: 4, start_time: '09:00', end_time: '13:00', consultation_duration: 30, active: true },
  { id: 'sch-siddharth-sat', doctor_id: 'dr-siddharth-deshmukh', day_of_week: 6, start_time: '09:00', end_time: '13:00', consultation_duration: 30, active: true },

  // Dr. Farida Khan (Neurosciences): Tue, Wed, Fri 14:00 to 18:00 (30 min consultations)
  { id: 'sch-farida-tue', doctor_id: 'dr-farida-khan', day_of_week: 2, start_time: '14:00', end_time: '18:00', consultation_duration: 30, active: true },
  { id: 'sch-farida-wed', doctor_id: 'dr-farida-khan', day_of_week: 3, start_time: '14:00', end_time: '18:00', consultation_duration: 30, active: true },
  { id: 'sch-farida-fri', doctor_id: 'dr-farida-khan', day_of_week: 5, start_time: '14:00', end_time: '18:00', consultation_duration: 30, active: true }
];

/**
 * Sample schedule exceptions (e.g. medical symposium, planned hospital maintenance)
 */
export const INITIAL_SCHEDULE_EXCEPTIONS: DbScheduleException[] = [
  {
    id: 'exc-ananya-symposium',
    doctor_id: 'dr-ananya-mehta',
    exception_date: '2026-10-14',
    exception_type: 'leave',
    reason: 'National Cardiology Academic Symposium'
  }
];

const TIME_HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * In-memory mutable catalog store for local development and unit testing.
 * Strictly enforces referential integrity, unique constraints, and schema parity.
 */
export class InMemoryCatalogStore {
  private doctors: DbDoctor[] = [];
  private departments: DbDepartment[] = [];
  private schedules: DbDoctorSchedule[] = [];
  private exceptions: DbScheduleException[] = [];
  private consultationTypes: DbConsultationType[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.doctors = CANONICAL_DOCTORS.map((d) => ({ ...d }));
    this.departments = CANONICAL_DEPARTMENTS.map((d) => ({ ...d }));
    this.schedules = CANONICAL_SCHEDULES.map((s) => ({ ...s }));
    this.exceptions = INITIAL_SCHEDULE_EXCEPTIONS.map((e) => ({ ...e }));
    this.consultationTypes = STANDARD_CONSULTATION_TYPES.map((c) => ({ ...c }));
  }

  getDoctors(filter?: { department_id?: string; active_only?: boolean }): DbDoctor[] {
    let result = [...this.doctors];
    if (filter?.department_id) {
      result = result.filter((d) => d.department_id === filter.department_id);
    }
    if (filter?.active_only) {
      result = result.filter((d) => d.active);
    }
    return result;
  }

  getDoctorById(id: string, includeInactive = false): DbDoctor | null {
    const doc = this.doctors.find((d) => d.id === id);
    if (!doc) return null;
    if (!includeInactive && !doc.active) return null;
    return doc;
  }

  createDoctor(doctor: DbDoctor): DbDoctor {
    this.doctors.push(doctor);
    return doctor;
  }

  updateDoctor(id: string, updates: Partial<DbDoctor>): DbDoctor | null {
    const doc = this.doctors.find((d) => d.id === id);
    if (!doc) return null;
    Object.assign(doc, updates, { updated_at: new Date().toISOString() });
    return doc;
  }

  getDepartments(): DbDepartment[] {
    return [...this.departments];
  }

  getDepartmentById(id: string): DbDepartment | null {
    return this.departments.find((d) => d.id === id || d.slug === id) || null;
  }

  getDoctorSchedules(doctorId: string, activeOnly = true): DbDoctorSchedule[] {
    let result = this.schedules.filter((s) => s.doctor_id === doctorId);
    if (activeOnly) {
      result = result.filter((s) => s.active);
    }
    return result;
  }

  getScheduleById(scheduleId: string): DbDoctorSchedule | null {
    return this.schedules.find((s) => s.id === scheduleId) || null;
  }

  replaceDoctorSchedule(doctorId: string, newSchedules: DbDoctorSchedule[]): DbDoctorSchedule[] {
    this.schedules = this.schedules.filter((s) => s.doctor_id !== doctorId);
    this.schedules.push(...newSchedules);
    return newSchedules;
  }

  addScheduleWindow(window: DbDoctorSchedule): DbDoctorSchedule {
    this.schedules.push(window);
    return window;
  }

  removeScheduleWindow(scheduleId: string): boolean {
    const initialLen = this.schedules.length;
    this.schedules = this.schedules.filter((s) => s.id !== scheduleId);
    return this.schedules.length < initialLen;
  }

  getScheduleExceptions(doctorId: string): DbScheduleException[] {
    return this.exceptions.filter((e) => e.doctor_id === doctorId);
  }

  getScheduleExceptionById(id: string): DbScheduleException | null {
    return this.exceptions.find((e) => e.id === id) || null;
  }

  createScheduleException(exception: DbScheduleException): DbScheduleException {
    this.exceptions.push(exception);
    return exception;
  }

  updateScheduleException(id: string, updates: Partial<DbScheduleException>): DbScheduleException | null {
    const exc = this.exceptions.find((e) => e.id === id);
    if (!exc) return null;
    Object.assign(exc, updates);
    return exc;
  }

  deleteScheduleException(id: string): boolean {
    const initialLen = this.exceptions.length;
    this.exceptions = this.exceptions.filter((e) => e.id !== id);
    return this.exceptions.length < initialLen;
  }

  addDoctor(doctor: DbDoctor): DbDoctor {
    return this.createDoctor(doctor);
  }

  addScheduleException(exception: DbScheduleException): DbScheduleException {
    return this.createScheduleException(exception);
  }

  addDoctorSchedule(schedule: DbDoctorSchedule): DbDoctorSchedule {
    return this.addScheduleWindow(schedule);
  }

  getConsultationTypes(): DbConsultationType[] {
    return [...this.consultationTypes];
  }

  getConsultationTypeById(id: string): DbConsultationType | null {
    return this.consultationTypes.find((c) => c.id === id || c.code === id) || null;
  }
}

export const localCatalogStore = new InMemoryCatalogStore();

/**
 * Validates whether proposed schedule windows would leave any existing future
 * non-cancelled appointment without valid doctor schedule coverage.
 */
function checkScheduleConflictsWithAppointments(
  doctorId: string,
  proposedWindows: DbDoctorSchedule[],
  currentTimeUtc: Date = new Date(),
  extraAppointments?: DbAppointment[]
): { hasConflict: boolean; conflictingAppointment?: DbAppointment } {
  const localAppts = localAppointmentStore.getAppointments();
  const allAppts = extraAppointments ? [...localAppts, ...extraAppointments] : localAppts;
  const futureDoctorAppts = allAppts.filter(
    (a) => a.doctor_id === doctorId && 
           a.status !== 'cancelled' && 
           new Date(a.appointment_start).getTime() >= currentTimeUtc.getTime()
  );

  for (const appt of futureDoctorAppts) {
    const istDateStr = getISTDateString(appt.appointment_start);
    const dayOfWeek = getISTDayOfWeek(istDateStr);
    const apptStartUtc = new Date(appt.appointment_start);
    const apptEndUtc = new Date(appt.appointment_end);

    const isCovered = proposedWindows.some((w) => {
      if (w.day_of_week !== dayOfWeek || !w.active) return false;
      const winStartUtc = parseISTToUTC(istDateStr, w.start_time);
      const winEndUtc = parseISTToUTC(istDateStr, w.end_time);
      return winStartUtc.getTime() <= apptStartUtc.getTime() && winEndUtc.getTime() >= apptEndUtc.getTime();
    });

    if (!isCovered) {
      return { hasConflict: true, conflictingAppointment: appt };
    }
  }

  return { hasConflict: false };
}

/**
 * Validates whether proposed schedule windows would conflict with active temporary holds.
 */
function checkScheduleConflictsWithHolds(
  doctorId: string,
  proposedWindows: DbDoctorSchedule[],
  currentTimeUtc: Date = new Date(),
  extraHolds?: DbSlotHold[]
): { hasConflict: boolean; conflictingHold?: DbSlotHold } {
  const localHolds = localAppointmentStore.getSlotHolds();
  const allHolds = extraHolds ? [...localHolds, ...extraHolds] : localHolds;
  const activeHolds = allHolds.filter(
    (h) => h.doctor_id === doctorId && 
           h.status === 'active' && 
           new Date(h.expires_at).getTime() > currentTimeUtc.getTime()
  );

  for (const hold of activeHolds) {
    const istDateStr = getISTDateString(hold.slot_start);
    const dayOfWeek = getISTDayOfWeek(istDateStr);
    const holdStartUtc = new Date(hold.slot_start);
    const holdEndUtc = new Date(hold.slot_end);

    const isCovered = proposedWindows.some((w) => {
      if (w.day_of_week !== dayOfWeek || !w.active) return false;
      const winStartUtc = parseISTToUTC(istDateStr, w.start_time);
      const winEndUtc = parseISTToUTC(istDateStr, w.end_time);
      return winStartUtc.getTime() <= holdStartUtc.getTime() && winEndUtc.getTime() >= holdEndUtc.getTime();
    });

    if (!isCovered) {
      return { hasConflict: true, conflictingHold: hold };
    }
  }

  return { hasConflict: false };
}

/**
 * Validates whether a schedule exception would conflict with future appointments.
 */
function checkExceptionConflictsWithAppointments(
  doctorId: string,
  exception: {
    exception_date: string;
    start_time?: string;
    end_time?: string;
    exception_type: string;
  },
  currentTimeUtc: Date = new Date(),
  extraAppointments?: DbAppointment[]
): { hasConflict: boolean; conflictingAppointment?: DbAppointment } {
  const localAppts = localAppointmentStore.getAppointments();
  const allAppts = extraAppointments ? [...localAppts, ...extraAppointments] : localAppts;
  const futureDoctorAppts = allAppts.filter(
    (a) => a.doctor_id === doctorId && 
           a.status !== 'cancelled' && 
           new Date(a.appointment_start).getTime() >= currentTimeUtc.getTime()
  );

  for (const appt of futureDoctorAppts) {
    const istDateStr = getISTDateString(appt.appointment_start);
    if (istDateStr !== exception.exception_date) continue;

    if (
      exception.exception_type === 'leave' ||
      exception.exception_type === 'holiday' ||
      (exception.exception_type === 'blocked' && (!exception.start_time || !exception.end_time))
    ) {
      return { hasConflict: true, conflictingAppointment: appt };
    }

    if (exception.start_time && exception.end_time) {
      const excStartUtc = parseISTToUTC(istDateStr, exception.start_time);
      const excEndUtc = parseISTToUTC(istDateStr, exception.end_time);
      const apptStartUtc = new Date(appt.appointment_start);
      const apptEndUtc = new Date(appt.appointment_end);

      if (isTimeIntervalOverlapping(apptStartUtc, apptEndUtc, excStartUtc, excEndUtc)) {
        return { hasConflict: true, conflictingAppointment: appt };
      }
    }
  }

  return { hasConflict: false };
}

export class CatalogService {
  /**
   * Helper to verify staff or admin role authorization.
   */
  private async isAuthorizedStaffOrAdmin(override?: boolean): Promise<boolean> {
    if (override !== undefined && !isProductionEnvironment()) {
      return override;
    }
    const role = await authService.getUserRole();
    return role === 'staff' || role === 'admin';
  }

  /**
   * Retrieves clinical departments.
   */
  async getDepartments(): Promise<DbDepartment[]> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('active', true)
        .order('name');
      if (!error && data) return data as DbDepartment[];
    }
    return localCatalogStore.getDepartments();
  }

  /**
   * Retrieves a single department by ID or slug.
   */
  async getDepartmentById(id: string): Promise<DbDepartment | null> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .or(`id.eq.${id},slug.eq.${id}`)
        .maybeSingle();
      if (!error && data) return data as DbDepartment;
    }
    return localCatalogStore.getDepartmentById(id);
  }

  /**
   * Retrieves doctors, optionally filtered by department or active status.
   */
  async getDoctors(filter?: { department_id?: string; active_only?: boolean } | string): Promise<DbDoctor[]> {
    const parsedFilter: { department_id?: string; active_only?: boolean } = 
      typeof filter === 'string' ? { department_id: filter, active_only: true } : (filter || { active_only: true });

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('doctors').select('*');
      if (parsedFilter.active_only) {
        query = query.eq('active', true);
      }
      if (parsedFilter.department_id) {
        query = query.eq('department_id', parsedFilter.department_id);
      }
      const { data, error } = await query.order('name');
      if (!error && data) return data as DbDoctor[];
    }

    return localCatalogStore.getDoctors(parsedFilter);
  }

  /**
   * Retrieves a doctor by ID.
   * By default, includes only active doctors unless includeInactive is set to true.
   */
  async getDoctorById(id: string, includeInactive = false): Promise<DbDoctor | null> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('doctors').select('*').eq('id', id);
      if (!includeInactive) {
        query = query.eq('active', true);
      }
      const { data, error } = await query.maybeSingle();
      if (!error) return (data as DbDoctor) || null;
    }

    return localCatalogStore.getDoctorById(id, includeInactive);
  }

  /**
   * Creates a new doctor in the hospital catalog.
   * Requires staff or admin role. Validates department referential integrity.
   */
  async createDoctor(
    input: CreateDoctorInput,
    isStaffOrAdminOverride?: boolean
  ): Promise<DoctorOperationResult> {
    const isStaff = await this.isAuthorizedStaffOrAdmin(isStaffOrAdminOverride);
    if (!isStaff) {
      return {
        success: false,
        error: 'Unauthorized: staff or admin credentials required to create doctors.',
        error_code: 'UNAUTHORIZED_SCHEDULE_OPERATION'
      };
    }

    if (!input.id || input.id.trim().length === 0) {
      return {
        success: false,
        error: 'Doctor identifier is required.',
        error_code: 'DOCTOR_NOT_FOUND'
      };
    }

    if (!input.name || input.name.trim().length === 0) {
      return {
        success: false,
        error: 'Doctor name is required.',
        error_code: 'DOCTOR_NOT_FOUND'
      };
    }

    const department = await this.getDepartmentById(input.department_id);
    if (!department) {
      return {
        success: false,
        error: `Department '${input.department_id}' not found in catalog.`,
        error_code: 'DEPARTMENT_NOT_FOUND'
      };
    }

    const now = new Date().toISOString();
    const newDoc: DbDoctor = {
      id: input.id.trim(),
      name: input.name.trim(),
      slug: input.slug?.trim() || input.id.trim(),
      department_id: input.department_id,
      designation: input.designation || 'Attending Physician',
      credentials: input.credentials || 'MBBS, MD',
      experience_years: input.experience_years ?? 5,
      active: input.active !== undefined ? input.active : true,
      created_at: now,
      updated_at: now
    };

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('doctors')
        .insert(newDoc)
        .select()
        .single();

      if (error || !data) {
        return {
          success: false,
          error: error?.message || 'Failed to insert doctor in database.',
          error_code: 'DATABASE_ERROR'
        };
      }
      return { success: true, doctor: data as DbDoctor };
    }

    localCatalogStore.createDoctor(newDoc);
    return { success: true, doctor: newDoc };
  }

  /**
   * Updates an existing doctor.
   * Requires staff or admin role. Validates department if changed.
   */
  async updateDoctor(
    id: string,
    updates: UpdateDoctorInput,
    isStaffOrAdminOverride?: boolean
  ): Promise<DoctorOperationResult> {
    const isStaff = await this.isAuthorizedStaffOrAdmin(isStaffOrAdminOverride);
    if (!isStaff) {
      return {
        success: false,
        error: 'Unauthorized: staff or admin credentials required to update doctors.',
        error_code: 'UNAUTHORIZED_SCHEDULE_OPERATION'
      };
    }

    const existing = await this.getDoctorById(id, true);
    if (!existing) {
      return {
        success: false,
        error: `Doctor '${id}' was not found.`,
        error_code: 'DOCTOR_NOT_FOUND'
      };
    }

    if (updates.department_id) {
      const department = await this.getDepartmentById(updates.department_id);
      if (!department) {
        return {
          success: false,
          error: `Department '${updates.department_id}' not found in catalog.`,
          error_code: 'DEPARTMENT_NOT_FOUND'
        };
      }
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('doctors')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        return {
          success: false,
          error: error?.message || 'Database update failure.',
          error_code: 'DATABASE_ERROR'
        };
      }
      return { success: true, doctor: data as DbDoctor };
    }

    const updated = localCatalogStore.updateDoctor(id, updates);
    return { success: true, doctor: updated! };
  }

  /**
   * Sets doctor active status.
   * Preserves all appointments, patients, and historical records without cancellation or deletion.
   */
  async setDoctorActiveState(
    id: string,
    active: boolean,
    isStaffOrAdminOverride?: boolean
  ): Promise<DoctorOperationResult> {
    return this.updateDoctor(id, { active }, isStaffOrAdminOverride);
  }

  /**
   * Retrieves recurring schedules for a doctor.
   */
  async getDoctorSchedules(doctorId: string, activeOnly = true): Promise<DbDoctorSchedule[]> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('doctor_schedules').select('*').eq('doctor_id', doctorId);
      if (activeOnly) {
        query = query.eq('active', true);
      }
      const { data, error } = await query.order('day_of_week').order('start_time');
      if (!error && data) return data as DbDoctorSchedule[];
    }
    return localCatalogStore.getDoctorSchedules(doctorId, activeOnly);
  }

  /**
   * Validates a single schedule window.
   */
  private validateScheduleWindow(window: ScheduleWindowInput): { valid: boolean; error?: string; error_code?: ScheduleManagementErrorCode } {
    if (
      typeof window.day_of_week !== 'number' || 
      window.day_of_week < 0 || 
      window.day_of_week > 6 || 
      !Number.isInteger(window.day_of_week)
    ) {
      return {
        valid: false,
        error: 'Invalid day of week. Day must be an integer between 0 (Sunday) and 6 (Saturday).',
        error_code: 'INVALID_SCHEDULE_DAY'
      };
    }

    if (!TIME_HHMM_REGEX.test(window.start_time || '')) {
      return {
        valid: false,
        error: `Invalid schedule start time '${window.start_time}'. HH:mm 24-hour format required.`,
        error_code: 'INVALID_SCHEDULE_TIME'
      };
    }

    if (!TIME_HHMM_REGEX.test(window.end_time || '')) {
      return {
        valid: false,
        error: `Invalid schedule end time '${window.end_time}'. HH:mm 24-hour format required.`,
        error_code: 'INVALID_SCHEDULE_TIME'
      };
    }

    const startMin = timeStrToMinutes(window.start_time);
    const endMin = timeStrToMinutes(window.end_time);
    if (startMin >= endMin) {
      return {
        valid: false,
        error: 'Schedule window start time must precede end time, and duration must be greater than zero.',
        error_code: 'INVALID_SCHEDULE_RANGE'
      };
    }

    if (window.consultation_duration !== undefined && window.consultation_duration <= 0) {
      return {
        valid: false,
        error: 'Consultation duration must be a positive number of minutes.',
        error_code: 'INVALID_SCHEDULE_RANGE'
      };
    }

    return { valid: true };
  }

  /**
   * Replaces a doctor's weekly recurring working schedule.
   * Requires staff or admin role.
   * Enforces:
   * - weekday bounds (0 to 6)
   * - HH:mm format
   * - start < end and positive duration
   * - no overlapping windows on the same day
   * - active doctor check
   * - appointment conflict protection (SCHEDULE_CONFLICTS_WITH_APPOINTMENTS)
   * - hold conflict protection (SCHEDULE_CONFLICTS_WITH_HOLDS)
   */
  async replaceDoctorSchedule(
    doctorId: string,
    windows: ScheduleWindowInput[],
    isStaffOrAdminOverride?: boolean
  ): Promise<DoctorScheduleOperationResult> {
    const isStaff = await this.isAuthorizedStaffOrAdmin(isStaffOrAdminOverride);
    if (!isStaff) {
      return {
        success: false,
        error: 'Unauthorized: staff or admin credentials required to replace doctor schedules.',
        error_code: 'UNAUTHORIZED_SCHEDULE_OPERATION'
      };
    }

    const doctor = await this.getDoctorById(doctorId, true);
    if (!doctor) {
      return {
        success: false,
        error: `Doctor '${doctorId}' was not found.`,
        error_code: 'DOCTOR_NOT_FOUND'
      };
    }

    if (!doctor.active) {
      return {
        success: false,
        error: `Doctor '${doctor.name}' is inactive. Schedules cannot be updated for inactive doctors.`,
        error_code: 'DOCTOR_INACTIVE'
      };
    }

    // 1. Validate each window
    for (const w of windows) {
      const check = this.validateScheduleWindow(w);
      if (!check.valid) {
        return {
          success: false,
          error: check.error,
          error_code: check.error_code
        };
      }
    }

    // 2. Validate non-overlapping windows per weekday
    const windowsByDay = new Map<number, ScheduleWindowInput[]>();
    for (const w of windows) {
      const list = windowsByDay.get(w.day_of_week) || [];
      list.push(w);
      windowsByDay.set(w.day_of_week, list);
    }

    for (const [, dayWindows] of windowsByDay.entries()) {
      const sorted = [...dayWindows].sort((a, b) => timeStrToMinutes(a.start_time) - timeStrToMinutes(b.start_time));
      for (let i = 1; i < sorted.length; i++) {
        const prevEnd = timeStrToMinutes(sorted[i - 1].end_time);
        const currStart = timeStrToMinutes(sorted[i].start_time);
        if (currStart < prevEnd) {
          return {
            success: false,
            error: 'Schedule windows on the same day must not overlap.',
            error_code: 'OVERLAPPING_SCHEDULE_WINDOWS'
          };
        }
      }
    }

    // Construct schedule objects
    const newSchedules: DbDoctorSchedule[] = windows.map((w, idx) => ({
      id: `sch-${doctorId}-${w.day_of_week}-${idx}-${Date.now()}`,
      doctor_id: doctorId,
      day_of_week: w.day_of_week,
      start_time: w.start_time,
      end_time: w.end_time,
      consultation_duration: w.consultation_duration || 30,
      active: w.active !== undefined ? w.active : true,
      created_at: new Date().toISOString()
    }));

    // 3. Appointment conflict protection
    const apptConflict = checkScheduleConflictsWithAppointments(doctorId, newSchedules);
    if (apptConflict.hasConflict) {
      return {
        success: false,
        error: 'Proposed schedule changes conflict with existing confirmed future appointments.',
        error_code: 'SCHEDULE_CONFLICTS_WITH_APPOINTMENTS'
      };
    }

    // 4. Hold conflict protection
    const holdConflict = checkScheduleConflictsWithHolds(doctorId, newSchedules);
    if (holdConflict.hasConflict) {
      return {
        success: false,
        error: 'Proposed schedule changes conflict with active temporary holds.',
        error_code: 'SCHEDULE_CONFLICTS_WITH_HOLDS'
      };
    }

    // 5. Database persistence note:
    // When live Supabase is configured, multi-row deletion and insertion requires an RPC
    // for single-transaction rollback. In local fallback, state is updated authoritatively.
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      await supabase.from('doctor_schedules').delete().eq('doctor_id', doctorId);
      const { data, error } = await supabase.from('doctor_schedules').insert(newSchedules).select();
      if (error) {
        return {
          success: false,
          error: error.message,
          error_code: 'DATABASE_ERROR'
        };
      }
      return { success: true, schedules: data as DbDoctorSchedule[] };
    }

    localCatalogStore.replaceDoctorSchedule(doctorId, newSchedules);
    return { success: true, schedules: newSchedules };
  }

  /**
   * Adds an individual schedule window for a doctor.
   * Validates day, range, and non-overlap with existing windows on that day.
   */
  async addScheduleWindow(
    doctorId: string,
    window: ScheduleWindowInput,
    isStaffOrAdminOverride?: boolean
  ): Promise<DoctorScheduleOperationResult> {
    const isStaff = await this.isAuthorizedStaffOrAdmin(isStaffOrAdminOverride);
    if (!isStaff) {
      return {
        success: false,
        error: 'Unauthorized: staff or admin credentials required to add schedule window.',
        error_code: 'UNAUTHORIZED_SCHEDULE_OPERATION'
      };
    }

    const doctor = await this.getDoctorById(doctorId, true);
    if (!doctor) {
      return {
        success: false,
        error: `Doctor '${doctorId}' was not found.`,
        error_code: 'DOCTOR_NOT_FOUND'
      };
    }

    if (!doctor.active) {
      return {
        success: false,
        error: `Doctor '${doctor.name}' is inactive.`,
        error_code: 'DOCTOR_INACTIVE'
      };
    }

    const check = this.validateScheduleWindow(window);
    if (!check.valid) {
      return {
        success: false,
        error: check.error,
        error_code: check.error_code
      };
    }

    // Check overlap with existing active windows on that day
    const existing = await this.getDoctorSchedules(doctorId, true);
    const dayWindows = existing.filter((s) => s.day_of_week === window.day_of_week);
    const newStart = timeStrToMinutes(window.start_time);
    const newEnd = timeStrToMinutes(window.end_time);

    for (const w of dayWindows) {
      const wStart = timeStrToMinutes(w.start_time);
      const wEnd = timeStrToMinutes(w.end_time);
      if (newStart < wEnd && newEnd > wStart) {
        return {
          success: false,
          error: 'Schedule window overlaps an existing schedule window on this day.',
          error_code: 'OVERLAPPING_SCHEDULE_WINDOWS'
        };
      }
    }

    const newSchedule: DbDoctorSchedule = {
      id: `sch-${doctorId}-${window.day_of_week}-${Date.now()}`,
      doctor_id: doctorId,
      day_of_week: window.day_of_week,
      start_time: window.start_time,
      end_time: window.end_time,
      consultation_duration: window.consultation_duration || 30,
      active: window.active !== undefined ? window.active : true,
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('doctor_schedules').insert(newSchedule).select().single();
      if (error || !data) {
        return {
          success: false,
          error: error?.message || 'Failed to add schedule window.',
          error_code: 'DATABASE_ERROR'
        };
      }
      return { success: true, schedule: data as DbDoctorSchedule };
    }

    localCatalogStore.addScheduleWindow(newSchedule);
    return { success: true, schedule: newSchedule };
  }

  /**
   * Removes a schedule window.
   * Requires staff or admin role.
   * Protects existing future appointments and active holds from being left uncovered.
   */
  async removeScheduleWindow(
    scheduleIdOrDoctorId: string,
    scheduleIdOrOverride?: string | boolean,
    isStaffOrAdminOverride?: boolean
  ): Promise<DoctorScheduleOperationResult> {
    let scheduleId = scheduleIdOrDoctorId;
    const override = typeof scheduleIdOrOverride === 'boolean' ? scheduleIdOrOverride : isStaffOrAdminOverride;
    if (typeof scheduleIdOrOverride === 'string') {
      scheduleId = scheduleIdOrOverride;
    }

    const isStaff = await this.isAuthorizedStaffOrAdmin(override);
    if (!isStaff) {
      return {
        success: false,
        error: 'Unauthorized: staff or admin credentials required to remove schedule window.',
        error_code: 'UNAUTHORIZED_SCHEDULE_OPERATION'
      };
    }

    const supabase = getSupabaseClient();
    let existingWindow = localCatalogStore.getScheduleById(scheduleId);
    if (!existingWindow && isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('doctor_schedules').select('*').eq('id', scheduleId).maybeSingle();
      if (data) {
        existingWindow = data as DbDoctorSchedule;
      }
    }

    if (!existingWindow) {
      return {
        success: false,
        error: `Schedule window '${scheduleId}' was not found.`,
        error_code: 'INVALID_SCHEDULE_RANGE'
      };
    }

    const doctorId = existingWindow.doctor_id;
    const allWindows = await this.getDoctorSchedules(doctorId, true);
    const remainingWindows = allWindows.filter((w) => w.id !== scheduleId);

    let remoteAppts: DbAppointment[] | undefined;
    let remoteHolds: DbSlotHold[] | undefined;

    if (isSupabaseConfigured && supabase) {
      const { data: apptData } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .neq('status', 'cancelled')
        .gte('appointment_start', new Date().toISOString());
      if (apptData) {
        remoteAppts = apptData as DbAppointment[];
      }

      const { data: holdData } = await supabase
        .from('slot_holds')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());
      if (holdData) {
        remoteHolds = holdData as DbSlotHold[];
      }
    }

    // 1. Conflict check against future confirmed appointments
    const apptConflict = checkScheduleConflictsWithAppointments(doctorId, remainingWindows, new Date(), remoteAppts);
    if (apptConflict.hasConflict) {
      return {
        success: false,
        error: 'Cannot remove schedule window: existing future appointments depend on this time window.',
        error_code: 'SCHEDULE_CONFLICTS_WITH_APPOINTMENTS'
      };
    }

    // 2. Conflict check against active holds
    const holdConflict = checkScheduleConflictsWithHolds(doctorId, remainingWindows, new Date(), remoteHolds);
    if (holdConflict.hasConflict) {
      return {
        success: false,
        error: 'Cannot remove schedule window: active holds depend on this time window.',
        error_code: 'SCHEDULE_CONFLICTS_WITH_HOLDS'
      };
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('doctor_schedules').delete().eq('id', scheduleId);
      if (error) {
        return {
          success: false,
          error: error.message,
          error_code: 'DATABASE_ERROR'
        };
      }
      return { success: true };
    }

    localCatalogStore.removeScheduleWindow(scheduleId);
    return { success: true };
  }

  /**
   * Retrieves schedule exceptions for a doctor.
   */
  async getScheduleExceptions(doctorId: string): Promise<DbScheduleException[]> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('schedule_exceptions')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('exception_date');
      if (!error && data) return data as DbScheduleException[];
    }
    return localCatalogStore.getScheduleExceptions(doctorId);
  }

  /**
   * Creates a schedule exception for a doctor (leaves, symposiums, modified hours).
   * Enforces date validity, time range validity, and protects existing confirmed appointments.
   */
  async createScheduleException(
    input: CreateScheduleExceptionInput,
    isStaffOrAdminOverride?: boolean
  ): Promise<ScheduleExceptionOperationResult> {
    const isStaff = await this.isAuthorizedStaffOrAdmin(isStaffOrAdminOverride);
    if (!isStaff) {
      return {
        success: false,
        error: 'Unauthorized: staff or admin credentials required to create schedule exceptions.',
        error_code: 'UNAUTHORIZED_SCHEDULE_OPERATION'
      };
    }

    const doctor = await this.getDoctorById(input.doctor_id, true);
    if (!doctor) {
      return {
        success: false,
        error: `Doctor '${input.doctor_id}' was not found.`,
        error_code: 'DOCTOR_NOT_FOUND'
      };
    }

    if (!isValidCalendarDate(input.exception_date)) {
      return {
        success: false,
        error: `Invalid exception calendar date '${input.exception_date}'.`,
        error_code: 'EXCEPTION_INVALID_RANGE'
      };
    }

    if (input.start_time || input.end_time) {
      if (!input.start_time || !input.end_time || !TIME_HHMM_REGEX.test(input.start_time) || !TIME_HHMM_REGEX.test(input.end_time)) {
        return {
          success: false,
          error: 'Exception start and end times must both be valid HH:mm strings.',
          error_code: 'EXCEPTION_INVALID_RANGE'
        };
      }
      const startMin = timeStrToMinutes(input.start_time);
      const endMin = timeStrToMinutes(input.end_time);
      if (startMin >= endMin) {
        return {
          success: false,
          error: 'Exception start time must precede end time.',
          error_code: 'EXCEPTION_INVALID_RANGE'
        };
      }
    }

    if (input.exception_type === 'modified_hours' && (!input.start_time || !input.end_time)) {
      return {
        success: false,
        error: 'Modified hours exception requires both start_time and end_time.',
        error_code: 'EXCEPTION_INVALID_RANGE'
      };
    }

    // Appointment conflict check: cannot add exception that cancels out future confirmed appointments
    const conflict = checkExceptionConflictsWithAppointments(input.doctor_id, input);
    if (conflict.hasConflict) {
      return {
        success: false,
        error: 'Schedule exception conflicts with existing confirmed future appointments.',
        error_code: 'SCHEDULE_CONFLICTS_WITH_APPOINTMENTS'
      };
    }

    const newException: DbScheduleException = {
      id: `exc-${input.doctor_id}-${Date.now()}`,
      doctor_id: input.doctor_id,
      exception_date: input.exception_date,
      start_time: input.start_time,
      end_time: input.end_time,
      exception_type: input.exception_type,
      reason: input.reason || 'Doctor unavailable',
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('schedule_exceptions').insert(newException).select().single();
      if (error || !data) {
        return {
          success: false,
          error: error?.message || 'Database exception creation failed.',
          error_code: 'DATABASE_ERROR'
        };
      }
      return { success: true, exception: data as DbScheduleException };
    }

    localCatalogStore.createScheduleException(newException);
    return { success: true, exception: newException };
  }

  /**
   * Updates an existing schedule exception.
   */
  async updateScheduleException(
    id: string,
    updates: UpdateScheduleExceptionInput,
    isStaffOrAdminOverride?: boolean
  ): Promise<ScheduleExceptionOperationResult> {
    const isStaff = await this.isAuthorizedStaffOrAdmin(isStaffOrAdminOverride);
    if (!isStaff) {
      return {
        success: false,
        error: 'Unauthorized: staff or admin credentials required to update schedule exceptions.',
        error_code: 'UNAUTHORIZED_SCHEDULE_OPERATION'
      };
    }

    const existing = localCatalogStore.getScheduleExceptionById(id);
    if (!existing) {
      return {
        success: false,
        error: `Schedule exception '${id}' was not found.`,
        error_code: 'EXCEPTION_INVALID_RANGE'
      };
    }

    if (updates.exception_date && !isValidCalendarDate(updates.exception_date)) {
      return {
        success: false,
        error: `Invalid exception calendar date '${updates.exception_date}'.`,
        error_code: 'EXCEPTION_INVALID_RANGE'
      };
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('schedule_exceptions').update(updates).eq('id', id).select().single();
      if (error || !data) {
        return {
          success: false,
          error: error?.message || 'Database update failure.',
          error_code: 'DATABASE_ERROR'
        };
      }
      return { success: true, exception: data as DbScheduleException };
    }

    const updated = localCatalogStore.updateScheduleException(id, updates);
    return { success: true, exception: updated! };
  }

  /**
   * Deletes a schedule exception.
   */
  async deleteScheduleException(
    id: string,
    isStaffOrAdminOverride?: boolean
  ): Promise<ScheduleExceptionOperationResult> {
    const isStaff = await this.isAuthorizedStaffOrAdmin(isStaffOrAdminOverride);
    if (!isStaff) {
      return {
        success: false,
        error: 'Unauthorized: staff or admin credentials required to delete schedule exceptions.',
        error_code: 'UNAUTHORIZED_SCHEDULE_OPERATION'
      };
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('schedule_exceptions').delete().eq('id', id);
      if (error) {
        return {
          success: false,
          error: error.message,
          error_code: 'DATABASE_ERROR'
        };
      }
      return { success: true };
    }

    localCatalogStore.deleteScheduleException(id);
    return { success: true };
  }

  /**
   * Retrieves consultation types.
   */
  async getConsultationTypes(): Promise<DbConsultationType[]> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('consultation_types')
        .select('*')
        .eq('active', true);
      if (!error && data) return data as DbConsultationType[];
    }
    return localCatalogStore.getConsultationTypes();
  }

  /**
   * Retrieves a single consultation type by ID or code.
   */
  async getConsultationTypeById(id: string): Promise<DbConsultationType | null> {
    const types = await this.getConsultationTypes();
    return types.find((t) => t.id === id || t.code === id) || null;
  }
}

export const catalogService = new CatalogService();
