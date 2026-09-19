import { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlass,
  ArrowClockwise,
  ArrowSquareOut
} from '@phosphor-icons/react';
import { appointmentService } from '@/services/appointmentService';
import { formatISTDateDisplay, formatISTTimeDisplay } from '@/lib/timezone';
import type { StaffPatientView } from '@/types/scheduling';

export function AdminPatientsPage() {
  const [patients, setPatients] = useState<StaffPatientView[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail drawer
  const [selectedPatient, setSelectedPatient] = useState<StaffPatientView | null>(null);

  const fetchPatients = useCallback(async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const list = await appointmentService.getStaffPatients(query, true);
      setPatients(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch patient directory.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(searchQuery.trim() || undefined);
  };

  const handleClear = () => {
    setSearchQuery('');
    fetchPatients();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2D8]">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-[#1A635E] font-semibold mb-1">
            PATIENT MASTER DIRECTORY
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#111315]">
            Patient Records & Consultation History
          </h1>
          <p className="text-xs text-[#555C63] mt-0.5">
            Operational search, verified contact details, and outpatient consultation logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPatients(searchQuery.trim() || undefined)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#FAF9F6] hover:bg-[#FFFFFF] border border-[#E5E2D8] text-[#222528] rounded cursor-pointer transition-colors"
          >
            <ArrowClockwise size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Directory</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FCE8E6] border border-[#F85149] text-[#9E2A2B] rounded text-xs">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-[#8A9096]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by full name, phone, or email..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E2D8] rounded text-[#111315] focus:outline-none focus:border-[#1A635E]"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[#1A635E] hover:bg-[#14514D] text-[#FAF9F6] text-xs font-semibold rounded transition-colors cursor-pointer"
        >
          Search
        </button>
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 bg-[#FAF9F6] border border-[#D9D5CA] text-[#222528] text-xs rounded hover:bg-[#FFFFFF] cursor-pointer"
          >
            Reset
          </button>
        )}
      </form>

      {/* Directory Table */}
      <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-[#F4F2EC] border-b border-[#E5E2D8] flex items-center justify-between text-xs text-[#555C63]">
          <div>
            Showing <strong className="text-[#111315]">{patients.length}</strong> patient records
          </div>
          <div className="text-[11px] font-mono text-[#8A9096]">
            Strict token isolation enforced
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-[#8A9096]">
            <ArrowClockwise size={24} className="animate-spin mx-auto mb-2 text-[#1A635E]" />
            Loading patient records...
          </div>
        ) : patients.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#8A9096]">
            No patient records found matching query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E2D8] bg-[#F9F8F5] text-[11px] font-mono uppercase text-[#768390]">
                  <th className="py-2.5 px-4 font-medium">Patient Name</th>
                  <th className="py-2.5 px-4 font-medium">Contact Phone</th>
                  <th className="py-2.5 px-4 font-medium">Email Address</th>
                  <th className="py-2.5 px-4 font-medium">Consultations</th>
                  <th className="py-2.5 px-4 font-medium">Last Visit (IST)</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D8]">
                {patients.map((p) => {
                  const lastVisit = p.recent_appointments[0]?.appointment_start;
                  return (
                    <tr key={p.id} className="hover:bg-[#F4F2EC] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#111315]">{p.full_name}</div>
                        <div className="text-[10px] font-mono text-[#8A9096]">{p.id}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#222528]">
                        {p.phone}
                      </td>
                      <td className="py-3 px-4 text-[#555C63]">
                        {p.email || 'None'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] bg-[#EAE7DE] border border-[#D9D5CA] text-[#222528]">
                          {p.total_appointments} visit{p.total_appointments === 1 ? '' : 's'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#555C63] text-[11px]">
                        {lastVisit ? formatISTDateDisplay(lastVisit) : 'No recorded visits'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedPatient(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-[#FAF9F6] hover:bg-[#FFFFFF] border border-[#D9D5CA] text-[#222528] rounded cursor-pointer transition-colors"
                        >
                          <ArrowSquareOut size={12} />
                          <span>History</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Consultation History Drawer / Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-[#111315]/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded max-w-xl w-full p-6 space-y-4 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E2D8] pb-3">
              <div>
                <div className="text-[10px] font-mono uppercase text-[#1A635E] font-semibold">
                  PATIENT CONSULTATION DOSSIER
                </div>
                <h3 className="font-serif text-xl font-semibold text-[#111315]">
                  {selectedPatient.full_name}
                </h3>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-[#8A9096]">UHID / ID</div>
                <div className="font-mono text-xs font-semibold text-[#111315]">{selectedPatient.id}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-[#F4F2EC] p-3 rounded border border-[#E5E2D8]">
              <div>
                <span className="text-[10px] uppercase text-[#768390] font-mono block">Primary Phone</span>
                <span className="font-mono font-medium text-[#111315]">{selectedPatient.phone}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#768390] font-mono block">Email Address</span>
                <span className="text-[#111315]">{selectedPatient.email || 'N/A'}</span>
              </div>
            </div>

            {/* Consultation History */}
            <div className="space-y-2">
              <h4 className="font-serif text-base font-semibold text-[#111315]">
                Consultation History ({selectedPatient.recent_appointments.length})
              </h4>

              {selectedPatient.recent_appointments.length === 0 ? (
                <div className="p-4 rounded bg-[#FAF9F6] border border-[#E5E2D8] text-center text-xs text-[#8A9096]">
                  No consultation records logged for this patient.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedPatient.recent_appointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="p-3 rounded bg-[#FFFFFF] border border-[#E5E2D8] text-xs flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-[#1A635E]">
                            {appt.appointment_id}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-[#EAE7DE] text-[#222528]">
                            {appt.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#555C63] mt-1">
                          {formatISTDateDisplay(appt.appointment_start)} at {formatISTTimeDisplay(appt.appointment_start)}
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-[#768390] capitalize">
                        {appt.consultation_type.replace('_', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[#E5E2D8]">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-1.5 text-xs bg-[#FAF9F6] border border-[#D9D5CA] text-[#222528] rounded cursor-pointer hover:bg-[#FFFFFF]"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
