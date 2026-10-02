// Client for the model-catalog Cloud Function. The endpoint enforces Firebase
// App Check, so every request carries the `X-Firebase-AppCheck` header.
// The row shape and its validation rules live in modelCatalog.ts (the catalog
// contract); this module is transport only.
import axios from 'axios'
import { getToken } from 'firebase/app-check'
import { appCheck } from './firebase'
import { validateCatalogRows, exchangeRatesFromRows, type Catalog } from './modelCatalog'

// Model-catalog endpoint, configured per environment (see .env.example).
const AI_MODELS_URL = import.meta.env.VITE_AI_MODELS_URL

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
  const { token } = await getToken(appCheck)
  // `unknown`, not ApiModel[]: nothing about the response is trusted until
  // validateCatalogRows has checked ids, names, and the price columns.
  const response = await axios.get<unknown>(AI_MODELS_URL, {
    headers: { 'X-Firebase-AppCheck': token },
    // Finite timeout so a stalled request reaches the error/retry UI.
    timeout: 15000,
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
