import { useState, useEffect } from 'react';
import type { DbDepartment, DbDoctor } from '@/types/database';
import { catalogService } from '@/services/catalogService';
import { CaretRight, ArrowLeft, UserCircle, Briefcase, GraduationCap, CheckCircle } from '@phosphor-icons/react';

interface SpecialistStepProps {
  selectedDepartment: DbDepartment | null;
  selectedDoctor: DbDoctor | null;
  onSelectDoctor: (doctor: DbDoctor) => void;
  onBack: () => void;
}

export function SpecialistStep({
  selectedDepartment,
  selectedDoctor,
  onSelectDoctor,
  onBack
}: SpecialistStepProps) {
  const [doctors, setDoctors] = useState<DbDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const filter = selectedDepartment
      ? { department_id: selectedDepartment.id, active_only: true }
      : { active_only: true };

    catalogService.getDoctors(filter)
      .then((data) => {
        if (isMounted) {
          setDoctors(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Failed to load specialists. Please try again.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDepartment]);

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-[#5E666D]">
        <div className="inline-block w-6 h-6 border-2 border-[#1A635E] border-t-transparent rounded-full animate-spin mb-3" />
        <p>Loading available specialists...</p>
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
            Choose Specialist Physician
          </h2>
          <p className="text-xs sm:text-sm text-[#5E666D] mt-1">
            {selectedDepartment
              ? `Senior clinical specialists in ${selectedDepartment.name}`
              : 'All active hospital consultants and medical faculty'}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5E666D] hover:text-[#111315] shrink-0 min-h-[44px]"
        >
          <ArrowLeft size={14} />
          <span>Change department</span>
        </button>
      </div>

      {doctors.length === 0 ? (
        <div className="p-8 text-center bg-[#FAF9F6] border border-[#E5E2D8] rounded text-sm text-[#5E666D]">
          No active specialists are currently available in this department. Please choose another department or contact the scheduling desk.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doctors.map((doc) => {
            const isSelected = selectedDoctor?.id === doc.id;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => onSelectDoctor(doc)}
                aria-pressed={isSelected}
                className={`text-left p-5 rounded border transition-all flex flex-col justify-between gap-4 min-h-[44px] ${
                  isSelected
                    ? 'bg-[#EDF5F4] border-[#1A635E] ring-1 ring-[#1A635E]'
                    : 'bg-[#FAF9F6] border-[#E5E2D8] hover:border-[#BCD9D6] hover:bg-white'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded bg-[#EDF5F4] text-[#1A635E] flex items-center justify-center shrink-0">
                        <UserCircle size={22} weight="bold" />
                      </div>
                      <div>
                        <span className="text-base font-semibold text-[#111315] block">
                          {doc.name}
                        </span>
                        {doc.designation && (
                          <span className="text-xs text-[#5E666D] block">
                            {doc.designation}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle size={20} className="text-[#1A635E] shrink-0" weight="fill" />
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#EAE8E0] space-y-1.5 text-xs text-[#5E666D]">
                    {doc.credentials && (
                      <div className="flex items-center gap-2">
                        <GraduationCap size={14} className="text-[#1A635E] shrink-0" />
                        <span>{doc.credentials}</span>
                      </div>
                    )}
                    {doc.experience_years !== undefined && (
                      <div className="flex items-center gap-2">
                        <Briefcase size={14} className="text-[#1A635E] shrink-0" />
                        <span>{doc.experience_years} Years of Clinical Experience</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-medium text-[#1A635E] pt-2">
                  <span>View availability and schedules</span>
                  <CaretRight size={14} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
