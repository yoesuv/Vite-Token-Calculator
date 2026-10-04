// Shared catalog contract: the API row shape, its validation, the exchange-rate
// derivation, and the display fields the UI derives from it. Kept free of
// transport imports (Firebase is loaded by models.ts) so these rules can be
// exercised on their own.
import { isSupportedCurrency, isUsableRate, type Currency, type ExchangeRates } from './pricing'

/** Firestore timestamp shape returned by the API (`released` and `cutoff`). */
export type ApiTimestamp = { _seconds: number; _nanoseconds: number }

/**
 * One entry of a row's `currency` array: a single-key map of ISO 4217 code to
 * that currency's units per 1 USD, e.g. `{ IDR: 15000 }` for `1 USD = 15000 IDR`.
 * The API models it as an array so a row can publish several codes at once.
 */
export type ApiCurrencyEntry = Record<string, number>

/**
 * Model catalog entry as returned by the API. Prices are US cents per 1M tokens.
 * `input` and `output` are required (validateCatalogRows enforces it); `cache` is
 * the cache *read* rate and may be absent when the provider publishes none.
 * `currency` is the FX figure for those prices and is optional — most rows
 * publish `null`/omit it, so the rate is collected across the whole response
 * (see exchangeRatesFromRows) rather than read off one model.
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
  currency?: ApiCurrencyEntry[] | null
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

/** A validated `[code, units per 1 USD]` pair, narrowed to a supported code. */
type RateEntry = [Currency, number]

/**
 * Collect the FX figures out of one row's `currency` array. Defensive by
 * design: the field is unvalidated (`validateCatalogRows` deliberately ignores
 * it), so anything unexpected is skipped instead of throwing.
 *
 * Entries are single-key maps (`[{ IDR: 15000 }]`); a multi-key object is still
 * read key by key, because that shape costs nothing to accept. A non-positive,
 * NaN, or infinite value is dropped — a `0` rate would silently turn every
 * converted price into free, which is the exact failure the coverage guard
 * spends its whole existence on — and so is a wildly out-of-range one:
 * `isUsableRate` keeps the figure within the currency's plausible magnitude
 * (an absurd rate poisons prices and coverage just the same, then persists).
 */
const ratesFromEntry = (entry: unknown): RateEntry[] => {
  const collected: RateEntry[] = []
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return collected
  for (const [code, value] of Object.entries(entry)) {
    // Only codes the registry knows, and never USD: it is the base of the table,
    // so a stray `{ USD: 0.9 }` would rescale every other currency off a
    // non-1 base.
    if (!isSupportedCurrency(code) || code === 'USD') continue
    if (!isUsableRate(code, value)) continue
    collected.push([code, value])
  }
  return collected
}

/**
 * Build the app-wide rate table from the whole catalog response.
 *
 * The rate is global, not per model: it converts USD prices into the display
 * currency for the balance, the coverage, and every price line at once, so it is
 * collected across the array instead of read off the first row. Most rows
 * publish `currency: null`, so a scan — not `rows[0]` — is what finds the rate,
 * and a later row that only carries `EUR` still contributes it.
 *
 * First non-empty wins per code (`??=` keeps the earlier value): the API repeats
 * the figure across rows, and without a tie-break one stale duplicate further
 * down would overwrite the fresher value at the top.
 */
export const exchangeRatesFromRows = (rows: readonly ApiModel[]): ExchangeRates => {
  const rates: ExchangeRates = {}
  for (const row of rows) {
    const field = row?.currency
    if (!Array.isArray(field)) continue
    for (const entry of field) {
      for (const [code, value] of ratesFromEntry(entry)) {
        rates[code] ??= value
      }
    }
  }
  return rates
}

/**
 * A usable identity: non-blank, and when the API splits it as `provider/slug`,
 * the slug past the slash must be non-blank too. A blank `name` sorts to row 0
 * of the display order and would become a blank, still-selectable default
 * primary; a `provider/` with no slug strips to an empty display name the same
 * way.
 */
const isUsableName = (name: unknown): name is string => {
  if (typeof name !== 'string' || name.trim().length === 0) return false
  const separator = name.indexOf('/')
  return separator <= 0 || name.slice(separator + 1).trim().length > 0
}

/**
 * Validate a raw response into a usable catalog.
 *
 * Identity first: a malformed row would crash the mapping, and duplicate ids
 * collide as React keys and as shared selection entries. Then `input`/`output`:
 * every estimate multiplies them, and an unknown rate would blend as free and
 * quietly inflate "Estimated coverage" — so one bad price rejects the whole
 * response and the UI falls to its retry path. That is deliberate: the catalog
 * guarantees these columns, so a violation means the data is not trustworthy.
 *
 * `currency` is *not* checked here. It is an optional refinement, not a price:
 * a malformed entry is dropped by exchangeRatesFromRows and the app keeps
 * working on the registry's default rate, which is strictly better than
 * rejecting an otherwise valid catalog over an FX figure.
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
      !isUsableName(row.name) ||
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
 * A validated catalog load: the rows plus the app-wide FX table derived from
 * them. The rate is returned alongside the models because a response may carry
 * no usable `currency` at all, and the caller has to distinguish "published
 * nothing" (keep the cache/default) from "published 0" (never possible here —
 * non-positive rates are dropped).
 */
export type Catalog = { models: ApiModel[]; rates: ExchangeRates }

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
 * `fullName` — never `id` — is what the UI shows as the second line. Stray
 * slashes around the slug (`/kimi-k3/`) are API noise and stripped; the
 * original name still reaches search through `fullName`.
 */
export const toCatalogModel = (model: ApiModel): CatalogModel => {
  const separator = model.name.indexOf('/')
  const provider = separator > 0 ? model.name.slice(0, separator) : 'other'
  const slug = (separator > 0 ? model.name.slice(separator + 1) : model.name)
    .replace(/^\/+|\/+$/g, '')
    .trim()
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
