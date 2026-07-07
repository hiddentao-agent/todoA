import { describe, it, expect } from 'vitest';
import {
  getWeekBounds,
  formatDueDate,
  isOverdue,
  isValidDateString,
  getTodayISO,
} from '@/utils/date';

describe('getWeekBounds', () => {
  it('returns Monday 00:00 to Sunday 23:59 for a given date', () => {
    // 2026-07-02 is a Thursday
    const date = new Date('2026-07-02T12:00:00');
    const { monday, sunday } = getWeekBounds(date);

    // Monday should be 2026-06-29
    expect(monday.getFullYear()).toBe(2026);
    expect(monday.getMonth()).toBe(5); // June = 5 (0-indexed)
    expect(monday.getDate()).toBe(29);
    expect(monday.getHours()).toBe(0);
    expect(monday.getMinutes()).toBe(0);

    // Sunday should be 2026-07-05
    expect(sunday.getFullYear()).toBe(2026);
    expect(sunday.getMonth()).toBe(6); // July = 6
    expect(sunday.getDate()).toBe(5);
    expect(sunday.getHours()).toBe(23);
    expect(sunday.getMinutes()).toBe(59);
  });

  it('handles Sunday correctly (Sunday itself is start of week per spec)', () => {
    // 2026-07-05 is a Sunday
    const date = new Date('2026-07-05T12:00:00');
    const { monday, sunday } = getWeekBounds(date);

    // Monday should be 2026-06-29
    expect(monday.getDate()).toBe(29);
    // Sunday should be 2026-07-05
    expect(sunday.getDate()).toBe(5);
  });

  it('handles Monday correctly', () => {
    const date = new Date('2026-06-29T12:00:00');
    const { monday, sunday } = getWeekBounds(date);

    expect(monday.getDate()).toBe(29);
    expect(sunday.getDate()).toBe(5);
  });
});

describe('formatDueDate', () => {
  it('formats an ISO date as "Mon DD"', () => {
    expect(formatDueDate('2026-07-15')).toBe('Jul 15');
    expect(formatDueDate('2026-01-01')).toBe('Jan 1');
    expect(formatDueDate('2026-12-25')).toBe('Dec 25');
  });
});

describe('isOverdue', () => {
  it('returns true for dates before today', () => {
    // 2020-01-01 is before 2026-07-02
    expect(isOverdue('2020-01-01')).toBe(true);
  });

  it('returns false for dates after today', () => {
    // 2027-01-01 is after 2026-07-02
    expect(isOverdue('2027-01-01')).toBe(false);
  });

  it('returns false for today', () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    expect(isOverdue(`${yyyy}-${mm}-${dd}`)).toBe(false);
  });
});

describe('isValidDateString', () => {
  it('returns true for a valid YYYY-MM-DD string', () => {
    expect(isValidDateString('2026-07-15')).toBe(true);
    expect(isValidDateString('2026-01-01')).toBe(true);
    expect(isValidDateString('2026-12-31')).toBe(true);
  });

  it('returns false for strings not matching YYYY-MM-DD format', () => {
    expect(isValidDateString('2026-7-15')).toBe(false);
    expect(isValidDateString('26-07-15')).toBe(false);
    expect(isValidDateString('2026/07/15')).toBe(false);
    expect(isValidDateString('2026-07-15T00:00:00')).toBe(false);
  });

  it('returns false for non-date strings', () => {
    expect(isValidDateString('not-a-date')).toBe(false);
    expect(isValidDateString('abcdef-gh-ij')).toBe(false);
    expect(isValidDateString('')).toBe(false);
  });

  it('returns false for invalid dates with correct format', () => {
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('2026-13-01')).toBe(false);
    expect(isValidDateString('2026-00-01')).toBe(false);
  });
});

describe('getTodayISO', () => {
  it('returns a YYYY-MM-DD string matching today', () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    expect(getTodayISO()).toBe(`${yyyy}-${mm}-${dd}`);
  });

  it('matches the expected YYYY-MM-DD format', () => {
    expect(getTodayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
