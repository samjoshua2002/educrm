/**
 * Scheduling helpers for Communication Management forms.
 *
 * Scheduled emails, SMS / WhatsApp messages and email campaigns are now sent
 * by the API's cron dispatchers (communications, messaging and
 * email-campaigns modules) — nothing is queued in the browser any more.
 * Forms send a wall-clock value ("YYYY-MM-DDTHH:mm") together with an IANA
 * time zone; the API converts it to the exact UTC instant.
 */

export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

/** Browser time zone (falls back to the default). */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** Formats an ISO instant as the wall-clock "YYYY-MM-DDTHH:mm" of the given zone (for datetime-local inputs). */
export function toWallClock(iso: string | null | undefined, timeZone: string = DEFAULT_TIME_ZONE): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  } catch {
    return d.toISOString().slice(0, 16);
  }
}

/** Formats an instant in a given time zone for display. */
export function formatInZone(iso: string | null | undefined, timeZone?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return d.toLocaleString(undefined, {
      timeZone: timeZone || undefined,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d.toLocaleString();
  }
}

/** True when a wall-clock value in the zone lies in the future (rough client-side check). */
export function isFutureWallClock(value: string, timeZone: string = DEFAULT_TIME_ZONE): boolean {
  if (!value) return false;
  return value > toWallClock(new Date().toISOString(), timeZone);
}
