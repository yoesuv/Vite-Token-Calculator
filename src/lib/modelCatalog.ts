// Shared catalog contract: the API row shape, its validation, and the display
// fields the UI derives from it. Kept free of transport imports (Firebase is
// loaded by models.ts) so these rules can be exercised on their own.

/** Firestore timestamp shape returned by the API (`released` and `cutoff`). */
export type ApiTimestamp = { _seconds: number; _nanoseconds: number }

/**
 * Model catalog entry as returned by the API. Prices are US cents per 1M tokens.
 * `input` and `output` are required (validateCatalogRows enforces it); `cache` is
 * the cache *read* rate and may be absent when the provider publishes none.
 */
export type ApiModel = {
  id: string
  name: string
  input: number
  output: number
  cache?: number | null
  context: number
  modalities: string[]
  cutoff: ApiTimestamp | null
  released: ApiTimestamp | null
}

/**
 * A published rate must be a finite, non-negative number of US cents per 1M
 * tokens. `0` is legal — a genuinely free rate; `null`, `NaN`, negatives, and
 * strings are not.
 */
const isRate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

/** Cache is the one optional rate: no cache rate means free cache reads by policy. */
const isOptionalRate = (value: unknown): boolean =>
  value === undefined || value === null || isRate(value)

/**
 * Validate a raw response into a usable catalog.
 *
 * Identity first: a malformed row would crash the mapping, and duplicate ids
 * collide as React keys and as shared selection entries. Then `input`/`output`:
 * every estimate multiplies them, and an unknown rate would blend as free and
 * quietly inflate "Estimated coverage" — so one bad price rejects the whole
 * response and the UI falls to its retry path. That is deliberate: the catalog
 * guarantees these columns, so a violation means the data is not trustworthy.
 */
export const validateCatalogRows = (data: unknown): ApiModel[] => {
  if (!Array.isArray(data)) {
    throw new Error('The models API returned an unexpected response shape.')
  }
  const seen = new Set<string>()
  for (const row of data as (Partial<ApiModel> | null | undefined)[]) {
    if (
      !row ||
      typeof row.id !== 'string' ||
      !row.id.trim() ||
      typeof row.name !== 'string' ||
      seen.has(row.id)
    ) {
      throw new Error('The models API returned an invalid catalog entry.')
    }
    if (!isRate(row.input) || !isRate(row.output) || !isOptionalRate(row.cache)) {
      throw new Error(`The models API returned an invalid price for ${row.name}.`)
    }
    seen.add(row.id)
  }
  return data as ApiModel[]
}

/**
 * Compare limit — one primary slot plus four compare slots. The picker's
 * selection cap and the balance section's slot count both read this constant,
 * so the two sections cannot drift apart again.
 */
export const MAX_SELECTED = 5

/** API row + the display fields the UI derives from `name`. */
export type CatalogModel = ApiModel & {
  /** Prettified slug for headlines: `kimi-k3` → `Kimi K3`. */
  displayName: string
  /** Original API name, e.g. `moonshotai/kimi-k3`. */
  fullName: string
  /** Namespace before the slash (`moonshotai`), or `other` when the API omits it. */
  provider: string
}

/**
 * `moonshotai/kimi-k3` → provider `moonshotai`, display name `Kimi K3`, full name
 * kept for search and subtitles. `ApiModel.id` is an opaque document id, so
 * `fullName` — never `id` — is what the UI shows as the second line.
 */
export const toCatalogModel = (model: ApiModel): CatalogModel => {
  const separator = model.name.indexOf('/')
  const provider = separator > 0 ? model.name.slice(0, separator) : 'other'
  const slug = separator > 0 ? model.name.slice(separator + 1) : model.name
  return {
    ...model,
    displayName: slug
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase()),
    fullName: model.name,
    provider,
  }
}

/**
 * Map the response to catalog rows, preserving the response's own order. Pass
 * the result through sortForDisplay() for anything the user sees.
 */
export const toCatalogModels = (models: ApiModel[]): CatalogModel[] =>
  models.map(toCatalogModel)

/**
 * Display order for the picker grid and the slot "add" picks: alphabetical by
 * full API name, the order the catalog had before the sections were synced.
 * Sorts `fullName`, not `displayName` — `Kimi K3` and `kimi-k3` do not order
 * the same way, and the previous list keyed off the API name.
 *
 * Row 0 is also the default primary model, so the PRIMARY MODEL slot and the
 * first card in the grid are the same model.
 */
export const sortForDisplay = (models: CatalogModel[]): CatalogModel[] =>
  [...models].sort((a, b) => a.fullName.localeCompare(b.fullName))
