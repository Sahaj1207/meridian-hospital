import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  MagnifyingGlass,
  ArrowClockwise,
  CalendarBlank,
  Funnel,
  CaretLeft,
  CaretRight
} from '@phosphor-icons/react';
import { auditService } from '@/services/auditService';
import type { AuditLogRecord } from '@/types/notification';

const PAGE_SIZE = 25;

export function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  // Filters
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
  const [resourceIdSearch, setResourceIdSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditService.getAuditLogs({
        action: actionFilter !== 'all' ? actionFilter : undefined,
        resource_type: resourceTypeFilter !== 'all' ? resourceTypeFilter : undefined,
        resource_id: resourceIdSearch.trim() || undefined,
        actor_role: roleFilter !== 'all' ? roleFilter : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate + 'T23:59:59Z').toISOString() : undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE
      });
      setLogs(res.logs);
      setTotalCount(res.total);
    } catch {
      setLogs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, resourceTypeFilter, resourceIdSearch, roleFilter, startDate, endDate, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setActionFilter('all');
    setResourceTypeFilter('all');
    setResourceIdSearch('');
    setRoleFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return (
          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-[#153424] text-[#7EE787]">
            ADMIN
          </span>
        );
      case 'staff':
        return (
          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-[#1A3344] text-[#79C0FF]">
            STAFF
          </span>
        );
      case 'system':
        return (
          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-[#222528] text-[#FAF9F6]">
            SYSTEM
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-[#EAE8E0] text-[#555C63]">
            {role.toUpperCase()}
          </span>
        );
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('cancelled') || action.includes('failed') || action.includes('blocked')) {
      return (
        <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-[#FCE8E6] text-[#9E2A2B] border border-[#F85149]/20">
          {action}
        </span>
      );
    }
    if (action.includes('confirmed') || action.includes('sent') || action.includes('completed')) {
      return (
        <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-[#EDF5F4] text-[#1A635E] border border-[#BCD9D6]">
          {action}
        </span>
      );
    }
    if (action.includes('rescheduled')) {
      return (
        <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-[#FFF8E7] text-[#B07219] border border-[#F3DFB0]">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-[#F4F2EC] text-[#3C4247] border border-[#E5E2D8]">
        {action}
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2D8]">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-[#1A635E] font-semibold mb-1">
            GOVERNANCE & AUDITABILITY
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#111315]">
            Operational Audit Trail
          </h1>
          <p className="text-xs text-[#555C63] mt-0.5">
            Immutable log of clinical actions, schedule modifications, and notification events.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-[#E5E2D8] bg-[#FAF9F6] text-[#222528] hover:bg-[#F4F2EC] transition-colors cursor-pointer self-start sm:self-auto min-h-[36px]"
        >
          <ArrowClockwise size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#111315] pb-2 border-b border-[#ECE9E0]">
          <Funnel size={14} className="text-[#1A635E]" />
          <span>Audit Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Action Filter */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#768390] mb-1">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(0);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
            >
              <option value="all">All Actions</option>
              <option value="appointment.created">appointment.created</option>
              <option value="appointment.confirmed">appointment.confirmed</option>
              <option value="appointment.rescheduled">appointment.rescheduled</option>
              <option value="appointment.cancelled">appointment.cancelled</option>
              <option value="appointment.completed">appointment.completed</option>
              <option value="appointment.no_show">appointment.no_show</option>
              <option value="notification.sent">notification.sent</option>
              <option value="notification.failed">notification.failed</option>
              <option value="schedule.created">schedule.created</option>
              <option value="schedule.updated">schedule.updated</option>
            </select>
          </div>

          {/* Resource Type */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#768390] mb-1">
              Resource Type
            </label>
            <select
              value={resourceTypeFilter}
              onChange={(e) => {
                setResourceTypeFilter(e.target.value);
                setPage(0);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
            >
              <option value="all">All Resources</option>
              <option value="appointment">Appointment</option>
              <option value="schedule">Schedule</option>
              <option value="doctor">Doctor</option>
              <option value="department">Department</option>
              <option value="notification">Notification</option>
            </select>
          </div>

          {/* Actor Role */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#768390] mb-1">
              Actor Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(0);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="system">System</option>
              <option value="public">Public</option>
            </select>
          </div>

          {/* Resource ID Search */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#768390] mb-1">
              Resource Reference
            </label>
            <div className="relative">
              <input
                type="text"
                value={resourceIdSearch}
                onChange={(e) => {
                  setResourceIdSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="e.g. MRD-2026-..."
                className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
              />
              <MagnifyingGlass
                size={14}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-[#8E9499]"
              />
            </div>
          </div>
        </div>

        {/* Date Filters & Clear */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#ECE9E0] text-xs">
          <div className="flex items-center gap-2">
            <CalendarBlank size={14} className="text-[#8E9499]" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
              className="px-2 py-1 bg-white border border-[#E5E2D8] rounded text-xs"
            />
            <span className="text-[#8E9499]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
              className="px-2 py-1 bg-white border border-[#E5E2D8] rounded text-xs"
            />
          </div>

          <button
            onClick={handleResetFilters}
            className="text-xs text-[#1A635E] hover:underline font-medium cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#8A9096]">
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8A9096] space-y-1">
            <ShieldCheck size={28} className="mx-auto text-[#D9D5CA]" />
            <div className="font-semibold text-[#222528]">No matching audit records</div>
            <div>Adjust filters or record identifier to view historical events.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E2D8] bg-[#F4F2EC] text-[#555C63] font-medium text-[11px]">
                  <th className="py-2.5 px-3">Timestamp (IST)</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Reference ID</th>
                  <th className="py-2.5 px-3">Actor Role</th>
                  <th className="py-2.5 px-3">Safe Operational Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D8]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F4F2EC] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#555C63] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] uppercase text-[#768390]">
                      {log.resource_type}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#111315]">
                      {log.resource_id}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getRoleBadge(log.actor_role)}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-mono text-[#555C63] max-w-xs truncate">
                      {Object.keys(log.metadata || {}).length > 0 ? (
                        <span title={JSON.stringify(log.metadata, null, 2)}>
                          {JSON.stringify(log.metadata)}
                        </span>
                      ) : (
                        <span className="text-[#8A9096] italic">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between p-3 border-t border-[#E5E2D8] bg-[#FAF9F6] text-xs text-[#555C63]">
            <div>
              Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} records
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded border border-[#E5E2D8] hover:bg-[#F4F2EC] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <CaretLeft size={14} />
              </button>
              <span className="px-2 font-mono">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1 rounded border border-[#E5E2D8] hover:bg-[#F4F2EC] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <CaretRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
