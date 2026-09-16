/**
 * Single fetch wrapper for the Express API.
 *
 * The backend accepts either an `Authorization: Bearer <token>` header or its
 * HTTP-only `token` cookie (backend/src/middleware/auth.js). We send both:
 * the bearer token is the source of truth, and `credentials: "include"` keeps
 * the cookie flowing so logout clears server-side state too.
 */

const BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api"
).replace(/\/+$/, "");

const TOKEN_KEY = "gpa.token";

/** Notifies the auth context when the server rejects our token mid-session. */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private-mode browsers: fall back to cookie auth for this tab */
  }
}

export interface FieldError {
  field: string;
  message: string;
}

/** Shaped from the backend's `{ error, details? }` error envelope. */
export class ApiError extends Error {
  status: number;
  details?: FieldError[];

  constructor(status: number, message: string, details?: FieldError[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  /** Per-field messages keyed by field name, for inline form errors. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details ?? []) {
      if (d.field && !out[d.field]) out[d.field] = d.message;
    }
    return out;
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  /** Skip the global 401 handler (used by login/register, where 401 is expected). */
  skipAuthRedirect?: boolean;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, skipAuthRedirect = false, signal } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new ApiError(
      0,
      "Cannot reach the API. Confirm the backend is running on " + BASE_URL + ".",
    );
  }

  if (response.status === 204) return undefined as T;

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const data = (payload ?? {}) as { error?: string; details?: FieldError[] };

    if (response.status === 401 && !skipAuthRedirect) {
      setToken(null);
      onUnauthorized?.();
    }

    throw new ApiError(
      response.status,
      data.error || `Request failed (${response.status})`,
      data.details,
    );
  }

  return payload as T;
}

export const apiBaseUrl = BASE_URL;
