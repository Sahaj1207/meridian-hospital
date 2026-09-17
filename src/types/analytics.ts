export type DateRangePreset = 
  | 'today' 
  | 'last_7_days' 
  | 'last_30_days' 
  | 'last_90_days' 
  | 'custom';

export interface DateRangeFilter {
  preset: DateRangePreset;
  start_date_ist: string; // YYYY-MM-DD
  end_date_ist: string;   // YYYY-MM-DD
}

export interface AppointmentOverviewMetrics {
  appointments_today: number;
  active_today: number;
  completed_today: number;
  cancelled_today: number;
  no_show_today: number;
  total_in_period: number;
  active_in_period: number;
  completed_in_period: number;
  cancelled_in_period: number;
  no_show_in_period: number;
  cancellation_rate_percentage: number;
  no_show_rate_percentage: number;
  has_cancellation_data: boolean;
  has_no_show_data: boolean;
}

export interface DailyAppointmentMetric {
  date: string; // YYYY-MM-DD in Asia/Kolkata
  formatted_date: string; // e.g. "Mon, 16 Nov"
  total: number;
  active: number;
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export interface DepartmentDemandMetric {
  department_id: string;
  department_name: string;
  appointment_count: number;
  percentage_share: number;
}

export type SpecialistUtilizationStatus = 
  | 'active' 
  | 'zero_utilization' 
  | 'no_schedule' 
  | 'unavailable';

export interface SpecialistUtilizationMetric {
  doctor_id: string;
  doctor_name: string;
  department_id: string;
  department_name: string;
  scheduled_minutes: number;
  booked_minutes: number;
  utilization_percentage: number;
  status: SpecialistUtilizationStatus;
}

export interface PeakHourMetric {
  hour: number; // 0 to 23
  formatted_hour: string; // e.g. "10:00 AM"
  appointment_count: number;
  is_operating_hour: boolean; // 8 to 18
}

export interface StatusDistributionMetric {
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  label: string;
  count: number;
  percentage: number;
}

export interface ConsultationTypeDemandMetric {
  consultation_type_id: string;
  consultation_type_name: string;
  appointment_count: number;
  percentage_share: number;
}

export interface OperationalAnalyticsReport {
  generated_at: string;
  timezone: string; // Asia/Kolkata
  filter: DateRangeFilter;
  overview: AppointmentOverviewMetrics;
  daily_activity: DailyAppointmentMetric[];
  department_demand: DepartmentDemandMetric[];
  specialist_utilization: SpecialistUtilizationMetric[];
  peak_hours: PeakHourMetric[];
  status_distribution: StatusDistributionMetric[];
  consultation_type_demand: ConsultationTypeDemandMetric[];
  is_demo_data: boolean;
  total_appointments_analyzed: number;
}

export type AnalyticsErrorCode = 
  | 'UNAUTHORIZED' 
  | 'INVALID_RANGE' 
  | 'SERVICE_ERROR';
