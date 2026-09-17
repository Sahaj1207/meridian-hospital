import { PageShell } from '@/components/shared/PageShell';
import { patientServices } from '@/data/patientServices';
import { CaretRight } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export function PatientsPage() {
  return (
    <PageShell
      title="Patient Services & Visitor Care"
      category="Patients"
      description="Essential clinical, administrative, and support services designed to make patient navigation straightforward and stress-free."
      statusText="9 Patient Services Mapped"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {patientServices.map((service) => (
          <div 
            key={service.id}
            className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#F4F2EC] text-[#5E666D]">
                  {service.category}
                </span>
                <span className="text-xs text-[#8E9499]">{service.hours}</span>
              </div>

              <h2 className="font-display text-xl font-semibold text-[#111315] mb-2">
                {service.name}
              </h2>

              <p className="text-sm text-[#5E666D] mb-4 leading-relaxed">
                {service.summary}
              </p>

              <div className="mb-4">
                <span className="text-xs uppercase tracking-wider text-[#8E9499] block mb-1.5 font-medium">
                  Service Highlights
                </span>
                <ul className="space-y-1.5 text-xs text-[#3C4247]">
                  {service.keyDetails.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[#1A635E] mt-1.5 shrink-0"></span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E5E2D8] text-xs text-[#8E9499] flex items-center justify-between">
              <span>{service.location}</span>
              {service.slug === 'appointment' ? (
                <Link to="/appointment" className="text-[#1A635E] font-medium hover:underline inline-flex items-center gap-1">
                  <span>Schedule</span>
                  <CaretRight size={12} />
                </Link>
              ) : service.slug === 'insurance-billing' ? (
                <Link to="/insurance-billing" className="text-[#1A635E] font-medium hover:underline inline-flex items-center gap-1">
                  <span>Billing Info</span>
                  <CaretRight size={12} />
                </Link>
              ) : service.slug === 'international-patients' ? (
                <Link to="/international-patients" className="text-[#1A635E] font-medium hover:underline inline-flex items-center gap-1">
                  <span>Overseas Desk</span>
                  <CaretRight size={12} />
                </Link>
              ) : (
                <span className="text-[#5E666D]">{service.contactAffordance}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
