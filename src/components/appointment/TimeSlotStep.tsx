import { useState, useEffect, useCallback } from 'react';
import type { DbDoctor, DbConsultationType } from '@/types/database';
import type { CalculatedSlot } from '@/types/scheduling';
import type { ActiveSlotHoldState } from './types';
import { availabilityService } from '@/services/availabilityService';
import { appointmentService } from '@/services/appointmentService';
import { formatISTTimeDisplay } from '@/lib/timezone';
import { 
  ArrowLeft, 
  Clock, 
  ArrowClockwise, 
  WarningCircle, 
  CheckCircle,
  CalendarX 
} from '@phosphor-icons/react';

interface TimeSlotStepProps {
  doctor: DbDoctor;
  consultationType: DbConsultationType;
  dateStr: string;
  activeHold: ActiveSlotHoldState | null;
  onHoldAcquired: (slot: CalculatedSlot, holdState: ActiveSlotHoldState) => void;
  onBack: () => void;
}

export function TimeSlotStep({
  doctor,
  consultationType,
  dateStr,
  activeHold,
  onHoldAcquired,
  onBack
}: TimeSlotStepProps) {
  const [slots, setSlots] = useState<CalculatedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingDay, setWorkingDay] = useState(true);
  const [nonWorkingReason, setNonWorkingReason] = useState<string | undefined>();
  const [acquiringSlot, setAcquiringSlot] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await availabilityService.getLiveAvailability({
        doctorId: doctor.id,
        consultationTypeId: consultationType.id,
        date: dateStr,
        activeHoldToken: activeHold?.holdToken
      });

      if (!res.success || !res.data) {
        setWorkingDay(false);
        setNonWorkingReason(res.error || 'No schedule available.');
        setSlots([]);
      } else {
        setWorkingDay(res.data.is_working_day);
        setNonWorkingReason(res.data.exception_reason);
        setSlots(res.data.slots);
      }
    } catch {
      setErrorMessage('Failed to check live slot availability. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [doctor.id, consultationType.id, dateStr, activeHold?.holdToken]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const handleSlotClick = async (slot: CalculatedSlot) => {
    if (!slot.available && !(activeHold && activeHold.slotStart === slot.slot_start)) {
      return;
    }

    // If slot is already held by this patient, advance immediately
    if (activeHold && activeHold.slotStart === slot.slot_start) {
      onHoldAcquired(slot, activeHold);
      return;
    }

    setAcquiringSlot(slot.slot_start);
    setErrorMessage(null);

    try {
      const holdRes = await appointmentService.createSlotHold({
        doctor_id: doctor.id,
        slot_start: slot.slot_start,
        slot_end: slot.slot_end,
        hold_duration_minutes: 10
      });

      if (!holdRes.success || !holdRes.hold_token || !holdRes.expires_at) {
        // Hold conflict recovery
        setErrorMessage('That time was just taken. Please choose another time.');
        await fetchAvailability();
      } else {
        onHoldAcquired(slot, {
          holdToken: holdRes.hold_token,
          expiresAt: holdRes.expires_at,
          slotStart: slot.slot_start,
          slotEnd: slot.slot_end
        });
      }
    } catch {
      setErrorMessage('Unable to reserve slot. Please check your connection and try again.');
    } finally {
      setAcquiringSlot(null);
    }
  };

  const availableSlotsCount = slots.filter((s) => s.available).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5E2D8] pb-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#111315]">
            Select Consultation Time
          </h2>
          <p className="text-xs sm:text-sm text-[#5E666D] mt-1">
            Live availability for {doctor.name} on {dateStr} ({consultationType.duration_minutes} min slots)
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={fetchAvailability}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A635E] hover:text-[#14514D] p-2 rounded hover:bg-[#EDF5F4] transition-colors min-h-[44px]"
            aria-label="Refresh available slots"
          >
            <ArrowClockwise size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5E666D] hover:text-[#111315] p-2 min-h-[44px]"
          >
            <ArrowLeft size={14} />
            <span>Change date</span>
          </button>
        </div>
      </div>

      {/* Inline notification or error banner */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="p-4 bg-[#FDF2F2] border border-[#F1C5C5] rounded text-xs text-[#9E2A2B] flex items-center gap-2.5"
        >
          <WarningCircle size={18} className="shrink-0" weight="fill" />
          <span>{errorMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-[#5E666D]">
          <div className="inline-block w-6 h-6 border-2 border-[#1A635E] border-t-transparent rounded-full animate-spin mb-3" />
          <p>Retrieving live specialist availability from clinic roster...</p>
        </div>
      ) : !workingDay ? (
        <div className="p-8 text-center bg-[#FAF9F6] border border-[#E5E2D8] rounded-md space-y-3">
          <CalendarX size={32} className="text-[#8E9499] mx-auto" />
          <h3 className="font-display text-lg font-semibold text-[#111315]">
            Doctor Not Available on This Date
          </h3>
          <p className="text-xs text-[#5E666D] max-w-md mx-auto leading-relaxed">
            {nonWorkingReason || 'The specialist does not have scheduled outpatient clinic hours on this calendar date.'}
          </p>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1A635E] hover:bg-[#14514D] rounded transition-colors min-h-[44px]"
          >
            Choose Another Date
          </button>
        </div>
      ) : slots.length === 0 || availableSlotsCount === 0 ? (
        <div className="p-8 text-center bg-[#FAF9F6] border border-[#E5E2D8] rounded-md space-y-3">
          <Clock size={32} className="text-[#8E9499] mx-auto" />
          <h3 className="font-display text-lg font-semibold text-[#111315]">
            No Appointments Available
          </h3>
          <p className="text-xs text-[#5E666D] max-w-md mx-auto leading-relaxed">
            All consultation windows for this date have been booked or reserved. Please select another date.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1A635E] hover:bg-[#14514D] rounded transition-colors min-h-[44px]"
          >
            Select An Alternative Date
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#5E666D] px-1">
            <span>{availableSlotsCount} slots available</span>
            <span className="text-[11px]">Click a time to place a 10-minute temporary reservation</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {slots.map((slot) => {
              const isHeldByPatient = activeHold && activeHold.slotStart === slot.slot_start;
              const isAcquiring = acquiringSlot === slot.slot_start;
              const isAvailable = slot.available || isHeldByPatient;

              let buttonClass = 'bg-[#FAF9F6] border-[#E5E2D8] text-[#111315] hover:border-[#1A635E] hover:bg-white';
              if (isHeldByPatient) {
                buttonClass = 'bg-[#EDF5F4] border-[#1A635E] text-[#1A635E] font-semibold ring-1 ring-[#1A635E]';
              } else if (!isAvailable) {
                buttonClass = 'bg-[#F4F2EC] border-[#EAE8E0] text-[#8E9499] cursor-not-allowed opacity-60';
              }

              return (
                <button
                  key={slot.slot_start}
                  type="button"
                  disabled={!isAvailable || isAcquiring}
                  onClick={() => handleSlotClick(slot)}
                  className={`p-3.5 rounded border text-center transition-all flex flex-col items-center justify-center gap-1 min-h-[52px] ${buttonClass}`}
                  aria-label={`${formatISTTimeDisplay(slot.slot_start)}${isHeldByPatient ? ' (Currently reserved by you)' : !isAvailable ? ' (Unavailable)' : ''}`}
                >
                  {isAcquiring ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#1A635E]">
                      <div className="w-3.5 h-3.5 border-2 border-[#1A635E] border-t-transparent rounded-full animate-spin" />
                      <span>Holding...</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-semibold tracking-tight">
                        {formatISTTimeDisplay(slot.slot_start)}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-medium">
                        {isHeldByPatient ? (
                          <span className="inline-flex items-center gap-1 text-[#1A635E]">
                            <CheckCircle size={10} weight="fill" /> Held by you
                          </span>
                        ) : isAvailable ? (
                          'Available'
                        ) : (
                          'Unavailable'
                        )}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
