import type { 
  NotificationEventType, 
  NotificationChannel, 
  NotificationIntent, 
  NotificationDispatchResult, 
  NotificationDeliveryResult, 
  NotificationPreferences, 
  NotificationProvider, 
  StoredNotificationRecord 
} from '../types/notification.ts';
import { NotificationTemplateRegistry } from './notificationTemplates.ts';
import { LocalNotificationProvider } from './notificationProvider.ts';
import { formatISTDateDisplay, formatISTTimeDisplay } from '../lib/timezone.ts';

export interface CreateIntentParams {
  event_type: NotificationEventType;
  appointment_id: string; // e.g. MRD-2026-10420
  doctor_name: string;
  department_name: string;
  consultation_type: string;
  appointment_start: string; // ISO 8601 UTC
  appointment_end: string;   // ISO 8601 UTC
  patient: {
    full_name: string;
    phone?: string;
    email?: string;
  };
  previous_appointment_start?: string; // For reschedule
  previous_appointment_end?: string;   // For reschedule
  reminder_lead_time_hours?: number;
}

/**
 * In-memory notification store for audit tracking and resend support.
 * Kept completely decoupled from authoritative appointment database state.
 */
export class InMemoryNotificationStore {
  private records: StoredNotificationRecord[] = [];

  addRecord(record: StoredNotificationRecord): void {
    this.records.push(record);
  }

  getRecords(appointmentId?: string): StoredNotificationRecord[] {
    if (appointmentId) {
      return this.records.filter((r) => r.appointment_id === appointmentId);
    }
    return [...this.records];
  }

  getRecordById(recordId: string): StoredNotificationRecord | undefined {
    return this.records.find((r) => r.id === recordId);
  }

  updateRecord(recordId: string, updates: Partial<StoredNotificationRecord>): void {
    const idx = this.records.findIndex((r) => r.id === recordId);
    if (idx !== -1) {
      this.records[idx] = { ...this.records[idx], ...updates };
    }
  }

  clear(): void {
    this.records = [];
  }
}

export const localNotificationStore = new InMemoryNotificationStore();

/**
 * Core Notification Service.
 * Decouples appointment lifecycle events from delivery providers and templates.
 */
export class NotificationService {
  private provider: NotificationProvider;
  private store: InMemoryNotificationStore;
  private defaultPreferences: NotificationPreferences = {
    email_enabled: true,
    sms_enabled: true
  };

  constructor(
    provider: NotificationProvider = new LocalNotificationProvider(),
    store: InMemoryNotificationStore = localNotificationStore
  ) {
    this.provider = provider;
    this.store = store;
  }

  setProvider(provider: NotificationProvider): void {
    this.provider = provider;
  }

  getProvider(): NotificationProvider {
    return this.provider;
  }

