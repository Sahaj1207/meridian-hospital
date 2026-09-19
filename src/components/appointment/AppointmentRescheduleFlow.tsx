import { useState, useEffect, useMemo, useCallback } from 'react';
import type { DbDoctor, DbConsultationType } from '@/types/database';
import type { PublicAppointmentConfirmation, CalculatedSlot } from '@/types/scheduling';
import { catalogService } from '@/services/catalogService';
import { availabilityService } from '@/services/availabilityService';
import { appointmentService } from '@/services/appointmentService';
import { 
  getISTDateString, 
  formatISTTimeDisplay, 
  formatISTDateDisplay 
} from '@/lib/timezone';
import { 
  ArrowLeft, 
  CheckCircle, 
  WarningCircle, 
  HourglassHigh, 
  ArrowRight,
  ArrowClockwise
} from '@phosphor-icons/react';

interface AppointmentRescheduleFlowProps {
  appointment: PublicAppointmentConfirmation;
  confirmationToken: string;
  onSuccess: (newAppointment: PublicAppointmentConfirmation, newToken: string) => void;
  onCancel: () => void;
}

interface CalendarDayOption {
  dateStr: string;
  dayNumber: string;
  weekdayShort: string;
  monthShort: string;
  isToday: boolean;
}

interface ActiveHold {
  holdToken: string;
  expiresAt: string;
  slotStart: string;
  slotEnd: string;
}

type RescheduleStep = 'date' | 'slot' | 'review';

