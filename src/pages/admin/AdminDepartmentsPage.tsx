import { useState, useEffect } from 'react';
import { Buildings, ArrowClockwise, CheckCircle, Stethoscope } from '@phosphor-icons/react';
import { catalogService } from '@/services/catalogService';
import type { DbDepartment, DbDoctor } from '@/types/database';

export function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<DbDepartment[]>([]);
  const [doctors, setDoctors] = useState<DbDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deps, docs] = await Promise.all([
        catalogService.getDepartments(),
        catalogService.getDoctors({ active_only: false })
      ]);
      setDepartments(deps);
      setDoctors(docs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load department registry.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getDoctorCountForDepartment = (deptId: string) => {
    return doctors.filter((d) => d.department_id === deptId).length;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2D8]">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-[#1A635E] font-semibold mb-1">
            INSTITUTIONAL DIVISIONS
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#111315]">
            Clinical Departments
          </h1>
          <p className="text-xs text-[#555C63] mt-0.5">
            Registry of 15 canonical clinical institutes and outpatient medical departments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
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

      {/* Institutional Note */}
      <div className="p-3.5 rounded bg-[#FAF9F6] border border-[#E5E2D8] text-xs text-[#555C63] space-y-1">
        <div className="font-medium text-[#222528] flex items-center gap-1.5">
          <Buildings size={16} className="text-[#1A635E]" />
          <span>Operational Integrity Notice:</span>
        </div>
        <p>
          Canonical tertiary hospital departments are architecturally protected. Deletion or arbitrary structural mutation is restricted to preserve relational consistency across live clinical schedules and booking records.
        </p>
      </div>

      {/* Departments Table / Grid */}
      <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-[#F4F2EC] border-b border-[#E5E2D8] flex items-center justify-between text-xs text-[#555C63]">
          <div>
            Total Canonical Departments: <strong className="text-[#111315]">{departments.length}</strong>
          </div>
          <div className="text-[11px] font-mono text-[#8A9096]">
            All 15 Departments Active
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-[#8A9096]">
            Loading clinical departments...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E2D8] bg-[#F9F8F5] text-[11px] font-mono uppercase text-[#768390]">
                  <th className="py-2.5 px-4 font-medium">Department Name</th>
                  <th className="py-2.5 px-4 font-medium">Department Code</th>
                  <th className="py-2.5 px-4 font-medium">Assigned Specialists</th>
                  <th className="py-2.5 px-4 font-medium">Description</th>
                  <th className="py-2.5 px-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D8]">
                {departments.map((dept) => {
                  const docCount = getDoctorCountForDepartment(dept.id);
                  return (
                    <tr key={dept.id} className="hover:bg-[#F4F2EC] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#111315] text-xs sm:text-sm">
                          {dept.name}
                        </div>
                        <div className="text-[11px] font-mono text-[#8A9096]">{dept.id}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#555C63]">
                        <span className="px-2 py-0.5 rounded bg-[#EAE7DE] border border-[#D9D5CA] text-[11px]">
                          {dept.code || dept.id.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-[#222528]">
                          <Stethoscope size={14} className="text-[#1A635E]" />
                          <span>{docCount} Specialist{docCount === 1 ? '' : 's'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#555C63] max-w-md">
                        <p className="line-clamp-2 text-[11px]">
                          {dept.description || 'Specialized outpatient clinical consultations, diagnostic evaluation, and comprehensive inpatient therapeutic care.'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#E6F4EA] text-[#137333] border border-[#A8DAB5]">
                          <CheckCircle size={12} weight="fill" />
                          <span>Active</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
