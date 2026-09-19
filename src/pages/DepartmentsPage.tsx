import { Link } from 'react-router-dom';
import { PageShell } from '@/components/shared/PageShell';
import { departments } from '@/data/departments';
import { CaretRight, Buildings } from '@phosphor-icons/react';

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
            className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md flex flex-col justify-between hover:border-[#1A635E] hover:shadow-sm transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono font-semibold text-[#1A635E] bg-[#EDF5F4] px-2.5 py-0.5 rounded border border-[#BCD9D6]">
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

              <p className="text-xs sm:text-sm text-[#5E666D] mb-4 leading-relaxed">
                {dept.shortDescription}
              </p>

              <div className="mb-4">
                <span className="text-xs uppercase tracking-wider text-[#8E9499] block mb-1.5 font-semibold">
                  Clinical Focus Areas
                </span>
                <ul className="space-y-1.5 text-xs text-[#3C4247]">
                  {dept.clinicalFocus.slice(0, 3).map((focus) => (
                    <li key={focus} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A635E]" aria-hidden="true" />
                      <span>{focus}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#E5E2D8] text-xs flex items-center justify-between gap-3">
              <div className="text-[#8E9499] flex items-center gap-1.5">
                <Buildings size={14} className="text-[#1A635E]" />
                <span>{dept.location}</span>
                {dept.bedCapacity && <span>({dept.bedCapacity} Beds)</span>}
              </div>
              <Link
                to={`/appointment?department=${dept.id}`}
                className="inline-flex items-center gap-1 font-semibold text-[#1A635E] hover:text-[#14514D] transition-colors py-1 focus-visible:ring-2 focus-visible:ring-[#1A635E] rounded-sm shrink-0"
              >
                <span>Book Consultation</span>
                <CaretRight size={14} weight="bold" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
