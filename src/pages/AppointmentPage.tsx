import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '@/components/shared/PageShell';
import { catalogService } from '@/services/catalogService';
import { appointmentService } from '@/services/appointmentService';
import type {
  DbDepartment,
  DbDoctor,
  DbConsultationType
} from '@/types/database';
import type {
  CalculatedSlot,
  PublicAppointmentConfirmation
} from '@/types/scheduling';
import type { 
  AppointmentStep, 
  ActiveSlotHoldState, 
  PatientFormState, 
  BookingFlowState 
} from '@/components/appointment/types';
import { StepProgressIndicator } from '@/components/appointment/StepProgressIndicator';
import { BookingSummarySidebar } from '@/components/appointment/BookingSummarySidebar';
import { DepartmentStep } from '@/components/appointment/DepartmentStep';
import { SpecialistStep } from '@/components/appointment/SpecialistStep';
import { ConsultationTypeStep } from '@/components/appointment/ConsultationTypeStep';
import { DateStep } from '@/components/appointment/DateStep';
import { TimeSlotStep } from '@/components/appointment/TimeSlotStep';
import { PatientDetailsStep } from '@/components/appointment/PatientDetailsStep';
import { BookingConfirmation } from '@/components/appointment/BookingConfirmation';
import { AppointmentLookupView } from '@/components/appointment/AppointmentLookupView';
import { getISTDateString } from '@/lib/timezone';
import { CalendarCheck, MagnifyingGlass } from '@phosphor-icons/react';

