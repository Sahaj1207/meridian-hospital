import type { 
  DbAppointment, 
  DbDoctor, 
  DbDepartment, 
  DbConsultationType,
  DbDoctorSchedule,
  DbScheduleException
} from '@/types/database';
import type { 
  DateRangeFilter, 
  DateRangePreset,
  AppointmentOverviewMetrics, 
  DailyAppointmentMetric, 
  DepartmentDemandMetric, 
  SpecialistUtilizationMetric, 
  PeakHourMetric, 
  StatusDistributionMetric, 
  ConsultationTypeDemandMetric, 
  OperationalAnalyticsReport 
} from '@/types/analytics';
import { catalogService, CANONICAL_DOCTORS, CANONICAL_DEPARTMENTS, STANDARD_CONSULTATION_TYPES } from './catalogService';
import { localAppointmentStore } from './appointmentService';
import { authService } from './authService';
import { getSupabaseClient, isSupabaseConfigured, isProductionEnvironment } from './supabaseClient';
import { 
  getISTDateString, 
  getISTDayOfWeek, 
  isValidCalendarDate
} from '@/lib/timezone';
import { timeStrToMinutes } from './availabilityEngine';

/**
 * Utility to shift an IST date string (YYYY-MM-DD) by N calendar days.
 */
export function shiftISTDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  const ry = dt.getUTCFullYear();
  const rm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const rd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
}

/**
 * Returns an array of consecutive IST calendar dates from start to end (inclusive).
 */
export function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  let current = startDateStr;
  while (current <= endDateStr) {
    dates.push(current);
    current = shiftISTDate(current, 1);
  }
  return dates;
}

interface AnalyticsDataSnapshot {
  appointments: DbAppointment[];
  doctors: DbDoctor[];
  departments: DbDepartment[];
  consultationTypes: DbConsultationType[];
  schedulesByDoctor: Map<string, DbDoctorSchedule[]>;
  exceptionsByDoctor: Map<string, DbScheduleException[]>;
  isDemoData: boolean;
}

export class AnalyticsService {
  /**
   * Resolves a DateRangeFilter into validated start and end IST date strings.
   */
  resolveDateRange(preset: DateRangePreset, customStart?: string, customEnd?: string, referenceClockUtc?: Date): DateRangeFilter {
    const todayIst = getISTDateString(referenceClockUtc || new Date());

    switch (preset) {
      case 'today':
        return {
          preset: 'today',
          start_date_ist: todayIst,
          end_date_ist: todayIst
        };

      case 'last_7_days':
        return {
          preset: 'last_7_days',
          start_date_ist: shiftISTDate(todayIst, -6),
          end_date_ist: todayIst
        };

      case 'last_30_days':
        return {
          preset: 'last_30_days',
          start_date_ist: shiftISTDate(todayIst, -29),
          end_date_ist: todayIst
        };

      case 'last_90_days':
        return {
          preset: 'last_90_days',
          start_date_ist: shiftISTDate(todayIst, -89),
          end_date_ist: todayIst
        };

      case 'custom':
        if (customStart && customEnd && isValidCalendarDate(customStart) && isValidCalendarDate(customEnd) && customStart <= customEnd) {
          return {
            preset: 'custom',
            start_date_ist: customStart,
            end_date_ist: customEnd
          };
        }
        return {
          preset: 'last_7_days',
          start_date_ist: shiftISTDate(todayIst, -6),
          end_date_ist: todayIst
        };

      default:
        return {
          preset: 'last_7_days',
          start_date_ist: shiftISTDate(todayIst, -6),
          end_date_ist: todayIst
        };
    }
  }

  /**
   * Helper to verify staff/admin authorization.
   * Throws an error if public or unauthenticated.
   */
  private async assertStaffOrAdminAuthorization(isStaffOrAdminOverride?: boolean): Promise<void> {
    if (isStaffOrAdminOverride === true && !isProductionEnvironment()) {
      return;
    }
    const role = await authService.getUserRole();
    if (role !== 'staff' && role !== 'admin') {
      throw new Error('UNAUTHORIZED: Staff or administrator operational privileges are required.');
    }
  }

