import type { Account, AuthResponse, SignInRequest, SignUpRequest } from '@/types/models';

import { simulateLatency } from './helpers';

/**
 * Mock sign-in: any email and password work, so the app can be explored
 * without the backend. The "account" only lives for this session.
 */
let account: Account = { id: 'mock-user', email: 'you@example.com', timezone: 'UTC' };

function respond(email: string, timezone?: string): Promise<AuthResponse> {
  account = { ...account, email: email.trim().toLowerCase(), timezone: timezone ?? account.timezone };
  return simulateLatency({ token: 'mock-token', account }, 600);
}

export function signUp({ email, timezone }: SignUpRequest): Promise<AuthResponse> {
  return respond(email, timezone);
}

export function signIn({ email, timezone }: SignInRequest): Promise<AuthResponse> {
  return respond(email, timezone);
}

export function signOut(): Promise<void> {
  return simulateLatency(undefined, 200);
}

export function getAccount(): Promise<Account> {
  return simulateLatency(account);
}

export function updateTimezone(timezone: string): Promise<Account> {
  account = { ...account, timezone };
  return simulateLatency(account);
}