export function AppointmentPage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'book' | 'lookup'>('book');

  const [flow, setFlow] = useState<BookingFlowState>({
    currentStep: 'department',
    department: null,
    doctor: null,
    consultationType: null,
    dateStr: getISTDateString(new Date()),
    slot: null,
    activeHold: null,
    patient: {
      fullName: '',
      phone: '',
      email: ''
    },
    confirmedAppointment: null,
    isSubmitting: false,
    submissionError: null
  });

  const [isHoldExpired, setIsHoldExpired] = useState(false);

  // Initialize from search parameters (e.g. from Find Care or Specialists pages)
  useEffect(() => {
    const doctorParam = searchParams.get('doctor');
    const deptParam = searchParams.get('department');

    if (doctorParam) {
      catalogService.getDoctorById(doctorParam)
        .then(async (doc) => {
          if (doc && doc.active) {
            const dept = await catalogService.getDepartmentById(doc.department_id);
            setFlow((prev) => ({
              ...prev,
              doctor: doc,
              department: dept,
              currentStep: 'consultation'
            }));
          }
        })
        .catch(() => {});
    } else if (deptParam) {
      catalogService.getDepartmentById(deptParam)
        .then((dept) => {
          if (dept) {
            setFlow((prev) => ({
              ...prev,
              department: dept,
              currentStep: 'specialist'
            }));
          }
        })
        .catch(() => {});
    }
  }, [searchParams]);

  const canNavigateToStep = useCallback((targetStep: AppointmentStep): boolean => {
    switch (targetStep) {
      case 'department':
        return true;
      case 'specialist':
        return flow.department !== null;
      case 'consultation':
        return flow.doctor !== null;
      case 'date':
        return flow.consultationType !== null;
      case 'slot':
        return Boolean(flow.dateStr && flow.consultationType);
      case 'details':
        return Boolean(flow.slot && flow.activeHold && !isHoldExpired);
      case 'confirmation':
        return flow.confirmedAppointment !== null;
      default:
        return false;
    }
  }, [flow, isHoldExpired]);

  const handleStepClick = (step: AppointmentStep) => {
    setFlow((prev) => ({ ...prev, currentStep: step }));
  };

  const handleSelectDepartment = (dept: DbDepartment) => {
    setFlow((prev) => ({
      ...prev,
      department: dept,
      doctor: null, // Reset subsequent choices
      consultationType: null,
      slot: null,
      activeHold: null,
      currentStep: 'specialist'
    }));
    setIsHoldExpired(false);
  };

  const handleSkipToSpecialists = () => {
    setFlow((prev) => ({
      ...prev,
      department: null,
      doctor: null,
      consultationType: null,
      slot: null,
      activeHold: null,
      currentStep: 'specialist'
    }));
    setIsHoldExpired(false);
  };

  const handleSelectDoctor = async (doc: DbDoctor) => {
    let dept = flow.department;
    if (!dept || dept.id !== doc.department_id) {
      dept = await catalogService.getDepartmentById(doc.department_id);
    }

    setFlow((prev) => ({
      ...prev,
      doctor: doc,
      department: dept,
      consultationType: null,
      slot: null,
      activeHold: null,
      currentStep: 'consultation'
    }));
    setIsHoldExpired(false);
  };

  const handleSelectConsultationType = (type: DbConsultationType) => {
    setFlow((prev) => ({
      ...prev,
      consultationType: type,
      slot: null,
      activeHold: null,
      currentStep: 'date'
    }));
    setIsHoldExpired(false);
  };

  const handleSelectDate = (dateStr: string) => {
    setFlow((prev) => ({
      ...prev,
      dateStr,
      slot: null,
      activeHold: null,
      currentStep: 'slot'
    }));
    setIsHoldExpired(false);
  };

  const handleHoldAcquired = (slot: CalculatedSlot, holdState: ActiveSlotHoldState) => {
    setFlow((prev) => ({
      ...prev,
      slot,
      activeHold: holdState,
      currentStep: 'details'
    }));
    setIsHoldExpired(false);
  };

  const handleHoldExpired = useCallback(() => {
    setIsHoldExpired(true);
  }, []);

  const handleBookingSubmit = async (patientDetails: PatientFormState) => {
    if (!flow.doctor || !flow.department || !flow.consultationType || !flow.slot) {
      return;
    }

    if (isHoldExpired) {
      setFlow((prev) => ({
        ...prev,
        submissionError: 'Your slot hold has expired. Please select a time slot again to proceed.'
      }));
      return;
    }

    setFlow((prev) => ({ ...prev, isSubmitting: true, submissionError: null }));

    try {
      const result = await appointmentService.createAppointment({
        doctor_id: flow.doctor.id,
        department_id: flow.department.id,
        consultation_type: flow.consultationType.name,
        slot_start: flow.slot.slot_start,
        slot_end: flow.slot.slot_end,
        hold_token: flow.activeHold?.holdToken,
        patient: {
          full_name: patientDetails.fullName,
          phone: patientDetails.phone,
          email: patientDetails.email
        }
      });

      if (!result.success || !result.appointment_id) {
        setFlow((prev) => ({
          ...prev,
          isSubmitting: false,
          submissionError: result.error || 'Unable to confirm appointment. Please try again or contact our scheduling desk.'
        }));
      } else {
        // Construct sanitized confirmation for patient view
        const confirmation: PublicAppointmentConfirmation = {
          appointment_id: result.appointment_id,
          doctor_id: flow.doctor.id,
          doctor_name: flow.doctor.name,
          department_id: flow.department.id,
          department_name: flow.department.name,
          consultation_type: flow.consultationType.name,
          appointment_start: flow.slot.slot_start,
          appointment_end: flow.slot.slot_end,
          status: 'confirmed',
          created_at: new Date().toISOString()
        };

        // Note: confirmation_token is NOT persisted in localStorage or URLs
        setFlow((prev) => ({
          ...prev,
          isSubmitting: false,
          activeHold: null,
          confirmedAppointment: confirmation,
          currentStep: 'confirmation'
        }));
      }
    } catch {
      setFlow((prev) => ({
        ...prev,
        isSubmitting: false,
        submissionError: 'A network or service error occurred. Please verify your connection and try again.'
      }));
    }
  };

  const handleBookAnother = () => {
    setFlow({
      currentStep: 'department',
      department: null,
      doctor: null,
      consultationType: null,
      dateStr: getISTDateString(new Date()),
      slot: null,
      activeHold: null,
      patient: {
        fullName: '',
        phone: '',
        email: ''
      },
      confirmedAppointment: null,
      isSubmitting: false,
      submissionError: null
    });
    setIsHoldExpired(false);
  };

  return (
    <PageShell
      title="Book a Consultation"
      category="Appointment"
      description="Schedule outpatient visits with clinical specialists across 42 medical and surgical departments."
      statusText="Live Outpatient Scheduling"
    >
      {/* Tab navigation: Book vs Look up */}
      <div className="flex items-center gap-3 border-b border-[#E5E2D8] mb-8">
        <button
          type="button"
          onClick={() => setActiveTab('book')}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 min-h-[44px] ${
            activeTab === 'book'
              ? 'border-[#1A635E] text-[#1A635E]'
              : 'border-transparent text-[#5E666D] hover:text-[#111315]'
          }`}
        >
          <CalendarCheck size={18} weight={activeTab === 'book' ? 'bold' : 'regular'} />
          <span>Schedule an Appointment</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lookup')}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 min-h-[44px] ${
            activeTab === 'lookup'
              ? 'border-[#1A635E] text-[#1A635E]'
              : 'border-transparent text-[#5E666D] hover:text-[#111315]'
          }`}
        >
          <MagnifyingGlass size={18} weight={activeTab === 'lookup' ? 'bold' : 'regular'} />
          <span>Look Up Existing Appointment</span>
        </button>
      </div>

      {activeTab === 'lookup' ? (
        <AppointmentLookupView onBackToBooking={() => setActiveTab('book')} />
      ) : flow.currentStep === 'confirmation' && flow.confirmedAppointment ? (
        <BookingConfirmation
          confirmation={flow.confirmedAppointment}
          onBookAnother={handleBookAnother}
        />
      ) : (
        <div className="space-y-6">
          {/* Progress Indicator */}
          <StepProgressIndicator
            currentStep={flow.currentStep}
            onStepClick={handleStepClick}
            canNavigateToStep={canNavigateToStep}
          />

          {/* Two-column layout: left interaction flow, right persistent summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-md border border-[#E5E2D8] shadow-sm">
              {flow.currentStep === 'department' && (
                <DepartmentStep
                  selectedDepartment={flow.department}
                  onSelectDepartment={handleSelectDepartment}
                  onSkipToSpecialists={handleSkipToSpecialists}
                />
              )}

              {flow.currentStep === 'specialist' && (
                <SpecialistStep
                  selectedDepartment={flow.department}
                  selectedDoctor={flow.doctor}
                  onSelectDoctor={handleSelectDoctor}
                  onBack={() => handleStepClick('department')}
                />
              )}

              {flow.currentStep === 'consultation' && flow.doctor && (
                <ConsultationTypeStep
                  selectedConsultationType={flow.consultationType}
                  onSelectConsultationType={handleSelectConsultationType}
                  onBack={() => handleStepClick('specialist')}
                />
              )}

              {flow.currentStep === 'date' && (
                <DateStep
                  selectedDate={flow.dateStr}
                  onSelectDate={handleSelectDate}
                  onBack={() => handleStepClick('consultation')}
                />
              )}

              {flow.currentStep === 'slot' && flow.doctor && flow.consultationType && (
                <TimeSlotStep
                  doctor={flow.doctor}
                  consultationType={flow.consultationType}
                  dateStr={flow.dateStr}
                  activeHold={flow.activeHold}
                  onHoldAcquired={handleHoldAcquired}
                  onBack={() => handleStepClick('date')}
                />
              )}

              {flow.currentStep === 'details' && (
                <PatientDetailsStep
                  initialValues={flow.patient}
                  isHoldExpired={isHoldExpired}
                  isSubmitting={flow.isSubmitting}
                  submissionError={flow.submissionError}
                  onSubmit={handleBookingSubmit}
                  onBack={() => handleStepClick('slot')}
                />
              )}
            </div>

            <div className="lg:col-span-5">
              <BookingSummarySidebar
                flow={flow}
                onHoldExpired={handleHoldExpired}
              />
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
