import { QueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./apiConfig";
import { toSnakeCaseObject, toCamelCaseObject, buildUrlWithParams } from "./caseTransform";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

        const res = await fetch(fullUrl, {
          credentials: 'include',
        });

        if (!res.ok) {
          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.detail || `${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        // Transform response from snake_case to camelCase
        return toCamelCaseObject(data);
      },
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Makes an API request to the Django backend
 * Automatically handles case conversion between camelCase (frontend) and snake_case (backend)
 */
export async function apiRequest(
  method: string,
  url: string,
  body?: any,
  queryParams?: Record<string, any>
): Promise<Response> {
  // Build full URL
  let fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // Add query parameters if provided
  if (queryParams) {
    fullUrl = buildUrlWithParams(fullUrl, queryParams);
  }

  // Prepare request options
  const options: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Transform body from camelCase to snake_case if provided
  if (body) {
    options.body = JSON.stringify(toSnakeCaseObject(body));
  }

  const res = await fetch(fullUrl, options);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.detail || `${res.status}: ${res.statusText}`);
  }

  return res;
}

/**
 * Makes an API request and returns the transformed response data
 */
export async function apiRequestJson<T = any>(
  method: string,
  url: string,
  body?: any,
  queryParams?: Record<string, any>
): Promise<T> {
  const res = await apiRequest(method, url, body, queryParams);
  const data = await res.json();
  // Transform response from snake_case to camelCase
  return toCamelCaseObject(data);
}