  /**
   * Acquires a unified data snapshot once to prevent redundant database/store scans.
   */
  private async acquireDataSnapshot(): Promise<AnalyticsDataSnapshot> {
    const supabase = getSupabaseClient();

    let appointments: DbAppointment[] = [];
    let doctors: DbDoctor[] = [];
    let departments: DbDepartment[] = [];
    let consultationTypes: DbConsultationType[] = [];
    let isDemo = false;

    if (isSupabaseConfigured && supabase) {
      const [apptRes, docRes, deptRes, consRes] = await Promise.all([
        supabase.from('appointments').select('*'),
        supabase.from('doctors').select('*'),
        supabase.from('departments').select('*'),
        supabase.from('consultation_types').select('*')
      ]);

      appointments = (apptRes.data as DbAppointment[]) || [];
      doctors = (docRes.data as DbDoctor[]) || CANONICAL_DOCTORS;
      departments = (deptRes.data as DbDepartment[]) || CANONICAL_DEPARTMENTS;
      consultationTypes = (consRes.data as DbConsultationType[]) || STANDARD_CONSULTATION_TYPES;
    } else {
      appointments = localAppointmentStore.getAppointments();
      doctors = await catalogService.getDoctors({ active_only: false });
      departments = await catalogService.getDepartments();
      consultationTypes = await catalogService.getConsultationTypes();
      isDemo = true;
    }

    // Load schedules and exceptions for active doctors concurrently
    const schedulesByDoctor = new Map<string, DbDoctorSchedule[]>();
    const exceptionsByDoctor = new Map<string, DbScheduleException[]>();

    const activeDocs = doctors.filter((d) => d.active);
    await Promise.all(
      activeDocs.map(async (doc) => {
        const [scheds, excs] = await Promise.all([
          catalogService.getDoctorSchedules(doc.id, true),
          catalogService.getScheduleExceptions(doc.id)
        ]);
        schedulesByDoctor.set(doc.id, scheds);
        exceptionsByDoctor.set(doc.id, excs);
      })
    );

    return {
      appointments,
      doctors,
      departments,
      consultationTypes,
      schedulesByDoctor,
      exceptionsByDoctor,
      isDemoData: isDemo
    };
  }

  // =========================================================================
  // CORE METRIC CALCULATIONS DERIVED FROM A SHARED SNAPSHOT
  // =========================================================================

