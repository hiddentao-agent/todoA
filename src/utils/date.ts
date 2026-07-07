/** Midnight time suffix appended to ISO date strings for local-timezone parsing. */
export const MIDNIGHT_TIME = 'T00:00:00';

/** Validate a date string matches YYYY-MM-DD and is a valid calendar date. */
export function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + MIDNIGHT_TIME);
  if (isNaN(d.getTime())) return false;
  // Verify the parsed date is the same day as the input — Date()
  // silently rolls over invalid dates like 2026-02-30 → 2026-03-02.
  const [yyyy, mm, dd] = s.split('-').map(Number);
  return d.getFullYear() === yyyy && d.getMonth() + 1 === mm && d.getDate() === dd;
}

/** Return today's date as a YYYY-MM-DD string in the local timezone. */
export function getTodayISO(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Get the Monday 00:00:00 and Sunday 23:59:59.999 bounds for the week
 * containing the given date, in the local timezone.
 */
export function getWeekBounds(date: Date): { monday: Date; sunday: Date } {
  const day = date.getDay();
  // getDay() returns 0=Sun, 1=Mon, ..., 6=Sat
  const diffToMonday = day === 0 ? 6 : day - 1;

  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

/** Format an ISO date string as "Mon DD" (e.g. "Jul 15"). */
export function formatDueDate(isoDate: string): string {
  const d = new Date(isoDate + MIDNIGHT_TIME);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Check if an ISO date string is before today (and thus overdue). */
export function isOverdue(isoDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(isoDate + MIDNIGHT_TIME);
  return due < today;
}
