import type { DbAppointment } from '../types/database.ts';
import type { ReminderEvaluationResult } from '../types/notification.ts';
import { notificationService } from './notificationService.ts';

export interface ReminderConfig {
  lead_time_hours: number; // default 24 hours
}

/**
 * Domain engine for calculating, evaluating, and triggering appointment reminders.
 * Fully timezone-aware and deterministic.
 */
export class ReminderService {
  private config: ReminderConfig;
  private sentReminderAppointmentIds = new Set<string>();

  constructor(config: ReminderConfig = { lead_time_hours: 24 }) {
    this.config = config;
  }

  setLeadTimeHours(hours: number): void {
    this.config.lead_time_hours = hours;
  }

  getLeadTimeHours(): number {
    return this.config.lead_time_hours;
  }

  clearSentHistory(): void {
    this.sentReminderAppointmentIds.clear();
  }

  markReminderSent(appointmentId: string): void {
    this.sentReminderAppointmentIds.add(appointmentId);
  }

  hasReminderBeenSent(appointmentId: string): boolean {
    return this.sentReminderAppointmentIds.has(appointmentId);
  }

  /**
   * Evaluates whether a set of appointments has reminders due relative to currentTimeUtc.
   */
  evaluateDueReminders(
    appointments: DbAppointment[],
    currentTimeUtc: Date = new Date()
  ): ReminderEvaluationResult[] {
    const results: ReminderEvaluationResult[] = [];
    const nowMs = currentTimeUtc.getTime();
    const leadTimeMs = this.config.lead_time_hours * 60 * 60 * 1000;

    for (const appt of appointments) {
      const apptStartMs = new Date(appt.appointment_start).getTime();
      const reminderTriggerMs = apptStartMs - leadTimeMs;
      const scheduledReminderTimeUtc = new Date(reminderTriggerMs).toISOString();

      // Ineligible if not confirmed (e.g. cancelled, completed, no_show)
      if (appt.status !== 'confirmed') {
        results.push({
          appointment_id: appt.appointment_id,
          status: 'ineligible',
          lead_time_hours: this.config.lead_time_hours,
          scheduled_reminder_time_utc: scheduledReminderTimeUtc,
          reason: `Appointment status is ${appt.status}`
        });
        continue;
      }

      // Ineligible if appointment has already started
      if (nowMs >= apptStartMs) {
        results.push({
          appointment_id: appt.appointment_id,
          status: 'ineligible',
          lead_time_hours: this.config.lead_time_hours,
          scheduled_reminder_time_utc: scheduledReminderTimeUtc,
          reason: 'Appointment time has already passed'
        });
        continue;
      }

      // Already sent
      if (this.sentReminderAppointmentIds.has(appt.appointment_id)) {
        results.push({
          appointment_id: appt.appointment_id,
          status: 'already_sent',
          lead_time_hours: this.config.lead_time_hours,
          scheduled_reminder_time_utc: scheduledReminderTimeUtc,
          reason: 'Reminder has already been dispatched'
        });
        continue;
      }

      // Due window: now is at or past trigger time, but before appointment start
      if (nowMs >= reminderTriggerMs && nowMs < apptStartMs) {
        results.push({
          appointment_id: appt.appointment_id,
          status: 'due',
          lead_time_hours: this.config.lead_time_hours,
          scheduled_reminder_time_utc: scheduledReminderTimeUtc
        });
      } else {
        results.push({
          appointment_id: appt.appointment_id,
          status: 'not_due',
          lead_time_hours: this.config.lead_time_hours,
          scheduled_reminder_time_utc: scheduledReminderTimeUtc,
          reason: 'Reminder trigger window has not arrived yet'
        });
      }
    }

    return results;
  }

  /**
   * Evaluates due reminders and dispatches them via notificationService.
   */
  async processDueReminders(
    appointments: DbAppointment[],
    helpers: {
      getDoctorName: (docId: string) => Promise<string>;
      getDepartmentName: (deptId: string) => Promise<string>;
      getPatient: (patientId: string) => Promise<{ full_name: string; phone?: string; email?: string } | undefined>;
    },
    currentTimeUtc: Date = new Date()
  ): Promise<{ processed: number; dispatched: number; results: ReminderEvaluationResult[] }> {
    const evaluations = this.evaluateDueReminders(appointments, currentTimeUtc);
    let dispatched = 0;

    for (const ev of evaluations) {
      if (ev.status === 'due') {
        const appt = appointments.find((a) => a.appointment_id === ev.appointment_id);
        if (!appt) continue;

        const patient = await helpers.getPatient(appt.patient_id);
        if (!patient) continue;

        const doctorName = await helpers.getDoctorName(appt.doctor_id);
        const departmentName = await helpers.getDepartmentName(appt.department_id);

        const intent = notificationService.createNotificationIntent({
          event_type: 'appointment.reminder',
          appointment_id: appt.appointment_id,
          doctor_name: doctorName,
          department_name: departmentName,
          consultation_type: appt.consultation_type,
          appointment_start: appt.appointment_start,
          appointment_end: appt.appointment_end,
          patient,
          reminder_lead_time_hours: this.config.lead_time_hours
        });

        await notificationService.dispatchNotification(intent);
        this.markReminderSent(appt.appointment_id);
        dispatched += 1;
      }
    }

    return {
      processed: evaluations.length,
      dispatched,
      results: evaluations
    };
  }
}

export const reminderService = new ReminderService();
