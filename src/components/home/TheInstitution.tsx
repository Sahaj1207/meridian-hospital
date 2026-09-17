import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { hospitalContent } from '@/data/hospitalContent';
import { specialists } from '@/data/specialists';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { gsap } from '@/lib/gsap';
import { ShieldCheck, UserCheck, ArrowRight } from '@phosphor-icons/react';

export function TheInstitution() {
  const sectionRef = useRef<HTMLElement>(null);
  const ledgerRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  const medicalDirector = specialists.find((s) => s.id === 'dr-ananya-mehta');

  useEffect(() => {
    if (prefersReduced || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.institution-header', {
        opacity: 0,
        y: 20,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      });

      gsap.from('.institution-stat', {
        opacity: 0,
        y: 16,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: ledgerRef.current,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      });

      gsap.from('.institution-detail', {
        opacity: 0,
        y: 18,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: detailsRef.current,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [prefersReduced]);

  return (
    <section
      ref={sectionRef}
      className="py-16 sm:py-20 lg:py-24 bg-[#FAF9F6] border-b border-[#E5E2D8]"
      aria-labelledby="institution-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Split: Narrative and Proof Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start mb-16">
          {/* Left: Narrative Overview */}
          <div className="institution-header lg:col-span-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#1A635E]" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-widest text-[#1A635E]">
                  THE INSTITUTION
                </span>
              </div>

              <h2
                id="institution-heading"
                className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#111315] tracking-tight leading-[1.1] mb-5 descender-clear"
              >
                Built around the patient.
              </h2>

              <p className="text-base sm:text-lg text-[#3C4247] leading-relaxed max-w-xl mb-6">
                Meridian Hospital is a private multi-specialty tertiary-care hospital in Mumbai, bringing together experienced consultants, coordinated clinical services, emergency and critical care, and patient-focused support.
              </p>
            </div>

            <div className="p-4 bg-[#F4F2EC] rounded border border-[#E5E2D8] text-xs text-[#5E666D] space-y-1">
              <span className="font-semibold text-[#111315] block">
                Clinical Philosophy: {hospitalContent.creativePrinciple}
              </span>
              <span>{hospitalContent.tagline}</span>
            </div>
          </div>

          {/* Right: Institutional Proof Ledger (Typographic Evidence, Not Generic SaaS Cards) */}
          <div
            ref={ledgerRef}
            className="lg:col-span-6 bg-[#F4F2EC] border border-[#E5E2D8] rounded-md overflow-hidden grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#E5E2D8]"
          >
            <div className="divide-y divide-[#E5E2D8]">
              {/* Stat 1 */}
              <div className="institution-stat p-6 sm:p-7">
                <span className="block font-display text-4xl sm:text-5xl font-semibold text-[#111315] tracking-tight mb-1">
                  {hospitalContent.scale.beds}
                </span>
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#1A635E] mb-1">
                  Inpatient Beds
                </span>
                <span className="text-xs text-[#5E666D] leading-relaxed block">
                  Critical care, step-down telemetry, and private recovery units.
                </span>
              </div>

              {/* Stat 2 */}
              <div className="institution-stat p-6 sm:p-7">
                <span className="block font-display text-4xl sm:text-5xl font-semibold text-[#111315] tracking-tight mb-1">
                  {hospitalContent.scale.specialties}
                </span>
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#1A635E] mb-1">
                  Clinical Specialties
                </span>
                <span className="text-xs text-[#5E666D] leading-relaxed block">
                  Integrated medical and surgical disciplines under one campus roof.
                </span>
              </div>
            </div>

            <div className="divide-y divide-[#E5E2D8]">
              {/* Stat 3 */}
              <div className="institution-stat p-6 sm:p-7">
                <span className="block font-display text-4xl sm:text-5xl font-semibold text-[#111315] tracking-tight mb-1">
                  {hospitalContent.scale.specialistsCount}
                </span>
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#1A635E] mb-1">
                  Consultants & Specialists
                </span>
                <span className="text-xs text-[#5E666D] leading-relaxed block">
                  Senior faculty across primary, surgical, and diagnostic fields.
                </span>
              </div>

              {/* Stat 4 */}
              <div className="institution-stat p-6 sm:p-7">
                <span className="block font-display text-4xl sm:text-5xl font-semibold text-[#9E2A2B] tracking-tight mb-1">
                  {hospitalContent.scale.emergencyAvailability}
                </span>
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#9E2A2B] mb-1">
                  Emergency & Critical Care
                </span>
                <span className="text-xs text-[#5E666D] leading-relaxed block">
                  Rapid resuscitation, stroke pathways, and 24/7 cardiac catheterization.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Split: Quality & Patient Safety + Medical Leadership */}
        <div ref={detailsRef} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Quality & Patient Safety Positioning */}
          <div className="institution-detail lg:col-span-7 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="w-9 h-9 rounded bg-[#EDF5F4] text-[#1A635E] flex items-center justify-center">
                  <ShieldCheck size={20} weight="bold" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#EDF5F4] text-[#1A635E]">
                  {hospitalContent.qualityFramework.standardsAlignment}
                </span>
              </div>

              <h3 className="font-display text-2xl font-semibold text-[#111315] mb-2.5">
                QUALITY & PATIENT SAFETY
              </h3>

              <p className="text-sm text-[#3C4247] leading-relaxed mb-4">
                An institutional quality program aligned with structured hospital quality and patient-safety principles. Continuous clinical audits, antimicrobial stewardship, and incident monitoring are embedded across all wards.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#5E666D] pt-2">
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1A635E] mt-1.5 shrink-0" />
                  <span>Multidisciplinary peer review and morbidity audits</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1A635E] mt-1.5 shrink-0" />
                  <span>Structured infection control and surgical safety checklists</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-[#E5E2D8] flex items-center justify-between text-xs text-[#8E9499]">
              <span>Institutional Quality Directorate</span>
              <span className="text-[#1A635E] font-medium">Safe Care Governance</span>
            </div>
          </div>

          {/* Medical Leadership */}
          <div className="institution-detail lg:col-span-5 bg-[#F4F2EC] border border-[#E5E2D8] rounded-md p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="w-9 h-9 rounded bg-white text-[#1A635E] border border-[#E5E2D8] flex items-center justify-center">
                  <UserCheck size={20} weight="bold" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5E666D] bg-white px-2.5 py-1 rounded border border-[#E5E2D8]">
                  Clinical Governance
                </span>
              </div>

              <h3 className="font-display text-2xl font-semibold text-[#111315] mb-1">
                {hospitalContent.leadership.medicalDirector}
              </h3>

              <p className="text-xs font-semibold text-[#1A635E] uppercase tracking-wider mb-3">
                {hospitalContent.leadership.title}
              </p>

              <p className="text-xs text-[#3C4247] leading-relaxed mb-4">
                Medical leadership grounded in coordinated clinical practice, patient safety, and multidisciplinary care across Mumbai outpatient and inpatient programs.
              </p>

              {medicalDirector && (
                <div className="p-3 bg-white rounded border border-[#E5E2D8] text-xs space-y-1 text-[#5E666D]">
                  <p>
                    <strong className="text-[#111315]">Credentials:</strong> {medicalDirector.qualifications}
                  </p>
                  <p>
                    <strong className="text-[#111315]">Clinical Focus:</strong> {medicalDirector.clinicalInterests.slice(0, 2).join(', ')}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 mt-6 border-t border-[#E5E2D8] flex items-center justify-between text-xs">
              <span className="text-[#8E9499]">Department of Cardiology</span>
              <Link
                to="/specialists"
                className="text-[#1A635E] font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span>View Faculty</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
