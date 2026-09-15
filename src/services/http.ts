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

/**
 * Minimal JSON fetch wrapper for the FastAPI backend. Converts network
 * failures and non-2xx responses into `ApiError` with a user-readable message.
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError('Unable to reach SmartFocus. Check your connection and try again.', 0);
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
