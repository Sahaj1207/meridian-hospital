import { Link } from 'react-router-dom';
import { hospitalContent } from '@/data/hospitalContent';
import { MapPin, Clock, ShieldCheck } from '@phosphor-icons/react';

export function Footer() {
  return (
    <footer className="bg-[#111315] text-[#D9D5CA] border-t border-[#222528] pt-14 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main institutional footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#222528]">
          {/* Column 1: Hospital Overview */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <span className="font-display text-2xl font-semibold tracking-tight text-[#FAF9F6] block">
                {hospitalContent.name}
              </span>
              <span className="text-xs uppercase tracking-widest text-[#8E9499] block mt-1">
                {hospitalContent.tagline}
              </span>
            </div>

            <p className="text-sm text-[#8E9499] max-w-md leading-relaxed">
              {hospitalContent.institutionType} based in {hospitalContent.location.city}. Providing 24/7 emergency response, intensive care, and multi-specialty clinical programs.
            </p>

            {/* Quality positioning */}
            <div className="pt-2 flex items-start gap-2.5 text-xs text-[#BCD9D6]">
              <ShieldCheck size={18} className="text-[#1A635E] shrink-0 mt-0.5" weight="bold" />
              <span>{hospitalContent.qualityFramework.title}: {hospitalContent.qualityFramework.standardsAlignment}.</span>
            </div>
          </div>

          {/* Column 2: Clinical Care */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#FAF9F6]">
              Clinical Care
            </h3>
            <ul className="space-y-2 text-sm text-[#8E9499]">
              <li>
                <Link to="/departments" className="hover:text-white transition-colors">
                  All 42 Specialties
                </Link>
              </li>
              <li>
                <Link to="/specialists" className="hover:text-white transition-colors">
                  Consultants & Faculty
                </Link>
              </li>
              <li>
                <Link to="/find-care" className="hover:text-white transition-colors">
                  Find Your Care
                </Link>
              </li>
              <li>
                <span className="text-[#5E666D] block text-xs pt-1">Flagship Program:</span>
                <span className="text-[#D9D5CA] text-xs block">{hospitalContent.flagshipProgram.title}</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Patient Services */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#FAF9F6]">
              Patient Services
            </h3>
            <ul className="space-y-2 text-sm text-[#8E9499]">
              <li>
                <Link to="/appointment" className="hover:text-white transition-colors">
                  Book an Appointment
                </Link>
              </li>
              <li>
                <Link to="/insurance-billing" className="hover:text-white transition-colors">
                  Insurance & Cashless Desk
                </Link>
              </li>
              <li>
                <Link to="/international-patients" className="hover:text-white transition-colors">
                  International Patient Services
                </Link>
              </li>
              <li>
                <Link to="/patients" className="hover:text-white transition-colors">
                  Visitor Information & Guides
                </Link>
              </li>
              <li>
                <Link to="/journal" className="hover:text-white transition-colors">
                  Clinical Journal & News
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Emergency & Location Coordinates */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#FAF9F6]">
              Campus Coordinates
            </h3>
            <div className="space-y-2.5 text-xs text-[#8E9499]">
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
                <span>
                  {hospitalContent.location.address}, {hospitalContent.location.city}, {hospitalContent.location.state}, {hospitalContent.location.country}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#1A635E] shrink-0" />
                <span>Emergency: 24 Hours / 7 Days</span>
              </div>
              <div className="pt-2">
                <span className="block text-[11px] uppercase tracking-wider text-[#8E9499]">
                  Emergency Department
                </span>
                <a 
                  href={`tel:${hospitalContent.emergency.phone}`} 
                  className="text-sm font-semibold text-[#FAF9F6] hover:text-[#BCD9D6] transition-colors inline-block mt-0.5"
                >
                  {hospitalContent.emergency.phone}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Fictional Institution Notice & Regulatory Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#5E666D]">
          <p className="max-w-2xl leading-relaxed text-center md:text-left">
            Portfolio Showcase Notice: Meridian Hospital is a fictional healthcare concept project created for interface design demonstration. Clinical details, contact numbers, and institutional profiles are simulated.
          </p>
          <div className="flex items-center gap-6">
            <span>Mumbai, Maharashtra</span>
            <span>&copy; {new Date().getFullYear()} {hospitalContent.name}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
