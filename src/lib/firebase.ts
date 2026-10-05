import { initializeApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// The values the app cannot function without. `.env.example` ships them blank,
// so a fresh clone or a misconfigured deploy leaves these empty. Firebase itself
// does not reject an empty config at `initializeApp`/`initializeAppCheck` — it
// fails later, asynchronously, as a stream of cryptic App Check console errors
// while the catalog silently never loads. Validate up front so the failure is
// one clear, named message instead of guesswork.
const REQUIRED_ENV: Record<string, string | undefined> = {
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
  VITE_RECAPTCHA_ENTERPRISE_KEY: import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY,
};

const missingConfig = Object.entries(REQUIRED_ENV)
  .filter(([, value]) => !value?.trim())
  .map(([name]) => name);

/**
 * True when every required Firebase value is present. Gates App Check so an
 * unconfigured app skips initialization entirely (no doomed reCAPTCHA load)
 * rather than half-starting and erroring on every catalog fetch.
 */
export const isFirebaseConfigured = missingConfig.length === 0;

/**
 * One actionable message naming the unset variables. Surfaced in the in-app
 * error card (see models.ts) and logged in dev — a user sees a friendly reason
 * instead of a blank page; a developer sees exactly what to fill in.
 */
export const configErrorMessage = isFirebaseConfigured
  ? ""
  : `Missing required Firebase configuration: ${missingConfig.join(", ")}. ` +
    "Copy .env.example to .env.local, fill these in, and restart the dev server.";

export const app = initializeApp(firebaseConfig);

// In local dev, App Check would otherwise fail because reCAPTCHA can't verify
// a localhost origin reliably. Firebase gives you a debug token instead.
// NEVER enable this in production.
if (isFirebaseConfigured && import.meta.env.DEV) {
  // Pin to a fixed token (from .env.local) so it doesn't change on every reload.
  // Falls back to `true` (random token, printed to console) if not set.
  // @ts-expect-error FIREBASE_APPCHECK_DEBUG_TOKEN is a debug-only global.
  self.FIREBASE_APPCHECK_DEBUG_TOKEN =
    import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
}

// `null` when unconfigured so `fetchAiModels` can fail with `configErrorMessage`
// instead of calling into a half-initialized App Check that never issues a token.
export const appCheck: AppCheck | null = isFirebaseConfigured
  ? initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(
        import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY.trim(),
      ),
      // Automatically refresh the App Check token before it expires.
      isTokenAutoRefreshEnabled: true,
    })
  : null;

// Loud where it helps: the card is friendly for users, this names the exact
// unset variables for whoever is standing up the app.
if (!isFirebaseConfigured && import.meta.env.DEV) {
  console.error(configErrorMessage);
}
