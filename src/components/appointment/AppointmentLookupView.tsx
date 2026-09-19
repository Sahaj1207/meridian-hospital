import { useState } from 'react';
import type { PublicAppointmentConfirmation } from '@/types/scheduling';
import { appointmentService } from '@/services/appointmentService';
import { formatISTTimeDisplay, formatISTDateDisplay } from '@/lib/timezone';
import { AppointmentRescheduleFlow } from './AppointmentRescheduleFlow';
import { 
  MagnifyingGlass, 
  Key, 
  WarningCircle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  User, 
  FirstAid,
  ShieldCheck,
  CalendarBlank,
  XCircle,
  Check
} from '@phosphor-icons/react';

interface AppointmentLookupViewProps {
  onBackToBooking: () => void;
}

type LookupMode = 'lookup' | 'details' | 'confirm_cancel' | 'rescheduling';

export function AppointmentLookupView({ onBackToBooking }: AppointmentLookupViewProps) {
  const [appointmentId, setAppointmentId] = useState('');
  const [confirmationToken, setConfirmationToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicAppointmentConfirmation | null>(null);

  // Lifecycle interaction state
  const [mode, setMode] = useState<LookupMode>('lookup');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSuccessBanner(null);

    const cleanApptId = appointmentId.trim();
    const cleanToken = confirmationToken.trim();

    if (!cleanApptId || !cleanToken) {
      setError('Both appointment reference and secret confirmation token are required.');
      return;
    }

    setLoading(true);

    try {
      const data = await appointmentService.getPublicAppointment(cleanApptId, cleanToken);
      if (!data) {
        setError('We could not verify those appointment details. Please check your reference and secure confirmation code.');
      } else {
        setResult(data);
        setMode('details');
      }
    } catch {
      setError('An error occurred during verification. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!result || cancelLoading) return;

    setCancelLoading(true);
    setCancelError(null);

    try {
      const res = await appointmentService.cancelAppointment({
        appointment_id: result.appointment_id,
        confirmation_token: confirmationToken.trim()
      });

      if (typeof res === 'object' && res.success) {
        setResult({
          ...result,
          status: 'cancelled'
        });
        setMode('details');
        setSuccessBanner('Your appointment has been cancelled. The reserved consultation time has been released.');
      } else {
        const errorMsg = typeof res === 'object' ? res.error : null;
        setCancelError(errorMsg || 'Unable to cancel appointment. Please try again or contact our outpatient desk.');
      }
    } catch {
      setCancelError('A network or service error occurred. Please verify your connection and try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRescheduleSuccess = (updatedAppointment: PublicAppointmentConfirmation, newToken: string) => {
    setResult(updatedAppointment);
    setAppointmentId(updatedAppointment.appointment_id);
    setConfirmationToken(newToken);
    setMode('details');
    setSuccessBanner(`Your consultation was successfully rescheduled. New reference: ${updatedAppointment.appointment_id}.`);
  };

  const isCancellableOrReschedulable = result && (result.status === 'confirmed' || result.status === 'pending');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#EDF5F4] border border-[#BCD9D6] text-[#1A635E]">
            <CheckCircle size={12} weight="fill" />
            <span>Confirmed</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E]">
            <Clock size={12} weight="bold" />
            <span>Pending Confirmation</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#FDF2F2] border border-[#F1C5C5] text-[#9E2A2B]">
            <XCircle size={12} weight="fill" />
            <span>Cancelled</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#F4F2EC] border border-[#EAE8E0] text-[#5E666D]">
            <Check size={12} weight="bold" />
            <span>Completed</span>
          </span>
        );
      case 'no_show':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#F4F2EC] border border-[#EAE8E0] text-[#5E666D]">
            <span>Did Not Attend</span>
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#F4F2EC] text-[#5E666D]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Title & Navigation Header */}
      <div className="border-b border-[#E5E2D8] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#111315]">
            Manage Scheduled Consultation
          </h2>
          <p className="text-xs sm:text-sm text-[#5E666D] mt-1">
            Look up, review, reschedule, or cancel your hospital outpatient appointment.
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToBooking}
          className="text-xs font-semibold text-[#1A635E] hover:text-[#14514D] underline underline-offset-4 min-h-[44px] flex items-center shrink-0"
        >
          Book a new consultation
        </button>
      </div>

      {/* Global error banner */}
      {error && (
        <div
          role="alert"
          className="p-4 bg-[#FDF2F2] border border-[#F1C5C5] rounded text-xs text-[#9E2A2B] flex items-center gap-2.5"
        >
          <WarningCircle size={18} className="shrink-0" weight="fill" />
          <span>{error}</span>
        </div>
      )}

      {/* Success notification banner */}
      {successBanner && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 bg-[#EDF5F4] border border-[#BCD9D6] rounded text-xs text-[#1A635E] flex items-center gap-2.5"
        >
          <CheckCircle size={18} className="shrink-0" weight="fill" />
          <span className="font-medium">{successBanner}</span>
        </div>
      )}

      {/* Lookup Form */}
      {mode === 'lookup' && (
        <form onSubmit={handleLookup} className="space-y-4 p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md shadow-sm">
          <div>
            <label
              htmlFor="lookup-reference"
              className="block text-xs font-semibold uppercase tracking-wider text-[#3C4247] mb-1.5"
            >
              Appointment Reference <span className="text-[#9E2A2B]">*</span>
            </label>
            <div className="relative">
              <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E9499]" />
              <input
                id="lookup-reference"
                type="text"
                required
                value={appointmentId}
                onChange={(e) => setAppointmentId(e.target.value)}
                placeholder="e.g. MRD-2026-10435"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#E5E2D8] rounded text-[#111315] focus:outline-none focus:border-[#1A635E] focus:ring-1 focus:ring-[#1A635E] min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="lookup-token"
              className="block text-xs font-semibold uppercase tracking-wider text-[#3C4247] mb-1.5"
            >
              Confirmation Security Token <span className="text-[#9E2A2B]">*</span>
            </label>
            <div className="relative">
              <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E9499]" />
              <input
                id="lookup-token"
                type="password"
                required
                value={confirmationToken}
                onChange={(e) => setConfirmationToken(e.target.value)}
                placeholder="Security token provided upon booking"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#E5E2D8] rounded text-[#111315] focus:outline-none focus:border-[#1A635E] focus:ring-1 focus:ring-[#1A635E] min-h-[44px]"
              />
            </div>
            <span className="text-[11px] text-[#8E9499] block mt-1">
              Required to authenticate patient identity without exposing private records.
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-semibold rounded bg-[#1A635E] text-white hover:bg-[#14514D] transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} weight="bold" />
                  <span>Verify & View Appointment</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Appointment Details & Actions View */}
      {result && mode === 'details' && (
        <div className="space-y-6">
          <div className="p-6 bg-white border border-[#BCD9D6] rounded-md space-y-5 text-xs shadow-sm">
            {/* Header with Reference & Status Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#EAE8E0] pb-4">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-[#8E9499] uppercase tracking-wider block">
                  Official Booking Reference
                </span>
                <span className="font-mono text-xl font-bold text-[#111315]">
                  {result.appointment_id}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(result.status)}
              </div>
            </div>

            {/* Particulars Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-2.5">
                <User size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#8E9499] block">Specialist Physician</span>
                  <strong className="text-[#111315] text-sm block">{result.doctor_name}</strong>
                  <span className="text-[#5E666D] block">Senior Clinical Consultant</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <FirstAid size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#8E9499] block">Clinical Department</span>
                  <strong className="text-[#111315] text-sm block">{result.department_name}</strong>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#8E9499] block">Format & Schedule</span>
                  <strong className="text-[#111315] text-sm block">
                    {formatISTTimeDisplay(result.appointment_start)}
                  </strong>
                  <span className="text-[#5E666D] block">{result.consultation_type}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#8E9499] block">Date & Campus</span>
                  <strong className="text-[#111315] text-sm block">
                    {formatISTDateDisplay(result.appointment_start)}
                  </strong>
                  <span className="text-[#5E666D] block">Tower A, Outpatient Suites, Lower Parel Campus</span>
                </div>
              </div>
            </div>

            {/* Permitted Patient Actions */}
            <div className="pt-4 border-t border-[#EAE8E0] flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setMode('lookup');
                  setSuccessBanner(null);
                }}
                className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-[#5E666D] hover:text-[#111315] border border-[#E5E2D8] rounded min-h-[44px]"
              >
                Look Up Another Reference
              </button>

              {isCancellableOrReschedulable ? (
                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCancelError(null);
                      setMode('confirm_cancel');
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#9E2A2B] hover:text-white border border-[#F1C5C5] hover:bg-[#9E2A2B] rounded transition-colors min-h-[44px]"
                  >
                    <XCircle size={16} />
                    <span>Cancel Consultation</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSuccessBanner(null);
                      setMode('rescheduling');
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#1A635E] hover:bg-[#14514D] rounded transition-colors min-h-[44px] shadow-sm"
                  >
                    <CalendarBlank size={16} weight="bold" />
                    <span>Reschedule Consultation</span>
                  </button>
                </div>
              ) : result.status === 'cancelled' ? (
                <div className="text-xs text-[#5E666D]">
                  This appointment is cancelled. The reserved slot has been returned to clinic availability.
                </div>
              ) : (
                <div className="text-xs text-[#5E666D]">
                  This appointment has concluded. No further schedule modifications are permitted.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation State */}
      {result && mode === 'confirm_cancel' && (
        <div className="p-6 bg-[#FAF9F6] border border-[#F1C5C5] rounded-md space-y-4 text-xs shadow-sm">
          <div className="flex items-start gap-3">
            <WarningCircle size={24} className="text-[#9E2A2B] shrink-0 mt-0.5" weight="fill" />
            <div className="space-y-1">
              <h3 className="font-display text-xl font-semibold text-[#111315]">
                Cancel this appointment?
              </h3>
              <p className="text-xs text-[#5E666D] leading-relaxed">
                Cancelling your consultation with <strong>{result.doctor_name}</strong> on <strong>{formatISTDateDisplay(result.appointment_start)}</strong> at <strong>{formatISTTimeDisplay(result.appointment_start)}</strong> will release your reserved appointment slot. This action is consequential and cannot be undone.
              </p>
            </div>
          </div>

          {cancelError && (
            <div
              role="alert"
              className="p-3 bg-[#FDF2F2] border border-[#F1C5C5] rounded text-xs text-[#9E2A2B]"
            >
              {cancelError}
            </div>
          )}

          <div className="pt-3 border-t border-[#E5E2D8] flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              disabled={cancelLoading}
              onClick={() => setMode('details')}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-[#5E666D] hover:text-[#111315] border border-[#E5E2D8] bg-white rounded min-h-[44px]"
            >
              Keep Appointment
            </button>

            <button
              type="button"
              disabled={cancelLoading}
              onClick={handleConfirmCancel}
              className={`w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white rounded transition-colors flex items-center justify-center gap-2 min-h-[44px] ${
                cancelLoading
                  ? 'bg-[#E5E2D8] text-[#8E9499] cursor-not-allowed'
                  : 'bg-[#9E2A2B] hover:bg-[#7D2223] shadow-sm'
              }`}
            >
              {cancelLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Cancelling Consultation...</span>
                </>
              ) : (
                <span>Confirm Cancellation</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Rescheduling Flow State */}
      {result && mode === 'rescheduling' && (
        <AppointmentRescheduleFlow
          appointment={result}
          confirmationToken={confirmationToken.trim()}
          onSuccess={handleRescheduleSuccess}
          onCancel={() => setMode('details')}
        />
      )}
    </div>
  );
}
