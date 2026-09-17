import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { departments } from '@/data/departments';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { gsap } from '@/lib/gsap';
import { ArrowUpRight, CaretRight, ShieldPlus } from '@phosphor-icons/react';

export function CentersOfExcellence() {
  const [activeDeptId, setActiveDeptId] = useState<string>(departments[0]?.id || 'cardiology');
  const sectionRef = useRef<HTMLElement>(null);
  const flagshipRef = useRef<HTMLDivElement>(null);
  const directoryRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  const flagshipDepartment = departments.find((d) => d.isFlagship) || departments[0];

  useEffect(() => {
    if (prefersReduced || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.centers-header', {
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

      if (flagshipRef.current) {
        gsap.from(flagshipRef.current, {
          opacity: 0,
          y: 24,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: flagshipRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        });
      }

      gsap.from('.dept-index-row', {
        opacity: 0,
        y: 12,
        duration: 0.6,
        stagger: 0.04,
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
      ref={sectionRef}
      className="py-16 sm:py-20 lg:py-24 bg-[#F4F2EC] border-b border-[#E5E2D8]"
      aria-labelledby="centers-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="centers-header max-w-2xl mb-12">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#1A635E]" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#1A635E]">
              CENTERS OF EXCELLENCE
            </span>
          </div>

          <h2
            id="centers-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#111315] tracking-tight leading-[1.1] mb-4 descender-clear"
          >
            Specialized care, brought together.
          </h2>

          <p className="text-base sm:text-lg text-[#3C4247] leading-relaxed">
            Depth across primary, surgical, and intensive clinical disciplines organized around coordinated patient pathways.
          </p>
        </div>

        {/* Flagship Center: Signature Feature Treatment */}
        <div
          ref={flagshipRef}
          className="mb-16 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md overflow-hidden shadow-xs"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Flagship Narrative & Highlights */}
            <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#EDF5F4] text-[#1A635E] text-xs font-semibold uppercase tracking-wider">
                    <ShieldPlus size={14} weight="bold" />
                    <span>Signature Clinical Institute</span>
                  </span>
                  <span className="text-xs text-[#5E666D] font-mono">
                    {flagshipDepartment.code}
                  </span>
                </div>

                <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#111315] tracking-tight leading-tight mb-4">
                  MERIDIAN HEART & VASCULAR INSTITUTE
                </h3>

                <p className="text-sm sm:text-base text-[#3C4247] leading-relaxed mb-6">
                  {flagshipDepartment.shortDescription} Uniting non-invasive diagnostic imaging, interventional cardiac suites, and dedicated cardiothoracic post-operative recovery units.
                </p>

                {/* Flagship Focus Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                  {flagshipDepartment.clinicalFocus.map((focus) => (
                    <div key={focus} className="flex items-center gap-2 text-xs text-[#222528] bg-[#F4F2EC] p-2.5 rounded border border-[#E5E2D8]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A635E] shrink-0" />
                      <span className="font-medium">{focus}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action and Location Affordances */}
              <div className="pt-6 border-t border-[#E5E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-[#5E666D]">
                  <span className="block font-medium text-[#111315]">
                    {flagshipDepartment.location}
                  </span>
                  <span>{flagshipDepartment.bedCapacity} Dedicated Inpatient Beds</span>
                </div>

                <Link
                  to="/departments"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#1A635E] hover:bg-[#14514D] active:scale-[0.98] rounded transition-all focus-visible:ring-2 focus-visible:ring-[#1A635E] shrink-0"
                >
                  <span>Explore Heart & Vascular Care</span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>

            {/* Flagship Documentary Imagery */}
            <div className="lg:col-span-5 bg-[#222528] relative min-h-[280px] lg:min-h-full">
              <img
                src="/images/meridian-cardiac.jpg"
                alt="Clinicians observing cardiac catheterization in interventional suite at Meridian Hospital"
                className="w-full h-full object-cover block"
                loading="lazy"
                width={800}
                height={500}
              />
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-[11px] text-[#FAF9F6]">
                <span>Interventional Catheterization Laboratory, Tower A</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Network Index: 15 Departments Directory (Not 15 Generic Cards) */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6 pb-3 border-b border-[#E5E2D8]">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5E666D]">
                Clinical Department Directory
              </h3>
              <p className="font-display text-2xl font-semibold text-[#111315]">
                Full Medical & Surgical Faculty
              </p>
            </div>
            <span className="text-xs text-[#8E9499]">
              15 Clinical Centers &bull; 42 Sub-Disciplines
            </span>
          </div>

          <div
            ref={directoryRef}
            className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2"
            role="list"
            aria-label="Clinical Departments Index"
          >
            {departments.map((dept, index) => {
              const formattedIndex = String(index + 1).padStart(2, '0');
              const isActive = activeDeptId === dept.id;

              return (
                <div
                  key={dept.id}
                  className={`dept-index-row group relative border-b border-[#E5E2D8] transition-colors py-3.5 px-2 rounded-sm ${
                    isActive ? 'bg-[#FAF9F6]' : 'hover:bg-[#FAF9F6]/60'
                  }`}
                  onMouseEnter={() => setActiveDeptId(dept.id)}
                  onFocus={() => setActiveDeptId(dept.id)}
                  role="listitem"
                >
                  <Link
                    to="/departments"
                    className="flex items-center justify-between gap-3 text-left focus-visible:outline-hidden"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="font-mono text-xs text-[#8E9499] group-hover:text-[#1A635E] transition-colors w-6 shrink-0">
                        {formattedIndex}
                      </span>
                      <span className="font-medium text-sm sm:text-base text-[#111315] group-hover:text-[#1A635E] transition-colors truncate">
                        {dept.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10.5px] font-mono font-medium text-[#5E666D] bg-[#F4F2EC] px-1.5 py-0.5 rounded">
                        {dept.code}
                      </span>
                      <CaretRight
                        size={14}
                        className="text-[#8E9499] group-hover:text-[#1A635E] group-hover:translate-x-0.5 transition-all"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>

                  {/* Supporting descriptor preview */}
                  {isActive && (
                    <div className="pt-2 pl-9 pr-2 text-xs text-[#5E666D] transition-opacity">
                      <span>{dept.shortDescription}</span>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-[#8E9499]">
                        <span>Location: {dept.location}</span>
                        {dept.bedCapacity && <span>&bull; {dept.bedCapacity} Beds</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-4 border-t border-[#E5E2D8] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5E666D]">
            <span>
              All clinical specialties operate with integrated emergency triage and inpatient consultation.
            </span>
            <Link
              to="/departments"
              className="font-semibold text-[#1A635E] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>View Department Directory Details</span>
              <CaretRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
