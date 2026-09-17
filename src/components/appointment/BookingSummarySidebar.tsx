import { useState, useEffect } from 'react';
import type { BookingFlowState } from './types';
import { 
  formatISTTimeDisplay, 
  formatISTDateDisplay 
} from '@/lib/timezone';
import { 
  Clock, 
  CalendarCheck, 
  User, 
  FirstAid, 
  ShieldCheck, 
  HourglassHigh,
  WarningCircle 
} from '@phosphor-icons/react';

interface BookingSummarySidebarProps {
  flow: BookingFlowState;
  onHoldExpired: () => void;
}

export function BookingSummarySidebar({
  flow,
  onHoldExpired
}: BookingSummarySidebarProps) {
  const { department, doctor, consultationType, dateStr, slot, activeHold } = flow;
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!activeHold) {
      setSecondsRemaining(null);
      return;
    }

    const calculateRemaining = () => {
      const expiresAtMs = new Date(activeHold.expiresAt).getTime();
      const diffMs = expiresAtMs - Date.now();
      const sec = Math.max(0, Math.floor(diffMs / 1000));
      setSecondsRemaining(sec);
      if (sec === 0) {
        onHoldExpired();
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [activeHold, onHoldExpired]);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isExpired = secondsRemaining !== null && secondsRemaining <= 0;

  return (
    <aside 
      aria-label="Appointment summary and reservation status"
      className="bg-[#FAF9F6] border border-[#E5E2D8] rounded-md p-5 sm:p-6 lg:sticky lg:top-24 space-y-5"
    >
      <div className="flex items-center justify-between border-b border-[#E5E2D8] pb-4">
        <div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-[#5E666D] block">
            Meridian Hospital
          </span>
          <h2 className="font-display text-xl font-semibold text-[#111315]">
            Consultation Summary
          </h2>
        </div>
        <ShieldCheck size={24} className="text-[#1A635E]" weight="bold" />
      </div>

      {/* Active slot hold countdown banner */}
      {activeHold && secondsRemaining !== null && (
        <div
          aria-live="polite"
          className={`p-3 rounded border text-xs flex items-start gap-2.5 transition-colors ${
            isExpired
              ? 'bg-[#FDF2F2] border-[#F1C5C5] text-[#9E2A2B]'
              : 'bg-[#EDF5F4] border-[#BCD9D6] text-[#1A635E]'
          }`}
        >
          {isExpired ? (
            <WarningCircle size={18} className="shrink-0 mt-0.5 text-[#9E2A2B]" weight="fill" />
          ) : (
            <HourglassHigh size={18} className="shrink-0 mt-0.5 text-[#1A635E]" weight="bold" />
          )}
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">
              {isExpired ? 'Reservation Expired' : 'Temporary Slot Hold Active'}
            </span>
            <span>
              {isExpired
                ? 'Your temporary slot hold has expired. Please select a time slot again to proceed.'
                : `Your selected appointment time is reserved for ${formatCountdown(secondsRemaining)} while you complete your details.`}
            </span>
          </div>
        </div>
      )}

      {/* Selected booking parameters */}
      <div className="space-y-4 text-xs">
        {/* Department */}
        <div className="flex items-start gap-3">
          <FirstAid size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
          <div>
            <span className="text-[#5E666D] block">Clinical Department</span>
            <span className="text-[#111315] font-medium block">
              {department ? department.name : 'Not yet selected'}
            </span>
          </div>
        </div>

        {/* Doctor */}
        <div className="flex items-start gap-3">
          <User size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
          <div>
            <span className="text-[#5E666D] block">Specialist Physician</span>
            <span className="text-[#111315] font-medium block">
              {doctor ? doctor.name : 'Not yet selected'}
            </span>
            {doctor?.designation && (
              <span className="text-[#5E666D] text-[11px] block mt-0.5">
                {doctor.designation}
              </span>
            )}
          </div>
        </div>

        {/* Consultation Type */}
        <div className="flex items-start gap-3">
          <Clock size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
          <div>
            <span className="text-[#5E666D] block">Consultation Type</span>
            <span className="text-[#111315] font-medium block">
              {consultationType ? consultationType.name : 'Not yet selected'}
            </span>
            {consultationType?.duration_minutes && (
              <span className="text-[#5E666D] text-[11px] block mt-0.5">
                Standard Duration: {consultationType.duration_minutes} Minutes
              </span>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex items-start gap-3">
          <CalendarCheck size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
          <div>
            <span className="text-[#5E666D] block">Schedule & Time</span>
            <span className="text-[#111315] font-medium block">
              {slot 
                ? `${formatISTDateDisplay(slot.slot_start)} at ${formatISTTimeDisplay(slot.slot_start)}`
                : dateStr 
                  ? formatISTDateDisplay(`${dateStr}T00:00:00.000Z`)
                  : 'Not yet selected'}
            </span>
          </div>
        </div>
      </div>

      {/* Location note */}
      <div className="p-3 bg-[#F4F2EC] rounded border border-[#EAE8E0] text-[11px] text-[#5E666D] leading-relaxed">
        <strong className="text-[#111315] block mb-1">Campus Location</strong>
        Meridian Hospital, Dr. E. Moses Road, Lower Parel, Mumbai. Outpatient Suites, Tower A.
      </div>
    </aside>
  );
}
