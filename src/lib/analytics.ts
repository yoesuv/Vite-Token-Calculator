// Google Analytics via the modular Firebase SDK.
//
// Initialization deliberately mirrors `firebase.ts`'s degrade-gracefully
// pattern: analytics is a nice-to-have, so every missing piece (unconfigured
// Firebase, no Measurement ID, an unsupported browser) turns it into a no-op
// instead of an error the app has to handle at every call site.
//
// `isSupported()` matters: the analytics SDK touches browser APIs (IndexedDB,
// `performance`, cookie access) that crash in restricted environments. Checking
// it before `getAnalytics` keeps those environments clean. It must resolve
// before initialization, so the whole thing is async — hence the shared
// promise instead of an eagerly created instance.
import { getApp, type FirebaseApp } from "firebase/app";
import {
  getAnalytics,
  isSupported,
  logEvent,
  type Analytics,
  type EventParams,
} from "firebase/analytics";
import { isFirebaseConfigured } from "./firebase";

const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim();

/**
 * Resolves to the analytics instance, or `null` when analytics is off
 * (unconfigured Firebase, blank Measurement ID, or an unsupported browser).
 * Memoized so React StrictMode's double renders and every `trackEvent` call
 * share one initialization — `getAnalytics` throws on a second init.
 */
let instancePromise: Promise<Analytics | null> | undefined;

function initializeAnalytics(): Promise<Analytics | null> {
  instancePromise ??= (async () => {
    if (!isFirebaseConfigured || !measurementId) return null;
    // `getApp` rather than importing `app` so a bundler tree-shaking error
    // can't create a second Firebase app instance behind this module's back.
    const app: FirebaseApp = getApp();
    if (!(await isSupported())) return null;
    // Reads `measurementId` from the app options (see firebase.ts).
    return getAnalytics(app);
  })();
  return instancePromise;
}

/**
 * Fire-and-forget call for `main.tsx`: starts (or reuses) analytics init so
 * automatic events (page_view, session_start) begin as early as possible.
 * Never awaited — a failure here must not block the first render.
 */
export function startAnalytics(): void {
  initializeAnalytics().catch((error) => {
    if (import.meta.env.DEV) console.error("Analytics failed to start:", error);
  });
}

/**
 * Application-level analytics event. No-ops when analytics is off, so call
 * sites never branch on configuration.
 */
export async function trackEvent(
  eventName: string,
  eventParams?: Record<string, unknown>,
): Promise<void> {
  const analytics = await initializeAnalytics();
  if (!analytics) return;
  try {
    logEvent(analytics, eventName, eventParams as EventParams | undefined);
  } catch (error) {
    // Telemetry must never break a user flow.
    if (import.meta.env.DEV) console.error(`Analytics event '${eventName}' failed:`, error);
  }
}
