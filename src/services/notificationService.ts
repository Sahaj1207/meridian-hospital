import type {
  NotificationEventType,
  NotificationChannel,
  NotificationIntent,
  NotificationDispatchResult,
  NotificationDeliveryResult,
  NotificationDeliveryStatus,
  NotificationPreferences,
  NotificationProvider,
  StoredNotificationRecord
} from '../types/notification.ts';
import { NotificationTemplateRegistry } from './notificationTemplates.ts';
import { LocalNotificationProvider } from './notificationProvider.ts';
import { formatISTDateDisplay, formatISTTimeDisplay } from '../lib/timezone.ts';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.ts';
import { auditService } from './auditService.ts';

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

export interface ResendNotificationParams {
  appointment_id: string;
  event_type: NotificationEventType;
  channel: NotificationChannel;
  reason?: string;
  recipient_contact?: string;
  payload?: Partial<CreateIntentParams>;
}

/**
 * In-memory notification store for audit tracking, testing, and fallback.
 * Kept completely decoupled from authoritative appointment database state.
 */
export class InMemoryNotificationStore {
  private records: StoredNotificationRecord[] = [];

  addRecord(record: StoredNotificationRecord): void {
    const existingIdx = this.records.findIndex(
      (r) => r.idempotency_key && r.idempotency_key === record.idempotency_key
    );
    if (existingIdx !== -1) {
      this.records[existingIdx] = { ...this.records[existingIdx], ...record };
    } else {
      this.records.push(record);
    }
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

  getRecordByIdempotencyKey(key: string): StoredNotificationRecord | undefined {
    return this.records.find((r) => r.idempotency_key === key);
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
 * Categorizes an error message or code as retryable or permanent.
 */
export function isRetryableError(errorText?: string): boolean {
  if (!errorText) return false;
  const lower = errorText.toLowerCase();
  // Permanent failures: missing data, invalid format, disabled channel
  if (
    lower.includes('missing') ||
    lower.includes('disabled') ||
    lower.includes('invalid recipient') ||
    lower.includes('unsupported')
  ) {
    return false;
  }
  // Retryable failures: timeouts, connection errors, rate limits, simulated provider drops
  return (
    lower.includes('timeout') ||
    lower.includes('rate limit') ||
    lower.includes('network') ||
    lower.includes('temporary') ||
    lower.includes('simulated') ||
    lower.includes('provider delivery error')
  );
}

/**
 * Core Notification Service.
 * Decouples appointment lifecycle events from delivery providers and templates.
 * Enforces strict delivery idempotency, controlled retries, and failure isolation.
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
   * Completely failure-isolated: errors never propagate to abort appointment mutations.
   */
  async dispatchNotification(
    intent: NotificationIntent,
    preferences: NotificationPreferences = this.defaultPreferences,
    customIdempotencyKeyPrefix?: string
  ): Promise<NotificationDispatchResult> {
    try {
      const results: NotificationDeliveryResult[] = [];
      const nowIso = new Date().toISOString();

      // 1. Email Channel
      if (intent.channels.includes('email')) {
        const emailResult = await this.deliverChannelWithRetry(
          intent,
          'email',
          preferences.email_enabled,
          intent.recipient.email,
          nowIso,
          customIdempotencyKeyPrefix
        );
        results.push(emailResult);
      }

      // 2. SMS Channel
      if (intent.channels.includes('sms')) {
        const smsResult = await this.deliverChannelWithRetry(
          intent,
          'sms',
          preferences.sms_enabled,
          intent.recipient.phone,
          nowIso,
          customIdempotencyKeyPrefix
        );
        results.push(smsResult);
      }

      const overallSuccess =
        results.some((r) => r.status === 'sent') ||
        results.every((r) => r.status === 'skipped');

      return {
        intent_id: intent.id,
        event_type: intent.event_type,
        results,
        success: overallSuccess
      };
    } catch {
      // Failure isolation guarantee: notification dispatch failure must never disrupt caller
      return {
        intent_id: intent.id,
        event_type: intent.event_type,
        results: [],
        success: false
      };
    }
  }

  /**
   * Delivers to a single channel with idempotency check and controlled retries (max 3).
   */
  private async deliverChannelWithRetry(
    intent: NotificationIntent,
    channel: NotificationChannel,
    isEnabled: boolean,
    targetContact: string | undefined,
    timestamp: string,
    customIdempotencyKeyPrefix?: string
  ): Promise<NotificationDeliveryResult> {
    const baseIdempotencyKey = customIdempotencyKeyPrefix
      ? `${customIdempotencyKeyPrefix}:${channel}`
      : `${intent.appointment_id}:${intent.event_type}:${channel}`;

    const recordId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Idempotency check in memory & Supabase
    const existing = await this.checkExistingDelivery(baseIdempotencyKey, intent.appointment_id);
    if (existing && existing.status === 'sent') {
      return {
        notification_id: existing.id,
        channel,
        status: 'skipped',
        error: 'Duplicate delivery prevented by idempotency policy',
        simulated: !this.provider.is_live,
        idempotency_key: baseIdempotencyKey
      };
    }

    // 2. Check channel enabled
    if (!isEnabled) {
      const skippedResult: NotificationDeliveryResult = {
        notification_id: recordId,
        channel,
        status: 'skipped',
        error: `${channel.toUpperCase()} channel disabled by configuration`,
        simulated: !this.provider.is_live,
        idempotency_key: baseIdempotencyKey
      };
      await this.persistDeliveryRecord({
        id: recordId,
        idempotency_key: baseIdempotencyKey,
        intent_id: intent.id,
        appointment_id: intent.appointment_id,
        event_type: intent.event_type,
        channel,
        status: 'skipped',
        provider: this.provider.name,
        attempt_count: 1,
        created_at: timestamp,
        error: skippedResult.error,
        simulated: !this.provider.is_live
      });
      return skippedResult;
    }

    // 3. Check recipient contact
    if (!targetContact || targetContact.trim().length === 0) {
      const skippedResult: NotificationDeliveryResult = {
        notification_id: recordId,
        channel,
        status: 'skipped',
        error: `Missing recipient ${channel === 'email' ? 'email address' : 'phone number'}`,
        simulated: !this.provider.is_live,
        idempotency_key: baseIdempotencyKey
      };
      await this.persistDeliveryRecord({
        id: recordId,
        idempotency_key: baseIdempotencyKey,
        intent_id: intent.id,
        appointment_id: intent.appointment_id,
        event_type: intent.event_type,
        channel,
        status: 'skipped',
        provider: this.provider.name,
        attempt_count: 1,
        created_at: timestamp,
        error: skippedResult.error,
        simulated: !this.provider.is_live
      });
      return skippedResult;
    }

    // 4. Render template
    let rendered;
    try {
      rendered = NotificationTemplateRegistry.render(intent, channel);
    } catch (renderErr: any) {
      const failedResult: NotificationDeliveryResult = {
        notification_id: recordId,
        channel,
        status: 'failed',
        error: renderErr?.message || 'Template rendering failure',
        simulated: !this.provider.is_live,
        idempotency_key: baseIdempotencyKey
      };
      await this.persistDeliveryRecord({
        id: recordId,
        idempotency_key: baseIdempotencyKey,
        intent_id: intent.id,
        appointment_id: intent.appointment_id,
        event_type: intent.event_type,
        channel,
        status: 'failed',
        provider: this.provider.name,
        attempt_count: 1,
        created_at: timestamp,
        error: failedResult.error,
        simulated: !this.provider.is_live
      });
      return failedResult;
    }

    // 5. Execution loop with controlled retries (maximum 3 attempts)
    const MAX_ATTEMPTS = 3;
    let attempt = 0;
    let lastError: string | undefined;

    while (attempt < MAX_ATTEMPTS) {
      attempt += 1;

      try {
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
          const sentAt = new Date().toISOString();
          const sentResult: NotificationDeliveryResult = {
            notification_id: recordId,
            channel,
            status: 'sent',
            sent_at: sentAt,
            simulated: !this.provider.is_live,
            attempt_count: attempt,
            idempotency_key: baseIdempotencyKey
          };

          await this.persistDeliveryRecord({
            id: recordId,
            idempotency_key: baseIdempotencyKey,
            intent_id: intent.id,
            appointment_id: intent.appointment_id,
            event_type: intent.event_type,
            channel,
            status: 'sent',
            provider: this.provider.name,
            attempt_count: attempt,
            created_at: timestamp,
            sent_at: sentAt,
            simulated: !this.provider.is_live
          });

          // Log operational audit event
          await auditService.logEvent({
            action: 'notification.sent',
            resource_type: 'appointment',
            resource_id: intent.appointment_id,
            metadata: {
              channel,
              provider: this.provider.name,
              attempt_count: attempt,
              idempotency_key: baseIdempotencyKey
            }
          });

          return sentResult;
        } else {
          lastError = deliveryOutcome.error || 'Provider delivery failure';
          const isRetryable = isRetryableError(lastError);

          if (!isRetryable || attempt >= MAX_ATTEMPTS) {
            // Permanent failure or retry exhaustion
            const finalStatus: NotificationDeliveryStatus = 'failed';
            const failedResult: NotificationDeliveryResult = {
              notification_id: recordId,
              channel,
              status: finalStatus,
              error: lastError,
              simulated: !this.provider.is_live,
              attempt_count: attempt,
              idempotency_key: baseIdempotencyKey
            };

            await this.persistDeliveryRecord({
              id: recordId,
              idempotency_key: baseIdempotencyKey,
              intent_id: intent.id,
              appointment_id: intent.appointment_id,
              event_type: intent.event_type,
              channel,
              status: finalStatus,
              provider: this.provider.name,
              attempt_count: attempt,
              last_error_code: lastError,
              created_at: timestamp,
              error: lastError,
              simulated: !this.provider.is_live
            });

            await auditService.logEvent({
              action: 'notification.failed',
              resource_type: 'appointment',
              resource_id: intent.appointment_id,
              metadata: {
                channel,
                provider: this.provider.name,
                attempt_count: attempt,
                error_code: lastError
              }
            });

            return failedResult;
          } else {
            // Intermediate retryable failure: log as retrying
            await this.persistDeliveryRecord({
              id: recordId,
              idempotency_key: baseIdempotencyKey,
              intent_id: intent.id,
              appointment_id: intent.appointment_id,
              event_type: intent.event_type,
              channel,
              status: 'retrying',
              provider: this.provider.name,
              attempt_count: attempt,
              last_error_code: lastError,
              created_at: timestamp,
              error: lastError,
              simulated: !this.provider.is_live
            });
          }
        }
      } catch (err: any) {
        lastError = err?.message || 'Dispatch exception';
        if (attempt >= MAX_ATTEMPTS || !isRetryableError(lastError)) {
          break;
        }
      }
    }

    // Exhausted retries
    const exhaustedResult: NotificationDeliveryResult = {
      notification_id: recordId,
      channel,
      status: 'failed',
      error: lastError || 'Exhausted maximum retry attempts',
      simulated: !this.provider.is_live,
      attempt_count: attempt,
      idempotency_key: baseIdempotencyKey
    };

    await this.persistDeliveryRecord({
      id: recordId,
      idempotency_key: baseIdempotencyKey,
      intent_id: intent.id,
      appointment_id: intent.appointment_id,
      event_type: intent.event_type,
      channel,
      status: 'failed',
      provider: this.provider.name,
      attempt_count: attempt,
      last_error_code: lastError,
      created_at: timestamp,
      error: exhaustedResult.error,
      simulated: !this.provider.is_live
    });

    return exhaustedResult;
  }

  /**
   * Checks whether a notification with this idempotency key already exists.
   */
  private async checkExistingDelivery(
    idempotencyKey: string,
    _appointmentId?: string
  ): Promise<StoredNotificationRecord | undefined> {
    // Check local store first
    const mem = this.store.getRecordByIdempotencyKey(idempotencyKey);
    if (mem) return mem;

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('notification_deliveries')
          .select('*')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            idempotency_key: data.idempotency_key,
            intent_id: `intent-${data.appointment_id}`,
            appointment_id: data.appointment_id,
            event_type: data.event_type as NotificationEventType,
            channel: data.channel as NotificationChannel,
            status: data.status as NotificationDeliveryStatus,
            provider: data.provider,
            attempt_count: data.attempt_count,
            created_at: data.created_at,
            sent_at: data.sent_at,
            simulated: !this.provider.is_live
          };
        }
      } catch {
        // Fall back to memory
      }
    }
    return undefined;
  }

  /**
   * Persists delivery records to Supabase via RPC and local memory store.
   */
  private async persistDeliveryRecord(record: StoredNotificationRecord): Promise<void> {
    this.store.addRecord(record);

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase && record.idempotency_key) {
      try {
        await supabase.rpc('record_notification_delivery', {
          p_idempotency_key: record.idempotency_key,
          p_appointment_id: record.appointment_id,
          p_event_type: record.event_type,
          p_channel: record.channel,
          p_provider: record.provider || this.provider.name,
          p_status: record.status,
          p_attempt_count: record.attempt_count || 1,
          p_last_error_code: record.last_error_code || record.error || null,
          p_scheduled_at: null,
          p_sent_at: record.sent_at || null
        });
      } catch {
        // Non-blocking failure boundary
      }
    }
  }

  /**
   * Explicit administrative resend capability with unique auditable resend key.
   * Strictly avoids exposing or requiring confirmation tokens.
   * Supports both record ID (backward compatible) and ResendNotificationParams.
   */
  async resendNotification(
    recordIdOrParams: string | ResendNotificationParams
  ): Promise<NotificationDeliveryResult> {
    if (typeof recordIdOrParams === 'string') {
      const recordId = recordIdOrParams;
      const existing = this.store.getRecordById(recordId);
      if (!existing) {
        return {
          notification_id: recordId,
          channel: 'email',
          status: 'failed',
          error: 'Record not found',
          simulated: !this.provider.is_live
        };
      }

      await auditService.logEvent({
        action: 'notification.sent',
        resource_type: 'appointment',
        resource_id: existing.appointment_id,
        metadata: {
          channel: existing.channel,
          event_type: existing.event_type,
          reason: 'Resend triggered by record ID',
          trigger: 'record_resend'
        }
      });

      const nowIso = new Date().toISOString();
      let outcome: { success: boolean; message_id?: string; error?: string };

      try {
        if (existing.channel === 'email') {
          outcome = await this.provider.sendEmail({
            to: 'patient-contact',
            subject: `Meridian Hospital: Consultation Notice [${existing.appointment_id}]`,
            body: `Notice regarding consultation reference ${existing.appointment_id}.`
          });
        } else {
          outcome = await this.provider.sendSms({
            to: 'patient-contact',
            body: `Meridian Hospital: Consultation update for ${existing.appointment_id}.`
          });
        }

        if (outcome.success) {
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
            simulated: !this.provider.is_live,
            attempt_count: (existing.attempt_count || 1) + 1,
            idempotency_key: existing.idempotency_key
          };
        } else {
          this.store.updateRecord(recordId, {
            status: 'failed',
            error: outcome.error
          });

          return {
            notification_id: recordId,
            channel: existing.channel,
            status: 'failed',
            error: outcome.error,
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

    const params = recordIdOrParams;
    const resendKeyPrefix = `${params.appointment_id}:${params.event_type}:resend-${Date.now()}`;

    // Log the explicit resend audit event before dispatch
    await auditService.logEvent({
      action: 'notification.sent',
      resource_type: 'appointment',
      resource_id: params.appointment_id,
      metadata: {
        channel: params.channel,
        event_type: params.event_type,
        reason: params.reason || 'Staff requested resend',
        trigger: 'admin_resend'
      }
    });

    const nowIso = new Date().toISOString();
    let outcome: { success: boolean; message_id?: string; error?: string };

    try {
      if (params.channel === 'email') {
        outcome = await this.provider.sendEmail({
          to: params.recipient_contact || 'patient-contact',
          subject: `Meridian Hospital: Consultation Notice [${params.appointment_id}]`,
          body: `Notice regarding consultation reference ${params.appointment_id}.`
        });
      } else {
        outcome = await this.provider.sendSms({
          to: params.recipient_contact || 'patient-contact',
          body: `Meridian Hospital: Consultation update for ${params.appointment_id}.`
        });
      }

      const status: NotificationDeliveryStatus = outcome.success ? 'sent' : 'failed';
      const recordId = `notif-resend-${Date.now()}`;
      const record: StoredNotificationRecord = {
        id: recordId,
        idempotency_key: `${resendKeyPrefix}:${params.channel}`,
        intent_id: `intent-resend-${params.appointment_id}`,
        appointment_id: params.appointment_id,
        event_type: params.event_type,
        channel: params.channel,
        status,
        provider: this.provider.name,
        attempt_count: 1,
        created_at: nowIso,
        sent_at: outcome.success ? nowIso : undefined,
        error: outcome.error,
        simulated: !this.provider.is_live
      };

      await this.persistDeliveryRecord(record);

      return {
        notification_id: recordId,
        channel: params.channel,
        status,
        sent_at: outcome.success ? nowIso : undefined,
        error: outcome.error,
        simulated: !this.provider.is_live,
        attempt_count: 1,
        idempotency_key: record.idempotency_key
      };
    } catch (err: any) {
      return {
        notification_id: `notif-resend-${Date.now()}`,
        channel: params.channel,
        status: 'failed',
        error: err?.message || 'Resend error',
        simulated: !this.provider.is_live
      };
    }
  }

  /**
   * Retrieves notification delivery history for an appointment from Supabase and memory.
   */
  async getNotificationHistory(appointmentId?: string): Promise<StoredNotificationRecord[]> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured && supabase && appointmentId) {
      try {
        const { data, error } = await supabase
          .from('notification_deliveries')
          .select('*')
          .eq('appointment_id', appointmentId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            idempotency_key: d.idempotency_key,
            intent_id: `intent-${d.appointment_id}`,
            appointment_id: d.appointment_id,
            event_type: d.event_type as NotificationEventType,
            channel: d.channel as NotificationChannel,
            status: d.status as NotificationDeliveryStatus,
            provider: d.provider,
            attempt_count: d.attempt_count,
            created_at: d.created_at,
            sent_at: d.sent_at,
            error: d.last_error_code,
            simulated: !this.provider.is_live
          }));
        }
      } catch {
        // Fall back to memory
      }
    }
    return this.store.getRecords(appointmentId);
  }
}

export const notificationService = new NotificationService();
