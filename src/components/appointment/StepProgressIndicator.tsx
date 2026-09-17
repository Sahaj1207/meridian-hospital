import type { AppointmentStep } from './types';
import { Check } from '@phosphor-icons/react';

interface StepProgressIndicatorProps {
  currentStep: AppointmentStep;
  onStepClick: (step: AppointmentStep) => void;
  canNavigateToStep: (step: AppointmentStep) => boolean;
}

interface StepItem {
  id: AppointmentStep;
  number: string;
  label: string;
}

const STEPS: StepItem[] = [
  { id: 'department', number: '01', label: 'Department' },
  { id: 'specialist', number: '02', label: 'Specialist' },
  { id: 'consultation', number: '03', label: 'Consultation' },
  { id: 'date', number: '04', label: 'Date' },
  { id: 'slot', number: '05', label: 'Time' },
  { id: 'details', number: '06', label: 'Details' },
  { id: 'confirmation', number: '07', label: 'Confirmation' }
];

export function StepProgressIndicator({
  currentStep,
  onStepClick,
  canNavigateToStep
}: StepProgressIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Appointment booking steps" className="mb-8">
      {/* Mobile progress summary */}
      <div className="lg:hidden p-4 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md mb-4">
        <div className="flex items-center justify-between text-xs text-[#5E666D] mb-1.5 font-medium">
          <span>Step {currentIndex + 1} of {STEPS.length}</span>
          <span className="font-semibold text-[#1A635E]">{STEPS[currentIndex]?.label}</span>
        </div>
        <div className="w-full h-1.5 bg-[#E5E2D8] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1A635E] transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop progress bar */}
      <ol className="hidden lg:flex items-center justify-between gap-1 w-full p-3 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md">
        {STEPS.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = index < currentIndex;
          const isClickable = canNavigateToStep(step.id) && !isCurrent;

          let stateClasses = 'text-[#8E9499] border-transparent cursor-not-allowed';
          let circleClasses = 'bg-[#F4F2EC] text-[#8E9499] border-[#E5E2D8]';

          if (isCurrent) {
            stateClasses = 'text-[#111315] font-semibold border-[#1A635E]';
            circleClasses = 'bg-[#1A635E] text-white border-[#1A635E]';
          } else if (isCompleted) {
            stateClasses = 'text-[#1A635E] font-medium hover:text-[#14514D] cursor-pointer';
            circleClasses = 'bg-[#EDF5F4] text-[#1A635E] border-[#BCD9D6]';
          }

          return (
            <li
              key={step.id}
              className="flex-1 min-w-0"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(step.id)}
                className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded transition-all ${stateClasses}`}
                aria-label={`Step ${step.number}: ${step.label}${isCurrent ? ' (Current)' : isCompleted ? ' (Completed)' : ''}`}
              >
                <span
                  className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-semibold shrink-0 transition-colors ${circleClasses}`}
                >
                  {isCompleted ? <Check size={12} weight="bold" /> : step.number}
                </span>
                <span className="text-xs truncate tracking-tight">
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
