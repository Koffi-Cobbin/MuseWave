/**
 * API Request Client with JWT Token Support
 * Handles authentication tokens, request formatting, and automatic
 * camelCase <-> snake_case conversion between frontend and backend.
 */

import { QueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./apiConfig";
import {
  toSnakeCaseObject,
  toCamelCaseObject,
  buildUrlWithParams,
} from "./caseTransform";

// ---------------------------------------------------------------------------
// QueryClient
// ---------------------------------------------------------------------------

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1_000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// ---------------------------------------------------------------------------
// Public API helpers
// ---------------------------------------------------------------------------

/**
 * Makes an authenticated JSON API request.
 *
 * - Automatically converts the request body from camelCase → snake_case.
 * - Automatically converts the response body from snake_case → camelCase.
 * - Injects a JWT Bearer token if one is stored.
 * - Transparently retries once after a 401 by attempting a token refresh.
 * - Appends query parameters (converted to snake_case) when provided.
 */
export async function apiRequestJson<T = unknown>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  endpoint: string,
  body?: unknown,
  params?: Record<string, unknown>
): Promise<T> {
  const url = buildEndpointUrl(endpoint, params);
  const headers = buildAuthHeaders({ "Content-Type": "application/json" });
  const init: RequestInit = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(toSnakeCaseObject(body)) : undefined,
  };

  let response = await fetch(url, init);

  if (response.status === 401) {
    response = await refreshAndRetry(url, init);
  }

  await assertOk(response);

  // 204 No Content — nothing to parse
  if (response.status === 204) return undefined as T;

  const data = await response.json();
  return toCamelCaseObject(data) as T;
}

/**
 * Makes an authenticated multipart/form-data request (file uploads).
 *
 * ⚠️  Never set Content-Type manually here — the browser must set it so that
 *     the multipart boundary is included automatically.
 */
export async function apiRequestFormData<T = unknown>(
  method: "POST" | "PUT" | "PATCH",
  endpoint: string,
  formData: FormData
): Promise<T> {
  const url = buildEndpointUrl(endpoint);
  // No Content-Type — let the browser set it with the correct boundary
  const headers = buildAuthHeaders();
  const init: RequestInit = { method, headers, body: formData };

  let response = await fetch(url, init);

  if (response.status === 401) {
    response = await refreshAndRetry(url, init);
  }

  await assertOk(response);

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

/**
 * Attempts a silent refresh of the access token using the stored refresh token.
 * Stores the new token(s) on success.
 * Returns `true` if a new access token was obtained.
 */
async function attemptTokenRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/users/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();

    if (data.access) localStorage.setItem("accessToken", data.access);
    if (data.refresh) localStorage.setItem("refreshToken", data.refresh);

    return Boolean(data.access);
  } catch (err) {
    console.error("[queryClient] Token refresh failed:", err);
    return false;
  }
}

/** Clears all stored auth tokens (called after a failed refresh). */
function clearTokens(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userId");
}

// ---------------------------------------------------------------------------
// Internal utilities
// ---------------------------------------------------------------------------

/**
 * Resolves the full URL for an endpoint, appending snake_case query params
 * when provided.
 */
function buildEndpointUrl(
  endpoint: string,
  params?: Record<string, unknown>
): string {
  const base = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  return params ? buildUrlWithParams(base, params) : base;
}

/**
 * Returns headers with an Authorization Bearer token injected if an access
 * token is currently stored in localStorage.
 */
function buildAuthHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const accessToken = localStorage.getItem("accessToken");
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return headers;
}

/**
 * Attempts a token refresh and, if successful, retries the original request
 * with an updated Authorization header. Clears tokens and throws on failure.
 */
async function refreshAndRetry(
  url: string,
  init: RequestInit
): Promise<Response> {
  const refreshed = await attemptTokenRefresh();

  if (!refreshed) {
    clearTokens();
    throw new Error("401: Unauthorized");
  }

  const retryHeaders = buildAuthHeaders(
    (init.headers as Record<string, string>) ?? {}
  );

  return fetch(url, { ...init, headers: retryHeaders });
}

/**
 * Throws a descriptive Error for any non-OK response.
 * Tries to extract a message from the JSON body before falling back to the
 * HTTP status text. Distinguishes 5xx server errors from 4xx client errors.
 */
async function assertOk(response: Response): Promise<void> {
  if (response.ok) return;

  if (response.status >= 500) {
    throw new Error(`Server error ${response.status}: ${response.statusText}`);
  }

  const errorData = await response.json().catch(() => ({}));
  const message =
    errorData.message ??
    errorData.detail ??
    errorData.error ??
    `${response.status}: ${response.statusText}`;

  throw new Error(message);
}