import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { specialists } from '@/data/specialists';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { gsap } from '@/lib/gsap';
import { 
  ArrowRight, 
  CheckCircle,
  CaretRight
} from '@phosphor-icons/react';

interface ClinicalCapability {
  id: string;
  number: string;
  title: string;
  descriptor: string;
  infrastructure: string[];
  departmentPath: string;
}

const CLINICAL_CAPABILITIES: ClinicalCapability[] = [
  {
    id: 'diagnostics',
    number: '01',
    title: 'Advanced Diagnostics',
    descriptor: 'Comprehensive diagnostic imaging and automated clinical pathology to establish definitive clinical baselines.',
    infrastructure: [
      '3 Tesla Magnetic Resonance Imaging (MRI)',
      'Dual-Source Computed Tomography (CT)',
      'Automated core clinical biochemistry & histopathology',
      'Rapid emergency diagnostic reporting protocols'
    ],
    departmentPath: '/departments'
  },
  {
    id: 'surgical',
    number: '02',
    title: 'Interventional & Surgical Care',
    descriptor: 'Controlled operative suites designed for complex minimally invasive and open surgical interventions.',
    infrastructure: [
      'Dedicated cardiovascular catheterization laboratories',
      'Laparoscopic and minimally invasive surgical suites',
      'Standardized surgical safety checklist protocols',
      'HEPA-filtered sterile air laminar flow theaters'
    ],
    departmentPath: '/departments'
  },
  {
    id: 'critical-care',
    number: '03',
    title: 'Critical Care',
    descriptor: 'Closed multi-disciplinary intensive care unit providing continuous hemodynamic monitoring and life support.',
    infrastructure: [
      '24/7 intensivist and critical care physician staffing',
      'Advanced invasive hemodynamic monitoring systems',
      'Extracorporeal membrane oxygenation (ECMO) capability',
      'Dedicated isolation and negative-pressure rooms'
    ],
    departmentPath: '/departments'
  },
  {
    id: 'multidisciplinary',
    number: '04',
    title: 'Multidisciplinary Care',
    descriptor: 'Coordinated tumor boards and cross-specialty clinical conferences for complex patient management.',
    infrastructure: [
      'Multidisciplinary oncology tumor boards',
      'Combined cardiac and thoracic surgical review panels',
      'Hyperacute stroke response teams',
      'Hospital-wide antimicrobial stewardship protocols'
    ],
    departmentPath: '/departments'
  }
];

const CARE_STAGES = [
  {
    step: '01',
    label: 'DIAGNOSE',
    detail: 'High-resolution imaging and laboratory diagnostics to confirm underlying pathology.'
  },
  {
    step: '02',
    label: 'PLAN',
    detail: 'Multidisciplinary faculty review to formulate an individualized clinical pathway.'
  },
  {
    step: '03',
    label: 'TREAT',
    detail: 'Interventional, surgical, or medical therapies conducted under strict safety protocols.'
  },
  {
    step: '04',
    label: 'RECOVER',
    detail: 'Structured intensive step-down, nursing oversight, and clinical rehabilitation.'
  }
];

