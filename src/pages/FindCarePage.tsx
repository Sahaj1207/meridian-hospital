import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '@/components/shared/PageShell';
import { departments } from '@/data/departments';
import { specialists } from '@/data/specialists';
import {
  MagnifyingGlass,
  CaretRight,
  CalendarCheck,
  User,
  Buildings,
  XCircle
} from '@phosphor-icons/react';

type FilterCategory = 'all' | 'departments' | 'specialists';

export function FindCarePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');

  const cleanQuery = searchQuery.trim().toLowerCase();

  const filteredDepartments = useMemo(() => {
    if (!cleanQuery) return departments;
    return departments.filter((d) => {
      const matchName = d.name.toLowerCase().includes(cleanQuery);
      const matchCode = d.code.toLowerCase().includes(cleanQuery);
      const matchDesc = d.shortDescription.toLowerCase().includes(cleanQuery);
      const matchFocus = d.clinicalFocus.some((f) => f.toLowerCase().includes(cleanQuery));
      return matchName || matchCode || matchDesc || matchFocus;
    });
  }, [cleanQuery]);

  const filteredSpecialists = useMemo(() => {
    if (!cleanQuery) return specialists;
    return specialists.filter((s) => {
      const matchName = s.name.toLowerCase().includes(cleanQuery);
      const matchRole = s.role.toLowerCase().includes(cleanQuery);
      const matchDept = s.departmentName.toLowerCase().includes(cleanQuery);
      const matchInterests = s.clinicalInterests.some((i) => i.toLowerCase().includes(cleanQuery));
      return matchName || matchRole || matchDept || matchInterests;
    });
  }, [cleanQuery]);

  const totalMatches =
    (activeCategory === 'all' ? filteredDepartments.length + filteredSpecialists.length : 0) +
    (activeCategory === 'departments' ? filteredDepartments.length : 0) +
    (activeCategory === 'specialists' ? filteredSpecialists.length : 0);

  const hasSearch = cleanQuery.length > 0;

  return (
    <PageShell
      title="Find Your Care"
      category="Directory & Care Discovery"
      description="Locate clinical departments, identify specialist consultants, or explore clinical care programs across Meridian Hospital."
      statusText="15 Departments & 5 Clinical Faculties Mapped"
    >
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Search & Discovery Header */}
        <div className="p-6 sm:p-8 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md space-y-4 shadow-sm">
          <div>
            <label
              htmlFor="care-search-input"
              className="block text-xs font-semibold uppercase tracking-wider text-[#5E666D] mb-1.5"
            >
              Search by clinical discipline, physician, or specialty
            </label>
            <div className="relative">
              <MagnifyingGlass
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E9499]"
                aria-hidden="true"
              />
              <input
                id="care-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. Cardiology, Dr. Mehta, Joint Replacement, Oncology..."
                className="w-full pl-10 pr-10 py-3 text-sm sm:text-base bg-white border border-[#E5E2D8] rounded text-[#111315] focus:outline-none focus:border-[#1A635E] focus:ring-1 focus:ring-[#1A635E] transition-all min-h-[44px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9499] hover:text-[#111315] p-1"
                  aria-label="Clear search query"
                >
                  <XCircle size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#ECE9E0]">
            <span className="text-xs text-[#5E666D] font-medium mr-1">Filter view:</span>
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors min-h-[32px] cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-[#1A635E] text-white'
                  : 'bg-[#F4F2EC] text-[#5E666D] hover:bg-[#EAE8E0]'
              }`}
            >
              All Results ({filteredDepartments.length + filteredSpecialists.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('departments')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors min-h-[32px] cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'departments'
                  ? 'bg-[#1A635E] text-white'
                  : 'bg-[#F4F2EC] text-[#5E666D] hover:bg-[#EAE8E0]'
              }`}
            >
              <Buildings size={14} />
              <span>Departments ({filteredDepartments.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('specialists')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors min-h-[32px] cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'specialists'
                  ? 'bg-[#1A635E] text-white'
                  : 'bg-[#F4F2EC] text-[#5E666D] hover:bg-[#EAE8E0]'
              }`}
            >
              <User size={14} />
              <span>Specialists ({filteredSpecialists.length})</span>
            </button>
          </div>
        </div>

        {/* Search Feedback */}
        {hasSearch && (
          <div className="flex items-center justify-between text-xs text-[#5E666D] px-1">
            <span>
              Showing results matching &ldquo;<strong>{searchQuery}</strong>&rdquo;
            </span>
            {totalMatches === 0 && (
              <span className="text-[#9E2A2B] font-medium">Zero records found</span>
            )}
          </div>
        )}

        {/* Empty State */}
        {totalMatches === 0 && (
          <div className="p-10 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md text-center space-y-3">
            <Buildings size={32} className="mx-auto text-[#8E9499]" />
            <h3 className="font-serif text-lg font-semibold text-[#111315]">
              No clinical matches found
            </h3>
            <p className="text-xs text-[#5E666D] max-w-md mx-auto">
              We could not find any departments or specialists matching your search query. Please try searching by clinical specialty, doctor name, or browse the complete directory below.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1A635E] text-white text-xs font-semibold rounded hover:bg-[#14514D] transition-colors cursor-pointer"
            >
              <span>Reset Directory Filter</span>
            </button>
          </div>
        )}

        {/* Section 1: Specialists Grid */}
        {(activeCategory === 'all' || activeCategory === 'specialists') && filteredSpecialists.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E2D8] pb-2">
              <div className="flex items-center gap-2">
                <User size={18} className="text-[#1A635E]" />
                <h2 className="font-display text-xl font-semibold text-[#111315]">
                  Clinical Specialists ({filteredSpecialists.length})
                </h2>
              </div>
              <Link
                to="/specialists"
                className="text-xs text-[#1A635E] hover:underline font-medium inline-flex items-center gap-1"
              >
                <span>View All Specialists</span>
                <CaretRight size={12} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSpecialists.map((doc) => (
                <div
                  key={doc.id}
                  className="p-5 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md flex flex-col justify-between hover:border-[#1A635E] transition-all hover:shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-[#1A635E] uppercase tracking-wider">
                        {doc.departmentName}
                      </span>
                      {doc.isLeadership && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EDF5F4] text-[#1A635E] border border-[#BCD9D6]">
                          Leadership
                        </span>
                      )}
                    </div>

                    <h3 className="font-display text-lg font-semibold text-[#111315]">
                      {doc.name}
                    </h3>
                    <p className="text-xs text-[#5E666D] leading-relaxed">
                      {doc.role}
                    </p>
                    <div className="text-[11px] text-[#8E9499] pt-1">
                      <span>Credentials: {doc.qualifications}</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#ECE9E0] flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#5E666D] font-mono">
                      {doc.experienceYears} Years Experience
                    </span>
                    <Link
                      to={`/appointment?doctor=${doc.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1A635E] text-white hover:bg-[#14514D] text-xs font-semibold transition-colors min-h-[36px]"
                    >
                      <CalendarCheck size={14} />
                      <span>Book Visit</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Clinical Departments Grid */}
        {(activeCategory === 'all' || activeCategory === 'departments') && filteredDepartments.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-[#E5E2D8] pb-2">
              <div className="flex items-center gap-2">
                <Buildings size={18} className="text-[#1A635E]" />
                <h2 className="font-display text-xl font-semibold text-[#111315]">
                  Clinical Departments & Centers ({filteredDepartments.length})
                </h2>
              </div>
              <Link
                to="/departments"
                className="text-xs text-[#1A635E] hover:underline font-medium inline-flex items-center gap-1"
              >
                <span>View All Departments</span>
                <CaretRight size={12} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDepartments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-5 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md flex flex-col justify-between hover:border-[#1A635E] transition-all hover:shadow-sm"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#EDF5F4] text-[#1A635E] border border-[#BCD9D6]">
                        {dept.code}
                      </span>
                      {dept.isFlagship && (
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-[#1A635E]">
                          Flagship Institute
                        </span>
                      )}
                    </div>

                    <h3 className="font-display text-lg font-semibold text-[#111315]">
                      {dept.name}
                    </h3>
                    <p className="text-xs text-[#5E666D] leading-relaxed line-clamp-2">
                      {dept.shortDescription}
                    </p>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#8E9499] block mb-1 font-semibold">
                        Clinical Focus Areas
                      </span>
                      <ul className="space-y-1 text-xs text-[#3C4247]">
                        {dept.clinicalFocus.slice(0, 3).map((focus) => (
                          <li key={focus} className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-[#1A635E]" aria-hidden="true" />
                            <span className="truncate">{focus}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#ECE9E0] flex items-center justify-between text-xs">
                    <span className="text-[#8E9499] text-[11px]">{dept.location}</span>
                    <Link
                      to={`/appointment?department=${dept.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-[#1A635E] hover:text-[#14514D] transition-colors"
                    >
                      <span>Book in Department</span>
                      <CaretRight size={14} weight="bold" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
