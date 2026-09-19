import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  PencilSimple,
  ArrowClockwise,
  Buildings,
  GraduationCap,
  Clock
} from '@phosphor-icons/react';
import { catalogService } from '@/services/catalogService';
import { authService } from '@/services/authService';
import type { DbDoctor, DbDepartment } from '@/types/database';

export function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<DbDoctor[]>([]);
  const [departments, setDepartments] = useState<DbDepartment[]>([]);
  const [userRole, setUserRole] = useState<'public' | 'staff' | 'admin'>('public');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit modal
  const [editingDoctor, setEditingDoctor] = useState<DbDoctor | null>(null);
  const [editCredentials, setEditCredentials] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editExperience, setEditExperience] = useState(0);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [role, docs, deps] = await Promise.all([
        authService.getUserRole(),
        catalogService.getDoctors({ active_only: false }),
        catalogService.getDepartments()
      ]);
      setUserRole(role);
      setDoctors(docs);
      setDepartments(deps);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load doctors roster.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActive = async (doctor: DbDoctor) => {
    if (userRole !== 'admin') {
      setError('Doctor status modifications require Administrator privileges.');
      return;
    }

    const newStatus = !doctor.active;
    const res = await catalogService.setDoctorActiveState(doctor.id, newStatus, true);
    if (res.success) {
      setSuccessMessage(`Doctor ${doctor.name} ${newStatus ? 'activated' : 'deactivated'} successfully.`);
      loadData();
    } else {
      setError(res.error || 'Failed to update doctor active status.');
    }
  };

  const openEditModal = (doctor: DbDoctor) => {
    if (userRole !== 'admin') {
      setError('Specialist profile modifications require Administrator privileges.');
      return;
    }
    setEditingDoctor(doctor);
    setEditCredentials(doctor.credentials || '');
    setEditDesignation(doctor.designation || '');
    setEditExperience(doctor.experience_years || 0);
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    setSaving(true);
    setError(null);

    const res = await catalogService.updateDoctor(
      editingDoctor.id,
      {
        credentials: editCredentials,
        designation: editDesignation,
        experience_years: editExperience
      },
      true
    );

    setSaving(false);
    if (res.success) {
      setSuccessMessage(`Specialist profile for ${editingDoctor.name} updated successfully.`);
      setEditingDoctor(null);
      loadData();
    } else {
      setError(res.error || 'Failed to update specialist profile.');
    }
  };

  const getDepartmentName = (depId: string) => {
    const dep = departments.find((d) => d.id === depId);
    return dep ? dep.name : depId;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2D8]">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-[#1A635E] font-semibold mb-1">
            CLINICAL FACULTY
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#111315]">
            Specialists & Consultants Roster
          </h1>
          <p className="text-xs text-[#555C63] mt-0.5">
            Operational status and credential profiles for canonical medical staff.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#FAF9F6] hover:bg-[#FFFFFF] border border-[#E5E2D8] text-[#222528] rounded cursor-pointer transition-colors"
          >
            <ArrowClockwise size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Roster</span>
          </button>
        </div>
      </div>

      {/* Role Notice */}
      {userRole === 'staff' && (
        <div className="p-3 rounded bg-[#EBF5FB] border border-[#A9CCE3] text-[#1B4F72] text-xs flex items-center gap-2">
          <ShieldCheck size={16} className="shrink-0" />
          <span>
            Staff Role: View-only permissions active. Roster edits and activation toggles require Administrator rights.
          </span>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-[#FCE8E6] border border-[#F85149] text-[#9E2A2B] rounded text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline font-semibold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-[#E6F4EA] border border-[#2EA043] text-[#137333] rounded text-xs flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="underline font-semibold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Canonical Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-[#8A9096]">
            Loading medical staff directory...
          </div>
        ) : (
          doctors.map((doctor) => {
            const depName = getDepartmentName(doctor.department_id);
            return (
              <div
                key={doctor.id}
                className="bg-[#FAF9F6] border border-[#E5E2D8] rounded p-5 space-y-4 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-[#1A635E]/10 text-[#1A635E] flex items-center justify-center font-serif text-base font-bold">
                        {doctor.name.replace('Dr. ', '').charAt(0)}
                      </div>
                      <div>
                        <h2 className="font-serif text-base font-semibold text-[#111315]">
                          {doctor.name}
                        </h2>
                        <div className="text-xs text-[#1A635E] font-medium flex items-center gap-1">
                          <Buildings size={12} />
                          <span>{depName}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                        doctor.active
                          ? 'bg-[#E6F4EA] text-[#137333] border border-[#A8DAB5]'
                          : 'bg-[#ECEFF1] text-[#555C63] border border-[#CFD8DC]'
                      }`}
                    >
                      {doctor.active ? (
                        <>
                          <CheckCircle size={12} weight="fill" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={12} />
                          <span>Inactive</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#555C63] pt-1 border-t border-[#E5E2D8]">
                    <div className="text-xs font-medium text-[#222528]">
                      {doctor.designation || 'Consultant Specialist'}
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap size={14} className="text-[#8A9096] shrink-0" />
                      <span className="truncate">{doctor.credentials || 'MBBS, MD'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[#8A9096] shrink-0" />
                      <span>{doctor.experience_years} years clinical experience</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5E2D8] flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-[#8A9096]">{doctor.id}</span>

                  <div className="flex items-center gap-2">
                    {userRole === 'admin' ? (
                      <>
                        <button
                          onClick={() => handleToggleActive(doctor)}
                          className={`px-2 py-1 text-[11px] rounded transition-colors cursor-pointer ${
                            doctor.active
                              ? 'bg-[#FCE8E6] text-[#9E2A2B] hover:bg-[#F5C2C7]'
                              : 'bg-[#E6F4EA] text-[#137333] hover:bg-[#C8E6C9]'
                          }`}
                        >
                          {doctor.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEditModal(doctor)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-[#FAF9F6] hover:bg-[#FFFFFF] border border-[#D9D5CA] text-[#222528] rounded cursor-pointer transition-colors"
                        >
                          <PencilSimple size={12} />
                          <span>Edit</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-[#8A9096] italic">View Only</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Doctor Modal */}
      {editingDoctor && (
        <div className="fixed inset-0 bg-[#111315]/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded max-w-lg w-full p-6 space-y-4 shadow-lg">
            <div className="border-b border-[#E5E2D8] pb-3">
              <div className="text-[10px] font-mono uppercase text-[#1A635E] font-semibold">
                ADMINISTRATIVE DOCTOR PROFILE UPDATE
              </div>
              <h3 className="font-serif text-lg font-semibold text-[#111315]">
                {editingDoctor.name}
              </h3>
            </div>

            <form onSubmit={handleSaveDoctor} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-[#222528] block mb-1">
                  Designation / Role
                </label>
                <input
                  type="text"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
                />
              </div>

              <div>
                <label className="font-medium text-[#222528] block mb-1">
                  Academic & Clinical Credentials
                </label>
                <input
                  type="text"
                  value={editCredentials}
                  onChange={(e) => setEditCredentials(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
                />
              </div>

              <div>
                <label className="font-medium text-[#222528] block mb-1">
                  Experience (Years)
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={editExperience}
                  onChange={(e) => setEditExperience(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E2D8] rounded text-xs focus:outline-none focus:border-[#1A635E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E2D8]">
                <button
                  type="button"
                  onClick={() => setEditingDoctor(null)}
                  disabled={saving}
                  className="px-3.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#D9D5CA] text-[#222528] rounded cursor-pointer hover:bg-[#FFFFFF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs bg-[#1A635E] hover:bg-[#14514D] text-[#FAF9F6] font-semibold rounded cursor-pointer transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
