import { Link } from 'react-router-dom';
import { PageShell } from '@/components/shared/PageShell';
import { specialists } from '@/data/specialists';
import { CalendarCheck, Clock, ShieldCheck } from '@phosphor-icons/react';

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
            className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md flex flex-col justify-between hover:border-[#1A635E] hover:shadow-sm transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs uppercase tracking-wider text-[#1A635E] font-semibold">
                  {specialist.departmentName}
                </span>
                {specialist.isLeadership && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EDF5F4] text-[#1A635E] border border-[#BCD9D6] font-semibold flex items-center gap-1">
                    <ShieldCheck size={12} weight="bold" />
                    <span>Leadership</span>
                  </span>
                )}
              </div>

              <h2 className="font-display text-xl font-semibold text-[#111315] mb-1">
                {specialist.name}
              </h2>

              <p className="text-xs text-[#5E666D] font-medium mb-3">
                {specialist.role}
              </p>

              <div className="space-y-1.5 text-xs text-[#3C4247] mb-4 p-3 bg-[#F4F2EC] rounded border border-[#E5E2D8]">
                <p>
                  <strong className="text-[#111315]">Credentials:</strong> {specialist.qualifications}
                </p>
                <p>
                  <strong className="text-[#111315]">Clinical Experience:</strong> {specialist.experienceYears} Years
                </p>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-[#8E9499] block mb-1.5 font-semibold">
                  Clinical Focus & Interests
                </span>
                <ul className="space-y-1 text-xs text-[#5E666D]">
                  {specialist.clinicalInterests.map((interest) => (
                    <li key={interest} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A635E]" aria-hidden="true" />
                      <span>{interest}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 mt-5 border-t border-[#E5E2D8] space-y-3">
              <div className="text-xs text-[#5E666D] flex items-start gap-1.5">
                <Clock size={14} className="text-[#1A635E] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#111315]">OPD Hours:</strong> {specialist.opdDays}
                </span>
              </div>

              <Link
                to={`/appointment?doctor=${specialist.id}`}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1A635E] hover:bg-[#14514D] text-white text-xs font-semibold rounded transition-colors focus-visible:ring-2 focus-visible:ring-[#1A635E] min-h-[44px]"
              >
                <CalendarCheck size={16} weight="bold" />
                <span>Book Consultation</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
