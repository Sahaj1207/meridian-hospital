import { useState } from 'react';
import type { PublicAppointmentConfirmation } from '@/types/scheduling';
import { formatISTTimeDisplay, formatISTDateDisplay } from '@/lib/timezone';
import { 
  CheckCircle, 
  Copy, 
  Check, 
  Printer, 
  House, 
  CalendarPlus, 
  MapPin, 
  Clock, 
  User, 
  FirstAid,
  Info,
  EnvelopeSimple 
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

interface BookingConfirmationProps {
  confirmation: PublicAppointmentConfirmation;
  onBookAnother: () => void;
}

export function BookingConfirmation({
  confirmation,
  onBookAnother
}: BookingConfirmationProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(confirmation.appointment_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API unavailable
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Top success acknowledgment */}
      <div className="text-center space-y-3 pb-6 border-b border-[#E5E2D8]">
        <div className="w-14 h-14 bg-[#EDF5F4] text-[#1A635E] rounded-full flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle size={36} weight="fill" />
        </div>
        <span className="inline-block text-xs uppercase tracking-widest font-semibold text-[#1A635E] bg-[#EDF5F4] px-3 py-1 rounded-full">
          Appointment Confirmed
        </span>
        <h2 className="font-display text-3xl font-semibold text-[#111315]">
          Consultation Scheduled
        </h2>
        <p className="text-sm text-[#5E666D] leading-relaxed max-w-md mx-auto">
          Your outpatient consultation has been registered with the clinic coordination desk. Please save your reference code below.
        </p>
      </div>

      {/* Prominent appointment reference card */}
      <div className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md text-center space-y-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5E666D] block">
          Official Appointment Reference
        </span>
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono text-2xl font-bold tracking-wider text-[#111315]">
            {confirmation.appointment_id}
          </span>
          <button
            type="button"
            onClick={handleCopyReference}
            className="p-2 rounded hover:bg-[#F4F2EC] text-[#1A635E] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Copy reference code"
            aria-label="Copy appointment reference code"
          >
            {copied ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1A635E]">
                <Check size={16} weight="bold" /> Copied
              </span>
            ) : (
              <Copy size={18} weight="bold" />
            )}
          </button>
        </div>
        <p className="text-xs text-[#5E666D]">
          Present this reference number at the reception desk upon your arrival.
        </p>
        <div className="pt-2 border-t border-[#ECE9E0] flex items-center justify-center gap-1.5 text-xs text-[#5E666D]">
          <EnvelopeSimple size={14} className="text-[#1A635E] shrink-0" />
          <span>Confirmation details prepared for your selected contact method (local simulation active).</span>
        </div>
      </div>

      {/* Appointment particulars */}
      <div className="p-6 bg-white border border-[#E5E2D8] rounded-md space-y-4 text-sm">
        <h3 className="font-display text-lg font-semibold text-[#111315] border-b border-[#EAE8E0] pb-2">
          Consultation Particulars
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="flex items-start gap-2.5">
            <User size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
            <div>
              <span className="text-[#8E9499] block">Specialist</span>
              <strong className="text-[#111315] block">{confirmation.doctor_name}</strong>
              <span className="text-[#5E666D] block">Senior Clinical Consultant</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <FirstAid size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
            <div>
              <span className="text-[#8E9499] block">Department</span>
              <strong className="text-[#111315] block">{confirmation.department_name}</strong>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Clock size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
            <div>
              <span className="text-[#8E9499] block">Format & Schedule</span>
              <strong className="text-[#111315] block">
                {formatISTTimeDisplay(confirmation.appointment_start)}
              </strong>
              <span className="text-[#5E666D] block">{confirmation.consultation_type}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <MapPin size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
            <div>
              <span className="text-[#8E9499] block">Date & Campus</span>
              <strong className="text-[#111315] block">
                {formatISTDateDisplay(confirmation.appointment_start)}
              </strong>
              <span className="text-[#5E666D] block">Tower A, Outpatient Suites, Lower Parel Campus</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-[#EDF5F4] border border-[#BCD9D6] rounded text-xs text-[#1A635E] flex items-start gap-2">
          <Info size={18} className="shrink-0 mt-0.5" />
          <span>
            Please arrive 15 minutes prior to your scheduled consultation for registration and vital check procedures at the Outpatient Clinic Suite.
          </span>
        </div>
      </div>

      {/* Action affordances */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E5E2D8]">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded border border-[#E5E2D8] bg-[#FAF9F6] hover:bg-[#F4F2EC] text-[#111315] transition-colors min-h-[44px]"
        >
          <Printer size={16} />
          <span>Print Details</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBookAnother}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded border border-[#1A635E] text-[#1A635E] hover:bg-[#EDF5F4] transition-colors min-h-[44px]"
          >
            <CalendarPlus size={16} />
            <span>Book Another Appointment</span>
          </button>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded bg-[#1A635E] text-white hover:bg-[#14514D] transition-colors min-h-[44px]"
          >
            <House size={16} />
            <span>Return to Hospital Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
