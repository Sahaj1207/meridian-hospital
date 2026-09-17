import { PageShell } from '@/components/shared/PageShell';
import { CreditCard, Receipt } from '@phosphor-icons/react';

export function InsuranceBillingPage() {
  return (
    <PageShell
      title="Insurance & Billing Transparency"
      category="Insurance & Billing"
      description="Transparent pricing, cashless insurance desk coordination, and itemized billing support for planned and emergency admissions."
      statusText="Billing Architecture Initialized"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md">
          <div className="w-10 h-10 rounded bg-[#EDF5F4] text-[#1A635E] flex items-center justify-center mb-4">
            <CreditCard size={22} weight="bold" />
          </div>
          <h2 className="font-display text-xl font-semibold text-[#111315] mb-2">
            Cashless Hospitalization
          </h2>
          <p className="text-sm text-[#3C4247] leading-relaxed mb-4">
            Our Central Insurance Desk works with major health insurance companies and Third Party Administrators (TPAs) to process cashless claims efficiently.
          </p>
          <ul className="space-y-2 text-xs text-[#5E666D]">
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1A635E]"></span>
              <span>Dedicated pre-authorization guidance for planned surgeries</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1A635E]"></span>
              <span>Real-time claim tracking desk in Tower A Ground Floor</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1A635E]"></span>
              <span>Assistance with reimbursement documentation for non-network policies</span>
            </li>
          </ul>
        </div>

        <div className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md">
          <div className="w-10 h-10 rounded bg-[#EDF5F4] text-[#1A635E] flex items-center justify-center mb-4">
            <Receipt size={22} weight="bold" />
          </div>
          <h2 className="font-display text-xl font-semibold text-[#111315] mb-2">
            Itemized Clinical Estimates
          </h2>
          <p className="text-sm text-[#3C4247] leading-relaxed mb-4">
            We adhere to strict transparency principles. Patients receive written financial estimates detailing room tariffs, surgical charges, implants, and consumables before admission.
          </p>
          <ul className="space-y-2 text-xs text-[#5E666D]">
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1A635E]"></span>
              <span>Standardized procedure package options</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1A635E]"></span>
              <span>Daily interim billing updates during inpatient stays</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1A635E]"></span>
              <span>Financial counseling desks on each inpatient floor</span>
            </li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
