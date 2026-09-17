import type { 
  NotificationIntent, 
  NotificationChannel, 
  RenderedNotification 
} from '../types/notification.ts';

export class NotificationTemplateRegistry {
  /**
   * Compiles an intent into channel-specific rendered content.
   */
  static render(intent: NotificationIntent, channel: NotificationChannel): RenderedNotification {
    switch (intent.event_type) {
      case 'appointment.created':
      case 'appointment.confirmed':
        return channel === 'email' 
          ? this.renderConfirmationEmail(intent)
          : this.renderConfirmationSms(intent);

      case 'appointment.cancelled':
        return channel === 'email'
          ? this.renderCancellationEmail(intent)
          : this.renderCancellationSms(intent);

      case 'appointment.rescheduled':
        return channel === 'email'
          ? this.renderRescheduledEmail(intent)
          : this.renderRescheduledSms(intent);

      case 'appointment.reminder':
        return channel === 'email'
          ? this.renderReminderEmail(intent)
          : this.renderReminderSms(intent);

      case 'appointment.completed':
        return channel === 'email'
          ? this.renderCompletedEmail(intent)
          : this.renderCompletedSms(intent);

      default:
        throw new Error(`Unsupported notification event type: ${intent.event_type}`);
    }
  }

  // --- CONFIRMATION ---

  private static renderConfirmationEmail(intent: NotificationIntent): RenderedNotification {
    const p = intent.payload;
    const subject = `Meridian Hospital: Appointment Confirmation [${p.appointment_id}]`;
    const body = [
      `Dear ${intent.recipient.full_name},`,
      '',
      'Your consultation at Meridian Hospital has been confirmed.',
      '',
      `Reference Number: ${p.appointment_id}`,
      `Specialist: ${p.doctor_name}`,
      `Department: ${p.department_name}`,
      `Format: ${p.consultation_type}`,
      `Date: ${p.ist_date}`,
      `Time: ${p.ist_time}`,
      '',
      'Clinic Arrival Guidance:',
      'Please arrive at the Outpatient Pavilion reception 15 minutes prior to your scheduled consultation.',
      'Kindly bring any relevant prior clinical records or diagnostic reports.',
      '',
      'To verify or review your booking details, visit the appointment desk or access the portal with your reference number.',
      '',
      'Meridian Hospital',
      'Lower Parel, Mumbai 400013'
    ].join('\n');

    return { channel: 'email', subject, body };
  }

  private static renderConfirmationSms(intent: NotificationIntent): RenderedNotification {
    const p = intent.payload;
    const body = `Meridian Hospital: Consultation confirmed for ${p.appointment_id} with ${p.doctor_name} (${p.department_name}) on ${p.ist_date} at ${p.ist_time}. Please arrive 15 min prior at OPD Pavilion.`;
    return { channel: 'sms', body };
  }

  // --- CANCELLATION ---

  private static renderCancellationEmail(intent: NotificationIntent): RenderedNotification {
    const p = intent.payload;
    const subject = `Meridian Hospital: Appointment Cancellation Notice [${p.appointment_id}]`;
    const body = [
      `Dear ${intent.recipient.full_name},`,
      '',
      'Your consultation at Meridian Hospital has been cancelled as requested.',
      '',
      `Reference Number: ${p.appointment_id}`,
      `Specialist: ${p.doctor_name}`,
      `Department: ${p.department_name}`,
      `Cancelled Date: ${p.ist_date}`,
      `Cancelled Time: ${p.ist_time}`,
      '',
      'Next Steps:',
      'If this cancellation was unintended, or if you wish to choose another date, please visit our booking portal or contact the central scheduling desk.',
      '',
      'Meridian Hospital',
      'Lower Parel, Mumbai 400013'
    ].join('\n');

    return { channel: 'email', subject, body };
  }

  private static renderCancellationSms(intent: NotificationIntent): RenderedNotification {
    const p = intent.payload;
    const body = `Meridian Hospital: Appointment ${p.appointment_id} with ${p.doctor_name} on ${p.ist_date} has been cancelled. To schedule a new consultation, please visit our booking portal.`;
    return { channel: 'sms', body };
  }

  // --- RESCHEDULING ---

