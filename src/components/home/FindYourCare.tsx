import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { gsap } from '@/lib/gsap';
import { 
  type Icon,
  MagnifyingGlass, 
  ArrowUpRight, 
  UserCheck, 
  Buildings, 
  Stethoscope, 
  CalendarPlus,
  Heart,
  Brain,
  Bone,
  FirstAid
} from '@phosphor-icons/react';

interface DiscoveryPathway {
  id: string;
  title: string;
  description: string;
  path: string;
  badge: string;
  icon: Icon;
}

const DISCOVERY_PATHWAYS: DiscoveryPathway[] = [
  {
    id: 'specialists',
    title: 'Find a Specialist',
    description: 'Explore doctors by specialty, expertise, or clinical need.',
    path: '/specialists',
    badge: '210+ Consultants',
    icon: UserCheck
  },
  {
    id: 'departments',
    title: 'Explore Departments',
    description: "Browse Meridian's clinical departments and services.",
    path: '/departments',
    badge: '42 Specialties',
    icon: Buildings
  },
  {
    id: 'treatments',
    title: 'Find a Treatment',
    description: 'Explore care pathways and treatment areas.',
    path: '/find-care',
    badge: 'Care Pathways',
    icon: Stethoscope
  },
  {
    id: 'appointment',
    title: 'Book an Appointment',
    description: 'Choose a specialist and request a consultation.',
    path: '/appointment',
    badge: 'Outpatient Care',
    icon: CalendarPlus
  }
];

const COMMON_DISCIPLINES = [
  { name: 'Cardiology', path: '/departments', icon: Heart },
  { name: 'Oncology', path: '/departments', icon: Stethoscope },
  { name: 'Neurosciences', path: '/departments', icon: Brain },
  { name: 'Orthopaedics', path: '/departments', icon: Bone },
  { name: 'Emergency & Critical Care', path: '/departments', icon: FirstAid }
];

export function FindYourCare() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const pathwaysRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.find-care-header', {
        opacity: 0,
        y: 16,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      });

      gsap.from('.find-care-pathway', {
        opacity: 0,
        y: 16,
        duration: 0.6,
        stagger: 0.06,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 72%',
          toggleActions: 'play none none none'
        }
      });

      gsap.from('.find-care-frequent', {
        opacity: 0,
        y: 12,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 65%',
          toggleActions: 'play none none none'
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [prefersReduced]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/find-care?query=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/find-care');
    }
  };

  return (
    <section
      id="find-your-care"
      ref={sectionRef}
      className="py-14 sm:py-16 lg:py-20 bg-[#F4F2EC] border-b border-[#E5E2D8]"
      aria-labelledby="find-care-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="find-care-header max-w-2xl mb-8 sm:mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#1A635E]" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#1A635E]">
              FIND YOUR CARE
            </span>
          </div>

          <h2
            id="find-care-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#111315] tracking-tight mb-3 descender-clear"
          >
            Start with what you need.
          </h2>

          <p className="text-base sm:text-lg text-[#3C4247] leading-relaxed">
            Find the right specialist, department, treatment, or appointment pathway.
          </p>
        </div>

        {/* Future-Ready Search Exploration Bar */}
        <div className="find-care-header mb-6 sm:mb-8">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex flex-col sm:flex-row items-stretch gap-2 bg-[#FAF9F6] p-2 rounded-md border border-[#E5E2D8] shadow-xs focus-within:border-[#1A635E] transition-colors"
          >
            <div className="relative flex-1 flex items-center">
              <MagnifyingGlass
                size={20}
                className="absolute left-3.5 text-[#8E9499] pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by condition, specialist name, or clinical department..."
                className="w-full pl-11 pr-4 py-3 text-sm bg-transparent text-[#111315] placeholder:text-[#8E9499] focus:outline-hidden"
                aria-label="Search healthcare directory"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#1A635E] hover:bg-[#14514D] active:scale-[0.98] rounded transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-[#1A635E]"
            >
              <span>Search Directory</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          </form>
          <div className="mt-2.5 flex items-center justify-between text-xs text-[#5E666D] px-1">
            <span>Direct pathway search across Mumbai faculty and outpatient clinics</span>
            <Link to="/find-care" className="text-[#1A635E] hover:underline font-medium">
              Advanced directory index
            </Link>
          </div>
        </div>

        {/* Four Primary Discovery Pathways: Service Directory Format */}
        <div
          ref={pathwaysRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8"
          role="list"
          aria-label="Care Discovery Pathways"
        >
          {DISCOVERY_PATHWAYS.map((pathway) => {
            const Icon = pathway.icon;
            return (
              <Link
                key={pathway.id}
                to={pathway.path}
                className="find-care-pathway group relative bg-[#FAF9F6] border border-[#E5E2D8] hover:border-[#1A635E] rounded-md p-5 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#1A635E] flex flex-col justify-between"
                role="listitem"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className="w-9 h-9 rounded bg-[#EDF5F4] text-[#1A635E] flex items-center justify-center">
                      <Icon size={20} weight="bold" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5E666D] bg-[#F4F2EC] px-2 py-0.5 rounded">
                      {pathway.badge}
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-semibold text-[#111315] group-hover:text-[#1A635E] transition-colors mb-1.5 flex items-center justify-between">
                    <span>{pathway.title}</span>
                    <ArrowUpRight
                      size={18}
                      className="text-[#8E9499] group-hover:text-[#1A635E] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0"
                      aria-hidden="true"
                    />
                  </h3>

                  <p className="text-xs text-[#5E666D] leading-relaxed mb-3">
                    {pathway.description}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-[#E5E2D8] text-xs font-semibold text-[#1A635E] flex items-center gap-1">
                  <span>Open pathway</span>
                  <span aria-hidden="true">&rarr;</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Triage Quick Links: Immediate Access to High-Demand Clinical Specialties */}
        <div className="find-care-frequent p-4 sm:p-5 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5E666D] shrink-0">
            Frequent Clinical Pathways:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {COMMON_DISCIPLINES.map((discipline) => {
              const DisIcon = discipline.icon;
              return (
                <Link
                  key={discipline.name}
                  to={discipline.path}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3C4247] bg-[#F4F2EC] hover:bg-[#EDF5F4] hover:text-[#1A635E] border border-[#E5E2D8] rounded transition-colors"
                >
                  <DisIcon size={14} className="text-[#1A635E]" />
                  <span>{discipline.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
