import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { hospitalContent } from '@/data/hospitalContent';
import {
  Phone,
  MapPin,
  List,
  X,
  CalendarCheck,
  FirstAid,
  House
} from '@phosphor-icons/react';

interface NavItem {
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Find Care', path: '/find-care' },
  { label: 'Departments', path: '/departments' },
  { label: 'Specialists', path: '/specialists' },
  { label: 'Patients', path: '/patients' },
  { label: 'About', path: '/about' },
  { label: 'Journal', path: '/journal' },
  { label: 'Locations', path: '/locations' }
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FAF9F6] border-b border-[#E5E2D8]">
      {/* Top institutional utility bar: emergency, location, and operational badge */}
      <div className="bg-[#F4F2EC] border-b border-[#EAE8E0] text-[13px] text-[#5E666D] py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-[#1A635E]" weight="bold" aria-hidden="true" />
              <span>{hospitalContent.location.city}, {hospitalContent.location.country}</span>
            </span>
            <span className="hidden sm:inline-block text-[#D9D5CA]" aria-hidden="true">|</span>
            <span className="hidden sm:inline-block">
              {hospitalContent.scale.beds} Beds / {hospitalContent.scale.specialties} Specialties
            </span>
          </div>

          {/* Emergency Action Slot */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[#9E2A2B] font-medium">
              <FirstAid size={14} weight="fill" aria-hidden="true" />
              <span className="text-[12px] uppercase tracking-wider">Emergency 24/7:</span>
              <a
                href={`tel:${hospitalContent.emergency.phone}`}
                className="hover:underline font-semibold"
                aria-label={`Call Emergency Care at ${hospitalContent.emergency.phone}`}
              >
                {hospitalContent.emergency.phone}
              </a>
            </span>
          </div>
        </div>
      </div>

      {/* Primary header bar: 70px desktop height, single-line navigation */}
      <div className="max-w-7xl mx-auto h-[70px] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <Link
          to="/"
          className="flex flex-col focus-visible:ring-2 focus-visible:ring-[#1A635E] rounded-sm py-1"
          aria-label={`${hospitalContent.name} Home`}
        >
          <span className="font-display text-2xl font-semibold tracking-tight text-[#111315]">
            {hospitalContent.name}
          </span>
          <span className="text-[11px] font-sans text-[#5E666D] tracking-widest uppercase -mt-0.5">
            {hospitalContent.tagline}
          </span>
        </Link>

        {/* Desktop semantic navigation */}
        <nav
          className="hidden lg:flex items-center gap-7 text-[14.5px] font-medium text-[#3C4247]"
          aria-label="Primary Navigation"
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `transition-colors hover:text-[#1A635E] py-1 border-b-2 flex items-center justify-center ${
                isActive
                  ? 'text-[#1A635E] border-[#1A635E] font-semibold'
                  : 'border-transparent text-[#3C4247]'
              }`
            }
            aria-label="Home"
            title="Home"
          >
            <House size={18} weight="bold" aria-hidden="true" />
            <span className="sr-only">Home</span>
          </NavLink>

          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `transition-colors hover:text-[#1A635E] py-1 border-b-2 ${
                  isActive
                    ? 'text-[#1A635E] border-[#1A635E] font-semibold'
                    : 'border-transparent'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Action affordance slots: Appointment & Mobile menu button */}
        <div className="flex items-center gap-3">
          <Link
            to="/appointment"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-white bg-[#1A635E] hover:bg-[#14514D] active:scale-[0.98] rounded transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1A635E]"
            aria-label="Schedule an Appointment"
          >
            <CalendarCheck size={16} weight="bold" aria-hidden="true" />
            <span>Book Appointment</span>
          </Link>

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden inline-flex items-center justify-center p-2 rounded text-[#3C4247] hover:bg-[#F4F2EC] focus-visible:ring-2 focus-visible:ring-[#1A635E]"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          >
            {mobileMenuOpen ? <X size={24} /> : <List size={24} />}
          </button>
        </div>
      </div>

      {/* Accessible mobile drawer architecture */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          className="lg:hidden fixed inset-0 top-[102px] z-50 bg-[#FAF9F6] border-t border-[#E5E2D8] flex flex-col justify-between p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
        >
          <div className="space-y-4">
            <p className="text-[11px] font-medium text-[#8E9499] uppercase tracking-wider">
              Navigation
            </p>
            <nav className="flex flex-col space-y-3" aria-label="Mobile Navigation Links">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-[#222528] hover:text-[#1A635E] py-2 border-b border-[#F4F2EC] flex items-center justify-between"
              >
                <span className="flex items-center gap-2.5">
                  <House size={20} className="text-[#1A635E]" weight="bold" aria-hidden="true" />
                  <span>Home</span>
                </span>
                <span className="text-[#8E9499] text-sm">&rarr;</span>
              </Link>
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg font-medium text-[#222528] hover:text-[#1A635E] py-2 border-b border-[#F4F2EC] flex items-center justify-between min-h-[44px]"
                >
                  <span>{item.label}</span>
                  <span className="text-[#8E9499] text-sm">&rarr;</span>
                </Link>
              ))}
              <Link
                to="/international-patients"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-[#222528] hover:text-[#1A635E] py-2 border-b border-[#F4F2EC] flex items-center justify-between"
              >
                <span>International Patients</span>
                <span className="text-[#8E9499] text-sm">&rarr;</span>
              </Link>
              <Link
                to="/insurance-billing"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-[#222528] hover:text-[#1A635E] py-2 border-b border-[#F4F2EC] flex items-center justify-between"
              >
                <span>Insurance & Billing</span>
                <span className="text-[#8E9499] text-sm">&rarr;</span>
              </Link>
            </nav>
          </div>

          <div className="pt-6 border-t border-[#E5E2D8] space-y-3">
            <Link
              to="/appointment"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 text-center font-medium text-white bg-[#1A635E] rounded text-base"
            >
              <CalendarCheck size={18} weight="bold" />
              <span>Book Appointment</span>
            </Link>

            <a
              href={`tel:${hospitalContent.emergency.phone}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-center font-medium text-[#9E2A2B] bg-[#FDF2F2] border border-[#F1C5C5] rounded text-sm"
            >
              <Phone size={16} weight="fill" />
              <span>Emergency Hotline: {hospitalContent.emergency.phone}</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
