import { PageShell } from '@/components/shared/PageShell';
import { specialists } from '@/data/specialists';

export function SpecialistsPage() {
  return (
    <PageShell
      title="Specialists & Clinical Faculty"
      category="Specialists"
      description="Consultants, surgeons, and clinicians providing coordinated tertiary care across all medical disciplines."
      statusText="Faculty Architecture Configured"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {specialists.map((specialist) => (
          <div 
            key={specialist.id}
            className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs uppercase tracking-wider text-[#1A635E] font-medium">
                  {specialist.departmentName}
                </span>
                {specialist.isLeadership && (
                  <span className="text-[11px] font-semibold text-[#8E9499] uppercase tracking-wider">
                    Leadership
                  </span>
                )}
              </div>

              <h2 className="font-display text-xl font-semibold text-[#111315] mb-1">
                {specialist.name}
              </h2>

              <p className="text-xs text-[#5E666D] font-medium mb-3">
                {specialist.role}
              </p>

              <div className="space-y-2 text-xs text-[#3C4247] mb-4">
                <p>
                  <strong className="text-[#111315]">Credentials:</strong> {specialist.qualifications}
                </p>
                <p>
                  <strong className="text-[#111315]">Experience:</strong> {specialist.experienceYears} Years
                </p>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-[#8E9499] block mb-1 font-medium">
                  Clinical Interests
                </span>
                <ul className="space-y-1 text-xs text-[#5E666D]">
                  {specialist.clinicalInterests.map((interest) => (
                    <li key={interest} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[#1A635E]"></span>
                      <span>{interest}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#E5E2D8] text-xs text-[#5E666D]">
              <span className="font-medium text-[#111315]">OPD Hours:</span> {specialist.opdDays}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
