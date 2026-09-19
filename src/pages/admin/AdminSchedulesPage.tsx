import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash,
  ArrowClockwise,
  WarningCircle,
  CheckCircle,
  ShieldCheck
} from '@phosphor-icons/react';
import { catalogService } from '@/services/catalogService';
import { authService } from '@/services/authService';
import type { DbDoctor, DbDoctorSchedule, DbScheduleException, DayOfWeek } from '@/types/database';

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export function AdminSchedulesPage() {
  const [doctors, setDoctors] = useState<DbDoctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('dr-ananya-mehta');
  const [schedules, setSchedules] = useState<DbDoctorSchedule[]>([]);
  const [exceptions, setExceptions] = useState<DbScheduleException[]>([]);
  const [userRole, setUserRole] = useState<'public' | 'staff' | 'admin'>('public');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New window modal
  const [showAddWindow, setShowAddWindow] = useState(false);
  const [newDayOfWeek, setNewDayOfWeek] = useState<number>(1);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('13:00');
  const [newDuration, setNewDuration] = useState(30);
  const [savingWindow, setSavingWindow] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);

  // New exception modal
  const [showAddException, setShowAddException] = useState(false);
  const [excDate, setExcDate] = useState('');
  const [excType, setExcType] = useState<'leave' | 'holiday' | 'modified_hours'>('leave');
  const [excStartTime, setExcStartTime] = useState('');
  const [excEndTime, setExcEndTime] = useState('');
  const [excReason, setExcReason] = useState('');
  const [savingException, setSavingException] = useState(false);

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const [role, docs] = await Promise.all([
          authService.getUserRole(),
          catalogService.getDoctors({ active_only: false })
        ]);
        setUserRole(role);
        setDoctors(docs);
        if (docs.length > 0 && !docs.some((d) => d.id === selectedDoctorId)) {
          setSelectedDoctorId(docs[0].id);
        }
      } catch (err: unknown) {
        console.error('Failed to init schedules view:', err);
      }
    }
    init();
  }, [selectedDoctorId]);

  // Load schedules for selected doctor
  const loadDoctorSchedules = useCallback(async (docId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [schs, excs] = await Promise.all([
        catalogService.getDoctorSchedules(docId, true),
        catalogService.getScheduleExceptions(docId)
      ]);
      setSchedules(schs);
      setExceptions(excs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load schedule windows.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDoctorId) {
      loadDoctorSchedules(selectedDoctorId);
    }
  }, [selectedDoctorId, loadDoctorSchedules]);

  // Handle Add Window
  const handleAddWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') {
      setError('Schedule modifications require Administrator privileges.');
      return;
    }

    setSavingWindow(true);
    setError(null);

    const res = await catalogService.addScheduleWindow(
      selectedDoctorId,
      {
        day_of_week: Number(newDayOfWeek) as DayOfWeek,
        start_time: newStartTime,
        end_time: newEndTime,
        consultation_duration: Number(newDuration),
        active: true
      },
      true
    );

    setSavingWindow(false);

    if (res.success) {
      setSuccess('Operating schedule window added successfully.');
      setShowAddWindow(false);
      loadDoctorSchedules(selectedDoctorId);
    } else {
      setError(res.error || 'Failed to add schedule window.');
    }
  };

  // Handle Remove Window
  const handleRemoveWindow = async (scheduleId: string) => {
    if (userRole !== 'admin') {
      setError('Schedule modifications require Administrator privileges.');
      return;
    }

    if (deletingScheduleId) return;

    const confirm = window.confirm('Are you sure you want to remove this schedule window? The system will verify that no existing appointments or active holds depend on this window.');
    if (!confirm) return;

    setDeletingScheduleId(scheduleId);
    setError(null);
    setSuccess(null);

    try {
      const res = await catalogService.removeScheduleWindow(selectedDoctorId, scheduleId, true);
      if (res.success) {
        setSuccess('Schedule window removed successfully.');
        loadDoctorSchedules(selectedDoctorId);
      } else {
        setError(res.error || 'Cannot remove schedule window due to operational conflicts.');
      }
    } finally {
      setDeletingScheduleId(null);
    }
  };

  // Handle Add Exception
  const handleAddException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') {
      setError('Schedule exception creation requires Administrator privileges.');
      return;
    }

    setSavingException(true);
    setError(null);

    const res = await catalogService.createScheduleException(
      {
        doctor_id: selectedDoctorId,
        exception_date: excDate,
        exception_type: excType,
        start_time: excType === 'modified_hours' ? excStartTime : undefined,
        end_time: excType === 'modified_hours' ? excEndTime : undefined,
        reason: excReason || 'Doctor unavailable'
      },
      true
    );

    setSavingException(false);

    if (res.success) {
      setSuccess('Schedule exception recorded successfully.');
      setShowAddException(false);
      setExcDate('');
      setExcReason('');
      loadDoctorSchedules(selectedDoctorId);
    } else {
      setError(res.error || 'Failed to create schedule exception.');
    }
  };

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2D8]">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-[#1A635E] font-semibold mb-1">
            OPERATIONAL TIMETABLES
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#111315]">
            Consultant Schedules & Exceptions
          </h1>
          <p className="text-xs text-[#555C63] mt-0.5">
            Manage weekly recurring OPD consultation windows and date-specific exceptions in IST.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {userRole === 'admin' && (
            <>
              <button
                onClick={() => setShowAddWindow(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1A635E] hover:bg-[#14514D] text-[#FAF9F6] rounded transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Schedule Window</span>
              </button>
              <button
                onClick={() => setShowAddException(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#FAF9F6] hover:bg-[#FFFFFF] border border-[#D9D5CA] text-[#222528] rounded transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Exception</span>
              </button>
            </>
          )}

          <button
            onClick={() => loadDoctorSchedules(selectedDoctorId)}
            disabled={loading}
            className="p-1.5 text-xs bg-[#FAF9F6] hover:bg-[#FFFFFF] border border-[#E5E2D8] text-[#222528] rounded cursor-pointer transition-colors"
            title="Refresh"
          >
            <ArrowClockwise size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Role Notice */}
      {userRole === 'staff' && (
        <div className="p-3 rounded bg-[#EBF5FB] border border-[#A9CCE3] text-[#1B4F72] text-xs flex items-center gap-2">
          <ShieldCheck size={16} className="shrink-0" />
          <span>
            Staff Role: View-only timetable access. Modifying weekly windows or recording exceptions requires Administrator privileges.
          </span>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-[#FCE8E6] border border-[#F85149] text-[#9E2A2B] rounded text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WarningCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="underline font-semibold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="p-3 bg-[#E6F4EA] border border-[#2EA043] text-[#137333] rounded text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="underline font-semibold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Doctor Selector */}
      <div className="flex items-center gap-2 bg-[#FAF9F6] p-3 rounded border border-[#E5E2D8]">
        <span className="text-xs font-medium text-[#222528]">Select Specialist:</span>
        <select
          value={selectedDoctorId}
          onChange={(e) => setSelectedDoctorId(e.target.value)}
          className="px-3 py-1 text-xs bg-[#FFFFFF] border border-[#E5E2D8] rounded text-[#111315] focus:outline-none focus:border-[#1A635E] font-medium"
        >
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.department_id})
            </option>
          ))}
        </select>
        {selectedDoctor && (
          <span className="text-xs text-[#555C63] ml-2">
            Canonical Doctor ID: <span className="font-mono text-[#111315]">{selectedDoctor.id}</span>
          </span>
        )}
      </div>

      {/* Weekly Schedule Windows */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-[#111315]">
            Weekly Recurring Consultation Windows
          </h2>
          <span className="text-xs text-[#8A9096]">
            Evaluated in Asia/Kolkata wall-clock time
          </span>
        </div>

        <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#8A9096]">
              Loading weekly schedule windows...
            </div>
          ) : schedules.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8A9096]">
              No recurring schedule windows configured for this specialist.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E2D8] bg-[#F9F8F5] text-[11px] font-mono uppercase text-[#768390]">
                  <th className="py-2.5 px-4 font-medium">Day of Week</th>
                  <th className="py-2.5 px-4 font-medium">Operating Window (IST)</th>
                  <th className="py-2.5 px-4 font-medium">Consultation Duration</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D8]">
                {schedules.map((sch) => (
                  <tr key={sch.id} className="hover:bg-[#F4F2EC] transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-[#111315]">
                      {WEEKDAYS[sch.day_of_week] || `Day ${sch.day_of_week}`}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-[#1A635E]">
                      {sch.start_time} to {sch.end_time} IST
                    </td>
                    <td className="py-2.5 px-4 text-[#555C63]">
                      {sch.consultation_duration || 30} minutes
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                          sch.active
                            ? 'bg-[#E6F4EA] text-[#137333] border border-[#A8DAB5]'
                            : 'bg-[#ECEFF1] text-[#555C63] border border-[#CFD8DC]'
                        }`}
                      >
                        {sch.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {userRole === 'admin' ? (
                        <button
                          onClick={() => handleRemoveWindow(sch.id)}
                          disabled={deletingScheduleId === sch.id}
                          className="p-1 text-[#9E2A2B] hover:bg-[#FCE8E6] rounded transition-colors cursor-pointer disabled:opacity-50"
                          title="Remove Window"
                        >
                          <Trash size={14} />
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#8A9096] italic">Protected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Schedule Exceptions */}
      <div className="space-y-3 pt-4 border-t border-[#E5E2D8]">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-[#111315]">
            Date-Specific Exceptions & Leave
          </h2>
          <span className="text-xs text-[#8A9096]">
            Precedence over weekly recurring schedules
          </span>
        </div>

        <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-8 text-center text-xs text-[#8A9096]">
              Loading schedule exceptions...
            </div>
          ) : exceptions.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8A9096]">
              No date-specific exceptions or leaves recorded for this specialist.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E2D8] bg-[#F9F8F5] text-[11px] font-mono uppercase text-[#768390]">
                  <th className="py-2 px-4 font-medium">Calendar Date</th>
                  <th className="py-2 px-4 font-medium">Exception Type</th>
                  <th className="py-2 px-4 font-medium">Time Window</th>
                  <th className="py-2 px-4 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D8]">
                {exceptions.map((exc) => (
                  <tr key={exc.id} className="hover:bg-[#F4F2EC] transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-[#111315]">
                      {exc.exception_date}
                    </td>
                    <td className="py-2.5 px-4 uppercase text-[11px] font-semibold text-[#B06000]">
                      {exc.exception_type.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#555C63]">
                      {exc.start_time && exc.end_time ? `${exc.start_time} - ${exc.end_time}` : 'Full Day Blocked'}
                    </td>
                    <td className="py-2.5 px-4 text-[#555C63]">
                      {exc.reason || 'Specialist Unavailable'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Schedule Window Modal */}
      {showAddWindow && (
        <div className="fixed inset-0 bg-[#111315]/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded max-w-md w-full p-6 space-y-4 shadow-lg">
            <div className="border-b border-[#E5E2D8] pb-3">
              <div className="text-[10px] font-mono uppercase text-[#1A635E] font-semibold">
                ADMINISTRATIVE TIMETABLE MUTATION
              </div>
              <h3 className="font-serif text-lg font-semibold text-[#111315]">
                Add Schedule Window
              </h3>
              <p className="text-xs text-[#555C63]">
                Specialist: <strong>{selectedDoctor?.name}</strong>
              </p>
            </div>

            <form onSubmit={handleAddWindow} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-[#222528] block mb-1">
                  Day of the Week
                </label>
                <select
                  value={newDayOfWeek}
                  onChange={(e) => setNewDayOfWeek(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
                >
                  {WEEKDAYS.map((name, idx) => (
                    <option key={idx} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#222528] block mb-1">
                    Start Time (HH:mm)
                  </label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#222528] block mb-1">
                    End Time (HH:mm)
                  </label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-[#222528] block mb-1">
                  Consultation Duration (Minutes)
                </label>
                <select
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={20}>20 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E2D8]">
                <button
                  type="button"
                  onClick={() => setShowAddWindow(false)}
                  disabled={savingWindow}
                  className="px-3.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#D9D5CA] text-[#222528] rounded cursor-pointer hover:bg-[#FFFFFF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWindow}
                  className="px-4 py-1.5 text-xs bg-[#1A635E] hover:bg-[#14514D] text-[#FAF9F6] font-semibold rounded cursor-pointer transition-colors disabled:opacity-50"
                >
                  {savingWindow ? 'Saving...' : 'Add Window'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Schedule Exception Modal */}
      {showAddException && (
        <div className="fixed inset-0 bg-[#111315]/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded max-w-md w-full p-6 space-y-4 shadow-lg">
            <div className="border-b border-[#E5E2D8] pb-3">
              <div className="text-[10px] font-mono uppercase text-[#1A635E] font-semibold">
                ADMINISTRATIVE EXCEPTION REGISTRY
              </div>
              <h3 className="font-serif text-lg font-semibold text-[#111315]">
                Record Schedule Exception
              </h3>
              <p className="text-xs text-[#555C63]">
                Specialist: <strong>{selectedDoctor?.name}</strong>
              </p>
            </div>

            <form onSubmit={handleAddException} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-[#222528] block mb-1">
                  Calendar Date (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={excDate}
                  onChange={(e) => setExcDate(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
                />
              </div>

              <div>
                <label className="font-medium text-[#222528] block mb-1">
                  Exception Type
                </label>
                <select
                  value={excType}
                  onChange={(e) => setExcType(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
                >
                  <option value="leave">Leave / Medical Absence (Full Day)</option>
                  <option value="holiday">Institutional Holiday (Full Day)</option>
                  <option value="modified_hours">Modified Operating Hours</option>
                </select>
              </div>

              {excType === 'modified_hours' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-[#222528] block mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={excStartTime}
                      onChange={(e) => setExcStartTime(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-[#222528] block mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={excEndTime}
                      onChange={(e) => setExcEndTime(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-medium text-[#222528] block mb-1">
                  Reason for Exception
                </label>
                <input
                  type="text"
                  value={excReason}
                  onChange={(e) => setExcReason(e.target.value)}
                  placeholder="Medical conference, emergency leave, etc."
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E2D8]">
                <button
                  type="button"
                  onClick={() => setShowAddException(false)}
                  disabled={savingException}
                  className="px-3.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#D9D5CA] text-[#222528] rounded cursor-pointer hover:bg-[#FFFFFF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingException}
                  className="px-4 py-1.5 text-xs bg-[#1A635E] hover:bg-[#14514D] text-[#FAF9F6] font-semibold rounded cursor-pointer transition-colors disabled:opacity-50"
                >
                  {savingException ? 'Saving...' : 'Record Exception'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
