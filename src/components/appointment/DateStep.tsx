import { useMemo } from 'react';
import { getISTDateString } from '@/lib/timezone';
import { ArrowLeft, CalendarBlank, CaretRight } from '@phosphor-icons/react';

interface DateStepProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onBack: () => void;
}

interface CalendarDayOption {
  dateStr: string;
  dayNumber: string;
  weekdayShort: string;
  monthShort: string;
  isToday: boolean;
}

export function DateStep({
  selectedDate,
  onSelectDate,
  onBack
}: DateStepProps) {
  // Generate next 28 days in Asia/Kolkata timezone starting from today
  const availableDates: CalendarDayOption[] = useMemo(() => {
    const todayStr = getISTDateString(new Date());
    const [tYear, tMonth, tDay] = todayStr.split('-').map((n) => parseInt(n, 10));

    const days: CalendarDayOption[] = [];
    for (let i = 0; i < 28; i++) {
      // Advance by i days in UTC midday
      const d = new Date(Date.UTC(tYear, tMonth - 1, tDay + i, 12, 0, 0));
      const dateStr = getISTDateString(d);

      const weekdayFormatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short'
      });
      const monthFormatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        month: 'short'
      });

      days.push({
        dateStr,
        dayNumber: String(d.getUTCDate()),
        weekdayShort: weekdayFormatter.format(d),
        monthShort: monthFormatter.format(d),
        isToday: i === 0
      });
    }
    return days;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5E2D8] pb-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#111315]">
            Select Consultation Date
          </h2>
          <p className="text-xs sm:text-sm text-[#5E666D] mt-1">
            Choose an upcoming clinic date. Timings and slot availability are evaluated in Mumbai time (IST).
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5E666D] hover:text-[#111315] shrink-0 min-h-[44px]"
        >
          <ArrowLeft size={14} />
          <span>Change consultation format</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        {availableDates.map((day) => {
          const isSelected = selectedDate === day.dateStr;
          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => onSelectDate(day.dateStr)}
              aria-pressed={isSelected}
              className={`p-3 rounded border text-center transition-all flex flex-col items-center justify-between gap-1 min-h-[64px] min-w-[44px] ${
                isSelected
                  ? 'bg-[#1A635E] border-[#1A635E] text-white shadow-sm'
                  : 'bg-[#FAF9F6] border-[#E5E2D8] hover:border-[#BCD9D6] hover:bg-white text-[#111315]'
              }`}
            >
              <span
                className={`text-[11px] uppercase tracking-wider font-semibold ${
                  isSelected ? 'text-[#BCD9D6]' : 'text-[#5E666D]'
                }`}
              >
                {day.weekdayShort}
              </span>
              <span className="text-lg font-display font-semibold leading-none">
                {day.dayNumber}
              </span>
              <span
                className={`text-[10px] uppercase font-medium ${
                  isSelected ? 'text-[#BCD9D6]' : 'text-[#8E9499]'
                }`}
              >
                {day.monthShort} {day.isToday && '(Today)'}
              </span>
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="flex items-center justify-between p-4 bg-[#EDF5F4] border border-[#BCD9D6] rounded text-xs text-[#1A635E]">
          <div className="flex items-center gap-2">
            <CalendarBlank size={16} weight="bold" />
            <span>
              Selected date: <strong>{selectedDate}</strong>. Click below or proceed to view live available slots.
            </span>
          </div>
          <CaretRight size={14} weight="bold" />
        </div>
      )}
    </div>
  );
}
