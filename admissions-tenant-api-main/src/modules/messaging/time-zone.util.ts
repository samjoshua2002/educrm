/**
 * Time-zone helpers shared by messaging, email campaigns and scheduled
 * communications. Scheduling forms send a wall-clock value
 * ("2026-10-20T10:30") plus an IANA time zone ("Asia/Kolkata"); these helpers
 * turn that into the exact UTC instant to store and compare against.
 */

export const DEFAULT_TIME_ZONE = 'Asia/Kolkata';

export function isValidTimeZone(tz?: string | null): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Offset (ms) of `tz` from UTC at the given instant. */
function tzOffsetMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - date.getTime();
}

/**
 * Converts a schedule value into a UTC Date.
 * - Values that already carry an offset / 'Z' are parsed as-is.
 * - Wall-clock values ("YYYY-MM-DDTHH:mm[:ss]") are interpreted in `tz`.
 */
export function toUtcDate(value: string | Date | null | undefined, tz?: string | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const str = String(value).trim();
  if (!str) return null;
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  const zone = isValidTimeZone(tz) ? (tz as string) : DEFAULT_TIME_ZONE;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  // Two passes handle DST transitions correctly.
  let utc = guess - tzOffsetMs(new Date(guess), zone);
  utc = guess - tzOffsetMs(new Date(utc), zone);
  return new Date(utc);
}