  private static renderRescheduledEmail(intent: NotificationIntent): RenderedNotification {
    const p = intent.payload;
    const subject = `Meridian Hospital: Appointment Rescheduled [${p.appointment_id}]`;
    const body = [
      `Dear ${intent.recipient.full_name},`,
      '',
      'Your consultation at Meridian Hospital has been rescheduled to a new time.',
      '',
      `Reference Number: ${p.appointment_id}`,
      `Specialist: ${p.doctor_name}`,
      `Department: ${p.department_name}`,
      `New Date: ${p.ist_date}`,
      `New Time: ${p.ist_time}`,
      p.previous_ist_date && p.previous_ist_time 
        ? `Previous Schedule: ${p.previous_ist_date} at ${p.previous_ist_time}` 
        : '',
      '',
      'Clinic Arrival Guidance:',
      'Please arrive at the Outpatient Pavilion reception 15 minutes prior to your new scheduled consultation time.',
      '',
      'Meridian Hospital',
      'Lower Parel, Mumbai 400013'
    ].filter(Boolean).join('\n');

    return { channel: 'email', subject, body };
  }

  private static renderRescheduledSms(intent: NotificationIntent): RenderedNotification {
    const p = intent.payload;
    const body = `Meridian Hospital: Appointment ${p.appointment_id} with ${p.doctor_name} rescheduled to ${p.ist_date} at ${p.ist_time}. Please arrive 15 min prior at OPD Pavilion.`;
    return { channel: 'sms', body };
  }

  // --- REMINDER ---

  private static renderReminderEmail(intent: NotificationIntent): RenderedNotification {
    const p = intent.payload;
    const subject = `Meridian Hospital: Consultation Reminder [${p.appointment_id}]`;
    const body = [
      `Dear ${intent.recipient.full_name},`,
      '',
      'This is a reminder regarding your upcoming consultation at Meridian Hospital.',
      '',
      `Reference Number: ${p.appointment_id}`,
      `Specialist: ${p.doctor_name}`,
      `Department: ${p.department_name}`,
      `Format: ${p.consultation_type}`,
      `Date: ${p.ist_date}`,
      `Time: ${p.ist_time}`,
      '',
      'Kindly report to the Outpatient Pavilion reception 15 minutes before your consultation.',
      'If you need to reschedule or cancel, please contact the clinic desk in advance.',
      '',
      'Meridian Hospital',
      'Lower Parel, Mumbai 400013'
    ].join('\n');

    return { channel: 'email', subject, body };
  }

  private static renderReminderSms(intent: NotificationIntent): RenderedNotification {
    const p = intent.payload;
    const body = `Meridian Hospital Reminder: Upcoming consultation ${p.appointment_id} with ${p.doctor_name} is scheduled on ${p.ist_date} at ${p.ist_time}. Please arrive 15 min prior.`;
    return { channel: 'sms', body };
  }

  // --- COMPLETION / FOLLOW-UP ---

  private static renderCompletedEmail(intent: NotificationIntent): RenderedNotification {
    const p = intent.payload;
    const subject = `Meridian Hospital: Consultation Follow-Up [${p.appointment_id}]`;
    const body = [
      `Dear ${intent.recipient.full_name},`,
      '',
      'Thank you for visiting Meridian Hospital.',
      '',
      `Reference Number: ${p.appointment_id}`,
      `Specialist: ${p.doctor_name}`,
      `Department: ${p.department_name}`,
      `Date: ${p.ist_date}`,
      '',
      'Summary & Documentation:',
      'Your consultation documentation and prescriptions have been recorded by the clinical team.',
      'For any prescribed diagnostic investigations or follow-up schedules, please consult your discharge summary or contact the department desk.',
      '',
      'Meridian Hospital',
      'Lower Parel, Mumbai 400013'
    ].join('\n');

    return { channel: 'email', subject, body };
  }

  private static renderCompletedSms(intent: NotificationIntent): RenderedNotification {
    const p = intent.payload;
    const body = `Meridian Hospital: Thank you for your visit regarding consultation ${p.appointment_id} with ${p.doctor_name}. Clinical documentation is available at the department desk.`;
    return { channel: 'sms', body };
  }
}
