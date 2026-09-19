import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  ArrowClockwise,
  Clock,
  Prohibit,
  ArrowSquareOut
} from '@phosphor-icons/react';
import { appointmentService } from '@/services/appointmentService';
import { catalogService } from '@/services/catalogService';
import { availabilityService } from '@/services/availabilityService';
import { formatISTDateDisplay, formatISTTimeDisplay, getISTDateString } from '@/lib/timezone';
import type { StaffAppointmentView, CalculatedSlot } from '@/types/scheduling';
import type { DbAppointment } from '@/types/database';

type AppointmentStatus = DbAppointment['status'];
type QueueTab = 'all' | 'today' | 'upcoming' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<StaffAppointmentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<QueueTab>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  // Catalog cache
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  // Modals & Drawers
  const [inspectingAppt, setInspectingAppt] = useState<StaffAppointmentView | null>(null);
  const [reschedulingAppt, setReschedulingAppt] = useState<StaffAppointmentView | null>(null);

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<CalculatedSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<CalculatedSlot | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Load catalog lists
  useEffect(() => {
    async function loadCatalog() {
      try {
        const [docs, deps] = await Promise.all([
          catalogService.getDoctors(),
          catalogService.getDepartments()
        ]);
        setDoctors(docs.map((d) => ({ id: d.id, name: d.name })));
        setDepartments(deps.map((d) => ({ id: d.id, name: d.name })));
      } catch (e) {
        console.error('Failed to load catalog lists:', e);
      }
    }
    loadCatalog();
  }, []);

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await appointmentService.getStaffAppointments({}, true);
      setAppointments(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch appointments queue.';
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Today in IST
  const todayIst = useMemo(() => getISTDateString(new Date()), []);

  // Filtered view
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const apptIstDate = getISTDateString(appt.appointment_start);

      // Tab filter
      if (activeTab === 'today' && apptIstDate !== todayIst) return false;
      if (activeTab === 'upcoming') {
        if (apptIstDate < todayIst || appt.status === 'completed' || appt.status === 'cancelled') return false;
      }
      if (activeTab === 'pending' && appt.status !== 'pending') return false;
      if (activeTab === 'confirmed' && appt.status !== 'confirmed') return false;
      if (activeTab === 'completed' && appt.status !== 'completed') return false;
      if (activeTab === 'cancelled' && appt.status !== 'cancelled') return false;
      if (activeTab === 'no_show' && appt.status !== 'no_show') return false;

      // Doctor filter
      if (selectedDoctor !== 'all' && appt.doctor_id !== selectedDoctor) return false;

      // Department filter
      if (selectedDepartment !== 'all' && appt.department_id !== selectedDepartment) return false;

      // Date input filter
      if (filterDate && apptIstDate !== filterDate) return false;

      // Search query (Ref, Patient Name, Phone, Email)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const refMatch = appt.appointment_id.toLowerCase().includes(q);
        const nameMatch = appt.patient_name.toLowerCase().includes(q);
        const phoneMatch = appt.patient_phone?.toLowerCase().includes(q);
        const emailMatch = appt.patient_email?.toLowerCase().includes(q);
        if (!refMatch && !nameMatch && !phoneMatch && !emailMatch) return false;
      }

      return true;
    });
  }, [appointments, activeTab, todayIst, selectedDoctor, selectedDepartment, filterDate, searchQuery]);

  // Status mutation handlers
  const handleConfirm = async (ref: string) => {
    if (actionLoadingId) return;
    setActionLoadingId(ref);
    setActionMessage(null);
    try {
      const res = await appointmentService.confirmAppointment(ref, true);
      if (res.success) {
        setActionMessage({ type: 'success', text: `Appointment ${ref} confirmed successfully.` });
        await fetchAppointments();
        if (inspectingAppt?.appointment_id === ref) {
          setInspectingAppt((prev) => prev ? { ...prev, status: 'confirmed' } : null);
        }
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Failed to confirm appointment.' });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleComplete = async (ref: string) => {
    if (actionLoadingId) return;
    setActionLoadingId(ref);
    setActionMessage(null);
    try {
      const res = await appointmentService.completeAppointment(ref, true);
      if (res.success) {
        setActionMessage({ type: 'success', text: `Appointment ${ref} marked as completed.` });
        await fetchAppointments();
        if (inspectingAppt?.appointment_id === ref) {
          setInspectingAppt((prev) => prev ? { ...prev, status: 'completed' } : null);
        }
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Failed to complete appointment.' });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNoShow = async (ref: string) => {
    if (actionLoadingId) return;
    setActionLoadingId(ref);
    setActionMessage(null);
    try {
      const res = await appointmentService.recordNoShow(ref, true);
      if (res.success) {
        setActionMessage({ type: 'success', text: `Appointment ${ref} marked as no-show.` });
        await fetchAppointments();
        if (inspectingAppt?.appointment_id === ref) {
          setInspectingAppt((prev) => prev ? { ...prev, status: 'no_show' } : null);
        }
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Failed to mark no-show.' });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (ref: string) => {
    if (actionLoadingId) return;
    const reason = window.prompt('Please provide a clinical or operational cancellation reason:');
    if (!reason) return;
    setActionLoadingId(ref);
    setActionMessage(null);
    try {
      const res = await appointmentService.cancelAppointment({
        appointment_id: ref,
        cancellation_reason: reason
      }, undefined, true);

      if (typeof res === 'object' && res.success) {
        setActionMessage({ type: 'success', text: `Appointment ${ref} cancelled successfully.` });
        await fetchAppointments();
        if (inspectingAppt?.appointment_id === ref) {
          setInspectingAppt((prev) => prev ? { ...prev, status: 'cancelled' } : null);
        }
      } else {
        const errText = typeof res === 'object' ? res.error : 'Failed to cancel appointment.';
        setActionMessage({ type: 'error', text: errText || 'Failed to cancel appointment.' });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open reschedule modal
  const openRescheduleModal = (appt: StaffAppointmentView) => {
    setReschedulingAppt(appt);
    setRescheduleDate(getISTDateString(new Date(Date.now() + 86400000))); // Default tomorrow
    setRescheduleSlots([]);
    setSelectedSlot(null);
    setRescheduleReason('');
    setRescheduleError(null);
  };

  // Fetch slots for reschedule date
  useEffect(() => {
    if (!reschedulingAppt || !rescheduleDate) return;
    async function loadSlots() {
      setRescheduleLoading(true);
      setRescheduleError(null);
      try {
        const res = await availabilityService.getLiveAvailability({
          doctorId: reschedulingAppt!.doctor_id,
          consultationTypeId: 'general',
          date: rescheduleDate
        });
        if (res.success && res.data) {
          setRescheduleSlots(res.data.slots.filter((s: CalculatedSlot) => s.available));
        } else {
          setRescheduleSlots([]);
        }
        setSelectedSlot(null);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch available slots.';
        setRescheduleError(msg);
      } finally {
        setRescheduleLoading(false);
      }
    }
    loadSlots();
  }, [reschedulingAppt, rescheduleDate]);

  // Execute staff reschedule
  const handleExecuteReschedule = async () => {
    if (!reschedulingAppt || !selectedSlot) return;
    setRescheduleLoading(true);
    setRescheduleError(null);

    const res = await appointmentService.rescheduleAppointment({
      appointment_id: reschedulingAppt.appointment_id,
      new_slot_start: selectedSlot.slot_start,
      new_slot_end: selectedSlot.slot_end
    }, true);

    setRescheduleLoading(false);

    if (res.success && res.new_appointment_id) {
      setActionMessage({
        type: 'success',
        text: `Appointment rescheduled atomically. New reference: ${res.new_appointment_id}`
      });
      setReschedulingAppt(null);
      if (inspectingAppt?.appointment_id === reschedulingAppt.appointment_id) {
        setInspectingAppt(null);
      }
      fetchAppointments();
    } else {
      setRescheduleError(res.error || 'Failed to execute staff reschedule.');
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#E6F4EA] text-[#137333] border border-[#A8DAB5]">
            <CheckCircle size={12} weight="fill" />
            <span>Confirmed</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFF8E6] text-[#B06000] border border-[#FFDF99]">
            <Clock size={12} weight="fill" />
            <span>Pending</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#ECEFF1] text-[#455A64] border border-[#CFD8DC]">
            <CheckCircle size={12} />
            <span>Completed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FCE8E6] text-[#C5221F] border border-[#F5C2C7]">
            <XCircle size={12} weight="fill" />
            <span>Cancelled</span>
          </span>
        );
      case 'no_show':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F3E8FD] text-[#6E2BB1] border border-[#D8B4FE]">
            <Prohibit size={12} />
            <span>No Show</span>
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2D8]">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-[#1A635E] font-semibold mb-1">
            CLINICAL OUTPATIENT OPERATIONS
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#111315]">
            Appointments Queue
          </h1>
          <p className="text-xs text-[#555C63] mt-0.5">
            Operational status lifecycle, clinical admissions, and verified staff rescheduling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAppointments}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#FAF9F6] hover:bg-[#FFFFFF] border border-[#E5E2D8] text-[#222528] rounded cursor-pointer transition-colors disabled:opacity-50"
          >
            <ArrowClockwise size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div
          className={`p-3 rounded text-xs flex items-center justify-between gap-3 ${
            actionMessage.type === 'success'
              ? 'bg-[#E6F4EA] border border-[#2EA043] text-[#137333]'
              : 'bg-[#FCE8E6] border border-[#F85149] text-[#9E2A2B]'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-semibold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Queue Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#E5E2D8] pb-px">
        {[
          { key: 'today', label: "Today's Schedule" },
          { key: 'upcoming', label: 'Upcoming Active' },
          { key: 'pending', label: 'Pending Confirmation' },
          { key: 'confirmed', label: 'Confirmed' },
          { key: 'completed', label: 'Completed' },
          { key: 'no_show', label: 'No Show' },
          { key: 'cancelled', label: 'Cancelled' },
          { key: 'all', label: 'All Records' }
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as QueueTab)}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#1A635E] text-[#1A635E] font-semibold'
                  : 'border-transparent text-[#555C63] hover:text-[#111315]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#FAF9F6] p-3.5 rounded border border-[#E5E2D8]">
        {/* Search Input */}
        <div className="relative">
          <MagnifyingGlass size={15} className="absolute left-2.5 top-2.5 text-[#8A9096]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ref, patient, phone..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#E5E2D8] rounded text-[#111315] focus:outline-none focus:border-[#1A635E]"
          />
        </div>

        {/* Doctor Filter */}
        <div>
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#E5E2D8] rounded text-[#111315] focus:outline-none focus:border-[#1A635E]"
          >
            <option value="all">All Specialists (5 Canonical)</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Department Filter */}
        <div>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#E5E2D8] rounded text-[#111315] focus:outline-none focus:border-[#1A635E]"
          >
            <option value="all">All Departments (15 Canonical)</option>
            {departments.map((dep) => (
              <option key={dep.id} value={dep.id}>
                {dep.name}
              </option>
            ))}
          </select>
        </div>

        {/* Specific Date Filter */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#E5E2D8] rounded text-[#111315] focus:outline-none focus:border-[#1A635E]"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="text-[11px] text-[#8A9096] hover:text-[#111315] cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-[#F4F2EC] border-b border-[#E5E2D8] flex items-center justify-between text-xs text-[#555C63]">
          <div>
            Showing <strong className="text-[#111315]">{filteredAppointments.length}</strong> appointments in view
          </div>
          <div className="text-[11px] font-mono text-[#8A9096]">
            All schedules evaluated strictly in IST
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-[#8A9096]">
            <ArrowClockwise size={24} className="animate-spin mx-auto mb-2 text-[#1A635E]" />
            Loading operational appointments...
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#8A9096]">
            No appointments matching the active criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E2D8] bg-[#F9F8F5] text-[11px] font-mono uppercase text-[#768390]">
                  <th className="py-2.5 px-3 font-medium">Reference</th>
                  <th className="py-2.5 px-3 font-medium">Patient Details</th>
                  <th className="py-2.5 px-3 font-medium">Specialist & Department</th>
                  <th className="py-2.5 px-3 font-medium">Consultation Slot (IST)</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D8]">
                {filteredAppointments.map((appt) => {
                  const isTerminal = appt.status === 'completed' || appt.status === 'cancelled' || appt.status === 'no_show';
                  return (
                    <tr
                      key={appt.id}
                      className="hover:bg-[#F4F2EC] transition-colors"
                    >
                      {/* Reference */}
                      <td className="py-2.5 px-3 font-mono font-medium text-[#111315]">
                        <button
                          onClick={() => setInspectingAppt(appt)}
                          className="text-[#1A635E] hover:underline font-semibold cursor-pointer"
                        >
                          {appt.appointment_id}
                        </button>
                      </td>

                      {/* Patient Details */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[#111315]">{appt.patient_name}</div>
                        <div className="text-[11px] text-[#555C63] font-mono">{appt.patient_phone || 'No phone'}</div>
                      </td>

                      {/* Specialist */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[#111315]">{appt.doctor_name}</div>
                        <div className="text-[11px] text-[#768390]">{appt.department_name}</div>
                      </td>

                      {/* Slot */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[#111315]">
                          {formatISTTimeDisplay(appt.appointment_start)}
                        </div>
                        <div className="text-[11px] text-[#768390]">
                          {formatISTDateDisplay(appt.appointment_start)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3">
                        {getStatusBadge(appt.status)}
                      </td>

                      {/* Lifecycle Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {appt.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleConfirm(appt.appointment_id)}
                                disabled={Boolean(actionLoadingId)}
                                className="px-2 py-1 bg-[#1A635E] hover:bg-[#14514D] text-[#FAF9F6] text-[11px] rounded transition-colors cursor-pointer font-medium disabled:opacity-50"
                              >
                                {actionLoadingId === appt.appointment_id ? 'Confirming...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => handleCancel(appt.appointment_id)}
                                disabled={Boolean(actionLoadingId)}
                                className="px-2 py-1 bg-[#FCE8E6] hover:bg-[#F5C2C7] text-[#9E2A2B] text-[11px] rounded transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {appt.status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => handleComplete(appt.appointment_id)}
                                disabled={Boolean(actionLoadingId)}
                                className="px-2 py-1 bg-[#153424] hover:bg-[#204E35] text-[#7EE787] text-[11px] rounded transition-colors cursor-pointer font-medium disabled:opacity-50"
                              >
                                {actionLoadingId === appt.appointment_id ? 'Completing...' : 'Complete'}
                              </button>
                              <button
                                onClick={() => openRescheduleModal(appt)}
                                disabled={Boolean(actionLoadingId)}
                                className="px-2 py-1 bg-[#F4F2EC] hover:bg-[#E5E2D8] border border-[#D9D5CA] text-[#222528] text-[11px] rounded transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => handleNoShow(appt.appointment_id)}
                                disabled={Boolean(actionLoadingId)}
                                className="px-2 py-1 bg-[#F3E8FD] hover:bg-[#E9D5FF] text-[#6E2BB1] text-[11px] rounded transition-colors cursor-pointer disabled:opacity-50"
                              >
                                No Show
                              </button>
                              <button
                                onClick={() => handleCancel(appt.appointment_id)}
                                disabled={Boolean(actionLoadingId)}
                                className="px-2 py-1 bg-[#FAF9F6] hover:bg-[#FCE8E6] border border-[#E5E2D8] text-[#9E2A2B] text-[11px] rounded transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {isTerminal && (
                            <span className="text-[11px] font-mono text-[#8A9096] italic">
                              Terminal record
                            </span>
                          )}

                          <button
                            onClick={() => setInspectingAppt(appt)}
                            className="p-1 text-[#555C63] hover:text-[#111315] transition-colors cursor-pointer"
                            title="Inspect details"
                          >
                            <ArrowSquareOut size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Inspection Modal */}
      {inspectingAppt && (
        <div className="fixed inset-0 bg-[#111315]/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded max-w-lg w-full p-6 space-y-4 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E2D8] pb-3">
              <div>
                <div className="text-[10px] font-mono uppercase text-[#768390]">APPOINTMENT RECORD</div>
                <h3 className="font-mono text-base font-bold text-[#111315]">
                  {inspectingAppt.appointment_id}
                </h3>
              </div>
              <div>{getStatusBadge(inspectingAppt.status)}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-[10px] uppercase text-[#768390] font-mono">Patient Name</div>
                <div className="font-semibold text-[#111315] mt-0.5">{inspectingAppt.patient_name}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[#768390] font-mono">Contact Phone</div>
                <div className="font-mono text-[#111315] mt-0.5">{inspectingAppt.patient_phone || 'N/A'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[#768390] font-mono">Specialist</div>
                <div className="font-semibold text-[#111315] mt-0.5">{inspectingAppt.doctor_name}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[#768390] font-mono">Department</div>
                <div className="text-[#111315] mt-0.5">{inspectingAppt.department_name}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[#768390] font-mono">Scheduled Date</div>
                <div className="text-[#111315] mt-0.5">{formatISTDateDisplay(inspectingAppt.appointment_start)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[#768390] font-mono">Scheduled Time (IST)</div>
                <div className="font-semibold text-[#111315] mt-0.5">{formatISTTimeDisplay(inspectingAppt.appointment_start)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[#768390] font-mono">Consultation Type</div>
                <div className="capitalize text-[#111315] mt-0.5">{inspectingAppt.consultation_type.replace('_', ' ')}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[#768390] font-mono">Created Timestamp</div>
                <div className="text-[11px] font-mono text-[#555C63] mt-0.5">
                  {new Date(inspectingAppt.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </div>
              </div>
            </div>

            <div className="p-3 rounded bg-[#F4F2EC] text-[11px] text-[#555C63] border border-[#E5E2D8] space-y-1">
              <div className="font-semibold text-[#222528]">Security & Token Isolation Note:</div>
              <div>
                Patient confirmation tokens are strictly omitted from administrative responses and remain isolated on the patient-facing security boundary.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E2D8]">
              <button
                onClick={() => setInspectingAppt(null)}
                className="px-3.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#D9D5CA] text-[#222528] rounded cursor-pointer hover:bg-[#FFFFFF]"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Reschedule Modal */}
      {reschedulingAppt && (
        <div className="fixed inset-0 bg-[#111315]/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded max-w-lg w-full p-6 space-y-4 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="border-b border-[#E5E2D8] pb-3">
              <div className="text-[10px] font-mono uppercase text-[#1A635E] font-semibold">
                STAFF RESCHEDULING ENGINE
              </div>
              <h3 className="font-serif text-lg font-semibold text-[#111315] mt-0.5">
                Reschedule {reschedulingAppt.appointment_id}
              </h3>
              <p className="text-xs text-[#555C63] mt-0.5">
                Specialist: <strong>{reschedulingAppt.doctor_name}</strong> ({reschedulingAppt.department_name})
              </p>
            </div>

            {rescheduleError && (
              <div className="p-3 bg-[#FCE8E6] border border-[#F85149] text-[#9E2A2B] rounded text-xs">
                {rescheduleError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-[#222528] block mb-1">
                  Target Date (IST)
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  min={todayIst}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
                />
              </div>

              <div>
                <label className="font-medium text-[#222528] block mb-1">
                  Available Slots
                </label>
                {rescheduleLoading ? (
                  <div className="py-6 text-center text-[11px] text-[#8A9096]">
                    Checking doctor availability windows & active holds...
                  </div>
                ) : rescheduleSlots.length === 0 ? (
                  <div className="p-3 rounded bg-[#F4F2EC] border border-[#E5E2D8] text-[11px] text-[#8A9096] text-center">
                    No available consultation slots on this date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                    {rescheduleSlots.map((slot) => {
                      const isSelected = selectedSlot?.slot_start === slot.slot_start;
                      return (
                        <button
                          key={slot.slot_start}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-1.5 px-2 rounded text-xs font-mono transition-all cursor-pointer text-center ${
                            isSelected
                              ? 'bg-[#1A635E] text-[#FAF9F6] font-bold shadow-sm'
                              : 'bg-[#FFFFFF] border border-[#E5E2D8] text-[#222528] hover:border-[#1A635E]'
                          }`}
                        >
                          {formatISTTimeDisplay(slot.slot_start)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="font-medium text-[#222528] block mb-1">
                  Clinical / Operational Rescheduling Reason
                </label>
                <textarea
                  rows={2}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Patient requested alternate morning time slot"
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E2D8]">
              <button
                type="button"
                onClick={() => setReschedulingAppt(null)}
                disabled={rescheduleLoading}
                className="px-3.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#D9D5CA] text-[#222528] rounded cursor-pointer hover:bg-[#FFFFFF]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReschedule}
                disabled={!selectedSlot || rescheduleLoading}
                className="px-4 py-1.5 text-xs bg-[#1A635E] hover:bg-[#14514D] text-[#FAF9F6] font-semibold rounded cursor-pointer transition-colors disabled:opacity-50"
              >
                {rescheduleLoading ? 'Processing Reschedule...' : 'Execute Atomic Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
