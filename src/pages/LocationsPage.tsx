import { PageShell } from '@/components/shared/PageShell';
import { hospitalContent } from '@/data/hospitalContent';
import { MapPin, NavigationArrow, Car, Bus, FirstAid } from '@phosphor-icons/react';

export function LocationsPage() {
  return (
    <PageShell
      title="Hospital Campus & Access"
      category="Locations"
      description="Location coordinates, building layout, parking access, and ambulance entry points for Meridian Hospital."
      statusText="Campus Access Architecture"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md">
            <h2 className="font-display text-2xl font-semibold text-[#111315] mb-4">
              Main Hospital Campus
            </h2>
            <div className="space-y-3 text-sm text-[#3C4247]">
              <div className="flex items-start gap-3">
                <MapPin size={20} className="text-[#1A635E] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#111315]">Address</strong>
                  <span>{hospitalContent.location.address}, {hospitalContent.location.city}, {hospitalContent.location.state}, {hospitalContent.location.country}</span>
                  <span className="block text-xs text-[#8E9499] mt-0.5">Landmark: {hospitalContent.location.landmark}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-[#E5E2D8]">
                <NavigationArrow size={20} className="text-[#1A635E] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#111315]">Geographic Coordinates</strong>
                  <span>{hospitalContent.location.coordinates.latitude}&deg; N, {hospitalContent.location.coordinates.longitude}&deg; E</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md">
            <h2 className="font-display text-2xl font-semibold text-[#111315] mb-4">
              Transit & Parking Access
            </h2>
            <div className="space-y-4 text-sm text-[#3C4247]">
              <div className="flex items-start gap-3">
                <Car size={20} className="text-[#1A635E] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#111315]">Patient & Visitor Parking</strong>
                  <p className="text-xs text-[#5E666D]">
                    Multi-level underground parking accessed via Gate 2. Valet assistance available at Main Atrium Portico.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Bus size={20} className="text-[#1A635E] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#111315]">Public Transit Links</strong>
                  <p className="text-xs text-[#5E666D]">
                    5-minute walking distance from Lower Parel railway station and monorail connections.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Gate Access Box */}
        <div className="space-y-6">
          <div className="p-6 bg-[#FDF2F2] border border-[#F1C5C5] rounded-md">
            <div className="flex items-center gap-2 text-[#9E2A2B] font-semibold text-xs uppercase tracking-wider mb-2">
              <FirstAid size={16} weight="fill" />
              <span>Emergency Entry Gate</span>
            </div>
            <h3 className="font-display text-xl font-semibold text-[#111315] mb-2">
              Ambulance & Critical Access
            </h3>
            <p className="text-xs text-[#5E666D] leading-relaxed mb-4">
              {hospitalContent.emergency.deskNote}. Ramp access direct to resuscitation and trauma triage bays.
            </p>
            <div className="p-3 bg-white rounded border border-[#F1C5C5] text-xs">
              <span className="block text-[#5E666D]">Emergency Hotline:</span>
              <span className="font-semibold text-[#9E2A2B] text-sm">{hospitalContent.emergency.phone}</span>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