  private calculateOverviewMetrics(
    appointments: DbAppointment[],
    filter: DateRangeFilter,
    referenceClockUtc?: Date
  ): AppointmentOverviewMetrics {
    const todayIst = getISTDateString(referenceClockUtc || new Date());

    let appointmentsToday = 0;
    let activeToday = 0;
    let completedToday = 0;
    let cancelledToday = 0;
    let noShowToday = 0;

    let totalInPeriod = 0;
    let activeInPeriod = 0;
    let completedInPeriod = 0;
    let cancelledInPeriod = 0;
    let noShowInPeriod = 0;

    // For cancellation rate: appointments created in selected period
    let createdInPeriodCount = 0;
    let cancelledCreatedInPeriodCount = 0;

    for (const appt of appointments) {
      const apptStartDateIst = getISTDateString(appt.appointment_start);
      const apptCreatedDateIst = getISTDateString(appt.created_at);

      // Today's metrics (using appointment_start)
      if (apptStartDateIst === todayIst) {
        appointmentsToday += 1;
        if (appt.status !== 'cancelled') {
          activeToday += 1;
        }
        if (appt.status === 'completed') completedToday += 1;
        if (appt.status === 'cancelled') cancelledToday += 1;
        if (appt.status === 'no_show') noShowToday += 1;
      }

      // Period metrics (using appointment_start)
      if (apptStartDateIst >= filter.start_date_ist && apptStartDateIst <= filter.end_date_ist) {
        totalInPeriod += 1;
        if (appt.status !== 'cancelled') {
          activeInPeriod += 1;
        }
        if (appt.status === 'completed') completedInPeriod += 1;
        if (appt.status === 'cancelled') cancelledInPeriod += 1;
        if (appt.status === 'no_show') noShowInPeriod += 1;
      }

      // Cancellation rate denominator: appointments created during the period
      if (apptCreatedDateIst >= filter.start_date_ist && apptCreatedDateIst <= filter.end_date_ist) {
        createdInPeriodCount += 1;
        if (appt.status === 'cancelled') {
          cancelledCreatedInPeriodCount += 1;
        }
      }
    }

    // Cancellation rate: cancelled created in period / created in period
    let cancellationRate = 0;
    const hasCancellationData = createdInPeriodCount > 0;
    if (hasCancellationData) {
      cancellationRate = Math.round((cancelledCreatedInPeriodCount / createdInPeriodCount) * 1000) / 10;
    }

    // No-show rate: no_show / (completed + no_show)
    let noShowRate = 0;
    const terminalAttendanceCount = completedInPeriod + noShowInPeriod;
    const hasNoShowData = terminalAttendanceCount > 0;
    if (hasNoShowData) {
      noShowRate = Math.round((noShowInPeriod / terminalAttendanceCount) * 1000) / 10;
    }

    return {
      appointments_today: appointmentsToday,
      active_today: activeToday,
      completed_today: completedToday,
      cancelled_today: cancelledToday,
      no_show_today: noShowToday,
      total_in_period: totalInPeriod,
      active_in_period: activeInPeriod,
      completed_in_period: completedInPeriod,
      cancelled_in_period: cancelledInPeriod,
      no_show_in_period: noShowInPeriod,
      cancellation_rate_percentage: cancellationRate,
      no_show_rate_percentage: noShowRate,
      has_cancellation_data: hasCancellationData,
      has_no_show_data: hasNoShowData
    };
  }

  private calculateDailyActivity(
    appointments: DbAppointment[],
    filter: DateRangeFilter
  ): DailyAppointmentMetric[] {
    const dates = getDatesInRange(filter.start_date_ist, filter.end_date_ist);
    const dailyMap = new Map<string, DailyAppointmentMetric>();

    for (const d of dates) {
      const [yearStr, monthStr, dayStr] = d.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1;
      const dayNum = parseInt(dayStr, 10);
      const dateObj = new Date(Date.UTC(y, m, dayNum, 12, 0, 0));
      const formattedDate = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      }).format(dateObj);

