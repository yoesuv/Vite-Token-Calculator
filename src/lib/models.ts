// Client for the model-catalog Cloud Function. The endpoint enforces Firebase
// App Check, so every request carries the `X-Firebase-AppCheck` header.
// The row shape and its validation rules live in modelCatalog.ts (the catalog
// contract); this module is transport only.
import axios from 'axios'
import { getToken } from 'firebase/app-check'
import { appCheck, configErrorMessage } from './firebase'
import { validateCatalogRows, exchangeRatesFromRows, type Catalog } from './modelCatalog'

// Model-catalog endpoint, configured per environment (see .env.example).
const AI_MODELS_URL = import.meta.env.VITE_AI_MODELS_URL

/**
 * Shared ceiling for both legs of a catalog load: App Check token acquisition
 * and the catalog `GET` itself. A single value keeps the two from drifting and
 * gives the retry UI one predictable wait, whichever stage stalls.
 */
const REQUEST_TIMEOUT_MS = 30_000

/**
 * Reject after `ms` unless `promise` settles first. Used to bound calls that
 * have no native timeout (e.g. `getToken`); the caller still receives the
 * original resolution if it wins the race.
 *
 * The losing promise is left running in the background — that is intentional
 * here, because Firebase App Check deduplicates in-flight exchanges via
 * `state.exchangeTokenPromise`, so a later retry awaits the same request
 * rather than stacking another one.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms)
    }),
  ]).finally(() => {
    if (timer !== undefined) clearTimeout(timer)
  })
}

/** Hosts the Firebase emulator can serve over plain `http` in dev. */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

/**
 * Resolve the catalog endpoint from raw config, failing closed on the two ways a
 * mis-set `VITE_AI_MODELS_URL` misbehaves instead of erroring cleanly:
 *  - an empty or relative value makes axios hit the *current origin*, sending the
 *    App Check token to the wrong route; `new URL` rejects anything not absolute.
 *  - a plain-`http` URL sends that token unencrypted. Production must be `https:`;
 *    dev may use `http:` only for the emulator's loopback host, where transport
 *    encryption is moot.
 */
function resolveModelsEndpoint(): string {
  const raw = AI_MODELS_URL?.trim()
  if (!raw) {
    throw new Error(
      'Missing required configuration: VITE_AI_MODELS_URL. Copy .env.example to .env.local, fill it in, and restart the dev server.',
    )
  }
  let endpoint: URL
  try {
    endpoint = new URL(raw)
  } catch {
    throw new Error(
      `VITE_AI_MODELS_URL must be an absolute URL, got "${raw}" — a relative URL sends the App Check token to the current page.`,
    )
  }
  const loopbackHttp = endpoint.protocol === 'http:' && LOOPBACK_HOSTS.has(endpoint.hostname)
  if (endpoint.protocol === 'https:' || (loopbackHttp && import.meta.env.DEV)) {
    return endpoint.href
  }
  throw new Error(
    loopbackHttp
      ? 'VITE_AI_MODELS_URL may use http only for the local emulator in development; production requires https.'
      : 'VITE_AI_MODELS_URL must be an https URL so the App Check token is never sent unencrypted.',
  )
}

/**
 * Fetch the model catalog and the FX rate it publishes with it. `getToken`
 * caches the App Check token and refreshes it automatically
 * (`isTokenAutoRefreshEnabled` on the App Check instance).
 *
 * The rate is part of this response, not a second call: `currency` rides on
 * individual model rows, so one round trip yields both the prices and the
 * figure that converts them.
 */
export async function fetchAiModels(): Promise<Catalog> {
  // App Check is `null` only when required config is unset (see firebase.ts).
  // Fail with the named-missing-config message rather than a "use-before-
  // activation" error that would describe a bug the operator never caused.
  if (!appCheck) throw new Error(configErrorMessage)
  // Validate the endpoint *before* minting a token: a relative or plain-http
  // value would otherwise send the App Check token to the wrong route or
  // unencrypted rather than failing with a clear message.
  const endpoint = resolveModelsEndpoint()
  // App Check's token exchange has no built-in timeout: if the reCAPTCHA script
  // stalls (blocked origin, DNS filtering, offline), `getToken` never settles
  // and axios — which only runs *after* we have a token — cannot rescue the
  // caller. Race it against the same ceiling so a hung exchange reaches the
  // error/retry UI instead of pinning the provider in `loading` forever.
  const { token } = await withTimeout(
    getToken(appCheck),
    REQUEST_TIMEOUT_MS,
    'App verification timed out. Please try again.',
  )
  // `unknown`, not ApiModel[]: nothing about the response is trusted until
  // validateCatalogRows has checked ids, names, and the price columns.
  const response = await axios.get<unknown>(endpoint, {
    headers: { 'X-Firebase-AppCheck': token },
    // Finite timeout so a stalled request reaches the error/retry UI.
    timeout: REQUEST_TIMEOUT_MS,
  })
  const models = validateCatalogRows(response.data)
  return { models, rates: exchangeRatesFromRows(models) }
}

/** Human-readable message for fetch failures (App Check, axios, or parsing). */
export function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      return `The models API rejected the request (HTTP ${error.response.status}).`
    }
    return 'Could not reach the models API. Check your connection and try again.'
  }
  return error instanceof Error ? error.message : 'Failed to load models.'
}
