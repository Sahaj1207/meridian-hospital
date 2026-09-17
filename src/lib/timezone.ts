/**
 * Meridian Hospital Timezone Utilities
 * 
 * Meridian is based in Lower Parel, Mumbai, Maharashtra, India.
 * All hospital operations, clinic consultation windows, and doctor OPD schedules
 * are authoritatively evaluated in the Asia/Kolkata (IST: UTC+05:30) timezone.
 * 
 * Strategy:
 * 1. Storage: All database timestamps for appointments and slot holds are stored in UTC ISO 8601 strings.
 * 2. Schedule Rules: Defined in local IST wall-clock times (e.g. 10:00 to 14:00).
 * 3. Conversion: Calculations explicitly map IST calendar dates and times to UTC intervals using fixed offset math (+05:30, no DST in India).
 * 4. Display: Output is formatted explicitly in Asia/Kolkata so users in any browser timezone see the exact Mumbai clinic time.
 */

export const MERIDIAN_TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET_MINUTES = 330; // +05:30 = 330 minutes

/**
 * Parses an IST date string (YYYY-MM-DD) and time string (HH:mm) into a UTC Date object.
 * Example: parseISTToUTC('2026-09-21', '10:30') => 2026-09-21T05:00:00.000Z
 */
export function parseISTToUTC(dateStr: string, timeStr: string): Date {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const [hourStr, minuteStr] = timeStr.split(':');

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);
  const hours = parseInt(hourStr, 10);
  const minutes = parseInt(minuteStr, 10);

  // UTC time = IST time minus 330 minutes (5 hours and 30 minutes)
  const utcMillis = Date.UTC(year, month, day, hours, minutes, 0, 0) - (IST_OFFSET_MINUTES * 60 * 1000);
  return new Date(utcMillis);
}

/**
 * Returns an ISO string in UTC from an IST date and time string.
 */
export function istToUtcIso(dateStr: string, timeStr: string): string {
  return parseISTToUTC(dateStr, timeStr).toISOString();
}

/**
 * Extracts the IST calendar date (YYYY-MM-DD) from an ISO UTC string or Date.
 */
export function getISTDateString(utcDate: Date | string): string {
  const dateObj = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  // Shift to IST by adding 330 minutes to UTC epoch
  const istMillis = dateObj.getTime() + (IST_OFFSET_MINUTES * 60 * 1000);
  const istDate = new Date(istMillis);

  const y = istDate.getUTCFullYear();
  const m = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(istDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Extracts the IST 24-hour time string (HH:mm) from an ISO UTC string or Date.
 */
export function getISTTimeString(utcDate: Date | string): string {
  const dateObj = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const istMillis = dateObj.getTime() + (IST_OFFSET_MINUTES * 60 * 1000);
  const istDate = new Date(istMillis);

  const h = String(istDate.getUTCHours()).padStart(2, '0');
  const min = String(istDate.getUTCMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

/**
 * Calculates day of week in Asia/Kolkata (0 = Sunday, 1 = Monday, ..., 6 = Saturday) for a YYYY-MM-DD date.
 */
export function getISTDayOfWeek(dateStr: string): number {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  // Use midday UTC to safely determine weekday in India
  const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
  return date.getUTCDay();
}

/**
 * Formats a UTC timestamp into human-readable IST time (e.g. "10:30 AM IST").
 */
export function formatISTTimeDisplay(utcDate: Date | string, includeTzLabel = true): string {
  const dateObj = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: MERIDIAN_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const formatted = formatter.format(dateObj);
  return includeTzLabel ? `${formatted} IST` : formatted;
}

/**
 * Formats a UTC timestamp into human-readable IST date (e.g. "Monday, 21 September 2026").
 */
export function formatISTDateDisplay(utcDate: Date | string): string {
  const dateObj = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: MERIDIAN_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  return formatter.format(dateObj);
}

/**
 * Validates whether a calendar date string is both structurally YYYY-MM-DD
 * and represents an authentic calendar day without silent overflow.
 * E.g. rejects '2026-02-31', '2026-04-31', '2026-13-01'.
 */
export function isValidCalendarDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}
