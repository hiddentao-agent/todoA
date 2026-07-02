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
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Check if an ISO date string is before today (and thus overdue). */
export function isOverdue(isoDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(isoDate + 'T00:00:00');
  return due < today;
}
