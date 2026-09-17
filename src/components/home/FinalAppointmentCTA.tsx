import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { hospitalContent } from '@/data/hospitalContent';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { gsap } from '@/lib/gsap';
import { 
  CalendarCheck, 
  ArrowRight, 
  Phone, 
  Clock, 
  FirstAid 
} from '@phosphor-icons/react';

export function FinalAppointmentCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      if (leftColRef.current) {
        gsap.from(leftColRef.current.children, {
          opacity: 0,
          y: 18,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 82%',
            toggleActions: 'play none none none'
          }
        });
      }

      if (rightColRef.current) {
        gsap.from(rightColRef.current.children, {
          opacity: 0,
          y: 18,
          duration: 0.7,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [prefersReduced]);

  return (
    <section
      id="final-appointment-cta"
      ref={sectionRef}
      className="py-16 sm:py-20 lg:py-28 bg-[#FAF9F6] border-b border-[#E5E2D8]"
      aria-labelledby="cta-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          
          {/* Left Column: Editorial Message & Narrative Conclusion */}
          <div ref={leftColRef} className="lg:col-span-7 space-y-5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1A635E]" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#1A635E]">
                NEXT STEP
              </span>
            </div>

            <h2
              id="cta-heading"
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#111315] tracking-tight leading-[1.1] descender-clear"
            >
              Start with the right care.
            </h2>

            <p className="text-base sm:text-lg text-[#3C4247] leading-relaxed max-w-xl">
              Find the right specialist, request an appointment, or speak with Meridian about where to begin.
            </p>

            {/* Practical Scheduling Context */}
            <div className="pt-4 border-t border-[#E5E2D8] flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-[#5E666D]">
              <div className="flex items-center gap-1.5">
                <Clock size={15} className="text-[#1A635E]" aria-hidden="true" />
                <span>Central Scheduling: {hospitalContent.appointments.deskHours}</span>
              </div>
              <span className="text-[#D9D5CA] hidden sm:inline" aria-hidden="true">&bull;</span>
              <span>Lower Parel, Mumbai</span>
            </div>
          </div>

          {/* Right Column: Clear Action Architecture */}
          <div ref={rightColRef} className="lg:col-span-5 space-y-6">
            
            {/* Action Group: Primary and Secondary Actions */}
            <div className="p-6 sm:p-8 bg-[#F4F2EC] border border-[#E5E2D8] rounded-md space-y-5">
              <div className="space-y-3">
                {/* Primary CTA: Book an Appointment */}
                <Link
                  to="/appointment"
                  className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-xs sm:text-sm font-semibold uppercase tracking-wider text-white bg-[#1A635E] hover:bg-[#14514D] active:scale-[0.99] rounded transition-all shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#1A635E] focus:ring-offset-2"
                  aria-label="Book an Appointment with a Meridian Specialist"
                >
                  <CalendarCheck size={18} weight="bold" aria-hidden="true" />
                  <span>Book an Appointment</span>
                </Link>

                {/* Secondary CTA: Find Your Care */}
                <Link
                  to="/find-care"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#222528] bg-white hover:bg-[#FAF9F6] active:scale-[0.99] rounded border border-[#E5E2D8] transition-all focus:outline-hidden focus:ring-2 focus:ring-[#1A635E]"
                  aria-label="Find Your Care Pathway by clinical symptom or specialty"
                >
                  <span>Find Your Care</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>

              {/* Phone-First Pathway */}
              <div className="pt-5 border-t border-[#E5E2D8] space-y-1.5">
                <span className="block text-xs text-[#5E666D]">
                  Prefer to speak with someone?
                </span>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-[#111315] uppercase tracking-wider">
                    Call Meridian
                  </span>
                  <a
                    href="tel:+91XXXXXXXXXX"
                    className="inline-flex items-center gap-1.5 font-mono text-xs sm:text-sm font-semibold text-[#1A635E] hover:underline focus:outline-hidden focus:ring-2 focus:ring-[#1A635E]"
                    aria-label={`Call Meridian Central Scheduling at ${hospitalContent.appointments.deskPhone}`}
                  >
                    <Phone size={14} weight="fill" aria-hidden="true" />
                    <span>{hospitalContent.appointments.deskPhone}</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Restrained Emergency Reminder */}
            <div className="px-4 py-3 bg-[#FAF9F6] border border-[#E5E2D8] rounded flex items-center justify-between text-xs text-[#5E666D]">
              <div className="flex items-center gap-2">
                <FirstAid size={15} weight="fill" className="text-[#9E2A2B] shrink-0" aria-hidden="true" />
                <span>Emergency Care ({hospitalContent.emergency.availability}):</span>
              </div>
              <a
                href="tel:+91XXXXXXXXXX"
                className="font-mono font-semibold text-[#9E2A2B] hover:underline focus:outline-hidden focus:ring-2 focus:ring-[#9E2A2B]"
                aria-label={`Call Emergency Care hotline at ${hospitalContent.emergency.phone}`}
              >
                {hospitalContent.emergency.phone}
              </a>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
