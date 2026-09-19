import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import type { AuditLogRecord, AuditActionType } from '@/types/notification';

export interface LogAuditParams {
  action: AuditActionType | string;
  resource_type: string;
  resource_id: string;
  metadata?: Record<string, any>;
}

export interface AuditFilterParams {
  action?: string;
  resource_type?: string;
  resource_id?: string;
  actor_role?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// Explicit allowlist of safe operational metadata keys
const SAFE_METADATA_KEYS = new Set([
  'appointment_id',
  'doctor_id',
  'doctor_name',
  'department_id',
  'department_name',
  'consultation_type',
  'status',
  'previous_status',
  'slot_start',
  'slot_end',
  'rescheduled_from',
  'cancellation_reason',
  'channel',
  'provider',
  'attempt_count',
  'error_code',
  'idempotency_key',
  'lead_time_hours',
  'trigger'
]);

/**
 * Strips any sensitive tokens, credentials, or contact details,
 * allowing only safe operational attributes.
 */
export function sanitizeAuditMetadata(metadata?: Record<string, any>): Record<string, any> {
  if (!metadata || typeof metadata !== 'object') return {};
  const clean: Record<string, any> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Check against allowlist and ensure no dangerous key patterns
    if (
      SAFE_METADATA_KEYS.has(key) &&
      !key.toLowerCase().includes('token') &&
      !key.toLowerCase().includes('password') &&
      !key.toLowerCase().includes('secret') &&
      !key.toLowerCase().includes('phone') &&
      !key.toLowerCase().includes('email')
    ) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        clean[key] = value;
      }
    }
  }
  return clean;
}

/**
 * In-memory fallback store for development and non-Supabase environments.
 */
class InMemoryAuditStore {
  private logs: AuditLogRecord[] = [];

  addLog(record: AuditLogRecord): void {
    this.logs.unshift(record);
  }

  getLogs(filters?: AuditFilterParams): AuditLogRecord[] {
    let result = [...this.logs];

    if (filters?.action && filters.action !== 'all') {
      result = result.filter((l) => l.action === filters.action);
    }
    if (filters?.resource_type && filters.resource_type !== 'all') {
      result = result.filter((l) => l.resource_type === filters.resource_type);
    }
    if (filters?.resource_id) {
      result = result.filter((l) => l.resource_id.toLowerCase().includes(filters.resource_id!.toLowerCase()));
    }
    if (filters?.actor_role && filters.actor_role !== 'all') {
      result = result.filter((l) => l.actor_role === filters.actor_role);
    }
    if (filters?.startDate) {
      result = result.filter((l) => l.created_at >= filters.startDate!);
    }
    if (filters?.endDate) {
      result = result.filter((l) => l.created_at <= filters.endDate!);
    }

    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    return result.slice(offset, offset + limit);
  }

  clear(): void {
    this.logs = [];
  }
}

export const localAuditStore = new InMemoryAuditStore();

export class AuditService {
  private store: InMemoryAuditStore;

  constructor(store: InMemoryAuditStore = localAuditStore) {
    this.store = store;
  }

  /**
   * Records an operational audit trail.
   * Derives actor identity strictly via server-side session.
   * Guaranteed to be failure-isolated (never disrupts calling transactions).
   */
  async logEvent(params: LogAuditParams): Promise<{ success: boolean; audit_id?: string }> {
    try {
      const cleanMeta = sanitizeAuditMetadata(params.metadata);
      const supabase = getSupabaseClient();

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.rpc('record_audit_event', {
          p_action: params.action,
          p_resource_type: params.resource_type,
          p_resource_id: params.resource_id,
          p_metadata: cleanMeta
        });

        if (!error && data && data.success) {
          return { success: true, audit_id: data.audit_id };
        }
      }

      // Local store fallback
      const localId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const record: AuditLogRecord = {
        id: localId,
        actor_id: null,
        actor_role: 'system',
        action: params.action,
        resource_type: params.resource_type,
        resource_id: params.resource_id,
        metadata: cleanMeta,
        created_at: new Date().toISOString()
      };
      this.store.addLog(record);
      return { success: true, audit_id: localId };
    } catch {
      // Failure boundary: audit logging must never cause business operations to fail
      return { success: false };
    }
  }

  /**
   * Retrieves audit logs for authenticated staff and admin visibility.
   */
  async getAuditLogs(filters: AuditFilterParams = {}): Promise<{ logs: AuditLogRecord[]; total: number }> {
    const supabase = getSupabaseClient();

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('audit_logs')
          .select('*', { count: 'exact' });

        if (filters.action && filters.action !== 'all') {
          query = query.eq('action', filters.action);
        }
        if (filters.resource_type && filters.resource_type !== 'all') {
          query = query.eq('resource_type', filters.resource_type);
        }
        if (filters.resource_id) {
          query = query.ilike('resource_id', `%${filters.resource_id}%`);
        }
        if (filters.actor_role && filters.actor_role !== 'all') {
          query = query.eq('actor_role', filters.actor_role);
        }
        if (filters.startDate) {
          query = query.gte('created_at', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('created_at', filters.endDate);
        }

        const offset = filters.offset || 0;
        const limit = filters.limit || 50;

        query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (!error && data) {
          return { logs: data as AuditLogRecord[], total: count || data.length };
        }
      } catch {
        // Fall back to local store
      }
    }

    const localResults = this.store.getLogs(filters);
    return { logs: localResults, total: localResults.length };
  }

  /**
   * Fetches the complete lifecycle audit history for a specific appointment.
   */
  async getAppointmentHistory(appointmentId: string): Promise<AuditLogRecord[]> {
    const res = await this.getAuditLogs({
      resource_type: 'appointment',
      resource_id: appointmentId,
      limit: 100
    });
    return res.logs;
  }
}

export const auditService = new AuditService();
