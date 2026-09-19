import { PageShell } from '@/components/shared/PageShell';
import { patientServices } from '@/data/patientServices';
import { hospitalContent } from '@/data/hospitalContent';
import {
  CaretRight,
  FirstAid,
  Stethoscope,
  Files,
  Info,
  Clock,
  MapPin,
  Phone
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export function PatientsPage() {
  const emergencyServices = patientServices.filter((s) => s.category === 'emergency');
  const clinicalServices = patientServices.filter((s) => s.category === 'clinical' || s.id === 'pharmacy');
  const adminServices = patientServices.filter((s) => s.category === 'administrative');
  const visitorServices = patientServices.filter((s) => s.category === 'support' && s.id !== 'pharmacy');

  const renderServiceCard = (service: typeof patientServices[0], isEmergency = false) => (
    <div
      key={service.id}
      className={`p-6 rounded-md flex flex-col justify-between transition-all ${
        isEmergency
          ? 'bg-[#FDF2F2] border border-[#F1C5C5] shadow-sm'
          : 'bg-[#FAF9F6] border border-[#E5E2D8] hover:border-[#1A635E] hover:shadow-sm'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded ${
            isEmergency
              ? 'bg-[#FCE8E8] text-[#9E2A2B] border border-[#F5C2C7]'
              : 'bg-[#F4F2EC] text-[#5E666D]'
          }`}>
            {service.category.toUpperCase()}
          </span>
          <span className="text-xs text-[#8E9499] flex items-center gap-1 font-mono">
            <Clock size={12} />
            <span>{service.hours}</span>
          </span>
        </div>

        <h3 className={`font-display text-xl font-semibold mb-2 ${
          isEmergency ? 'text-[#9E2A2B]' : 'text-[#111315]'
        }`}>
          {service.name}
        </h3>

        <p className="text-xs sm:text-sm text-[#5E666D] mb-4 leading-relaxed">
          {service.summary}
        </p>

        <div className="mb-4">
          <span className="text-xs uppercase tracking-wider text-[#8E9499] block mb-1.5 font-semibold">
            Service Highlights
          </span>
          <ul className="space-y-1.5 text-xs text-[#3C4247]">
            {service.keyDetails.map((detail, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  isEmergency ? 'bg-[#9E2A2B]' : 'bg-[#1A635E]'
                }`} aria-hidden="true" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-[#ECE9E0] text-xs flex items-center justify-between gap-2">
        <span className="text-[#8E9499] flex items-center gap-1">
          <MapPin size={12} className={isEmergency ? 'text-[#9E2A2B]' : 'text-[#1A635E]'} />
          <span>{service.location}</span>
        </span>
        {service.slug === 'appointment' ? (
          <Link
            to="/appointment"
            className="text-[#1A635E] font-semibold hover:text-[#14514D] inline-flex items-center gap-1 min-h-[36px]"
          >
            <span>Book Visit</span>
            <CaretRight size={14} weight="bold" />
          </Link>
        ) : service.slug === 'insurance-billing' ? (
          <Link
            to="/insurance-billing"
            className="text-[#1A635E] font-semibold hover:text-[#14514D] inline-flex items-center gap-1 min-h-[36px]"
          >
            <span>Billing Info</span>
            <CaretRight size={14} weight="bold" />
          </Link>
        ) : service.slug === 'international-patients' ? (
          <Link
            to="/international-patients"
            className="text-[#1A635E] font-semibold hover:text-[#14514D] inline-flex items-center gap-1 min-h-[36px]"
          >
            <span>Overseas Desk</span>
            <CaretRight size={14} weight="bold" />
          </Link>
        ) : isEmergency ? (
          <a
            href={`tel:${hospitalContent.emergency.phone}`}
            className="font-semibold text-[#9E2A2B] hover:underline inline-flex items-center gap-1 min-h-[36px]"
          >
            <Phone size={12} weight="fill" />
            <span>Emergency Line</span>
          </a>
        ) : (
          <span className="text-[#5E666D] font-mono">{service.contactAffordance}</span>
        )}
      </div>
    </div>
  );

  return (
    <PageShell
      title="Patient Services & Visitor Care"
      category="Patients"
      description="Essential clinical, administrative, and support services designed to make patient navigation straightforward and stress-free."
      statusText="9 Patient Care Services Mapped"
    >
      <div className="space-y-12 max-w-7xl mx-auto">
        {/* Section 1: Urgent & Critical Services */}
        {emergencyServices.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#F1C5C5]">
              <FirstAid size={20} className="text-[#9E2A2B]" weight="fill" />
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#9E2A2B]">
                Urgent & Critical Emergency Services (24/7)
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {emergencyServices.map((s) => renderServiceCard(s, true))}
            </div>
          </div>
        )}

        {/* Section 2: Clinical & Diagnostic Care */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E5E2D8]">
            <Stethoscope size={20} className="text-[#1A635E]" />
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#111315]">
              Clinical Care, Screening & Diagnostics
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clinicalServices.map((s) => renderServiceCard(s))}
          </div>
        </div>

        {/* Section 3: Administrative & Financial Guidance */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E5E2D8]">
            <Files size={20} className="text-[#1A635E]" />
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#111315]">
              Administrative, Billing & Support Services
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminServices.map((s) => renderServiceCard(s))}
          </div>
        </div>

        {/* Section 4: Visitor & Campus Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E5E2D8]">
            <Info size={20} className="text-[#1A635E]" />
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#111315]">
              Visitor Information & Campus Guidelines
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visitorServices.map((s) => renderServiceCard(s))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
