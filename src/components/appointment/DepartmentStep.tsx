import { useState, useEffect } from 'react';
import type { DbDepartment } from '@/types/database';
import { catalogService } from '@/services/catalogService';
import { CaretRight, ArrowRight, Buildings } from '@phosphor-icons/react';

interface DepartmentStepProps {
  selectedDepartment: DbDepartment | null;
  onSelectDepartment: (department: DbDepartment) => void;
  onSkipToSpecialists: () => void;
}

export function DepartmentStep({
  selectedDepartment,
  onSelectDepartment,
  onSkipToSpecialists
}: DepartmentStepProps) {
  const [departments, setDepartments] = useState<DbDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    catalogService.getDepartments()
      .then((data) => {
        if (isMounted) {
          setDepartments(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Failed to load clinical departments. Please refresh the page.');
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-[#5E666D]">
        <div className="inline-block w-6 h-6 border-2 border-[#1A635E] border-t-transparent rounded-full animate-spin mb-3" />
        <p>Loading clinical departments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-[#FDF2F2] border border-[#F1C5C5] rounded text-[#9E2A2B] text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5E2D8] pb-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#111315]">
            Select Clinical Department
          </h2>
          <p className="text-xs sm:text-sm text-[#5E666D] mt-1">
            Choose a clinical discipline to view specialist physicians and outpatient clinic timings.
          </p>
        </div>
        <button
          type="button"
          onClick={onSkipToSpecialists}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A635E] hover:text-[#14514D] underline underline-offset-4 shrink-0"
        >
          <span>Choose a specialist directly</span>
          <ArrowRight size={13} weight="bold" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {departments.map((dept) => {
          const isSelected = selectedDepartment?.id === dept.id;
          return (
            <button
              key={dept.id}
              type="button"
              onClick={() => onSelectDepartment(dept)}
              aria-pressed={isSelected}
              className={`text-left p-4 rounded border transition-all flex items-start justify-between gap-3 min-h-[44px] ${
                isSelected
                  ? 'bg-[#EDF5F4] border-[#1A635E] ring-1 ring-[#1A635E]'
                  : 'bg-[#FAF9F6] border-[#E5E2D8] hover:border-[#BCD9D6] hover:bg-white'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Buildings size={16} className="text-[#1A635E] shrink-0" />
                  <span className="text-sm font-semibold text-[#111315]">
                    {dept.name}
                  </span>
                  {dept.code && (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#F4F2EC] text-[#5E666D] rounded">
                      {dept.code}
                    </span>
                  )}
                </div>
                {dept.description && (
                  <p className="text-xs text-[#5E666D] leading-relaxed line-clamp-2">
                    {dept.description}
                  </p>
                )}
              </div>
              <CaretRight
                size={16}
                className={`shrink-0 mt-1 transition-colors ${
                  isSelected ? 'text-[#1A635E]' : 'text-[#8E9499]'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
