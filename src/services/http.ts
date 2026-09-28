import { getToken } from './authToken';
import { API_BASE_URL } from './config';

export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 when the server could not be reached. */
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let onUnauthorized: (() => void) | undefined;

/**
 * Called when the server rejects the saved token (expired or signed out
 * elsewhere). The auth provider uses it to return to the sign-in screen.
 */
export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  onUnauthorized = handler;
}

/**
 * Minimal JSON fetch wrapper for the FastAPI backend. Converts network
 * failures and non-2xx responses into `ApiError` with a user-readable message.
 * Sends the saved sign-in token, if any.
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError('Unable to reach SmartFocus. Check your connection and try again.', 0);
  }

  if (response.status === 401 && token) {
    onUnauthorized?.();
  }

  if (!response.ok) {
    // FastAPI returns errors as { "detail": "..." } (or a list for validation errors).
    const body = await response.json().catch(() => null);
    const detail =
      typeof body?.detail === 'string' ? body.detail : 'Something went wrong. Please try again.';
    throw new ApiError(detail, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
