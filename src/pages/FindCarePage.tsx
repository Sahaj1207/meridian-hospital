import { PageShell } from '@/components/shared/PageShell';
import { departments } from '@/data/departments';
import { MagnifyingGlass, CaretRight } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export function FindCarePage() {
  return (
    <PageShell
      title="Find Your Care"
      category="Find Care"
      description="Search clinical departments, locate sub-specialties, or identify medical specialists matching your diagnosis."
      statusText="Care Discovery Architecture"
    >
      <div className="space-y-8">
        {/* Placeholder Search Affordance */}
        <div className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md">
          <label htmlFor="care-search-input" className="block text-xs font-semibold uppercase tracking-wider text-[#5E666D] mb-2">
            Search by condition, specialty, or physician name
          </label>
          <div className="relative">
            <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E9499]" />
            <input
              id="care-search-input"
              type="text"
              readOnly
              placeholder="e.g., Cardiology, Joint Replacement, Dr. Ananya Mehta"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#E5E2D8] rounded text-[#3C4247] cursor-not-allowed"
            />
          </div>
          <span className="text-[11px] text-[#8E9499] block mt-2">
            Interactive search index and faceted filtering will be introduced in the dedicated Find Your Care phase.
          </span>
        </div>

        {/* Quick Links by Core Specialties */}
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#111315] mb-4">
            Browse Core Specialties
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.slice(0, 6).map((dept) => (
              <div
                key={dept.id}
                className="p-4 bg-[#FAF9F6] border border-[#E5E2D8] rounded flex flex-col justify-between gap-3 hover:border-[#1A635E] transition-colors"
              >
                <div>
                  <span className="text-sm font-semibold text-[#111315] block">
                    {dept.name}
                  </span>
                  <span className="text-xs text-[#5E666D] block mt-0.5">
                    {dept.clinicalFocus.length} Sub-Specialties
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#EAE8E0] text-xs">
                  <Link
                    to={`/departments`}
                    className="text-[#5E666D] hover:text-[#111315] transition-colors flex items-center gap-1"
                  >
                    <span>Overview</span>
                    <CaretRight size={12} />
                  </Link>
                  <Link
                    to={`/appointment?department=${dept.id}`}
                    className="font-medium text-[#1A635E] hover:text-[#14514D] transition-colors flex items-center gap-1"
                  >
                    <span>Book Visit</span>
                    <CaretRight size={12} weight="bold" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
