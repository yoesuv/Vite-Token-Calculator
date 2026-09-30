// Client for the model-catalog Cloud Function. The endpoint enforces Firebase
// App Check, so every request carries the `X-Firebase-AppCheck` header.
import axios from 'axios'
import { getToken } from 'firebase/app-check'
import { appCheck } from './firebase'

// Model-catalog endpoint, configured per environment (see .env.example).
const AI_MODELS_URL = import.meta.env.VITE_AI_MODELS_URL

/** Firestore timestamp shape returned by the API (`released` and `cutoff`). */
export type ApiTimestamp = { _seconds: number; _nanoseconds: number }

/** Model catalog entry as returned by the API. Prices are US cents per 1M tokens. */
export type ApiModel = {
  id: string
  name: string
  input: number
  output: number
  cache: number
  context: number
  modalities: string[]
  cutoff: ApiTimestamp | null
  released: ApiTimestamp | null
}

/**
 * Fetch the model catalog. `getToken` caches the App Check token and refreshes
 * it automatically (`isTokenAutoRefreshEnabled` on the App Check instance).
 */
export async function fetchAiModels(): Promise<ApiModel[]> {
  const { token } = await getToken(appCheck)
  const response = await axios.get<ApiModel[]>(AI_MODELS_URL, {
    headers: { 'X-Firebase-AppCheck': token },
    // Finite timeout so a stalled request reaches the error/retry UI.
    timeout: 15000,
  })
  if (!Array.isArray(response.data)) {
    throw new Error('The models API returned an unexpected response shape.')
  }
  // Validate each entry: a malformed shape would crash the picker's mapping,
  // and duplicate ids would collide as React keys / shared selection state.
  const seen = new Set<string>()
  for (const model of response.data) {
    if (
      !model ||
      typeof model.id !== 'string' ||
      !model.id.trim() ||
      typeof model.name !== 'string' ||
      seen.has(model.id)
    ) {
      throw new Error('The models API returned an invalid catalog entry.')
    }
    seen.add(model.id)
  }
  return response.data
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
