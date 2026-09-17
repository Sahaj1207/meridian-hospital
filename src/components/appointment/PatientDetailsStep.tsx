import { useState } from 'react';
import type { PatientFormState, PatientFormErrors } from './types';
import { ArrowLeft, LockKey, Check, WarningCircle } from '@phosphor-icons/react';

interface PatientDetailsStepProps {
  initialValues: PatientFormState;
  isHoldExpired: boolean;
  isSubmitting: boolean;
  submissionError: string | null;
  onSubmit: (details: PatientFormState) => void;
  onBack: () => void;
}

export function PatientDetailsStep({
  initialValues,
  isHoldExpired,
  isSubmitting,
  submissionError,
  onSubmit,
  onBack
}: PatientDetailsStepProps) {
  const [form, setForm] = useState<PatientFormState>(initialValues);
  const [errors, setErrors] = useState<PatientFormErrors>({});

  const validate = (): boolean => {
    const errs: PatientFormErrors = {};

    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      errs.fullName = 'Please enter patient full name (at least 2 characters).';
    }

    const cleanPhone = form.phone.replace(/[\s\-()]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.phone = 'Please enter a valid telephone number with country code (e.g. +91 98200 12345).';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim() || !emailRegex.test(form.email.trim())) {
      errs.email = 'Please provide a valid email address for booking confirmation.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isHoldExpired || isSubmitting) return;

    if (validate()) {
      onSubmit(form);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5E2D8] pb-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#111315]">
            Patient Contact Information
          </h2>
          <p className="text-xs sm:text-sm text-[#5E666D] mt-1">
            Required for consultation scheduling and booking confirmation communications.
          </p>
        </div>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5E666D] hover:text-[#111315] shrink-0 min-h-[44px]"
        >
          <ArrowLeft size={14} />
          <span>Change time slot</span>
        </button>
      </div>

      {isHoldExpired && (
        <div
          role="alert"
          className="p-4 bg-[#FDF2F2] border border-[#F1C5C5] rounded text-xs text-[#9E2A2B] flex items-center gap-2.5"
        >
          <WarningCircle size={18} className="shrink-0" weight="fill" />
          <span>
            Your temporary slot hold has expired. Please go back to select an available consultation slot before confirming.
          </span>
        </div>
      )}

      {submissionError && (
        <div
          role="alert"
          className="p-4 bg-[#FDF2F2] border border-[#F1C5C5] rounded text-xs text-[#9E2A2B] flex items-center gap-2.5"
        >
          <WarningCircle size={18} className="shrink-0" weight="fill" />
          <span>{submissionError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Full Name */}
        <div>
          <label
            htmlFor="patient-full-name"
            className="block text-xs font-semibold uppercase tracking-wider text-[#3C4247] mb-1.5"
          >
            Full Name <span className="text-[#9E2A2B]">*</span>
          </label>
          <input
            id="patient-full-name"
            type="text"
            required
            autoComplete="name"
            value={form.fullName}
            onChange={(e) => {
              setForm({ ...form, fullName: e.target.value });
              if (errors.fullName) setErrors({ ...errors, fullName: undefined });
            }}
            placeholder="e.g. Smt. Gayatri Sen or Shri Rajesh Sharma"
            className={`w-full px-4 py-2.5 text-sm bg-white border rounded text-[#111315] focus:outline-none transition-colors min-h-[44px] ${
              errors.fullName
                ? 'border-[#9E2A2B] focus:ring-1 focus:ring-[#9E2A2B]'
                : 'border-[#E5E2D8] focus:border-[#1A635E] focus:ring-1 focus:ring-[#1A635E]'
            }`}
            aria-describedby={errors.fullName ? 'patient-name-error' : undefined}
          />
          {errors.fullName && (
            <p id="patient-name-error" className="mt-1 text-xs text-[#9E2A2B]">
              {errors.fullName}
            </p>
          )}
        </div>

        {/* Telephone Number */}
        <div>
          <label
            htmlFor="patient-phone"
            className="block text-xs font-semibold uppercase tracking-wider text-[#3C4247] mb-1.5"
          >
            Telephone / Mobile Number <span className="text-[#9E2A2B]">*</span>
          </label>
          <input
            id="patient-phone"
            type="tel"
            required
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => {
              setForm({ ...form, phone: e.target.value });
              if (errors.phone) setErrors({ ...errors, phone: undefined });
            }}
            placeholder="e.g. +91 98200 12345"
            className={`w-full px-4 py-2.5 text-sm bg-white border rounded text-[#111315] focus:outline-none transition-colors min-h-[44px] ${
              errors.phone
                ? 'border-[#9E2A2B] focus:ring-1 focus:ring-[#9E2A2B]'
                : 'border-[#E5E2D8] focus:border-[#1A635E] focus:ring-1 focus:ring-[#1A635E]'
            }`}
            aria-describedby={errors.phone ? 'patient-phone-error' : undefined}
          />
          <span className="text-[11px] text-[#8E9499] block mt-1">
            Used by outpatient coordination desks for schedule confirmation reminders.
          </span>
          {errors.phone && (
            <p id="patient-phone-error" className="mt-1 text-xs text-[#9E2A2B]">
              {errors.phone}
            </p>
          )}
        </div>

        {/* Email Address */}
        <div>
          <label
            htmlFor="patient-email"
            className="block text-xs font-semibold uppercase tracking-wider text-[#3C4247] mb-1.5"
          >
            Email Address <span className="text-[#9E2A2B]">*</span>
          </label>
          <input
            id="patient-email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => {
              setForm({ ...form, email: e.target.value });
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            placeholder="e.g. patient@example.com"
            className={`w-full px-4 py-2.5 text-sm bg-white border rounded text-[#111315] focus:outline-none transition-colors min-h-[44px] ${
              errors.email
                ? 'border-[#9E2A2B] focus:ring-1 focus:ring-[#9E2A2B]'
                : 'border-[#E5E2D8] focus:border-[#1A635E] focus:ring-1 focus:ring-[#1A635E]'
            }`}
            aria-describedby={errors.email ? 'patient-email-error' : undefined}
          />
          <span className="text-[11px] text-[#8E9499] block mt-1">
            Official appointment confirmation code and directions will be transmitted to this address.
          </span>
          {errors.email && (
            <p id="patient-email-error" className="mt-1 text-xs text-[#9E2A2B]">
              {errors.email}
            </p>
          )}
        </div>

        {/* Institutional privacy declaration */}
        <div className="p-4 bg-[#FAF9F6] border border-[#E5E2D8] rounded text-xs text-[#5E666D] flex items-start gap-2.5 leading-relaxed">
          <LockKey size={18} className="text-[#1A635E] shrink-0 mt-0.5" />
          <span>
            Patient confidentiality notice: Meridian Hospital processes contact information exclusively for clinic appointments and healthcare administration in accordance with national health data governance standards.
          </span>
        </div>

        {/* Submission actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-[#5E666D] hover:text-[#111315] rounded border border-[#E5E2D8] hover:bg-[#F4F2EC] transition-colors min-h-[44px]"
          >
            Back to Slot Selection
          </button>

          <button
            type="submit"
            disabled={isHoldExpired || isSubmitting}
            className={`w-full sm:w-auto px-6 py-2.5 text-sm font-semibold rounded transition-all flex items-center justify-center gap-2 min-h-[44px] ${
              isHoldExpired || isSubmitting
                ? 'bg-[#E5E2D8] text-[#8E9499] cursor-not-allowed'
                : 'bg-[#1A635E] text-white hover:bg-[#14514D] active:scale-[0.99] shadow-sm'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Confirming Appointment...</span>
              </>
            ) : (
              <>
                <Check size={16} weight="bold" />
                <span>Complete Appointment Booking</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
