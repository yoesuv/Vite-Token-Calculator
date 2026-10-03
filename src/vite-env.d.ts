/// <reference types="vite/client" />

/** App version injected from package.json via vite.config.ts define. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_RECAPTCHA_ENTERPRISE_KEY: string;
  // Model-catalog Cloud Function endpoint (src/lib/models.ts).
  readonly VITE_AI_MODELS_URL: string;
  // Optional: fixed App Check debug token for local dev only.
  readonly VITE_APPCHECK_DEBUG_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
