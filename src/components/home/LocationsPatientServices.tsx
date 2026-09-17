import { useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { patientServices, type PatientService } from '@/data/patientServices';
import { hospitalContent } from '@/data/hospitalContent';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { gsap } from '@/lib/gsap';
import { 
  MapPin, 
  Car, 
  Bus, 
  FirstAid, 
  Phone, 
  ArrowRight, 
  CaretRight, 
  Clock, 
  Compass
} from '@phosphor-icons/react';

interface ServiceGroup {
  groupTitle: string;
  groupDescription: string;
  services: {
    service: PatientService;
    indexNumber: string;
    route: string;
    actionLabel: string;
  }[];
}

export function LocationsPatientServices() {
  const sectionRef = useRef<HTMLElement>(null);
  const locationBlockRef = useRef<HTMLDivElement>(null);
  const directoryRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  // Map service routes to verified existing application routes
  const getServiceRoute = (slug: string): { route: string; label: string } => {
    switch (slug) {
      case 'appointment':
        return { route: '/appointment', label: 'Schedule Consultation' };
      case 'insurance-billing':
        return { route: '/insurance-billing', label: 'Insurance Desk' };
      case 'international-patients':
        return { route: '/international-patients', label: 'Overseas Liaison' };
      case 'diagnostic-services':
        return { route: '/departments', label: 'Explore Diagnostics' };
      case 'ambulance-emergency':
        return { route: '/locations', label: 'Gate 1 Emergency Access' };
      case 'health-checkups':
        return { route: '/patients', label: 'Screening Packages' };
      case 'patient-visitor-information':
        return { route: '/patients', label: 'Visiting Guidelines' };
      case 'pharmacy':
        return { route: '/patients', label: 'Pharmacy Guidance' };
      case 'patient-feedback':
        return { route: '/patients', label: 'Patient Advocacy' };
      default:
        return { route: '/patients', label: 'View Service' };
    }
  };

  // Structured editorial groupings matching patient care phases
  const serviceGroups: ServiceGroup[] = useMemo(() => {
    // 01. Before Your Visit: appointments, insurance, checkups
    const beforeVisitIds = ['appointments', 'insurance-billing', 'health-checkups'];
    const duringVisitIds = ['patient-visitor-info', 'pharmacy', 'diagnostic-services'];
    const beyondVisitIds = ['international-patients', 'ambulance-emergency', 'patient-feedback'];

    const mapServices = (ids: string[], startIndex: number) => {
      return ids
        .map((id, offset) => {
          const s = patientServices.find((item) => item.id === id);
          if (!s) return null;
          const { route, label } = getServiceRoute(s.slug);
          const indexNum = String(startIndex + offset).padStart(2, '0');
          return {
            service: s,
            indexNumber: indexNum,
            route,
            actionLabel: label
          };
        })
        .filter(Boolean) as ServiceGroup['services'];
    };

    return [
      {
        groupTitle: 'Before Your Visit',
        groupDescription: 'Consultation scheduling, cashless insurance coordination, and preventive screenings.',
        services: mapServices(beforeVisitIds, 1)
      },
      {
        groupTitle: 'During Your Visit',
        groupDescription: 'Visiting hours, automated pathology and imaging, and 24 / 7 pharmacy dispensing.',
        services: mapServices(duringVisitIds, 4)
      },
      {
        groupTitle: 'Support, Transit & Advocacy',
        groupDescription: 'Overseas patient care, critical emergency transit, and dedicated quality feedback.',
        services: mapServices(beyondVisitIds, 7)
      }
    ];
  }, []);

  useEffect(() => {
    if (prefersReduced || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Header reveal
      gsap.from('.loc-header', {
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

      // Location features reveal
      if (locationBlockRef.current) {
        gsap.from('.loc-block-item', {
          opacity: 0,
          y: 24,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: locationBlockRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        });
      }

      // Directory rows staggered reveal
      if (directoryRef.current) {
        gsap.from('.service-index-row', {
          opacity: 0,
          y: 16,
          duration: 0.6,
          stagger: 0.04,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: directoryRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        });
      }

      // Contact utility reveal
      if (contactRef.current) {
        gsap.from(contactRef.current, {
          opacity: 0,
          y: 20,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: contactRef.current,
            start: 'top 90%',
            toggleActions: 'play none none none'
          }
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [prefersReduced]);

  return (
    <section
      id="locations-services"
      ref={sectionRef}
      className="py-16 sm:py-20 lg:py-28 bg-[#FAF9F6] border-b border-[#E5E2D8]"
      aria-labelledby="locations-services-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ==================================================
            01. SECTION HEADER
            ================================================== */}
        <div className="loc-header max-w-3xl mb-14 lg:mb-20">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#1A635E]" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#1A635E]">
              LOCATIONS + PATIENT SERVICES
            </span>
          </div>

          <h2
            id="locations-services-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#111315] tracking-tight leading-[1.1] mb-4 descender-clear"
          >
            Everything around your care, clearly organised.
          </h2>

          <p className="text-base sm:text-lg text-[#3C4247] leading-relaxed mb-2">
            From your physical arrival in Lower Parel to registration, diagnostic testing, insurance coverage, and overseas patient support, Meridian provides a structured utility infrastructure so patients and families can focus entirely on clinical healing.
          </p>

          <span className="text-xs font-medium text-[#1A635E] uppercase tracking-wider">
            Patient Perspective: Campus access architecture and patient care directory
          </span>
        </div>

        {/* ==================================================
            02. PART A: LOCATION & ARRIVAL FEATURE
            ================================================== */}
        <div ref={locationBlockRef} className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left: Institutional Campus Details & Gate Access */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              
              {/* Campus Address & Coordinates Card */}
              <div className="loc-block-item p-6 sm:p-8 bg-[#F4F2EC] border border-[#E5E2D8] rounded-md shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#E5E2D8]">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#EDF5F4] text-[#1A635E] text-xs font-semibold uppercase tracking-wider">
                      Main Hospital Campus
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#5E666D] font-mono">
                    <Compass size={14} className="text-[#1A635E]" aria-hidden="true" />
                    <span>
                      {hospitalContent.location.coordinates.latitude}&deg; N, {hospitalContent.location.coordinates.longitude}&deg; E
                    </span>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-[#3C4247]">
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-white border border-[#E5E2D8] flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin size={18} className="text-[#1A635E]" aria-hidden="true" />
                    </div>
                    <div>
                      <strong className="block text-base font-semibold text-[#111315]">
                        {hospitalContent.name}
                      </strong>
                      <span className="block text-[#3C4247] mt-0.5">
                        {hospitalContent.location.address}, {hospitalContent.location.city}, {hospitalContent.location.state}, {hospitalContent.location.country}
                      </span>
                      <span className="inline-block text-xs text-[#5E666D] mt-1 bg-white px-2 py-0.5 rounded border border-[#E5E2D8]">
                        Landmark: {hospitalContent.location.landmark}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Practical Arrival Infrastructure Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-[#E5E2D8]">
                  <div className="flex items-start gap-3">
                    <Car size={18} className="text-[#1A635E] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-[#111315]">
                        Parking Access (Gate 2)
                      </span>
                      <p className="text-xs text-[#5E666D] mt-0.5 leading-relaxed">
                        Multi-level underground parking accessed via Gate 2. Valet assistance available at Main Atrium Portico.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Bus size={18} className="text-[#1A635E] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-[#111315]">
                        Transit Connections
                      </span>
                      <p className="text-xs text-[#5E666D] mt-0.5 leading-relaxed">
                        5-minute walking distance from Lower Parel railway station and Mumbai monorail connections.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation Actions */}
                <div className="flex flex-wrap items-center gap-3 mt-8 pt-6 border-t border-[#E5E2D8]">
                  <Link
                    to="/locations"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-xs font-semibold uppercase tracking-wider bg-[#1A635E] text-white hover:bg-[#14514D] transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#1A635E] focus:ring-offset-2"
                  >
                    <span>View Campus Access & Coordinates</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                  <Link
                    to="/patients"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded text-xs font-semibold uppercase tracking-wider bg-white text-[#222528] border border-[#E5E2D8] hover:bg-[#F4F2EC] transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#1A635E]"
                  >
                    <span>Visitor & Admission Guidelines</span>
                    <CaretRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* Dedicated Emergency Bay Callout */}
              <div className="loc-block-item p-5 bg-[#FDF2F2] border border-[#F1C5C5] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-white border border-[#F1C5C5] flex items-center justify-center shrink-0 mt-0.5">
                    <FirstAid size={18} weight="fill" className="text-[#9E2A2B]" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#9E2A2B]">
                        Emergency & Critical Access (Gate 1)
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-white text-[#9E2A2B] border border-[#F1C5C5]">
                        {hospitalContent.emergency.availability}
                      </span>
                    </div>
                    <p className="text-xs text-[#5E666D] mt-0.5">
                      {hospitalContent.emergency.deskNote}. Ramp access direct to resuscitation and trauma triage bays.
                    </p>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="block text-[11px] text-[#5E666D]">Emergency Hotline</span>
                  <a
                    href="tel:+91XXXXXXXXXX"
                    className="inline-block font-mono font-bold text-sm text-[#9E2A2B] hover:underline focus:outline-hidden focus:ring-2 focus:ring-[#9E2A2B]"
                    aria-label="Call Emergency Hotline at +91 XXX XXX XXXX"
                  >
                    {hospitalContent.emergency.phone}
                  </a>
                </div>
              </div>
            </div>

            {/* Right: Architectural Arrival Portico Visual */}
            <div className="lg:col-span-5 loc-block-item">
              <div className="h-full bg-[#F4F2EC] border border-[#E5E2D8] rounded-md overflow-hidden flex flex-col justify-between">
                <div className="relative aspect-4/3 lg:aspect-auto lg:h-72 w-full overflow-hidden bg-[#E5E2D8]">
                  <img
                    src="/images/meridian-arrive.jpg"
                    alt="Meridian Hospital main arrival atrium portico and patient registration desk in Lower Parel, Mumbai"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="block text-xs font-mono uppercase tracking-wider text-white/90">
                      Lower Parel Campus
                    </span>
                    <span className="block font-display text-lg font-semibold text-white">
                      Main Atrium Portico & Patient Welcome Desk
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-4 text-xs text-[#3C4247] flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E5E2D8]">
                      <span className="font-semibold text-[#111315]">Hospital Facilities</span>
                      <span className="text-[#5E666D]">320 Beds, 42 Clinical Specialties</span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-[#E5E2D8]">
                      <span className="font-semibold text-[#111315]">Central Scheduling</span>
                      <span className="text-[#5E666D]">{hospitalContent.appointments.deskHours}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#111315]">Quality Standard</span>
                      <span className="text-[#1A635E] font-medium">{hospitalContent.qualityFramework.standardsAlignment}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E5E2D8] flex items-center justify-between text-[#5E666D]">
                    <span className="italic">
                      Need on-campus wayfinding? Outpatient navigators are stationed at every atrium gate.
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ==================================================
            03. PART B: EDITORIAL PATIENT SERVICES DIRECTORY
            ================================================== */}
        <div ref={directoryRef} className="mb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-[#E5E2D8] gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#1A635E] block mb-1">
                PATIENT SERVICES INDEX
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#111315]">
                Clinical, administrative and support pathways.
              </h3>
            </div>
            <p className="text-xs text-[#5E666D] max-w-md">
              Every service is structured to answer practical questions before, during, and beyond hospital admission.
            </p>
          </div>

          {/* Grouped Editorial Rows (NOT identical cards) */}
          <div className="space-y-12">
            {serviceGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-3">
                {/* Group Label */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#111315]/15 gap-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#111315]">
                    {group.groupTitle}
                  </h4>
                  <span className="text-xs text-[#5E666D]">
                    {group.groupDescription}
                  </span>
                </div>

                {/* Service Rows */}
                <div className="divide-y divide-[#E5E2D8] border-b border-[#E5E2D8]">
                  {group.services.map(({ service, indexNumber, route, actionLabel }) => {
                    const isEmergency = service.category === 'emergency';
                    return (
                      <div
                        key={service.id}
                        className={`service-index-row group py-5 px-3 sm:px-4 -mx-3 sm:-mx-4 rounded transition-colors duration-200 ${
                          isEmergency ? 'hover:bg-[#FDF2F2]/60' : 'hover:bg-[#F4F2EC]'
                        }`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                          
                          {/* Index & Category */}
                          <div className="md:col-span-2 flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-[#8E9499] group-hover:text-[#1A635E] transition-colors">
                              {indexNumber}
                            </span>
                            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${
                              isEmergency 
                                ? 'bg-[#FDF2F2] text-[#9E2A2B] border-[#F1C5C5]' 
                                : 'bg-[#F4F2EC] text-[#5E666D] border-[#E5E2D8]'
                            }`}>
                              {service.category}
                            </span>
                          </div>

                          {/* Service Name & Location */}
                          <div className="md:col-span-4">
                            <h5 className="font-display text-xl font-semibold text-[#111315] group-hover:text-[#1A635E] transition-colors">
                              {service.name}
                            </h5>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-[#5E666D]">
                              <span>{service.location}</span>
                              <span className="text-[#8E9499]">&bull;</span>
                              <span>{service.hours}</span>
                            </div>
                          </div>

                          {/* Concise Summary */}
                          <div className="md:col-span-4">
                            <p className="text-xs text-[#3C4247] leading-relaxed">
                              {service.summary}
                            </p>
                          </div>

                          {/* Action Affordance */}
                          <div className="md:col-span-2 flex justify-start md:justify-end">
                            <Link
                              to={route}
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider py-1.5 px-3 rounded border transition-all duration-200 focus:outline-hidden focus:ring-2 ${
                                isEmergency
                                  ? 'text-[#9E2A2B] border-[#F1C5C5] bg-white group-hover:bg-[#9E2A2B] group-hover:text-white focus:ring-[#9E2A2B]'
                                  : 'text-[#1A635E] border-[#BCD9D6] bg-white group-hover:bg-[#1A635E] group-hover:text-white focus:ring-[#1A635E]'
                              }`}
                              aria-label={`Explore ${service.name}: ${actionLabel}`}
                            >
                              <span>{actionLabel}</span>
                              <ArrowRight 
                                size={12} 
                                className="group-hover:translate-x-0.5 transition-transform duration-200" 
                                aria-hidden="true" 
                              />
                            </Link>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ==================================================
            04. PART C: PHONE-FIRST ASSISTANCE & CONTACT UTILITY
            ================================================== */}
        <div
          ref={contactRef}
          className="p-6 sm:p-8 lg:p-10 bg-[#F4F2EC] border border-[#E5E2D8] rounded-md"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#1A635E] block">
                PHONE-FIRST ACCESS
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#111315]">
                Need help deciding where to start? Speak with Meridian.
              </h3>
              <p className="text-sm text-[#3C4247] leading-relaxed max-w-2xl">
                Not every patient journey begins online. Our outpatient scheduling desk assists with physician recommendations, tele-consultation coordination, and admission guidelines.
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-[#5E666D]">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-[#1A635E]" aria-hidden="true" />
                  <span>Central Scheduling: {hospitalContent.appointments.deskHours}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FirstAid size={14} className="text-[#9E2A2B]" aria-hidden="true" />
                  <span>Emergency: 24 / 7 triage at Gate 1</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col sm:items-center lg:items-end gap-3 justify-end">
              <a
                href="tel:+91XXXXXXXXXX"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded text-xs font-semibold uppercase tracking-wider bg-[#1A635E] text-white hover:bg-[#14514D] transition-colors shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#1A635E] focus:ring-offset-2"
                aria-label="Call Central Scheduling Desk at +91 XXX XXX XXXX"
              >
                <Phone size={16} weight="fill" aria-hidden="true" />
                <span>Call Central Scheduling ({hospitalContent.appointments.deskPhone})</span>
              </a>

              <Link
                to="/find-care"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded text-xs font-semibold uppercase tracking-wider bg-white text-[#222528] border border-[#E5E2D8] hover:bg-[#FAF9F6] transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#1A635E]"
              >
                <span>Find Your Care Pathway</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
