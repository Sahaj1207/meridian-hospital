import { useState } from 'react';
import type { PublicAppointmentConfirmation } from '@/types/scheduling';
import { appointmentService } from '@/services/appointmentService';
import { formatISTTimeDisplay, formatISTDateDisplay } from '@/lib/timezone';
import { 
  MagnifyingGlass, 
  Key, 
  WarningCircle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  User, 
  FirstAid,
  ShieldCheck 
} from '@phosphor-icons/react';

interface AppointmentLookupViewProps {
  onBackToBooking: () => void;
}

export function AppointmentLookupView({ onBackToBooking }: AppointmentLookupViewProps) {
  const [appointmentId, setAppointmentId] = useState('');
  const [confirmationToken, setConfirmationToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicAppointmentConfirmation | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

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
        setError('Appointment was not found or the confirmation token provided is invalid.');
      } else {
        setResult(data);
      }
    } catch {
      setError('An error occurred during verification. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="border-b border-[#E5E2D8] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#111315]">
            Look Up Consultation Details
          </h2>
          <p className="text-xs sm:text-sm text-[#5E666D] mt-1">
            Access your scheduled consultation record using your official booking credentials.
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToBooking}
          className="text-xs font-semibold text-[#1A635E] hover:text-[#14514D] underline underline-offset-4 min-h-[44px] flex items-center"
        >
          Book a new consultation
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 bg-[#FDF2F2] border border-[#F1C5C5] rounded text-xs text-[#9E2A2B] flex items-center gap-2.5"
        >
          <WarningCircle size={18} className="shrink-0" weight="fill" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLookup} className="space-y-4 p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md">
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
            Required to protect patient privacy against automated reference enumeration.
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

      {/* Lookup verification result card */}
      {result && (
        <div className="p-6 bg-white border border-[#BCD9D6] rounded-md space-y-4 text-xs shadow-sm">
          <div className="flex items-center justify-between border-b border-[#EAE8E0] pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-[#1A635E]" weight="fill" />
              <span className="font-semibold text-sm text-[#111315]">
                Verified Consultation Record
              </span>
            </div>
            <span className="font-mono text-xs uppercase px-2.5 py-1 bg-[#EDF5F4] text-[#1A635E] font-semibold rounded">
              {result.appointment_id}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-2.5">
              <User size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#8E9499] block">Specialist</span>
                <strong className="text-[#111315] block">{result.doctor_name}</strong>
                <span className="text-[#5E666D] block">Senior Clinical Consultant</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <FirstAid size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#8E9499] block">Department</span>
                <strong className="text-[#111315] block">{result.department_name}</strong>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Clock size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#8E9499] block">Format & Schedule</span>
                <strong className="text-[#111315] block">
                  {formatISTTimeDisplay(result.appointment_start)}
                </strong>
                <span className="text-[#5E666D] block">{result.consultation_type}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin size={16} className="text-[#1A635E] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#8E9499] block">Date & Campus</span>
                <strong className="text-[#111315] block">
                  {formatISTDateDisplay(result.appointment_start)}
                </strong>
                <span className="text-[#5E666D] block">Tower A, Outpatient Suites, Lower Parel Campus</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
