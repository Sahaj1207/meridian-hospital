import { useState, useEffect } from 'react';
import type { DbConsultationType } from '@/types/database';
import { catalogService } from '@/services/catalogService';
import { Clock, ArrowLeft, CheckCircle, CaretRight } from '@phosphor-icons/react';

interface ConsultationTypeStepProps {
  selectedConsultationType: DbConsultationType | null;
  onSelectConsultationType: (type: DbConsultationType) => void;
  onBack: () => void;
}

export function ConsultationTypeStep({
  selectedConsultationType,
  onSelectConsultationType,
  onBack
}: ConsultationTypeStepProps) {
  const [types, setTypes] = useState<DbConsultationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    catalogService.getConsultationTypes()
      .then((data) => {
        if (isMounted) {
          setTypes(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Failed to load consultation types. Please try again.');
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
        <p>Loading consultation formats...</p>
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
            Select Consultation Format
          </h2>
          <p className="text-xs sm:text-sm text-[#5E666D] mt-1">
            Choose the clinical consultation format aligned with your medical inquiry.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5E666D] hover:text-[#111315] shrink-0 min-h-[44px]"
        >
          <ArrowLeft size={14} />
          <span>Change specialist</span>
        </button>
      </div>

      <div className="space-y-3">
        {types.map((t) => {
          const isSelected = selectedConsultationType?.id === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectConsultationType(t)}
              aria-pressed={isSelected}
              className={`w-full text-left p-5 rounded border transition-all flex items-start justify-between gap-4 min-h-[44px] ${
                isSelected
                  ? 'bg-[#EDF5F4] border-[#1A635E] ring-1 ring-[#1A635E]'
                  : 'bg-[#FAF9F6] border-[#E5E2D8] hover:border-[#BCD9D6] hover:bg-white'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-[#111315]">
                    {t.name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E5E2D8] text-[#1A635E]">
                    <Clock size={12} weight="bold" />
                    <span>{t.duration_minutes} Minutes</span>
                  </span>
                </div>
                {t.description && (
                  <p className="text-xs text-[#5E666D] leading-relaxed max-w-2xl">
                    {t.description}
                  </p>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-2 mt-1">
                {isSelected ? (
                  <CheckCircle size={20} className="text-[#1A635E]" weight="fill" />
                ) : (
                  <CaretRight size={18} className="text-[#8E9499]" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
