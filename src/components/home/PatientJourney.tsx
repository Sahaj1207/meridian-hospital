import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { 
  ArrowRight, 
  CheckCircle
} from '@phosphor-icons/react';

interface JourneyStage {
  id: string;
  stepNumber: string;
  stageCode: string;
  title: string;
  subtitle: string;
  summary: string;
  checkpoints: string[];
  primaryAction: {
    label: string;
    path: string;
  };
  secondaryAction?: {
    label: string;
    path: string;
  };
  tertiaryAction?: {
    label: string;
    path: string;
  };
  image: {
    src: string;
    alt: string;
    caption: string;
  };
}

const JOURNEY_STAGES: JourneyStage[] = [
  {
    id: 'prepare',
    stepNumber: '01',
    stageCode: 'PREPARE',
    title: 'Before you arrive.',
    subtitle: 'Consultation scheduling and pre-visit clinical coordination.',
    summary: 'Preparing medical documentation, confirming outpatient consultation windows, and coordinating cashless insurance pre-authorization before visiting the hospital.',
    checkpoints: [
      'Identify clinical discipline and schedule with consultant faculty',
      'Gather previous laboratory diagnostics, imaging scans, and prescriptions',
      'Coordinate cashless hospitalization desk pre-authorization'
    ],
    primaryAction: {
      label: 'Book an Appointment',
      path: '/appointment'
    },
    secondaryAction: {
      label: 'Insurance & Billing Guidance',
      path: '/insurance-billing'
    },
    tertiaryAction: {
      label: 'Find Your Care',
      path: '/find-care'
    },
    image: {
      src: '/images/meridian-hero.jpg',
      alt: 'Clinicians reviewing patient records and consultation documentation in hospital suite',
      caption: 'Pre-visit Consultation Preparation, Lower Parel'
    }
  },
  {
    id: 'arrive',
    stepNumber: '02',
    stageCode: 'ARRIVE',
    title: 'Know what to expect.',
    subtitle: 'Campus navigation, registration, and patient reception.',
    summary: 'Clear transit access in Lower Parel, centralized registration in the Main Atrium, separate critical emergency ramps, and transparent visitor guidelines.',
    checkpoints: [
      'Central registration and outpatient helpdesks in Main Atrium',
      '24/7 Level 1 trauma and resuscitation bays via dedicated Gate 1',
      'Visitor windows: General 16:00 to 19:00, ICU restricted visiting'
    ],
    primaryAction: {
      label: 'Campus Coordinates & Access',
      path: '/locations'
    },
    secondaryAction: {
      label: 'Visitor Information',
      path: '/patients'
    },
    image: {
      src: '/images/meridian-arrive.jpg',
      alt: 'Spacious main entrance atrium with natural light and patient registration desk',
      caption: 'Main Entrance Atrium & Registration, Lower Parel'
    }
  },
  {
    id: 'receive-care',
    stepNumber: '03',
    stageCode: 'RECEIVE CARE',
    title: 'Understand your care.',
    subtitle: 'Diagnostic precision, treatment, and multidisciplinary oversight.',
    summary: 'Consultant evaluations, integrated 3T MRI and dual-source CT imaging, surgical operating theaters, and closed intensive care monitoring.',
    checkpoints: [
      'Multidisciplinary review panels for complex surgical and medical cases',
      'Standardized surgical safety checklists and laminar-flow theaters',
      'Continuous hemodynamic telemetry and nurse-to-patient oversight'
    ],
    primaryAction: {
      label: 'Explore Departments',
      path: '/departments'
    },
    secondaryAction: {
      label: 'Consultant Faculty',
      path: '/specialists'
    },
    image: {
      src: '/images/meridian-cardiac.jpg',
      alt: 'Cardiologists and surgical team in catheterization observation suite',
      caption: 'Interventional Catheterization & Intensive Monitoring'
    }
  },
  {
    id: 'follow-up',
    stepNumber: '04',
    stageCode: 'FOLLOW UP',
    title: 'Know what comes next.',
    subtitle: 'Discharge planning, recovery milestones, and ongoing coordination.',
    summary: 'Clear written discharge summaries, rehabilitation schedules, outpatient review dates, and dedicated patient advocacy response within 48 hours.',
    checkpoints: [
      'Itemized discharge instructions and verified home medication schedules',
      'Scheduled follow-up reviews and digital diagnostic report retrieval',
      'Direct clinical quality review and patient grievance response'
    ],
    primaryAction: {
      label: 'Schedule Follow-up Visit',
      path: '/appointment'
    },
    secondaryAction: {
      label: 'Patient Feedback & Advocacy',
      path: '/patients'
    },
    image: {
      src: '/images/meridian-followup.jpg',
      alt: 'Doctor discussing recovery milestones and post-care schedule with patient and family',
      caption: 'Post-Treatment Recovery Consultation Suite'
    }
  }
];

