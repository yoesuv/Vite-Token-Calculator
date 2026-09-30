import { initializeApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);

// In local dev, App Check would otherwise fail because reCAPTCHA can't verify
// a localhost origin reliably. Firebase gives you a debug token instead.
// NEVER enable this in production.
if (import.meta.env.DEV) {
  // Pin to a fixed token (from .env.local) so it doesn't change on every reload.
  // Falls back to `true` (random token, printed to console) if not set.
  // @ts-expect-error FIREBASE_APPCHECK_DEBUG_TOKEN is a debug-only global.
  self.FIREBASE_APPCHECK_DEBUG_TOKEN =
    import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
}

export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(
    import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY,
  ),
  // Automatically refresh the App Check token before it expires.
  isTokenAutoRefreshEnabled: true,
});