export function AppointmentRescheduleFlow({
  appointment,
  confirmationToken,
  onSuccess,
  onCancel
}: AppointmentRescheduleFlowProps) {
  const [step, setStep] = useState<RescheduleStep>('date');
  const [doctor, setDoctor] = useState<DbDoctor | null>(null);
  const [consultationType, setConsultationType] = useState<DbConsultationType | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Date and slot selection state
  const [selectedDate, setSelectedDate] = useState<string>(getISTDateString(new Date()));
  const [slots, setSlots] = useState<CalculatedSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [workingDay, setWorkingDay] = useState(true);
  const [nonWorkingReason, setNonWorkingReason] = useState<string | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<CalculatedSlot | null>(null);
  const [activeHold, setActiveHold] = useState<ActiveHold | null>(null);
  const [holdingSlot, setHoldingSlot] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Hold countdown state
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // 1. Load doctor and consultation type metadata
  useEffect(() => {
    let isMounted = true;
    setCatalogLoading(true);
    setCatalogError(null);

    Promise.all([
      catalogService.getDoctorById(appointment.doctor_id),
      catalogService.getConsultationTypes()
    ])
      .then(([doc, types]) => {
        if (!isMounted) return;
        if (!doc) {
          setCatalogError('Specialist details could not be retrieved from the catalog.');
          setCatalogLoading(false);
          return;
        }
        setDoctor(doc);

        const matchedType = types.find(
          (t) => t.name === appointment.consultation_type || t.id === appointment.consultation_type || t.code === appointment.consultation_type
        ) || types[0];

        setConsultationType(matchedType);
        setCatalogLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setCatalogError('Unable to load clinical consultation metadata. Please try again.');
        setCatalogLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [appointment.doctor_id, appointment.consultation_type]);

  // 2. Generate calendar days in IST (next 28 days)
  const availableDates: CalendarDayOption[] = useMemo(() => {
    const todayStr = getISTDateString(new Date());
    const [tYear, tMonth, tDay] = todayStr.split('-').map((n) => parseInt(n, 10));

    const days: CalendarDayOption[] = [];
    for (let i = 0; i < 28; i++) {
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

  // 3. Fetch live slots for selected date
  const fetchSlots = useCallback(async () => {
    if (!doctor || !consultationType) return;
    setSlotsLoading(true);
    setSlotError(null);

    try {
      const res = await availabilityService.getLiveAvailability({
        doctorId: doctor.id,
        consultationTypeId: consultationType.id,
        date: selectedDate,
        activeHoldToken: activeHold?.holdToken
      });

      if (!res.success || !res.data) {
        setWorkingDay(false);
        setNonWorkingReason(res.error || 'No schedule available on this date.');
        setSlots([]);
      } else {
        setWorkingDay(res.data.is_working_day);
        setNonWorkingReason(res.data.exception_reason);
        setSlots(res.data.slots);
      }
    } catch {
      setSlotError('Unable to retrieve available consultation times. Please try again.');
    } finally {
      setSlotsLoading(false);
    }
  }, [doctor, consultationType, selectedDate, activeHold?.holdToken]);

  useEffect(() => {
    if (step === 'slot' && doctor && consultationType) {
      fetchSlots();
    }
  }, [step, doctor, consultationType, selectedDate, fetchSlots]);

  // 4. Manage hold countdown
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
        setActiveHold(null);
        setSelectedSlot(null);
        setSlotError('Your temporary slot reservation has expired. Please select a time slot again.');
        setStep('slot');
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [activeHold]);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 5. Handle slot selection and acquire hold
  const handleSelectSlot = async (slot: CalculatedSlot) => {
    if (!slot.available || !doctor) return;

    setHoldingSlot(slot.slot_start);
    setSlotError(null);

    try {
      const holdRes = await appointmentService.createSlotHold({
        doctor_id: doctor.id,
        slot_start: slot.slot_start,
        slot_end: slot.slot_end,
        hold_duration_minutes: 10
      });

      if (!holdRes.success || !holdRes.hold_token || !holdRes.expires_at) {
        setSlotError('That time was just reserved by another patient. Please choose another time.');
        await fetchSlots();
      } else {
        setActiveHold({
          holdToken: holdRes.hold_token,
          expiresAt: holdRes.expires_at,
          slotStart: slot.slot_start,
          slotEnd: slot.slot_end
        });
        setSelectedSlot(slot);
        setStep('review');
      }
    } catch {
      setSlotError('Unable to reserve this slot. Please check your connection and try again.');
    } finally {
      setHoldingSlot(null);
    }
  };

  // 6. Submit reschedule request
  const handleConfirmReschedule = async () => {
    if (!selectedSlot || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await appointmentService.rescheduleAppointment({
        appointment_id: appointment.appointment_id,
        confirmation_token: confirmationToken,
        new_slot_start: selectedSlot.slot_start,
        new_slot_end: selectedSlot.slot_end,
        hold_token: activeHold?.holdToken
      });

      if (res.success && res.new_appointment_id && res.confirmation_token) {
        const updatedRecord: PublicAppointmentConfirmation = {
          appointment_id: res.new_appointment_id,
          doctor_id: appointment.doctor_id,
          doctor_name: appointment.doctor_name,
          department_id: appointment.department_id,
          department_name: appointment.department_name,
          consultation_type: appointment.consultation_type,
          appointment_start: selectedSlot.slot_start,
          appointment_end: selectedSlot.slot_end,
          status: 'confirmed',
          created_at: new Date().toISOString()
        };

        onSuccess(updatedRecord, res.confirmation_token);
      } else {
        setSubmitError(res.error || 'The appointment could not be updated. Please choose another time or try again.');
        if (res.error_code === 'RESCHEDULE_SLOT_UNAVAILABLE') {
          setStep('slot');
          await fetchSlots();
        }
      }
    } catch {
      setSubmitError('A network or service error occurred. Your existing appointment remains unchanged.');
    } finally {
      setSubmitting(false);
    }
  };

  if (catalogLoading) {
    return (
      <div className="p-8 text-center bg-white border border-[#E5E2D8] rounded-md space-y-3">
        <div className="inline-block w-6 h-6 border-2 border-[#1A635E] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[#5E666D]">Loading specialist consultation profile...</p>
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="p-6 bg-[#FDF2F2] border border-[#F1C5C5] rounded-md space-y-3 text-xs text-[#9E2A2B]">
        <div className="flex items-center gap-2">
          <WarningCircle size={18} weight="fill" />
          <span className="font-semibold">{catalogError}</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-semibold rounded bg-white border border-[#F1C5C5] text-[#9E2A2B] hover:bg-[#FBEAEA] min-h-[44px]"
        >
          Return to Consultation Details
        </button>
      </div>
    );
  }

  const availableSlotsCount = slots.filter((s) => s.available).length;

  return (
    <div className="p-6 bg-white border border-[#BCD9D6] rounded-md space-y-6 shadow-sm">
      {/* Header */}
      <div className="border-b border-[#E5E2D8] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1A635E] block mb-1">
            Appointment Rescheduling
          </span>
          <h3 className="font-display text-2xl font-semibold text-[#111315]">
            Reschedule Consultation
          </h3>
          <p className="text-xs text-[#5E666D] mt-0.5">
            Specialist: <strong>{appointment.doctor_name}</strong> ({appointment.department_name})
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5E666D] hover:text-[#111315] shrink-0 min-h-[44px]"
        >
          <ArrowLeft size={14} />
          <span>Keep current schedule</span>
        </button>
      </div>

      {/* Step Progress */}
      <div className="flex items-center gap-2 text-xs font-medium text-[#5E666D] border-b border-[#F4F2EC] pb-3">
        <span className={`px-2.5 py-1 rounded ${step === 'date' ? 'bg-[#1A635E] text-white font-semibold' : 'bg-[#F4F2EC] text-[#5E666D]'}`}>
          1. Select Date
        </span>
        <ArrowRight size={12} className="text-[#8E9499]" />
        <span className={`px-2.5 py-1 rounded ${step === 'slot' ? 'bg-[#1A635E] text-white font-semibold' : 'bg-[#F4F2EC] text-[#5E666D]'}`}>
          2. Select Time Slot
        </span>
        <ArrowRight size={12} className="text-[#8E9499]" />
        <span className={`px-2.5 py-1 rounded ${step === 'review' ? 'bg-[#1A635E] text-white font-semibold' : 'bg-[#F4F2EC] text-[#5E666D]'}`}>
          3. Review and Confirm
        </span>
      </div>

      {/* Error banner */}
      {(slotError || submitError) && (
        <div
          role="alert"
          aria-live="polite"
          className="p-4 bg-[#FDF2F2] border border-[#F1C5C5] rounded text-xs text-[#9E2A2B] flex items-center gap-2.5"
        >
          <WarningCircle size={18} className="shrink-0" weight="fill" />
          <span>{slotError || submitError}</span>
        </div>
      )}

      {/* STEP 1: DATE SELECTION */}
      {step === 'date' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#5E666D]">
            <span>Select an upcoming clinic date for {appointment.doctor_name}</span>
            <span className="text-[11px]">Timings in Mumbai Time (IST)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {availableDates.map((day) => {
              const isSelected = selectedDate === day.dateStr;
              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(day.dateStr)}
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

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-[#5E666D] hover:text-[#111315] border border-[#E5E2D8] rounded min-h-[44px]"
            >
              Cancel Rescheduling
            </button>
            <button
              type="button"
              onClick={() => setStep('slot')}
              className="px-6 py-2 text-xs font-semibold text-white bg-[#1A635E] hover:bg-[#14514D] rounded transition-colors min-h-[44px] flex items-center gap-1.5"
            >
              <span>View Available Slots</span>
              <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: TIME SLOT SELECTION */}
      {step === 'slot' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#5E666D] border-b border-[#F4F2EC] pb-2">
            <div>
              <span>Slots for <strong>{selectedDate}</strong></span>
              <span className="block text-[11px] text-[#8E9499]">{consultationType?.duration_minutes || 30} min consultations</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchSlots}
                disabled={slotsLoading}
                className="inline-flex items-center gap-1 text-xs text-[#1A635E] hover:underline p-1 min-h-[44px]"
              >
                <ArrowClockwise size={14} className={slotsLoading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => setStep('date')}
                className="text-xs text-[#5E666D] hover:underline p-1 min-h-[44px]"
              >
                Change date
              </button>
            </div>
          </div>

          {slotsLoading ? (
            <div className="py-12 text-center text-xs text-[#5E666D]">
              <div className="inline-block w-6 h-6 border-2 border-[#1A635E] border-t-transparent rounded-full animate-spin mb-3" />
              <p>Checking live clinic roster availability...</p>
            </div>
          ) : !workingDay ? (
            <div className="p-6 text-center bg-[#FAF9F6] border border-[#E5E2D8] rounded space-y-2">
              <p className="text-xs font-semibold text-[#111315]">Specialist Unavailable on this Date</p>
              <p className="text-xs text-[#5E666D] max-w-sm mx-auto">
                {nonWorkingReason || 'No clinic hours are scheduled for this calendar date.'}
              </p>
              <button
                type="button"
                onClick={() => setStep('date')}
                className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-[#1A635E] rounded min-h-[44px]"
              >
                Choose Another Date
              </button>
            </div>
          ) : slots.length === 0 || availableSlotsCount === 0 ? (
            <div className="p-6 text-center bg-[#FAF9F6] border border-[#E5E2D8] rounded space-y-2">
              <p className="text-xs font-semibold text-[#111315]">No Slots Available</p>
              <p className="text-xs text-[#5E666D] max-w-sm mx-auto">
                All consultation intervals on this date have been booked. Please pick another date.
              </p>
              <button
                type="button"
                onClick={() => setStep('date')}
                className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-[#1A635E] rounded min-h-[44px]"
              >
                Select Another Date
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {slots.map((slot) => {
                const isHolding = holdingSlot === slot.slot_start;
                const isAvailable = slot.available;

                return (
                  <button
                    key={slot.slot_start}
                    type="button"
                    disabled={!isAvailable || isHolding}
                    onClick={() => handleSelectSlot(slot)}
                    className={`p-3 rounded border text-center transition-all flex flex-col items-center justify-center gap-0.5 min-h-[50px] ${
                      !isAvailable
                        ? 'bg-[#F4F2EC] border-[#EAE8E0] text-[#8E9499] cursor-not-allowed opacity-60'
                        : 'bg-[#FAF9F6] border-[#E5E2D8] text-[#111315] hover:border-[#1A635E] hover:bg-white'
                    }`}
                  >
                    {isHolding ? (
                      <div className="flex items-center gap-1 text-xs text-[#1A635E]">
                        <div className="w-3.5 h-3.5 border-2 border-[#1A635E] border-t-transparent rounded-full animate-spin" />
                        <span>Holding...</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-semibold">
                          {formatISTTimeDisplay(slot.slot_start)}
                        </span>
                        <span className="text-[10px] uppercase font-medium">
                          {isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep('date')}
              className="px-4 py-2 text-xs font-medium text-[#5E666D] hover:text-[#111315] border border-[#E5E2D8] rounded min-h-[44px]"
            >
              Back to Date Selection
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW AND CONFIRM */}
      {step === 'review' && selectedSlot && (
        <div className="space-y-5">
          {/* Temporary hold countdown banner */}
          {activeHold && secondsRemaining !== null && (
            <div
              role="status"
              aria-live="polite"
              className="p-3 bg-[#EDF5F4] border border-[#BCD9D6] rounded text-xs text-[#1A635E] flex items-center gap-2.5"
            >
              <HourglassHigh size={18} weight="bold" className="shrink-0" />
              <div className="flex-1">
                <span className="font-semibold block">Slot Held for Rescheduling</span>
                <span>
                  This time is temporarily held for {formatCountdown(secondsRemaining)}. Complete confirmation before expiry.
                </span>
              </div>
            </div>
          )}

          {/* Comparison Cards: Current vs New */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Current */}
            <div className="p-4 bg-[#FAF9F6] border border-[#E5E2D8] rounded space-y-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8E9499] block">
                Current Consultation
              </span>
              <strong className="text-sm font-display text-[#111315] block">
                {appointment.doctor_name}
              </strong>
              <div className="space-y-1 text-[#5E666D]">
                <div>Department: {appointment.department_name}</div>
                <div>Date: {formatISTDateDisplay(appointment.appointment_start)}</div>
                <div>Time: {formatISTTimeDisplay(appointment.appointment_start)}</div>
                <div className="text-[11px] font-mono text-[#8E9499]">Ref: {appointment.appointment_id}</div>
              </div>
            </div>

            {/* New */}
            <div className="p-4 bg-[#EDF5F4] border border-[#1A635E] rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#1A635E] block">
                  New Rescheduled Time
                </span>
                <CheckCircle size={16} weight="fill" className="text-[#1A635E]" />
              </div>
              <strong className="text-sm font-display text-[#111315] block">
                {appointment.doctor_name}
              </strong>
              <div className="space-y-1 text-[#1A635E]">
                <div>Department: {appointment.department_name}</div>
                <div>Date: <strong>{formatISTDateDisplay(selectedSlot.slot_start)}</strong></div>
                <div>Time: <strong>{formatISTTimeDisplay(selectedSlot.slot_start)}</strong></div>
                <div className="text-[11px]">Format: {appointment.consultation_type}</div>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-[#FAF9F6] border border-[#E5E2D8] rounded text-xs text-[#5E666D] leading-relaxed">
            Upon confirmation, your current appointment reference will be atomically retired and replaced by a newly confirmed booking reference.
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setStep('slot')}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-[#5E666D] hover:text-[#111315] border border-[#E5E2D8] rounded min-h-[44px]"
            >
              Choose a Different Time
            </button>

            <button
              type="button"
              disabled={submitting || (secondsRemaining !== null && secondsRemaining <= 0)}
              onClick={handleConfirmReschedule}
              className={`w-full sm:w-auto px-6 py-2.5 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-2 min-h-[44px] ${
                submitting
                  ? 'bg-[#E5E2D8] text-[#8E9499] cursor-not-allowed'
                  : 'bg-[#1A635E] text-white hover:bg-[#14514D] shadow-sm'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Confirming Reschedule...</span>
                </>
              ) : (
                <span>Confirm Rescheduled Appointment</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
