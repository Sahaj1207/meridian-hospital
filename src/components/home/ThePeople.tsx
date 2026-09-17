import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { specialists, type Specialist } from '@/data/specialists';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { gsap } from '@/lib/gsap';
import { 
  ArrowRight, 
  CaretRight, 
  CalendarCheck, 
  Clock, 
  GraduationCap
} from '@phosphor-icons/react';

export function ThePeople() {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const sectionRef = useRef<HTMLElement>(null);
  const featuredRef = useRef<HTMLDivElement>(null);
  const directoryRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  // Extract featured specialist (Dr. Ananya Mehta, Medical Director)
  const featuredFaculty = useMemo(() => {
    return specialists.find((s) => s.id === 'dr-ananya-mehta') || specialists[0];
  }, []);

  // Filter categories derived cleanly from specialists data
  const specialtyCategories = useMemo(() => {
    const uniqueDepts = Array.from(new Set(specialists.map((s) => s.departmentName)));
    return ['all', ...uniqueDepts];
  }, []);

  // Filtered faculty list for directory
  const filteredFaculty = useMemo(() => {
    if (selectedSpecialty === 'all') return specialists;
    return specialists.filter((s) => s.departmentName === selectedSpecialty);
  }, [selectedSpecialty]);

  useEffect(() => {
    if (prefersReduced || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.people-header', {
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

      if (featuredRef.current) {
        gsap.from(featuredRef.current, {
          opacity: 0,
          y: 24,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: featuredRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        });
      }

      gsap.from('.faculty-index-row', {
        opacity: 0,
        y: 12,
        duration: 0.6,
        stagger: 0.05,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: directoryRef.current,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [prefersReduced]);

  return (
    <section
      id="the-people"
      ref={sectionRef}
      className="py-16 sm:py-20 lg:py-28 bg-[#FAF9F6] border-b border-[#E5E2D8]"
      aria-labelledby="people-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Introduction */}
        <div className="people-header max-w-3xl mb-14 lg:mb-20">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#1A635E]" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#1A635E]">
              THE PEOPLE
            </span>
          </div>

          <h2
            id="people-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#111315] tracking-tight leading-[1.1] mb-4 descender-clear"
          >
            Expertise, with a human face.
          </h2>

          <p className="text-base sm:text-lg text-[#3C4247] leading-relaxed mb-2">
            Care at Meridian is guided by experienced clinical consultants and department heads across 42 medical specialties. Our faculty combines focused clinical experience with collaborative decision-making.
          </p>

          <span className="text-xs font-medium text-[#1A635E] uppercase tracking-wider">
            Patient Perspective: Understanding who leads your clinical care
          </span>
        </div>

        {/* 02. Featured Faculty: Clinical Leadership Feature */}
        <div
          ref={featuredRef}
          className="mb-16 bg-[#F4F2EC] border border-[#E5E2D8] rounded-md overflow-hidden shadow-xs"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Left: Detailed Faculty Profile */}
            <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#EDF5F4] text-[#1A635E] text-xs font-semibold uppercase tracking-wider">
                    Medical Leadership & Clinical Governance
                  </span>
                  <span className="text-xs text-[#5E666D] font-mono">
                    {featuredFaculty.departmentName}
                  </span>
                </div>

                <h3 className="font-display text-3xl sm:text-4xl font-semibold text-[#111315] tracking-tight leading-tight mb-2">
                  {featuredFaculty.name}
                </h3>

                <p className="text-xs sm:text-sm font-semibold text-[#1A635E] uppercase tracking-wider mb-4">
                  {featuredFaculty.role}
                </p>

                <p className="text-sm sm:text-base text-[#3C4247] leading-relaxed mb-6">
                  Guiding clinical standards, peer review, and multidisciplinary coordination at Meridian Hospital. Dr. Mehta oversees acute coronary angioplasty pathways and clinical governance across all inpatient departments.
                </p>

                {/* Credentials and Experience Ledger */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  <div className="p-3 bg-[#FAF9F6] rounded border border-[#E5E2D8] text-xs">
                    <span className="text-[11px] font-semibold text-[#8E9499] uppercase tracking-wider block mb-1">
                      Qualifications
                    </span>
                    <span className="font-medium text-[#111315]">
                      {featuredFaculty.qualifications}
                    </span>
                  </div>

                  <div className="p-3 bg-[#FAF9F6] rounded border border-[#E5E2D8] text-xs">
                    <span className="text-[11px] font-semibold text-[#8E9499] uppercase tracking-wider block mb-1">
                      Clinical Tenure
                    </span>
                    <span className="font-medium text-[#111315]">
                      {featuredFaculty.experienceYears} Years Clinical Experience
                    </span>
                  </div>
                </div>

                {/* Clinical Focus Badges */}
                <div className="mb-6">
                  <span className="text-xs uppercase tracking-wider text-[#8E9499] font-medium block mb-2">
                    Specialist Clinical Interests:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {featuredFaculty.clinicalInterests.map((interest) => (
                      <span
                        key={interest}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#222528] bg-[#FAF9F6] border border-[#E5E2D8] rounded"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1A635E]" />
                        <span>{interest}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* OPD Consultation Schedule */}
                <div className="p-3.5 bg-[#FAF9F6] rounded border border-[#E5E2D8] text-xs flex items-center gap-2.5 text-[#5E666D]">
                  <Clock size={16} className="text-[#1A635E] shrink-0" />
                  <span>
                    <strong className="text-[#111315]">Consultation Windows:</strong> {featuredFaculty.opdDays}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 mt-6 border-t border-[#E5E2D8] flex flex-wrap items-center justify-between gap-4">
                <Link
                  to="/appointment"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#1A635E] hover:bg-[#14514D] active:scale-[0.98] rounded transition-all focus-visible:ring-2 focus-visible:ring-[#1A635E]"
                >
                  <CalendarCheck size={16} weight="bold" />
                  <span>Request Consultation</span>
                </Link>

                <Link
                  to={`/specialists#${featuredFaculty.id}`}
                  className="text-xs font-semibold text-[#1A635E] hover:underline inline-flex items-center gap-1"
                >
                  <span>View Full Profile</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>

            {/* Right: Documentary Clinical Portrait */}
            <div className="lg:col-span-5 bg-[#222528] relative min-h-[320px] lg:min-h-full">
              <img
                src="/images/meridian-dr-ananya-mehta.jpg"
                alt="Dr. Ananya Mehta, Medical Director, reviewing clinical records at consultation desk"
                className="w-full h-full object-cover block"
                loading="lazy"
                width={800}
                height={600}
              />
              <div className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/85 to-transparent text-[11px] text-[#FAF9F6]">
                <span className="block font-medium">Dr. Ananya Mehta, Medical Director</span>
                <span className="text-[#BCD9D6] text-[10px]">Department of Cardiology, Lower Parel Campus</span>
              </div>
            </div>
          </div>
        </div>

        {/* 03 & 04. Faculty Index & Specialty Filtering */}
        <div className="mb-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-4 border-b border-[#E5E2D8]">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5E666D] block mb-1">
                Clinical Faculty Directory
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#111315]">
                Senior Consultants & Faculty Heads
              </h3>
            </div>

            <span className="text-xs text-[#8E9499]">
              Showing {filteredFaculty.length} of {specialists.length} Featured Faculty Heads
            </span>
          </div>

          {/* Specialty Filter Button Row */}
          <div
            className="flex flex-wrap items-center gap-2 mb-6"
            role="toolbar"
            aria-label="Filter faculty by clinical specialty"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5E666D] mr-2">
              Specialty Filter:
            </span>
            {specialtyCategories.map((category) => {
              const isSelected = selectedSpecialty === category;
              const displayLabel = category === 'all' ? 'All Specialties' : category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedSpecialty(category)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1A635E] ${
                    isSelected
                      ? 'bg-[#1A635E] text-white font-semibold shadow-xs'
                      : 'bg-[#F4F2EC] text-[#3C4247] hover:bg-[#EDF5F4] hover:text-[#1A635E] border border-[#E5E2D8]'
                  }`}
                  aria-pressed={isSelected}
                >
                  {displayLabel}
                </button>
              );
            })}
          </div>

          {/* Editorial Faculty Index (Directory Format, Not a Card Grid) */}
          <div
            ref={directoryRef}
            className="divide-y divide-[#E5E2D8] border-t border-b border-[#E5E2D8] bg-[#FAF9F6]"
            role="list"
            aria-label="Clinical Specialists Directory"
          >
            {filteredFaculty.map((specialist: Specialist, index: number) => {
              const formattedIndex = String(index + 1).padStart(2, '0');

              return (
                <div
                  key={specialist.id}
                  className="faculty-index-row py-4 sm:py-5 px-3 sm:px-4 hover:bg-[#F4F2EC]/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  role="listitem"
                >
                  {/* Ordinal Number & Doctor Information */}
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <span className="font-mono text-xs font-bold text-[#8E9499] group-hover:text-[#1A635E] transition-colors w-6 shrink-0 mt-0.5 sm:mt-0">
                      {formattedIndex}
                    </span>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[10.5px] font-mono font-medium text-[#1A635E] bg-[#EDF5F4] px-1.5 py-0.5 rounded">
                          {specialist.departmentName}
                        </span>
                        {specialist.isLeadership && (
                          <span className="text-[10px] font-semibold text-[#5E666D] uppercase tracking-wider bg-[#F4F2EC] px-1.5 py-0.5 rounded">
                            Leadership
                          </span>
                        )}
                      </div>

                      <h4 className="font-display text-xl font-semibold text-[#111315] group-hover:text-[#1A635E] transition-colors">
                        {specialist.name}
                      </h4>

                      <p className="text-xs text-[#5E666D] font-medium">
                        {specialist.role}
                      </p>
                    </div>
                  </div>

                  {/* Credentials, Experience & OPD Hours */}
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-[#5E666D] pl-10 md:pl-0">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap size={15} className="text-[#1A635E] shrink-0" />
                      <span>{specialist.qualifications}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-[#1A635E] shrink-0" />
                      <span>{specialist.opdDays}</span>
                    </div>

                    <Link
                      to={`/specialists#${specialist.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-[#1A635E] hover:underline shrink-0 group-hover:translate-x-0.5 transition-transform"
                      aria-label={`View clinical profile of ${specialist.name}`}
                    >
                      <span>View Profile</span>
                      <CaretRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 06. Patient-First Context Box */}
        <div className="p-6 bg-[#F4F2EC] border border-[#E5E2D8] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-14">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1A635E] block mb-1">
              Patient Consultation Guidance
            </span>
            <p className="text-xs sm:text-sm text-[#3C4247] leading-relaxed">
              Patients can explore consultants by clinical specialty or sub-discipline. Every specialist at Meridian coordinates outpatient reviews with structured diagnostic follow-up and inpatient referral pathways.
            </p>
          </div>

          <Link
            to="/specialists"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#FAF9F6] bg-[#1A635E] hover:bg-[#14514D] active:scale-[0.98] rounded transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-[#1A635E]"
          >
            <span>Browse Full Specialist Directory</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* 07. Section Transition: Subtle Bridge toward Locations & Patient Services */}
        <div className="pt-8 border-t border-[#E5E2D8] text-center max-w-xl mx-auto">
          <p className="font-display text-xl sm:text-2xl font-medium text-[#5E666D] italic descender-clear">
            Good care also depends on what happens around the consultation.
          </p>
        </div>
      </div>
    </section>
  );
}
