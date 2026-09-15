import type { CheckIn, CheckInCreate } from '@/types/models';

import { daysAgoAt, simulateLatency } from './helpers';

/**
 * In-memory stand-in for the check-ins table. New check-ins are kept for the
 * rest of the session so Home and Check-In reflect them. Resets on reload.
 */
const checkIns: CheckIn[] = [
  { id: 'c4', createdAt: daysAgoAt(1, 21, 12), mood: 4, energy: 3, focus: 4, note: 'Productive study session in the library.' },
  { id: 'c3', createdAt: daysAgoAt(2, 20, 45), mood: 3, energy: 2, focus: 3 },
  { id: 'c2', createdAt: daysAgoAt(3, 22, 5), mood: 2, energy: 2, focus: 2, note: 'Stayed up too late scrolling.' },
  { id: 'c1', createdAt: daysAgoAt(4, 19, 30), mood: 4, energy: 4, focus: 3 },
];

export function hasCheckedInToday(): boolean {
  const today = new Date().toDateString();
  return checkIns.some((checkIn) => new Date(checkIn.createdAt).toDateString() === today);
}

export function getRecentCheckIns(limit: number): Promise<CheckIn[]> {
  return simulateLatency(checkIns.slice(0, limit));
}

export function createCheckIn(payload: CheckInCreate): Promise<CheckIn> {
  const checkIn: CheckIn = {
    ...payload,
    id: `c${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  checkIns.unshift(checkIn);
  return simulateLatency(checkIn, 700);
}
