import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from '@/services';
import { clearToken, loadToken, saveToken } from '@/services/authToken';
import { setUnauthorizedHandler } from '@/services/http';
import type { Account, AuthResponse } from '@/types/models';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  /** The signed-in account. Can be null while signed in if it hasn't loaded yet (e.g. offline). */
  account: Account | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** The phone's IANA time zone, e.g. "America/New_York". */
function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Tracks whether someone is signed in. The token is saved on the device, so
 * the app opens signed in; if the server later rejects it, we sign out.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [account, setAccount] = useState<Account | null>(null);

  const forgetSession = useCallback(async () => {
    await clearToken();
    setAccount(null);
    setStatus('signedOut');
  }, []);

  const syncAccount = useCallback(async () => {
    try {
      let current = await api.getAccount();
      const timezone = deviceTimeZone();
      if (current.timezone !== timezone) {
        current = await api.updateTimezone(timezone);
      }
      setAccount(current);
    } catch {
      // Offline or server trouble: stay signed in. A rejected token is
      // handled by the unauthorized handler below.
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void forgetSession());
    return () => setUnauthorizedHandler(undefined);
  }, [forgetSession]);

  useEffect(() => {
    let cancelled = false;
    loadToken()
      .catch(() => null)
      .then((token) => {
        if (cancelled) return;
        setStatus(token ? 'signedIn' : 'signedOut');
        if (token) void syncAccount();
      });
    return () => {
      cancelled = true;
    };
  }, [syncAccount]);

  const finishSignIn = useCallback(async ({ token, account: signedIn }: AuthResponse) => {
    await saveToken(token);
    setAccount(signedIn);
    setStatus('signedIn');
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await finishSignIn(await api.signIn({ email, password, timezone: deviceTimeZone() }));
    },
    [finishSignIn],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      await finishSignIn(await api.signUp({ email, password, timezone: deviceTimeZone() }));
    },
    [finishSignIn],
  );

  const signOut = useCallback(async () => {
    try {
      await api.signOut();
    } catch {
      // Still sign out locally, e.g. when offline.
    }
    await forgetSession();
  }, [forgetSession]);

  const value = useMemo(
    () => ({ status, account, signIn, signUp, signOut }),
    [status, account, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return context;
}
