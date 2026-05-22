/**
 * API Request Client with JWT Token Support
 * Handles authentication tokens, request formatting, and automatic
 * camelCase <-> snake_case conversion between frontend and backend.
 */

import { QueryClient } from "@tanstack/react-query";
import { API_BASE_URL, API_ENDPOINTS } from "./apiConfig";
import {
  toSnakeCaseObject,
  toCamelCaseObject,
  buildUrlWithParams,
} from "./caseTransform";

// ---------------------------------------------------------------------------
// QueryClient
// ---------------------------------------------------------------------------

import type { TrackShare, SharedTrack } from "@shared/schema";

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
// ---------------------------------------------------------------------------
// Track shares
// ---------------------------------------------------------------------------

/** List all shares for a track (owner only). */
export async function listTrackShares(trackId: string): Promise<TrackShare[]> {
  return apiRequestJson<TrackShare[]>("GET", API_ENDPOINTS.tracks.shares(trackId));
}

/** Share a private track with a user by username or email. */
export async function shareTrackWithUser(
  trackId: string,
  payload: { username?: string; email?: string }
): Promise<TrackShare> {
  return apiRequestJson<TrackShare>("POST", API_ENDPOINTS.tracks.shares(trackId), payload);
}

/** Revoke a user's access to a private track. */
export async function revokeTrackShare(
  trackId: string,
  shareId: string
): Promise<void> {
  await apiRequestJson("DELETE", API_ENDPOINTS.tracks.shareById(trackId, shareId));
}

/** List all tracks shared with the authenticated user. */
export async function listSharedTracks(): Promise<SharedTrack[]> {
  return apiRequestJson<SharedTrack[]>("GET", API_ENDPOINTS.tracks.sharedWithMe);
}

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
 * Flattens a field-level error object (common Django REST Framework format)
 * into a single dot-separated string.
 *
 * Input:  {"email": ["user with this email already exists."], "username": ["taken"]}
 * Output: "user with this email already exists. taken"
 */
function flattenFieldErrors(obj: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      for (const msg of value) {
        if (typeof msg === "string") parts.push(msg);
      }
    } else if (typeof value === "string") {
      parts.push(value);
    }
  }
  return parts.length > 0 ? parts.join(". ") : JSON.stringify(obj);
}

/**
 * Throws a descriptive Error for any non-OK response.
 * Tries to extract a message from the JSON body before falling back to the
 * HTTP status text. Distinguishes 5xx server errors from 4xx client errors.
 */
async function assertOk(response: Response): Promise<void> {
  if (response.ok) return;

  const responseText = await response.text().catch(() => "");
  console.debug("assertOk response", {
    status: response.status,
    statusText: response.statusText,
    body: responseText,
  });

  if (response.status >= 500) {
    const error = new Error(`Server error ${response.status}: ${response.statusText}`) as any;
    error.status = response.status;
    throw error;
  }

  let errorData: any = {};
  try {
    errorData = JSON.parse(responseText);
  } catch {}

  const rawMessage =
    errorData.message ??
    errorData.detail ??
    errorData.error ??
    `${response.status}: ${response.statusText}`;

  // Coerce to a human-readable string — the API may return field-level errors as
  // an object like {"email": ["msg1", "msg2"], "username": ["msg1"]}
  const message = typeof rawMessage === "string"
    ? rawMessage
    : Array.isArray(rawMessage)
      ? rawMessage.join(". ")
      : flattenFieldErrors(rawMessage);

  const error = new Error(message) as any;
  error.status = response.status;

  throw error;
}