export function PatientJourney() {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const containerRef = useRef<HTMLElement>(null);
  const stageRefs = useRef<(HTMLElement | null)[]>([]);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // Header entrance animation
      gsap.from('.journey-header', {
        opacity: 0,
        y: 20,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      });

      // Track active stage as user scrolls through the stages
      stageRefs.current.forEach((stageEl, idx) => {
        if (!stageEl) return;

        ScrollTrigger.create({
          trigger: stageEl,
          start: 'top 45%',
          end: 'bottom 45%',
          onEnter: () => setActiveStageIndex(idx),
          onEnterBack: () => setActiveStageIndex(idx)
        });

        // Soft reveal per stage
        gsap.from(stageEl, {
          opacity: 0.2,
          y: 20,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: stageEl,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, [prefersReduced]);

  const scrollToStage = (index: number) => {
    const target = stageRefs.current[index];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const activeStage = JOURNEY_STAGES[activeStageIndex];

  return (
    <section
      id="patient-journey"
      ref={containerRef}
      className="py-16 sm:py-20 lg:py-28 bg-[#F4F2EC] border-b border-[#E5E2D8]"
      aria-labelledby="journey-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Introduction */}
        <div className="journey-header max-w-3xl mb-14 lg:mb-20">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#1A635E]" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#1A635E]">
              PATIENT JOURNEY
            </span>
          </div>

          <h2
            id="journey-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#111315] tracking-tight leading-[1.1] mb-4 descender-clear"
          >
            Care does not begin at admission.
          </h2>

          <p className="text-base sm:text-lg text-[#3C4247] leading-relaxed">
            From preparing for your visit to coordinating what comes next, Meridian brings essential patient information together at every stage.
          </p>
        </div>

        {/* Two-Part Layout: Sticky Navigation on Desktop + Sequential Stage Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          {/* Left Column: Persistent Journey Navigation & Progress Ledger (Desktop) */}
          <div className="lg:col-span-4 lg:sticky lg:top-28">
            <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded-md p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E5E2D8]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#5E666D]">
                  Journey Progress
                </span>
                <span className="font-mono text-xs font-bold text-[#1A635E] bg-[#EDF5F4] px-2 py-0.5 rounded">
                  {activeStage.stepNumber} / 04
                </span>
              </div>

              {/* Vertical Stage Navigation Buttons */}
              <nav aria-label="Patient Journey Stages" className="space-y-2">
                {JOURNEY_STAGES.map((stage, idx) => {
                  const isCurrent = activeStageIndex === idx;

                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => scrollToStage(idx)}
                      className={`w-full text-left p-3 rounded transition-all flex items-center justify-between group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1A635E] ${
                        isCurrent
                          ? 'bg-[#F4F2EC] border-l-4 border-l-[#1A635E] text-[#111315] font-semibold'
                          : 'hover:bg-[#F4F2EC]/60 text-[#5E666D] border-l-4 border-l-transparent'
                      }`}
                      aria-current={isCurrent ? 'step' : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-mono text-xs font-bold ${
                          isCurrent ? 'text-[#1A635E]' : 'text-[#8E9499]'
                        }`}>
                          {stage.stepNumber}
                        </span>
                        <span className="text-sm tracking-wide">
                          {stage.stageCode}
                        </span>
                      </div>
                      <span className={`text-xs ${
                        isCurrent ? 'text-[#1A635E]' : 'text-transparent group-hover:text-[#8E9499]'
                      }`}>
                        &rarr;
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Active Stage Quick Hint */}
              <div className="mt-6 pt-5 border-t border-[#E5E2D8] text-xs text-[#5E666D]">
                <span className="font-semibold text-[#111315] block mb-1">
                  Current Stage: {activeStage.stageCode}
                </span>
                <p className="leading-relaxed">
                  {activeStage.title}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Large Sequential Stage Content Cards */}
          <div className="lg:col-span-8 space-y-10 sm:space-y-14">
            {JOURNEY_STAGES.map((stage, idx) => (
              <article
                key={stage.id}
                ref={(el) => { stageRefs.current[idx] = el; }}
                className="bg-[#FAF9F6] border border-[#E5E2D8] rounded-md p-6 sm:p-8 lg:p-10 shadow-xs"
                aria-label={`Stage ${stage.stepNumber}: ${stage.stageCode}`}
              >
                {/* Stage Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-[#E5E2D8]">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#1A635E] text-white font-mono text-xs font-bold flex items-center justify-center">
                      {stage.stepNumber}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#1A635E]">
                      STAGE {stage.stepNumber} : {stage.stageCode}
                    </span>
                  </div>
                  <span className="text-xs text-[#8E9499]">
                    Meridian Care Pathway
                  </span>
                </div>

                {/* Title & Subtitle */}
                <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#111315] tracking-tight leading-tight mb-2">
                  {stage.title}
                </h3>
                <p className="text-xs sm:text-sm font-medium text-[#5E666D] uppercase tracking-wider mb-5">
                  {stage.subtitle}
                </p>

                {/* Summary narrative */}
                <p className="text-sm sm:text-base text-[#3C4247] leading-relaxed mb-6">
                  {stage.summary}
                </p>

                {/* Checkpoint bullet list */}
                <div className="mb-8 p-5 bg-[#F4F2EC] rounded border border-[#E5E2D8]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#1A635E] block mb-3">
                    Coordinated Clinical Checkpoints:
                  </span>
                  <ul className="space-y-2 text-xs sm:text-sm text-[#222528]">
                    {stage.checkpoints.map((cp, cIdx) => (
                      <li key={cIdx} className="flex items-start gap-2.5">
                        <CheckCircle size={16} className="text-[#1A635E] mt-0.5 shrink-0" weight="bold" />
                        <span>{cp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Documentary Image with Caption */}
                <div className="rounded-md overflow-hidden border border-[#E5E2D8] bg-[#222528] mb-8">
                  <img
                    src={stage.image.src}
                    alt={stage.image.alt}
                    className="w-full h-auto object-cover aspect-[16/9] block"
                    loading="lazy"
                    width={800}
                    height={450}
                  />
                  <div className="p-3 bg-[#111315] text-[11px] text-[#FAF9F6] flex items-center justify-between">
                    <span>{stage.image.caption}</span>
                    <span className="text-[#BCD9D6]">Observational Documentation</span>
                  </div>
                </div>

                {/* Action Links Bar */}
                <div className="pt-5 border-t border-[#E5E2D8] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      to={stage.primaryAction.path}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#1A635E] hover:bg-[#14514D] active:scale-[0.98] rounded transition-all focus-visible:ring-2 focus-visible:ring-[#1A635E]"
                    >
                      <span>{stage.primaryAction.label}</span>
                      <ArrowRight size={14} />
                    </Link>

                    {stage.secondaryAction && (
                      <Link
                        to={stage.secondaryAction.path}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-[#222528] bg-[#F4F2EC] hover:bg-[#EAE8E0] border border-[#E5E2D8] rounded transition-colors"
                      >
                        <span>{stage.secondaryAction.label}</span>
                        <ArrowRight size={12} className="text-[#8E9499]" />
                      </Link>
                    )}
                  </div>

                  {stage.tertiaryAction && (
                    <Link
                      to={stage.tertiaryAction.path}
                      className="text-xs text-[#1A635E] font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>{stage.tertiaryAction.label}</span>
                      <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Section End Transition: Subtle Bridge toward The People */}
        <div className="mt-16 sm:mt-24 pt-10 border-t border-[#E5E2D8] text-center max-w-xl mx-auto">
          <p className="font-display text-xl sm:text-2xl font-medium text-[#5E666D] italic descender-clear">
            Behind every coordinated journey is a team.
          </p>
        </div>
      </div>
    </section>
  );
}
