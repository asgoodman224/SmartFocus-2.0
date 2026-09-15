/** Simulates network latency so loading states are visible during development. */
export function simulateLatency<T>(value: T, ms = 450): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Midnight (local time) `n` days before today. */
export function daysAgo(n: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - n);
  return date;
}

/** A timestamp `n` days ago at the given local time. */
export function daysAgoAt(n: number, hours: number, minutes = 0): string {
  const date = daysAgo(n);
  date.setHours(hours, minutes);
  return date.toISOString();
}