      dailyMap.set(d, {
        date: d,
        formatted_date: formattedDate,
        total: 0,
        active: 0,
        confirmed: 0,
        pending: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0
      });
    }

    for (const appt of appointments) {
      const dateIst = getISTDateString(appt.appointment_start);
      const entry = dailyMap.get(dateIst);
      if (entry) {
        entry.total += 1;
        if (appt.status !== 'cancelled') {
          entry.active += 1;
        }
        if (appt.status === 'confirmed') entry.confirmed += 1;
        if (appt.status === 'pending') entry.pending += 1;
        if (appt.status === 'completed') entry.completed += 1;
        if (appt.status === 'cancelled') entry.cancelled += 1;
        if (appt.status === 'no_show') entry.no_show += 1;
      }
    }

    return Array.from(dailyMap.values());
  }

  private calculateDepartmentDemand(
    appointments: DbAppointment[],
    departments: DbDepartment[],
    filter: DateRangeFilter
  ): DepartmentDemandMetric[] {
    const deptMap = new Map<string, { id: string; name: string; count: number }>();
    for (const d of departments) {
      deptMap.set(d.id, { id: d.id, name: d.name, count: 0 });
    }

    let totalDemand = 0;
    for (const appt of appointments) {
      const dateIst = getISTDateString(appt.appointment_start);
      if (dateIst >= filter.start_date_ist && dateIst <= filter.end_date_ist) {
        totalDemand += 1;
        const entry = deptMap.get(appt.department_id);
        if (entry) {
          entry.count += 1;
        } else {
          deptMap.set(appt.department_id, {
            id: appt.department_id,
            name: appt.department_id,
            count: 1
          });
        }
      }
    }

    return Array.from(deptMap.values())
      .map((d) => ({
        department_id: d.id,
        department_name: d.name,
        appointment_count: d.count,
        percentage_share: totalDemand > 0 ? Math.round((d.count / totalDemand) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.appointment_count - a.appointment_count);
  }

  private calculateSpecialistUtilization(
    appointments: DbAppointment[],
    doctors: DbDoctor[],
    departments: DbDepartment[],
    schedulesByDoctor: Map<string, DbDoctorSchedule[]>,
    exceptionsByDoctor: Map<string, DbScheduleException[]>,
    filter: DateRangeFilter
  ): SpecialistUtilizationMetric[] {
    const activeDoctors = doctors.filter((d) => d.active);
    const dates = getDatesInRange(filter.start_date_ist, filter.end_date_ist);

    const metrics: SpecialistUtilizationMetric[] = [];

    for (const doc of activeDoctors) {
      const dept = departments.find((dp) => dp.id === doc.department_id);
      const schedules = schedulesByDoctor.get(doc.id) || [];
      const exceptions = exceptionsByDoctor.get(doc.id) || [];

      // 1. Calculate available scheduled minutes across the date range
      let scheduledMinutes = 0;
      for (const dateStr of dates) {
        const dayOfWeek = getISTDayOfWeek(dateStr);
        const dayExceptions = exceptions.filter((e) => e.exception_date === dateStr);

        // Check full-day leave or holiday exception
        const fullDayException = dayExceptions.find(
          (e) => e.exception_type === 'leave' || e.exception_type === 'holiday' || (e.exception_type === 'blocked' && !e.start_time)
        );
        if (fullDayException) {
          continue; // 0 scheduled minutes on full-day exception
        }

        // Check modified hours exception
        const modifiedHours = dayExceptions.find((e) => e.exception_type === 'modified_hours' && e.start_time && e.end_time);
        if (modifiedHours && modifiedHours.start_time && modifiedHours.end_time) {
          const modMinutes = timeStrToMinutes(modifiedHours.end_time) - timeStrToMinutes(modifiedHours.start_time);
          if (modMinutes > 0) {
            scheduledMinutes += modMinutes;
          }
          continue;
        }

        // Standard recurring schedules for this day of week
        const daySchedules = schedules.filter((s) => s.day_of_week === dayOfWeek && s.active);
        for (const s of daySchedules) {
          let winMinutes = timeStrToMinutes(s.end_time) - timeStrToMinutes(s.start_time);
          if (winMinutes <= 0) continue;

          // Check partial blocked exceptions
          const partialBlocks = dayExceptions.filter(
            (e) => e.exception_type === 'blocked' && e.start_time && e.end_time
          );
          for (const b of partialBlocks) {
            const bStart = timeStrToMinutes(b.start_time!);
            const bEnd = timeStrToMinutes(b.end_time!);
            const sStart = timeStrToMinutes(s.start_time);
            const sEnd = timeStrToMinutes(s.end_time);

            // Calculate overlap between schedule window and blocked interval
            const overlapStart = Math.max(sStart, bStart);
            const overlapEnd = Math.min(sEnd, bEnd);
            if (overlapEnd > overlapStart) {
              winMinutes -= (overlapEnd - overlapStart);
            }
          }

          if (winMinutes > 0) {
            scheduledMinutes += winMinutes;
          }
        }
      }

      // 2. Calculate booked non-cancelled appointment minutes in range
      let bookedMinutes = 0;
      for (const appt of appointments) {
        if (appt.doctor_id !== doc.id || appt.status === 'cancelled') {
          continue;
        }
        const apptDateIst = getISTDateString(appt.appointment_start);
        if (apptDateIst >= filter.start_date_ist && apptDateIst <= filter.end_date_ist) {
          const startMs = new Date(appt.appointment_start).getTime();
          const endMs = new Date(appt.appointment_end).getTime();
          if (endMs > startMs) {
            bookedMinutes += Math.round((endMs - startMs) / (60 * 1000));
          }
        }
      }

      // 3. Determine status and utilization percentage
      let utilizationPercentage = 0;
      let status: 'active' | 'zero_utilization' | 'no_schedule' | 'unavailable';

      if (scheduledMinutes === 0) {
        status = bookedMinutes > 0 ? 'unavailable' : 'no_schedule';
        utilizationPercentage = 0;
      } else if (bookedMinutes === 0) {
        status = 'zero_utilization';
        utilizationPercentage = 0;
      } else {
        status = 'active';
        utilizationPercentage = Math.round((bookedMinutes / scheduledMinutes) * 1000) / 10;
      }

      metrics.push({
        doctor_id: doc.id,
        doctor_name: doc.name,
        department_id: doc.department_id,
        department_name: dept?.name || doc.department_id,
        scheduled_minutes: scheduledMinutes,
        booked_minutes: bookedMinutes,
        utilization_percentage: utilizationPercentage,
        status
      });
    }

    return metrics.sort((a, b) => b.utilization_percentage - a.utilization_percentage);
  }

  private calculatePeakHours(
    appointments: DbAppointment[],
    filter: DateRangeFilter
  ): PeakHourMetric[] {
    const hoursMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) {
      hoursMap.set(h, 0);
    }

    for (const appt of appointments) {
      if (appt.status === 'cancelled') continue;
      const dateIst = getISTDateString(appt.appointment_start);
      if (dateIst >= filter.start_date_ist && dateIst <= filter.end_date_ist) {
        // Calculate Asia/Kolkata wall-clock hour
        const apptStart = new Date(appt.appointment_start);
        const istMillis = apptStart.getTime() + (330 * 60 * 1000);
        const istHour = new Date(istMillis).getUTCHours();
        hoursMap.set(istHour, (hoursMap.get(istHour) || 0) + 1);
      }
    }

    const metrics: PeakHourMetric[] = [];
    for (let h = 0; h < 24; h++) {
      const count = hoursMap.get(h) || 0;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const formattedHour = `${String(displayH).padStart(2, '0')}:00 ${period}`;
      const isOperating = h >= 8 && h <= 18;

      metrics.push({
        hour: h,
        formatted_hour: formattedHour,
        appointment_count: count,
        is_operating_hour: isOperating
      });
    }

    return metrics;
  }

  private calculateStatusDistribution(
    appointments: DbAppointment[],
    filter: DateRangeFilter
  ): StatusDistributionMetric[] {
    let pending = 0;
    let confirmed = 0;
    let completed = 0;
    let cancelled = 0;
    let noShow = 0;
    let total = 0;

    for (const appt of appointments) {
      const dateIst = getISTDateString(appt.appointment_start);
      if (dateIst >= filter.start_date_ist && dateIst <= filter.end_date_ist) {
        total += 1;
        if (appt.status === 'pending') pending += 1;
        if (appt.status === 'confirmed') confirmed += 1;
        if (appt.status === 'completed') completed += 1;
        if (appt.status === 'cancelled') cancelled += 1;
        if (appt.status === 'no_show') noShow += 1;
      }
    }

    const calcPct = (cnt: number) => total > 0 ? Math.round((cnt / total) * 1000) / 10 : 0;

    return [
      { status: 'confirmed', label: 'Confirmed', count: confirmed, percentage: calcPct(confirmed) },
      { status: 'completed', label: 'Completed', count: completed, percentage: calcPct(completed) },
      { status: 'pending', label: 'Pending Verification', count: pending, percentage: calcPct(pending) },
      { status: 'cancelled', label: 'Cancelled', count: cancelled, percentage: calcPct(cancelled) },
      { status: 'no_show', label: 'No Show', count: noShow, percentage: calcPct(noShow) }
    ];
  }

  private calculateConsultationTypeDemand(
    appointments: DbAppointment[],
    consultationTypes: DbConsultationType[],
    filter: DateRangeFilter
  ): ConsultationTypeDemandMetric[] {
    const typeMap = new Map<string, { id: string; name: string; count: number }>();
    for (const c of consultationTypes) {
      typeMap.set(c.id, { id: c.id, name: c.name, count: 0 });
    }

    let total = 0;
    for (const appt of appointments) {
      const dateIst = getISTDateString(appt.appointment_start);
      if (dateIst >= filter.start_date_ist && dateIst <= filter.end_date_ist) {
        total += 1;
        // Match either by id or by name
        let matched = typeMap.get(appt.consultation_type);
        if (!matched) {
          for (const item of typeMap.values()) {
            if (item.name.toLowerCase() === appt.consultation_type.toLowerCase()) {
              matched = item;
              break;
            }
          }
        }
        if (matched) {
          matched.count += 1;
        } else {
          typeMap.set(appt.consultation_type, {
            id: appt.consultation_type,
            name: appt.consultation_type,
            count: 1
          });
        }
      }
    }

    return Array.from(typeMap.values())
      .map((t) => ({
        consultation_type_id: t.id,
        consultation_type_name: t.name,
        appointment_count: t.count,
        percentage_share: total > 0 ? Math.round((t.count / total) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.appointment_count - a.appointment_count);
  }

  // =========================================================================
  // PUBLIC CONSOLIDATED AND TARGETED METHODS
  // =========================================================================

  /**
   * Authoritative consolidated analytics report.
   * Acquires the underlying database and catalog data exactly once,
   * normalizes it once, and derives all metrics from the shared snapshot.
   */
  async getCompleteReport(
    filter: DateRangeFilter,
    isStaffOrAdminOverride?: boolean,
    referenceClockUtc?: Date
  ): Promise<OperationalAnalyticsReport> {
    await this.assertStaffOrAdminAuthorization(isStaffOrAdminOverride);

    const snapshot = await this.acquireDataSnapshot();

    const overview = this.calculateOverviewMetrics(snapshot.appointments, filter, referenceClockUtc);
    const daily = this.calculateDailyActivity(snapshot.appointments, filter);
    const deptDemand = this.calculateDepartmentDemand(snapshot.appointments, snapshot.departments, filter);
    const utilization = this.calculateSpecialistUtilization(
      snapshot.appointments,
      snapshot.doctors,
      snapshot.departments,
      snapshot.schedulesByDoctor,
      snapshot.exceptionsByDoctor,
      filter
    );
    const peakHours = this.calculatePeakHours(snapshot.appointments, filter);
    const statusDist = this.calculateStatusDistribution(snapshot.appointments, filter);
    const consDemand = this.calculateConsultationTypeDemand(snapshot.appointments, snapshot.consultationTypes, filter);

    return {
      generated_at: new Date().toISOString(),
      timezone: 'Asia/Kolkata',
      filter,
      overview,
      daily_activity: daily,
      department_demand: deptDemand,
      specialist_utilization: utilization,
      peak_hours: peakHours,
      status_distribution: statusDist,
      consultation_type_demand: consDemand,
      is_demo_data: snapshot.isDemoData,
      total_appointments_analyzed: snapshot.appointments.length
    };
  }

  // --- TARGETED METRIC METHODS (for isolated testing and targeted consumers) ---

  async getAppointmentOverview(
    filter: DateRangeFilter,
    isStaffOrAdminOverride?: boolean,
    referenceClockUtc?: Date
  ): Promise<AppointmentOverviewMetrics> {
    await this.assertStaffOrAdminAuthorization(isStaffOrAdminOverride);
    const snapshot = await this.acquireDataSnapshot();
    return this.calculateOverviewMetrics(snapshot.appointments, filter, referenceClockUtc);
  }

  async getAppointmentsByDay(
    filter: DateRangeFilter,
    isStaffOrAdminOverride?: boolean
  ): Promise<DailyAppointmentMetric[]> {
    await this.assertStaffOrAdminAuthorization(isStaffOrAdminOverride);
    const snapshot = await this.acquireDataSnapshot();
    return this.calculateDailyActivity(snapshot.appointments, filter);
  }

  async getAppointmentsByDepartment(
    filter: DateRangeFilter,
    isStaffOrAdminOverride?: boolean
  ): Promise<DepartmentDemandMetric[]> {
    await this.assertStaffOrAdminAuthorization(isStaffOrAdminOverride);
    const snapshot = await this.acquireDataSnapshot();
    return this.calculateDepartmentDemand(snapshot.appointments, snapshot.departments, filter);
  }

  async getSpecialistUtilization(
    filter: DateRangeFilter,
    isStaffOrAdminOverride?: boolean
  ): Promise<SpecialistUtilizationMetric[]> {
    await this.assertStaffOrAdminAuthorization(isStaffOrAdminOverride);
    const snapshot = await this.acquireDataSnapshot();
    return this.calculateSpecialistUtilization(
      snapshot.appointments,
      snapshot.doctors,
      snapshot.departments,
      snapshot.schedulesByDoctor,
      snapshot.exceptionsByDoctor,
      filter
    );
  }

  async getCancellationRate(
    filter: DateRangeFilter,
    isStaffOrAdminOverride?: boolean
  ): Promise<{ cancellation_rate: number; has_data: boolean; cancelled_count: number; total_created: number }> {
    await this.assertStaffOrAdminAuthorization(isStaffOrAdminOverride);
    const snapshot = await this.acquireDataSnapshot();
    let created = 0;
    let cancelled = 0;
    for (const a of snapshot.appointments) {
      const createdDateIst = getISTDateString(a.created_at);
      if (createdDateIst >= filter.start_date_ist && createdDateIst <= filter.end_date_ist) {
        created += 1;
        if (a.status === 'cancelled') {
          cancelled += 1;
        }
      }
    }
    const rate = created > 0 ? Math.round((cancelled / created) * 1000) / 10 : 0;
    return {
      cancellation_rate: rate,
      has_data: created > 0,
      cancelled_count: cancelled,
      total_created: created
    };
  }

  async getNoShowRate(
    filter: DateRangeFilter,
    isStaffOrAdminOverride?: boolean
  ): Promise<{ no_show_rate: number; has_data: boolean; no_show_count: number; completed_count: number }> {
    await this.assertStaffOrAdminAuthorization(isStaffOrAdminOverride);
    const snapshot = await this.acquireDataSnapshot();
    let completed = 0;
    let noShow = 0;
    for (const a of snapshot.appointments) {
      const dateIst = getISTDateString(a.appointment_start);
      if (dateIst >= filter.start_date_ist && dateIst <= filter.end_date_ist) {
        if (a.status === 'completed') completed += 1;
        if (a.status === 'no_show') noShow += 1;
      }
    }
    const denom = completed + noShow;
    const rate = denom > 0 ? Math.round((noShow / denom) * 1000) / 10 : 0;
    return {
      no_show_rate: rate,
      has_data: denom > 0,
      no_show_count: noShow,
      completed_count: completed
    };
  }

  async getPeakAppointmentHours(
    filter: DateRangeFilter,
    isStaffOrAdminOverride?: boolean
  ): Promise<PeakHourMetric[]> {
    await this.assertStaffOrAdminAuthorization(isStaffOrAdminOverride);
    const snapshot = await this.acquireDataSnapshot();
    return this.calculatePeakHours(snapshot.appointments, filter);
  }

  async getStatusDistribution(
    filter: DateRangeFilter,
    isStaffOrAdminOverride?: boolean
  ): Promise<StatusDistributionMetric[]> {
    await this.assertStaffOrAdminAuthorization(isStaffOrAdminOverride);
    const snapshot = await this.acquireDataSnapshot();
    return this.calculateStatusDistribution(snapshot.appointments, filter);
  }

  async getConsultationTypeDemand(
    filter: DateRangeFilter,
    isStaffOrAdminOverride?: boolean
  ): Promise<ConsultationTypeDemandMetric[]> {
    await this.assertStaffOrAdminAuthorization(isStaffOrAdminOverride);
    const snapshot = await this.acquireDataSnapshot();
    return this.calculateConsultationTypeDemand(snapshot.appointments, snapshot.consultationTypes, filter);
  }
}

export const analyticsService = new AnalyticsService();
