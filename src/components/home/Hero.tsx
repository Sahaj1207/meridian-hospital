import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { hospitalContent } from '@/data/hospitalContent';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { gsap } from '@/lib/gsap';
import { ArrowRight, FirstAid, CalendarCheck, MapPin } from '@phosphor-icons/react';

export function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const textGroupRef = useRef<HTMLDivElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced || !containerRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out', duration: 0.9 }
      });

      tl.from('.hero-eyebrow', { opacity: 0, y: 12, duration: 0.6 })
        .from('.hero-headline', { opacity: 0, y: 24, duration: 0.8 }, '-=0.4')
        .from('.hero-subtext', { opacity: 0, y: 16, duration: 0.7 }, '-=0.5')
        .from('.hero-actions', { opacity: 0, y: 14, duration: 0.7 }, '-=0.5')
        .from('.hero-metadata', { opacity: 0, duration: 0.6 }, '-=0.4')
        .from(imageWrapRef.current, { opacity: 0, scale: 0.98, duration: 1.1 }, '-=0.9');
    }, containerRef);

    return () => ctx.revert();
  }, [prefersReduced]);

  const handleScrollToFindCare = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById('find-your-care');
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={containerRef}
      className="relative bg-[#FAF9F6] border-b border-[#E5E2D8] pt-8 sm:pt-12 lg:pt-16 pb-12 sm:pb-16 lg:pb-20 overflow-hidden"
      aria-label="Meridian Hospital Introduction"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Asymmetric Content Stack */}
          <div ref={textGroupRef} className="lg:col-span-7 flex flex-col justify-center">
            {/* Eyebrow */}
            <div className="hero-eyebrow flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-[#1A635E]" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#1A635E]">
                {hospitalContent.name}
              </span>
            </div>

            {/* Primary Headline */}
            <h1 className="hero-headline font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#111315] tracking-tight leading-[1.08] mb-5">
              CARE, MADE CLEAR.
            </h1>

            {/* Supporting Statement */}
            <p className="hero-subtext text-base sm:text-lg text-[#3C4247] max-w-xl leading-relaxed mb-8">
              Advanced tertiary care, experienced specialists, and coordinated patient services in Mumbai.
            </p>

            {/* Patient Action & Emergency Utility Cluster */}
            <div className="hero-actions flex flex-col sm:flex-row sm:items-center gap-3.5 mb-8">
              {/* Primary CTA */}
              <Link
                to="/appointment"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#1A635E] hover:bg-[#14514D] active:scale-[0.98] rounded transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1A635E]"
                aria-label="Book an Appointment with a Specialist"
              >
                <CalendarCheck size={18} weight="bold" aria-hidden="true" />
                <span>Book an Appointment</span>
              </Link>

              {/* Secondary Functional Action */}
              <a
                href="#find-your-care"
                onClick={handleScrollToFindCare}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold text-[#222528] bg-[#F4F2EC] hover:bg-[#EAE8E0] active:scale-[0.98] rounded border border-[#E5E2D8] transition-all focus-visible:ring-2 focus-visible:ring-[#1A635E]"
                aria-label="Navigate to Find Your Care section"
              >
                <span>Find Your Care</span>
                <ArrowRight size={16} aria-hidden="true" />
              </a>

              {/* Emergency Action Slot */}
              <a
                href={`tel:${hospitalContent.emergency.phone}`}
                className="inline-flex items-center justify-center sm:justify-start gap-2 px-4 py-3 text-xs font-semibold text-[#9E2A2B] bg-[#FDF2F2] border border-[#F1C5C5] rounded hover:bg-[#FCE8E8] transition-colors focus-visible:ring-2 focus-visible:ring-[#9E2A2B]"
                aria-label={`Emergency Care 24/7 hotline at ${hospitalContent.emergency.phone}`}
              >
                <FirstAid size={16} weight="fill" className="text-[#9E2A2B] shrink-0" aria-hidden="true" />
                <span className="uppercase tracking-wider">Emergency 24 / 7:</span>
                <span className="font-mono text-xs underline">{hospitalContent.emergency.phone}</span>
              </a>
            </div>

            {/* Subtle Institutional Metadata Line */}
            <div className="hero-metadata pt-5 border-t border-[#E5E2D8] flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-[#5E666D]">
              <span className="flex items-center gap-1.5 font-medium text-[#3C4247]">
                <MapPin size={14} className="text-[#1A635E]" aria-hidden="true" />
                <span>{hospitalContent.location.city}, {hospitalContent.location.state}</span>
              </span>
              <span className="text-[#D9D5CA]" aria-hidden="true">&bull;</span>
              <span>{hospitalContent.scale.beds} Inpatient Beds</span>
              <span className="text-[#D9D5CA]" aria-hidden="true">&bull;</span>
              <span>{hospitalContent.scale.specialties} Clinical Specialties</span>
            </div>
          </div>

          {/* Right Column: Documentary Hospital Imagery */}
          <div className="lg:col-span-5">
            <div
              ref={imageWrapRef}
              className="relative rounded-md overflow-hidden border border-[#E5E2D8] bg-[#F4F2EC] shadow-sm"
            >
              <img
                src="/images/meridian-hero.jpg"
                alt="Observational view of clinicians reviewing patient records in a daylight-filled hospital suite in Mumbai"
                className="w-full h-auto object-cover aspect-[4/3] block"
                loading="eager"
                width={800}
                height={600}
              />
              <div className="p-3.5 bg-[#FAF9F6] border-t border-[#E5E2D8] flex items-center justify-between text-[11px] text-[#5E666D]">
                <span>Clinical Consultation Suite, Lower Parel</span>
                <span className="font-medium text-[#1A635E]">Observational Care</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
