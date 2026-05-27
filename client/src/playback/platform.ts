import type { Platform } from './types';

// ─── Cache ───────────────────────────────────────────────────────────────────

/** Module-level cache so `detectPlatform()` runs at most once */
let platformCache: Platform | undefined;

// ─── Detection ───────────────────────────────────────────────────────────────

/**
 * Detect the current platform based on navigator property sniffing.
 *
 * **Detection order is critical**:
 * 1. iPadOS — iPadOS 13+ spoofs `navigator.platform` as `'MacIntel'` and sends a
 *    desktop-like user agent. Use `maxTouchPoints > 1` to distinguish from real Macs.
 * 2. iPhone / iPod — legacy iOS device user agent check.
 * 3. Android — standard user agent substring match.
 * 4. Default — returns `'desktop'` when no mobile platform is detected.
 *
 * @returns The detected platform: `'ios'`, `'android'`, or `'desktop'`.
 */
export function detectPlatform(): Platform {
  // iPadOS 13+ detection: MacIntel platform + touch capability
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    return 'ios';
  }

  // iPhone, iPod, and older iPad detection via user agent
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    return 'ios';
  }

  // Android detection via user agent
  if (/Android/.test(navigator.userAgent)) {
    return 'android';
  }

  // Default fallback
  return 'desktop';
}

/**
 * Returns the detected platform, caching the result as a singleton.
 *
 * `detectPlatform()` executes only once — on the first call to `getPlatform()`.
 * Subsequent calls return the cached value, avoiding redundant user agent parsing
 * and ensuring consistent platform identification across the application lifecycle.
 *
 * @returns The cached platform: `'ios'`, `'android'`, or `'desktop'`.
 */
export function getPlatform(): Platform {
  if (platformCache !== undefined) {
    return platformCache;
  }

  platformCache = detectPlatform();
  return platformCache;
}