  /**
   * Constructs a typed NotificationIntent from raw appointment parameters.
   */
  createNotificationIntent(params: CreateIntentParams): NotificationIntent {
    const istDate = formatISTDateDisplay(params.appointment_start);
    const istTime = formatISTTimeDisplay(params.appointment_start);

    let prevIstDate: string | undefined;
    let prevIstTime: string | undefined;
    if (params.previous_appointment_start) {
      prevIstDate = formatISTDateDisplay(params.previous_appointment_start);
      prevIstTime = formatISTTimeDisplay(params.previous_appointment_start);
    }

    const intentId = `intent-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    return {
      id: intentId,
      event_type: params.event_type,
      appointment_id: params.appointment_id,
      channels: ['email', 'sms'],
      recipient: {
        full_name: params.patient.full_name,
        phone: params.patient.phone?.trim() || undefined,
        email: params.patient.email?.trim() || undefined
      },
      payload: {
        appointment_id: params.appointment_id,
        doctor_name: params.doctor_name,
        department_name: params.department_name,
        consultation_type: params.consultation_type,
        appointment_start: params.appointment_start,
        appointment_end: params.appointment_end,
        ist_date: istDate,
        ist_time: istTime,
        previous_ist_date: prevIstDate,
        previous_ist_time: prevIstTime,
        reminder_lead_time_hours: params.reminder_lead_time_hours
      },
      created_at: new Date().toISOString()
    };
  }

  /**
   * Dispatches a notification intent across configured channels.
   * Gracefully handles disabled channels or missing contact details.
   */
  async dispatchNotification(
    intent: NotificationIntent,
    preferences: NotificationPreferences = this.defaultPreferences
  ): Promise<NotificationDispatchResult> {
    const results: NotificationDeliveryResult[] = [];
    const nowIso = new Date().toISOString();

    // 1. Email Channel
    if (intent.channels.includes('email')) {
      const emailResult = await this.deliverChannel(
        intent,
        'email',
        preferences.email_enabled,
        intent.recipient.email,
        nowIso
      );
      results.push(emailResult);
    }

    // 2. SMS Channel
    if (intent.channels.includes('sms')) {
      const smsResult = await this.deliverChannel(
        intent,
        'sms',
        preferences.sms_enabled,
        intent.recipient.phone,
        nowIso
      );
      results.push(smsResult);
    }

    const overallSuccess = results.some((r) => r.status === 'sent') || 
      results.every((r) => r.status === 'skipped');

    return {
      intent_id: intent.id,
      event_type: intent.event_type,
      results,
      success: overallSuccess
    };
  }

  private async deliverChannel(
    intent: NotificationIntent,
    channel: NotificationChannel,
    isEnabled: boolean,
    targetContact: string | undefined,
    timestamp: string
  ): Promise<NotificationDeliveryResult> {
    const recordId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Check preference
    if (!isEnabled) {
      const skippedResult: NotificationDeliveryResult = {
        notification_id: recordId,
        channel,
        status: 'skipped',
        error: `${channel.toUpperCase()} channel disabled by configuration`,
        simulated: !this.provider.is_live
      };
      this.store.addRecord({
        id: recordId,
        intent_id: intent.id,
        appointment_id: intent.appointment_id,
        event_type: intent.event_type,
        channel,
        status: 'skipped',
        created_at: timestamp,
        error: skippedResult.error,
        simulated: !this.provider.is_live
      });
      return skippedResult;
    }

    // Check target recipient contact
    if (!targetContact || targetContact.trim().length === 0) {
      const skippedResult: NotificationDeliveryResult = {
        notification_id: recordId,
        channel,
        status: 'skipped',
        error: `Missing recipient ${channel === 'email' ? 'email address' : 'phone number'}`,
        simulated: !this.provider.is_live
      };
      this.store.addRecord({
        id: recordId,
        intent_id: intent.id,
        appointment_id: intent.appointment_id,
        event_type: intent.event_type,
        channel,
        status: 'skipped',
        created_at: timestamp,
        error: skippedResult.error,
        simulated: !this.provider.is_live
      });
      return skippedResult;
    }

    // Render template
    try {
      const rendered = NotificationTemplateRegistry.render(intent, channel);

      let deliveryOutcome: { success: boolean; message_id?: string; error?: string };
      if (channel === 'email') {
        deliveryOutcome = await this.provider.sendEmail({
          to: targetContact,
          subject: rendered.subject || `Meridian Hospital: Consultation Update [${intent.appointment_id}]`,
          body: rendered.body
        });
      } else {
        deliveryOutcome = await this.provider.sendSms({
          to: targetContact,
          body: rendered.body
        });
      }

      if (deliveryOutcome.success) {
        const sentResult: NotificationDeliveryResult = {
          notification_id: recordId,
          channel,
          status: 'sent',
          sent_at: new Date().toISOString(),
          simulated: !this.provider.is_live
        };
        this.store.addRecord({
          id: recordId,
          intent_id: intent.id,
          appointment_id: intent.appointment_id,
          event_type: intent.event_type,
          channel,
          status: 'sent',
          created_at: timestamp,
          sent_at: sentResult.sent_at,
          simulated: !this.provider.is_live
        });
        return sentResult;
      } else {
        const failedResult: NotificationDeliveryResult = {
          notification_id: recordId,
          channel,
          status: 'failed',
          error: deliveryOutcome.error || 'Provider delivery error',
          simulated: !this.provider.is_live
        };
        this.store.addRecord({
          id: recordId,
          intent_id: intent.id,
          appointment_id: intent.appointment_id,
          event_type: intent.event_type,
          channel,
          status: 'failed',
          created_at: timestamp,
          error: failedResult.error,
          simulated: !this.provider.is_live
        });
        return failedResult;
      }
    } catch (err: any) {
      const failedResult: NotificationDeliveryResult = {
        notification_id: recordId,
        channel,
        status: 'failed',
        error: err?.message || 'Template rendering or dispatch failure',
        simulated: !this.provider.is_live
      };
      this.store.addRecord({
        id: recordId,
        intent_id: intent.id,
        appointment_id: intent.appointment_id,
        event_type: intent.event_type,
        channel,
        status: 'failed',
        created_at: timestamp,
        error: failedResult.error,
        simulated: !this.provider.is_live
      });
      return failedResult;
    }
  }

  /**
   * Internal staff/admin capability to re-dispatch a previously failed or recorded notification.
   * Strictly avoids exposing or requiring confirmation tokens or hold tokens.
   */
  async resendNotification(recordId: string): Promise<NotificationDeliveryResult> {
    const existing = this.store.getRecordById(recordId);
    if (!existing) {
      return {
        notification_id: recordId,
        channel: 'email',
        status: 'failed',
        error: 'Notification record not found',
        simulated: !this.provider.is_live
      };
    }

    const nowIso = new Date().toISOString();
    let resendOutcome: { success: boolean; message_id?: string; error?: string };

    try {
      if (existing.channel === 'email') {
        resendOutcome = await this.provider.sendEmail({
          to: 'patient-contact',
          subject: `Meridian Hospital: Resent Notice [${existing.appointment_id}]`,
          body: `Notice regarding consultation reference ${existing.appointment_id}.`
        });
      } else {
        resendOutcome = await this.provider.sendSms({
          to: 'patient-contact',
          body: `Meridian Hospital: Consultation update for ${existing.appointment_id}.`
        });
      }

      if (resendOutcome.success) {
        this.store.updateRecord(recordId, {
          status: 'sent',
          sent_at: nowIso,
          error: undefined
        });
        return {
          notification_id: recordId,
          channel: existing.channel,
          status: 'sent',
          sent_at: nowIso,
          simulated: !this.provider.is_live
        };
      } else {
        this.store.updateRecord(recordId, {
          status: 'failed',
          error: resendOutcome.error || 'Resend provider error'
        });
        return {
          notification_id: recordId,
          channel: existing.channel,
          status: 'failed',
          error: resendOutcome.error || 'Resend provider error',
          simulated: !this.provider.is_live
        };
      }
    } catch (err: any) {
      return {
        notification_id: recordId,
        channel: existing.channel,
        status: 'failed',
        error: err?.message || 'Resend failure',
        simulated: !this.provider.is_live
      };
    }
  }

  getNotificationHistory(appointmentId?: string): StoredNotificationRecord[] {
    return this.store.getRecords(appointmentId);
  }
}

export const notificationService = new NotificationService();
