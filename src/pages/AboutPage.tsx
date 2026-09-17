import { PageShell } from '@/components/shared/PageShell';
import { hospitalContent } from '@/data/hospitalContent';
import { ShieldCheck } from '@phosphor-icons/react';

export function AboutPage() {
  return (
    <PageShell
      title="About Meridian Hospital"
      category="About"
      description="A private multi-specialty tertiary care hospital in Mumbai providing patient-centered clinical expertise and critical care."
      statusText="Institutional Overview"
    >
      <div className="space-y-10">
        {/* Core Institutional Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md">
            <h2 className="font-display text-2xl font-semibold text-[#111315] mb-4">
              Institutional Direction
            </h2>
            <p className="text-sm text-[#3C4247] leading-relaxed mb-4">
              Meridian Hospital was established with a singular objective: delivering advanced tertiary medical care with uncompromising clarity. We believe patients and their families deserve transparent clinical information, empathetic communication, and rigorous standards of clinical governance.
            </p>
            <div className="p-4 bg-[#F4F2EC] rounded border border-[#EAE8E0] text-xs space-y-1">
              <span className="font-semibold text-[#111315] block">
                Guiding Creative Principle: {hospitalContent.creativePrinciple}
              </span>
              <span className="text-[#5E666D] block">
                Public Tagline: {hospitalContent.tagline}
              </span>
            </div>
          </div>

          <div className="p-8 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md">
            <h2 className="font-display text-2xl font-semibold text-[#111315] mb-4">
              Clinical Leadership
            </h2>
            <p className="text-sm text-[#3C4247] leading-relaxed mb-4">
              Under the clinical direction of {hospitalContent.leadership.medicalDirector}, our multidisciplinary medical faculty coordinates peer review, antibiotic stewardship, and evidence-based patient management pathways.
            </p>
            <div className="pt-4 border-t border-[#E5E2D8] text-xs text-[#5E666D]">
              <span className="font-medium text-[#111315]">{hospitalContent.leadership.medicalDirector}</span>
              <span className="block text-[#8E9499]">{hospitalContent.leadership.title}</span>
            </div>
          </div>
        </div>

        {/* Quality Framework Section */}
        <div className="p-8 bg-[#F4F2EC] border border-[#E5E2D8] rounded-md">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded text-[#1A635E] border border-[#E5E2D8]">
              <ShieldCheck size={28} weight="bold" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#111315] mb-2">
                {hospitalContent.qualityFramework.title}
              </h2>
              <p className="text-sm text-[#3C4247] max-w-3xl leading-relaxed mb-3">
                {hospitalContent.qualityFramework.description}
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#EDF5F4] text-[#1A635E] text-xs font-semibold rounded">
                <span>{hospitalContent.qualityFramework.standardsAlignment}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