export function TechnologyExpertise() {
  const [activeCapabilityId, setActiveCapabilityId] = useState<string>(CLINICAL_CAPABILITIES[0].id);
  const sectionRef = useRef<HTMLElement>(null);
  const capabilityListRef = useRef<HTMLDivElement>(null);
  const stagesRef = useRef<HTMLDivElement>(null);
  const facultyRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  const leadershipFaculty = specialists.filter((s) => s.isLeadership).slice(0, 3);

  useEffect(() => {
    if (prefersReduced || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.tech-header', {
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

      gsap.from('.capability-item', {
        opacity: 0,
        y: 16,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: capabilityListRef.current,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      });

      gsap.from('.stage-step', {
        opacity: 0,
        y: 14,
        duration: 0.6,
        stagger: 0.06,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: stagesRef.current,
          start: 'top 90%',
          toggleActions: 'play none none none'
        }
      });

      gsap.from(facultyRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: facultyRef.current,
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
      aria-labelledby="tech-expertise-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="tech-header max-w-3xl mb-14">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#1A635E]" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#1A635E]">
              TECHNOLOGY + EXPERTISE
            </span>
          </div>

          <h2
            id="tech-expertise-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#111315] tracking-tight leading-[1.1] mb-4 descender-clear"
          >
            Advanced capability. Human expertise.
          </h2>

          <p className="text-base sm:text-lg text-[#3C4247] leading-relaxed mb-3">
            Technology at Meridian supports clinical judgment and patient safety rather than replacing physician oversight. We organize diagnostic imaging, surgical theaters, and critical care units around multidisciplinary coordination.
          </p>

          <p className="text-xs font-medium text-[#1A635E] uppercase tracking-wider">
            Clinical Principle: Technology should support clinical expertise, not replace it.
          </p>
        </div>

        {/* Clinical Capability Presentation: Asymmetrical Index Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-16 items-start">
          {/* Capability Selection List (Left Column) */}
          <div
            ref={capabilityListRef}
            className="lg:col-span-6 space-y-3"
            role="list"
            aria-label="Clinical Capabilities"
          >
            {CLINICAL_CAPABILITIES.map((capability) => {
              const isActive = activeCapabilityId === capability.id;

              return (
                <div
                  key={capability.id}
                  className={`capability-item p-5 sm:p-6 rounded-md border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#F4F2EC] border-[#1A635E] shadow-xs'
                      : 'bg-[#FAF9F6] border-[#E5E2D8] hover:border-[#BCD9D6]'
                  }`}
                  onClick={() => setActiveCapabilityId(capability.id)}
                  onMouseEnter={() => setActiveCapabilityId(capability.id)}
                  onFocus={() => setActiveCapabilityId(capability.id)}
                  tabIndex={0}
                  role="listitem"
                  aria-expanded={isActive}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                        isActive ? 'bg-[#1A635E] text-white' : 'bg-[#EAE8E0] text-[#5E666D]'
                      }`}>
                        {capability.number}
                      </span>
                      <h3 className="font-display text-xl sm:text-2xl font-semibold text-[#111315]">
                        {capability.title}
                      </h3>
                    </div>
                    <CaretRight
                      size={18}
                      className={`transition-transform shrink-0 ${
                        isActive ? 'text-[#1A635E] rotate-90' : 'text-[#8E9499]'
                      }`}
                      aria-hidden="true"
                    />
                  </div>

                  <p className="text-xs sm:text-sm text-[#5E666D] leading-relaxed mb-3">
                    {capability.descriptor}
                  </p>

                  {/* Infrastructure Points */}
                  <div className={`space-y-2 pt-3 border-t border-[#E5E2D8] ${isActive ? 'block' : 'hidden sm:block'}`}>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1A635E] block">
                      Key Clinical Infrastructure:
                    </span>
                    <ul className="grid grid-cols-1 gap-1.5 text-xs text-[#3C4247]">
                      {capability.infrastructure.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle size={14} className="text-[#1A635E] mt-0.5 shrink-0" weight="bold" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Documentary Clinical Workstation & Narrative Panel (Right Column) */}
          <div className="lg:col-span-6 bg-[#F4F2EC] border border-[#E5E2D8] rounded-md p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="rounded-md overflow-hidden border border-[#E5E2D8] bg-[#222528] mb-6">
                <img
                  src="/images/meridian-technology.jpg"
                  alt="Senior radiologist and surgeon analyzing diagnostic cross-sectional imaging in clinical reading room"
                  className="w-full h-auto object-cover aspect-[16/9] block"
                  loading="lazy"
                  width={800}
                  height={450}
                />
                <div className="p-3 bg-[#111315] text-[11px] text-[#FAF9F6] flex items-center justify-between">
                  <span>Diagnostic Review Suite, Tower A</span>
                  <span className="text-[#BCD9D6]">Cross-Disciplinary Consensus</span>
                </div>
              </div>

              <h3 className="font-display text-2xl font-semibold text-[#111315] mb-3">
                Precision in Diagnostic Review
              </h3>

              <p className="text-xs sm:text-sm text-[#3C4247] leading-relaxed mb-4">
                Diagnostic imaging and pathology results are reviewed collaboratively before procedural scheduling. This reduces diagnostic uncertainty and ensures patients enter surgery or treatment with verified anatomical planning.
              </p>

              <div className="p-3.5 bg-[#FAF9F6] rounded border border-[#E5E2D8] text-xs text-[#5E666D] space-y-1">
                <span className="font-semibold text-[#111315] block">
                  Digital Clinical Archive:
                </span>
                <span>
                  All imaging studies and biopsy evaluations are accessible hospital-wide for inpatient rounds and emergency triage.
                </span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-[#E5E2D8] flex items-center justify-between text-xs">
              <span className="text-[#8E9499]">Departments of Radiology & Pathology</span>
              <Link
                to="/departments"
                className="font-semibold text-[#1A635E] hover:underline inline-flex items-center gap-1"
              >
                <span>View Diagnostic Wings</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* Conceptual Clinical Delivery Sequence */}
        <div className="mb-16">
          <div className="mb-6 pb-2 border-b border-[#E5E2D8] flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5E666D]">
              Clinical Capability Delivery Model
            </h3>
            <span className="text-xs text-[#8E9499]">
              How capability is coordinated across patient care stages
            </span>
          </div>

          <div
            ref={stagesRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {CARE_STAGES.map((stage) => (
              <div
                key={stage.step}
                className="stage-step p-5 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-xs font-bold text-[#1A635E] block mb-2">
                    {stage.step}
                  </span>
                  <h4 className="font-display text-xl font-semibold text-[#111315] mb-2">
                    {stage.label}
                  </h4>
                  <p className="text-xs text-[#5E666D] leading-relaxed">
                    {stage.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Multidisciplinary Expertise & Faculty Signal */}
        <div
          ref={facultyRef}
          className="bg-[#F4F2EC] border border-[#E5E2D8] rounded-md p-6 sm:p-8 lg:p-10 mb-14"
        >
          <div className="max-w-2xl mb-8">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#1A635E] block mb-2">
              MULTIDISCIPLINARY EXPERTISE
            </span>
            <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#111315] mb-3">
              Complex care rarely belongs to one specialty.
            </h3>
            <p className="text-xs sm:text-sm text-[#3C4247] leading-relaxed">
              Meridian organizes care around clinical problem-solving. When patients present with multi-system conditions, consultants from cardiology, oncology, critical care, and surgery collaborate to establish unified treatment pathways.
            </p>
          </div>

          {/* Faculty Signal Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {leadershipFaculty.map((specialist) => (
              <div
                key={specialist.id}
                className="p-4 bg-[#FAF9F6] border border-[#E5E2D8] rounded flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[#1A635E] block mb-1">
                    {specialist.departmentName}
                  </span>
                  <h4 className="font-display text-lg font-semibold text-[#111315] mb-1">
                    {specialist.name}
                  </h4>
                  <p className="text-xs text-[#5E666D] mb-2 font-medium">
                    {specialist.role}
                  </p>
                  <p className="text-[11px] text-[#8E9499]">
                    Credentials: {specialist.qualifications} &bull; {specialist.experienceYears} Years
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#E5E2D8] text-xs">
            <span className="text-[#5E666D]">
              Over 210 clinical consultants and faculty members across 42 specialties in Mumbai.
            </span>
            <Link
              to="/specialists"
              className="font-semibold text-[#1A635E] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>Explore Specialist Directory</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Section Transition: Conceptual Bridge */}
        <div className="pt-8 border-t border-[#E5E2D8] text-center max-w-xl mx-auto">
          <p className="font-display text-xl sm:text-2xl font-medium text-[#5E666D] italic descender-clear">
            Care is more than what happens inside the hospital.
          </p>
        </div>
      </div>
    </section>
  );
}
