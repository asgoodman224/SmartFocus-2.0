/** 226 → "3h 46m", 45 → "45m", 120 → "2h". */
export function formatDuration(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Screen-reader friendly version: 226 → "3 hours 46 minutes". */
export function formatDurationSpoken(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes > 0 || hours === 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  return parts.join(' ');
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "Tuesday, September 15" */
export function formatLongDate(date = new Date()): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Local calendar date as `YYYY-MM-DD` (avoids UTC shifting from toISOString). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses `YYYY-MM-DD` as a local date. */
export function parseIsoDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "2026-09-14" → "Mon" */
export function formatWeekdayShort(isoDate: string): string {
  return parseIsoDate(isoDate).toLocaleDateString(undefined, { weekday: 'short' });
}

/** "Today", "Yesterday", or "Mon, Sep 14" for an ISO date-time. */
export function formatRelativeDay(isoDateTime: string, now = new Date()): string {
  const date = new Date(isoDateTime);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "9:41 AM" */
export function formatTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
