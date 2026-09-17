import { PageShell } from '@/components/shared/PageShell';
import { departments } from '@/data/departments';

export function DepartmentsPage() {
  return (
    <PageShell
      title="Clinical Departments & Centers"
      category="Departments"
      description="Meridian Hospital organizes comprehensive tertiary care across 42 clinical specialties and sub-specialties in Mumbai."
      statusText="15 Core Departments Mapped"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <div 
            key={dept.id} 
            className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono font-medium text-[#1A635E] bg-[#EDF5F4] px-2 py-0.5 rounded">
                  {dept.code}
                </span>
                {dept.isFlagship && (
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[#1A635E]">
                    Flagship Institute
                  </span>
                )}
              </div>

              <h2 className="font-display text-xl font-semibold text-[#111315] mb-2">
                {dept.name}
              </h2>

              <p className="text-sm text-[#5E666D] mb-4 leading-relaxed">
                {dept.shortDescription}
              </p>

              <div className="mb-4">
                <span className="text-xs uppercase tracking-wider text-[#8E9499] block mb-1.5 font-medium">
                  Clinical Focus Areas
                </span>
                <ul className="space-y-1 text-xs text-[#3C4247]">
                  {dept.clinicalFocus.slice(0, 3).map((focus) => (
                    <li key={focus} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[#1A635E]"></span>
                      <span>{focus}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E5E2D8] text-xs text-[#8E9499] flex items-center justify-between">
              <span>{dept.location}</span>
              {dept.bedCapacity && <span>{dept.bedCapacity} Beds</span>}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
