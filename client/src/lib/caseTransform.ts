// Utility functions for transforming data between camelCase and snake_case

/**
 * Converts a string from camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Converts a string from snake_case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively converts object keys from camelCase to snake_case
 */
export function toSnakeCaseObject<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCaseObject(item)) as T;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const snakeKey = toSnakeCase(key);
        converted[snakeKey] = toSnakeCaseObject(obj[key]);
      }
    }
    return converted as T;
  }

  return obj;
}

/**
 * Recursively converts object keys from snake_case to camelCase
 */
export function toCamelCaseObject<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCaseObject(item)) as T;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const camelKey = toCamelCase(key);
        converted[camelKey] = toCamelCaseObject(obj[key]);
      }
    }
    return converted as T;
  }

  return obj;
}

/**
 * Converts query parameters object from camelCase to snake_case
 */
export function toSnakeCaseParams(params: Record<string, any>): Record<string, any> {
  const snakeParams: Record<string, any> = {};

  for (const key in params) {
    if (params.hasOwnProperty(key) && params[key] !== undefined) {
      const snakeKey = toSnakeCase(key);
      snakeParams[snakeKey] = params[key];
    }
  }

  return snakeParams;
}

/**
 * Builds a URL with query parameters
 */
export function buildUrlWithParams(baseUrl: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }

  const snakeParams = toSnakeCaseParams(params);
  const queryString = new URLSearchParams(
    Object.entries(snakeParams).map(([key, value]) => [key, String(value)])
  ).toString();

  return `${baseUrl}?${queryString}`;
}
