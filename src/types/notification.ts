export type NotificationEventType =
  | 'appointment.created'
  | 'appointment.confirmed'
  | 'appointment.cancelled'
  | 'appointment.rescheduled'
  | 'appointment.reminder'
  | 'appointment.completed';

export type NotificationChannel = 'email' | 'sms';

export type NotificationDeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface AppointmentNotificationPayload {
  appointment_id: string; // e.g. MRD-2026-10420
  doctor_name: string;
  department_name: string;
  consultation_type: string;
  appointment_start: string; // ISO 8601 UTC
  appointment_end: string;   // ISO 8601 UTC
  ist_date: string;          // e.g. "Monday, 16 November 2026"
  ist_time: string;          // e.g. "10:00 AM IST"
  previous_ist_date?: string; // For rescheduling
  previous_ist_time?: string; // For rescheduling
  reminder_lead_time_hours?: number;
}

export interface NotificationRecipient {
  full_name: string;
  phone?: string;
  email?: string;
}

export interface NotificationIntent {
  id: string;
  event_type: NotificationEventType;
  appointment_id: string;
  channels: NotificationChannel[];
  recipient: NotificationRecipient;
  payload: AppointmentNotificationPayload;
  created_at: string;
}

export interface RenderedNotification {
  channel: NotificationChannel;
  subject?: string; // email only
  body: string;
}

export interface NotificationDeliveryResult {
  notification_id: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  sent_at?: string;
  error?: string;
  simulated: boolean;
}

export interface NotificationDispatchResult {
  intent_id: string;
  event_type: NotificationEventType;
  results: NotificationDeliveryResult[];
  success: boolean;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  sms_enabled: boolean;
}

export interface NotificationProvider {
  readonly name: string;
  readonly is_live: boolean;
  sendEmail(params: {
    to: string;
    subject: string;
    body: string;
  }): Promise<{ success: boolean; message_id?: string; error?: string }>;
  sendSms(params: {
    to: string;
    body: string;
  }): Promise<{ success: boolean; message_id?: string; error?: string }>;
}

export interface StoredNotificationRecord {
  id: string;
  intent_id: string;
  appointment_id: string;
  event_type: NotificationEventType;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  created_at: string;
  sent_at?: string;
  error?: string;
  simulated: boolean;
}

export interface ReminderEvaluationResult {
  appointment_id: string;
  status: 'due' | 'not_due' | 'ineligible' | 'already_sent';
  lead_time_hours: number;
  scheduled_reminder_time_utc: string;
  reason?: string;
}
