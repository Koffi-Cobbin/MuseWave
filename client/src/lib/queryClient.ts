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
  console.debug("apiRequestJson request", { url, method, headers, body, params });
  const init: RequestInit = {
    method,
    headers,
    credentials: 'include',
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
  const init: RequestInit = { method, headers, credentials: 'include', body: formData };

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
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    const accessToken = data.access ?? data.token?.access ?? data.token ?? data.accessToken;
    const refreshTokenResponse = data.refresh ?? data.token?.refresh ?? data.refreshToken;

    if (typeof accessToken === "string" && accessToken) {
      localStorage.setItem("accessToken", accessToken);
    }
    if (typeof refreshTokenResponse === "string" && refreshTokenResponse) {
      localStorage.setItem("refreshToken", refreshTokenResponse);
    }

    return Boolean(accessToken);
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
  console.debug("buildAuthHeaders token", { accessTokenExists: !!accessToken, accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null });
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

  const currentHeaders = init.headers instanceof Headers
    ? Object.fromEntries(init.headers.entries())
    : ((init.headers as Record<string, string>) ?? {});

  const retryHeaders = buildAuthHeaders(currentHeaders);

  return fetch(url, { ...init, headers: retryHeaders, credentials: 'include' });
}

/**
 * Throws a descriptive Error for any non-OK response.
 * Tries to extract a message from the JSON body before falling back to the
 * HTTP status text. Distinguishes 5xx server errors from 4xx client errors.
 */
async function assertOk(response: Response): Promise<void> {
  if (response.ok) return;

  const responseText = await response.text().catch(() => "");
  console.debug("assertOk response", { status: response.status, statusText: response.statusText, body: responseText });

  if (response.status >= 500) {
    throw new Error(`Server error ${response.status}: ${response.statusText}`);
  }

  let errorData: any = {};
  try {
    errorData = JSON.parse(responseText);
  } catch {
    errorData = {};
  }

  const message =
    errorData.message ??
    errorData.detail ??
    errorData.error ??
    `${response.status}: ${response.statusText}`;

  throw new Error(message);
}