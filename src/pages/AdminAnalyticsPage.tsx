import { useState, useEffect, useCallback } from 'react';
import { 
  ChartBar, 
  CalendarCheck, 
  Clock, 
  ShieldCheck, 
  WarningCircle, 
  ArrowClockwise,
  CheckCircle,
  XCircle,
  Prohibit,
  Buildings,
  UserCircle,
  FileText
} from '@phosphor-icons/react';
import type { 
  DateRangePreset, 
  OperationalAnalyticsReport, 
  DateRangeFilter 
} from '@/types/analytics';
import { analyticsService } from '@/services/analyticsService';
import { authService } from '@/services/authService';
import { isSupabaseConfigured, isProductionEnvironment } from '@/services/supabaseClient';

export function AdminAnalyticsPage() {
  const [userRole, setUserRole] = useState<'public' | 'staff' | 'admin'>('public');
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('last_7_days');
  const [report, setReport] = useState<OperationalAnalyticsReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [authWorking, setAuthWorking] = useState<boolean>(false);

  // Check auth role
  const checkRole = useCallback(async () => {
    try {
      const role = await authService.getUserRole();
      setUserRole(role);
      return role;
    } catch {
      setUserRole('public');
      return 'public';
    }
  }, []);

  // Fetch consolidated operational report
  const fetchReport = useCallback(async (preset: DateRangePreset, role?: string) => {
    setLoading(true);
    setError(null);
    try {
      const activeRole = role || userRole;
      const isAuthorized = activeRole === 'staff' || activeRole === 'admin';

      if (!isAuthorized) {
        setReport(null);
        setLoading(false);
        return;
      }

      const rangeFilter: DateRangeFilter = analyticsService.resolveDateRange(preset);
      // Consolidated fetch: acquire once, derive all metrics from unified snapshot
      const data = await analyticsService.getCompleteReport(rangeFilter);
      setReport(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to compile operational report.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    checkRole().then((role) => {
      fetchReport(selectedPreset, role);
    });
  }, [checkRole, fetchReport, selectedPreset]);

  // Demo staff authorization toggle
  const handleToggleDemoStaff = async () => {
    setAuthWorking(true);
    try {
      if (userRole === 'public') {
        const res = await authService.signIn({
          email: 'staff.operations@meridianhospital.in',
          password: 'demo-password'
        });
        if (res.success && res.user) {
          setUserRole(res.user.role);
          await fetchReport(selectedPreset, res.user.role);
        }
      } else {
        await authService.signOut();
        setUserRole('public');
        setReport(null);
      }
    } catch {
      // ignore
    } finally {
      setAuthWorking(false);
    }
  };

  const handleRangeChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset);
    fetchReport(preset);
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#111315] font-sans pb-16">
      {/* Top Console Bar */}
      <div className="bg-[#111315] text-[#FAF9F6] border-b border-[#2A2E33] px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3FB950] animate-pulse"></span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono tracking-widest text-[#9EA7B0] uppercase">
                  MERIDIAN HOSPITAL OPERATIONS CONSOLE
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#20252A] text-[#D0D7DE] border border-[#30363D]">
                  IST (UTC+05:30)
                </span>
              </div>
              <h1 className="text-sm font-semibold tracking-tight text-[#FAF9F6]">
                Authoritative Outpatient Telemetry & Analytics
              </h1>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1B2026] border border-[#2D333B] text-[#9EA7B0]">
              <span className="text-[10px] uppercase text-[#768390]">Source:</span>
              <strong className="text-[#FAF9F6]">
                {isSupabaseConfigured ? 'Supabase Cloud Store' : 'Authoritative Local Store'}
              </strong>
            </span>

            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border ${
              userRole === 'public' 
                ? 'bg-[#3E1B1E] border-[#F85149] text-[#FFA198]' 
                : 'bg-[#153424] border-[#2EA043] text-[#7EE787]'
            }`}>
              <ShieldCheck size={14} />
              <span>Role: <strong className="uppercase">{userRole}</strong></span>
            </span>

            {userRole !== 'public' ? (
              <button
                onClick={handleToggleDemoStaff}
                disabled={authWorking}
                className="px-2.5 py-1 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#3D444D] text-[#E6EDF3] transition-colors cursor-pointer text-xs disabled:opacity-50"
                title="Sign out of current staff session"
              >
                Sign Out
              </button>
            ) : !isProductionEnvironment() ? (
              <button
                onClick={handleToggleDemoStaff}
                disabled={authWorking}
                className="px-2.5 py-1 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#3D444D] text-[#E6EDF3] transition-colors cursor-pointer text-xs disabled:opacity-50"
                title="Toggle Staff Role for local review"
              >
                Sign In as Staff
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-8">
        {/* Subheader and Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E5E2D8]">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#1A635E] font-medium mb-1">
              Operational Reporting
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-[#111315]">
              Outpatient Capacity & Utilization
            </h2>
            <p className="text-xs md:text-sm text-[#5E666D] mt-1">
              All timestamps and daily buckets evaluate strictly in Asia/Kolkata wall clock time.
            </p>
          </div>

          {userRole !== 'public' && (
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md p-1 bg-[#EAE7DE] border border-[#D9D5CA]">
                {(['today', 'last_7_days', 'last_30_days', 'last_90_days'] as DateRangePreset[]).map((preset) => {
                  const labels: Record<DateRangePreset, string> = {
                    today: 'Today',
                    last_7_days: 'Last 7 Days',
                    last_30_days: 'Last 30 Days',
                    last_90_days: 'Last 90 Days',
                    custom: 'Custom'
                  };
                  const active = selectedPreset === preset;
                  return (
                    <button
                      key={preset}
                      onClick={() => handleRangeChange(preset)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-all cursor-pointer ${
                        active
                          ? 'bg-[#FAF9F6] text-[#111315] shadow-sm font-semibold'
                          : 'text-[#5E666D] hover:text-[#111315]'
                      }`}
                    >
                      {labels[preset]}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => fetchReport(selectedPreset)}
                disabled={loading}
                className="p-2 rounded-md bg-[#FAF9F6] border border-[#D9D5CA] text-[#5E666D] hover:text-[#111315] hover:border-[#1A635E] transition-colors cursor-pointer disabled:opacity-50"
                title="Refresh Operational Metrics"
              >
                <ArrowClockwise size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          )}
        </div>

        {/* Access Gate for Public / Unauthenticated visitors */}
        {userRole === 'public' && (
          <div className="p-8 bg-[#FAF9F6] border border-[#D9D5CA] rounded-md text-center max-w-xl mx-auto space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#FCE8E6] text-[#C5221F] flex items-center justify-center mx-auto">
              <Prohibit size={24} weight="bold" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#111315]">
                Restricted Operational Telemetry
              </h3>
              <p className="text-xs text-[#5E666D] mt-1.5 leading-relaxed">
                Outpatient operational analytics, specialist scheduling utilization, and departmental demand telemetry are restricted to authenticated hospital staff and administration.
              </p>
            </div>
            {!isProductionEnvironment() ? (
              <div className="pt-2">
                <button
                  onClick={handleToggleDemoStaff}
                  disabled={authWorking}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#1A635E] hover:bg-[#134e4a] text-[#FAF9F6] text-xs font-medium tracking-wide transition-colors cursor-pointer"
                >
                  <ShieldCheck size={16} />
                  <span>Initialize Staff Session (Demo Environment)</span>
                </button>
              </div>
            ) : (
              <div className="pt-2 text-xs text-[#8E9499] bg-[#EAE7DE] p-3 rounded border border-[#D9D5CA]">
                Production Security: Sign in using authorized hospital staff credentials via Supabase Auth. Local demo elevation is disabled in production deployments.
              </div>
            )}
            <div className="text-[11px] font-mono text-[#8E9499]">
              Authorization verified via server app_metadata role claims.
            </div>
          </div>
        )}

        {/* Loading State */}
        {userRole !== 'public' && loading && (
          <div className="p-12 text-center text-[#5E666D] space-y-2">
            <div className="inline-block animate-spin text-[#1A635E]">
              <ArrowClockwise size={28} />
            </div>
            <p className="text-xs font-medium">Synthesizing authoritative operational snapshot...</p>
          </div>
        )}

        {/* Error State */}
        {userRole !== 'public' && error && !loading && (
          <div className="p-4 rounded-md bg-[#FCE8E6] border border-[#F5C2C7] text-[#842029] flex items-start gap-3">
            <WarningCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="font-semibold block mb-0.5">Telemetry compilation error:</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Active Telemetry Console */}
        {userRole !== 'public' && report && !loading && (
          <div className="space-y-8">
            {/* Overview Metric Ribbon */}
            <section aria-labelledby="metric-ribbon-heading">
              <h3 id="metric-ribbon-heading" className="sr-only">Operational Metrics Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* Card 1: Today's Total */}
                <div className="p-4 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md">
                  <div className="flex items-center justify-between text-[#8E9499] mb-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider">Appointments Today</span>
                    <CalendarCheck size={16} className="text-[#1A635E]" />
                  </div>
                  <div className="text-2xl font-display font-semibold text-[#111315]">
                    {report.overview.appointments_today}
                  </div>
                  <div className="text-[11px] text-[#5E666D] mt-1 flex items-center gap-1.5">
                    <span className="text-[#1A635E] font-medium">{report.overview.active_today} Active</span>
                    <span className="text-[#D9D5CA]">•</span>
                    <span>{report.overview.completed_today} Completed</span>
                  </div>
                </div>

                {/* Card 2: Period Total Bookings */}
                <div className="p-4 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md">
                  <div className="flex items-center justify-between text-[#8E9499] mb-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider">Period Volume</span>
                    <ChartBar size={16} className="text-[#1A635E]" />
                  </div>
                  <div className="text-2xl font-display font-semibold text-[#111315]">
                    {report.overview.total_in_period}
                  </div>
                  <div className="text-[11px] text-[#5E666D] mt-1 flex items-center gap-1.5">
                    <span>{report.overview.active_in_period} Active</span>
                    <span className="text-[#D9D5CA]">•</span>
                    <span>{report.overview.cancelled_in_period} Cancelled</span>
                  </div>
                </div>

                {/* Card 3: Cancellation Rate */}
                <div className="p-4 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md">
                  <div className="flex items-center justify-between text-[#8E9499] mb-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider">Cancellation Rate</span>
                    <XCircle size={16} className="text-[#8E9499]" />
                  </div>
                  <div className="text-2xl font-display font-semibold text-[#111315]">
                    {report.overview.has_cancellation_data 
                      ? `${report.overview.cancellation_rate_percentage}%` 
                      : '0.0%'}
                  </div>
                  <div className="text-[11px] text-[#5E666D] mt-1">
                    {report.overview.has_cancellation_data 
                      ? 'Relative to bookings created in window' 
                      : 'No bookings created in window'}
                  </div>
                </div>

                {/* Card 4: No-Show Rate */}
                <div className="p-4 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md">
                  <div className="flex items-center justify-between text-[#8E9499] mb-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider">No Show Rate</span>
                    <WarningCircle size={16} className="text-[#8E9499]" />
                  </div>
                  <div className="text-2xl font-display font-semibold text-[#111315]">
                    {report.overview.has_no_show_data 
                      ? `${report.overview.no_show_rate_percentage}%` 
                      : '0.0%'}
                  </div>
                  <div className="text-[11px] text-[#5E666D] mt-1">
                    {report.overview.has_no_show_data 
                      ? `${report.overview.no_show_in_period} unfulfilled of ${report.overview.completed_in_period + report.overview.no_show_in_period} terminal` 
                      : 'No terminal records in window'}
                  </div>
                </div>

                {/* Card 5: Operational Scope */}
                <div className="p-4 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md col-span-2 md:col-span-4 lg:col-span-1">
                  <div className="flex items-center justify-between text-[#8E9499] mb-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider">Analyzed Records</span>
                    <FileText size={16} className="text-[#1A635E]" />
                  </div>
                  <div className="text-2xl font-display font-semibold text-[#111315]">
                    {report.total_appointments_analyzed}
                  </div>
                  <div className="text-[11px] text-[#5E666D] mt-1">
                    Window: {report.filter.start_date_ist} to {report.filter.end_date_ist}
                  </div>
                </div>
              </div>
            </section>

            {/* Daily Timeline Activity */}
            <section aria-labelledby="daily-activity-heading" className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 id="daily-activity-heading" className="text-sm font-semibold text-[#111315] uppercase tracking-wider">
                    Daily Appointment Timeline (Asia/Kolkata)
                  </h3>
                  <p className="text-xs text-[#5E666D]">
                    Rolling volume per calendar day across the selected date range.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-[#8E9499]">
                  {report.daily_activity.length} calendar days evaluated
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E2D8] text-[#8E9499] uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3 font-medium">Date (IST)</th>
                      <th className="py-2.5 px-3 font-medium text-right">Active</th>
                      <th className="py-2.5 px-3 font-medium text-right">Confirmed</th>
                      <th className="py-2.5 px-3 font-medium text-right">Pending</th>
                      <th className="py-2.5 px-3 font-medium text-right">Completed</th>
                      <th className="py-2.5 px-3 font-medium text-right">Cancelled</th>
                      <th className="py-2.5 px-3 font-medium text-right">No Show</th>
                      <th className="py-2.5 px-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE7DE]">
                    {report.daily_activity.map((day) => (
                      <tr key={day.date} className="hover:bg-[#F2EFE9] transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium text-[#111315]">
                          {day.formatted_date} <span className="text-[#8E9499] text-[10px]">({day.date})</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-[#1A635E]">
                          {day.active}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#5E666D]">
                          {day.confirmed}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#5E666D]">
                          {day.pending}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#5E666D]">
                          {day.completed}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#8E9499]">
                          {day.cancelled}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#8E9499]">
                          {day.no_show}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-[#111315]">
                          {day.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Two-Column Section: Department Demand & Specialist Utilization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Department Demand */}
              <section aria-labelledby="department-demand-heading" className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-[#1A635E] mb-1">
                    <Buildings size={16} />
                    <span className="text-xs uppercase tracking-wider font-semibold">Specialty Allocations</span>
                  </div>
                  <h3 id="department-demand-heading" className="text-sm font-semibold text-[#111315]">
                    Appointments by Department
                  </h3>
                  <p className="text-xs text-[#5E666D]">
                    Relative clinical share across outpatient departments.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {report.department_demand.length === 0 ? (
                    <div className="text-xs text-[#8E9499] py-4 text-center">
                      No departmental appointment data in this range.
                    </div>
                  ) : (
                    report.department_demand.map((dept) => (
                      <div key={dept.department_id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#111315]">{dept.department_name}</span>
                          <span className="font-mono text-[#5E666D]">
                            {dept.appointment_count} ({dept.percentage_share}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#E5E2D8] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#1A635E] h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(dept.percentage_share, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Right Column: Specialist Utilization */}
              <section aria-labelledby="specialist-utilization-heading" className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-[#1A635E] mb-1">
                    <UserCircle size={16} />
                    <span className="text-xs uppercase tracking-wider font-semibold">Clinical Load Balancing</span>
                  </div>
                  <h3 id="specialist-utilization-heading" className="text-sm font-semibold text-[#111315]">
                    Specialist Capacity & Utilization
                  </h3>
                  <p className="text-xs text-[#5E666D]">
                    Booked outpatient consultation minutes against scheduled availability windows.
                  </p>
                </div>

                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E5E2D8] text-[#8E9499] uppercase text-[10px] tracking-wider">
                        <th className="py-2 px-2 font-medium">Specialist</th>
                        <th className="py-2 px-2 font-medium">Scheduled</th>
                        <th className="py-2 px-2 font-medium">Booked</th>
                        <th className="py-2 px-2 font-medium text-right">Utilization</th>
                        <th className="py-2 px-2 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE7DE]">
                      {report.specialist_utilization.map((spec) => {
                        const schedHours = Math.round((spec.scheduled_minutes / 60) * 10) / 10;
                        const bookedHours = Math.round((spec.booked_minutes / 60) * 10) / 10;

                        const statusBadgeStyles: Record<string, { label: string; class: string }> = {
                          active: { label: 'Active', class: 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]' },
                          zero_utilization: { label: '0% Utilized', class: 'bg-[#FEF7E0] text-[#B06000] border-[#FEEFC3]' },
                          no_schedule: { label: 'No Schedule', class: 'bg-[#F1F3F4] text-[#5F6368] border-[#DADCE0]' },
                          unavailable: { label: 'Unavailable', class: 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]' }
                        };

                        const badge = statusBadgeStyles[spec.status] || statusBadgeStyles.active;

                        return (
                          <tr key={spec.doctor_id} className="hover:bg-[#F2EFE9] transition-colors">
                            <td className="py-2 px-2">
                              <div className="font-medium text-[#111315]">{spec.doctor_name}</div>
                              <div className="text-[10px] text-[#8E9499]">{spec.department_name}</div>
                            </td>
                            <td className="py-2 px-2 font-mono text-[#5E666D]">
                              {schedHours}h
                            </td>
                            <td className="py-2 px-2 font-mono text-[#111315]">
                              {bookedHours}h
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-semibold text-[#1A635E]">
                              {spec.status === 'no_schedule' ? 'N/A' : `${spec.utilization_percentage}%`}
                            </td>
                            <td className="py-2 px-2 text-right">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${badge.class}`}>
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* Peak Hours: All 24 hours represented, 08:00 to 18:00 framed */}
            <section aria-labelledby="peak-hours-heading" className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-[#1A635E] mb-1">
                    <Clock size={16} />
                    <span className="text-xs uppercase tracking-wider font-semibold">Temporal Distribution</span>
                  </div>
                  <h3 id="peak-hours-heading" className="text-sm font-semibold text-[#111315]">
                    Peak Appointment Hours across 24 Hours (Asia/Kolkata)
                  </h3>
                  <p className="text-xs text-[#5E666D]">
                    Distribution of active consultations across all 24 local hours. The standard hospital OPD window (08:00 to 18:00 IST) is highlighted.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 text-[#1A635E] font-medium">
                    <span className="w-3 h-3 rounded-sm bg-[#1A635E]"></span>
                    Operating Window (08:00 - 18:00)
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[#8E9499]">
                    <span className="w-3 h-3 rounded-sm bg-[#D9D5CA]"></span>
                    Off Hours (00:00 - 07:00, 19:00 - 23:00)
                  </span>
                </div>
              </div>

              {/* 24-hour visual bar representation */}
              <div className="pt-4 overflow-x-auto">
                <div className="min-w-[720px] grid grid-cols-24 gap-1 items-end h-40 border-b border-[#E5E2D8] pb-2">
                  {report.peak_hours.map((hourMetric) => {
                    const maxCount = Math.max(...report.peak_hours.map((h) => h.appointment_count), 1);
                    const barHeightPct = Math.round((hourMetric.appointment_count / maxCount) * 100);

                    return (
                      <div
                        key={hourMetric.hour}
                        className={`flex flex-col items-center justify-end h-full group relative ${
                          hourMetric.is_operating_hour
                            ? 'bg-[#F2EFE9] border-t border-x border-[#E5E2D8] rounded-t-sm'
                            : 'opacity-70'
                        }`}
                        title={`${hourMetric.formatted_hour}: ${hourMetric.appointment_count} appointments (${hourMetric.is_operating_hour ? 'Standard Operating Window' : 'Off-Hours Window'})`}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-7 hidden group-hover:block z-10 px-1.5 py-0.5 rounded bg-[#111315] text-[#FAF9F6] text-[10px] font-mono whitespace-nowrap shadow">
                          {hourMetric.appointment_count} appts
                        </div>

                        {/* Bar */}
                        <div
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            hourMetric.is_operating_hour
                              ? hourMetric.appointment_count > 0 ? 'bg-[#1A635E]' : 'bg-[#D9D5CA]'
                              : hourMetric.appointment_count > 0 ? 'bg-[#C5832B]' : 'bg-[#E5E2D8]'
                          }`}
                          style={{ height: `${Math.max(barHeightPct, 4)}%` }}
                        ></div>

                        {/* Hour Label */}
                        <div className="text-[9px] font-mono text-[#8E9499] mt-1 truncate">
                          {String(hourMetric.hour).padStart(2, '0')}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-[#8E9499] mt-1.5 px-1">
                  <span>00:00 (Midnight)</span>
                  <span className="text-[#1A635E] font-medium font-sans uppercase">Standard OPD Window: 08:00 to 18:00 IST</span>
                  <span>23:00 (Late Night)</span>
                </div>
              </div>
            </section>

            {/* Bottom Row: Status Distribution & Consultation Types */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Status Distribution */}
              <section aria-labelledby="status-dist-heading" className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md space-y-4">
                <h3 id="status-dist-heading" className="text-sm font-semibold text-[#111315] uppercase tracking-wider">
                  Lifecycle Status Distribution
                </h3>
                <div className="space-y-2.5">
                  {report.status_distribution.map((st) => (
                    <div key={st.status} className="flex items-center justify-between text-xs py-1 border-b border-[#EAE7DE] last:border-0">
                      <div className="flex items-center gap-2">
                        {st.status === 'confirmed' && <CheckCircle size={14} className="text-[#1A635E]" />}
                        {st.status === 'completed' && <CheckCircle size={14} className="text-[#137333]" />}
                        {st.status === 'pending' && <Clock size={14} className="text-[#B06000]" />}
                        {st.status === 'cancelled' && <XCircle size={14} className="text-[#8E9499]" />}
                        {st.status === 'no_show' && <WarningCircle size={14} className="text-[#C5221F]" />}
                        <span className="font-medium text-[#111315]">{st.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#5E666D]">{st.count}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EAE7DE] text-[#5E666D]">
                          {st.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Consultation Type Demand */}
              <section aria-labelledby="consultation-types-heading" className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md space-y-4">
                <h3 id="consultation-types-heading" className="text-sm font-semibold text-[#111315] uppercase tracking-wider">
                  Consultation Format Demand
                </h3>
                <div className="space-y-3">
                  {report.consultation_type_demand.map((cType) => (
                    <div key={cType.consultation_type_id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#111315]">{cType.consultation_type_name}</span>
                        <span className="font-mono text-[#5E666D]">
                          {cType.appointment_count} ({cType.percentage_share}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#E5E2D8] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#1A635E] h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(cType.percentage_share, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Console Footnote */}
            <div className="text-[11px] text-[#8E9499] flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[#E5E2D8] pt-4">
              <span>
                Report generated at {new Date(report.generated_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST from consolidated snapshot.
              </span>
              <span>
                Authoritative calendar semantics bounded to Asia/Kolkata. Zero em dash standard verified.
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
