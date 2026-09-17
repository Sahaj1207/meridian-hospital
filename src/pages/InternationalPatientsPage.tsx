import { PageShell } from '@/components/shared/PageShell';
import { AirplaneTilt, Translate, FileText } from '@phosphor-icons/react';

export function InternationalPatientsPage() {
  return (
    <PageShell
      title="International Patient Services"
      category="International Patients"
      description="Dedicated clinical liaison desk assisting overseas patients with specialist review, travel coordination, and hospital stay."
      statusText="International Desk Architecture"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md">
          <div className="w-10 h-10 rounded bg-[#EDF5F4] text-[#1A635E] flex items-center justify-center mb-4">
            <FileText size={22} weight="bold" />
          </div>
          <h2 className="font-display text-xl font-semibold text-[#111315] mb-2">
            Clinical Opinion & Estimates
          </h2>
          <p className="text-xs text-[#5E666D] leading-relaxed">
            Prior medical record review by senior faculty, clinical treatment plan formulation, and transparent length-of-stay cost estimates.
          </p>
        </div>

        <div className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md">
          <div className="w-10 h-10 rounded bg-[#EDF5F4] text-[#1A635E] flex items-center justify-center mb-4">
            <AirplaneTilt size={22} weight="bold" />
          </div>
          <h2 className="font-display text-xl font-semibold text-[#111315] mb-2">
            Visa & Travel Support
          </h2>
          <p className="text-xs text-[#5E666D] leading-relaxed">
            Assistance with Medical Visa (MED visa) invitation letters, airport pick-up coordination, and nearby lodging arrangements for families.
          </p>
        </div>

        <div className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md">
          <div className="w-10 h-10 rounded bg-[#EDF5F4] text-[#1A635E] flex items-center justify-center mb-4">
            <Translate size={22} weight="bold" />
          </div>
          <h2 className="font-display text-xl font-semibold text-[#111315] mb-2">
            Language & Dietary Care
          </h2>
          <p className="text-xs text-[#5E666D] leading-relaxed">
            Dedicated multi-lingual coordinators, tailored international meal choices, and religious dietary accommodations during inpatient care.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
