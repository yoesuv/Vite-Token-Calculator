// Pricing configuration for token estimates.
// Placeholder contract: API `input`/`output` prices are US **cents** per 1M tokens
// (e.g. `input: 100` → $1.00 per 1M input tokens). Replace with the real API
// semantics when the models endpoint is wired in.

/** Assumed USD → IDR exchange rate for price display. */
export const USD_TO_IDR = 16500

/** Default balance shown before the user edits the field (≈ USD 1 at USD_TO_IDR). */
export const DEFAULT_BALANCE = '16500'

const isPositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

/**
 * Price per 1M tokens in IDR.
 * Guarded against missing/zero/negative API values — returns 0 as a safe fallback.
 */
export const pricePerMillionIDR = (model: { input?: number | null }): number =>
  isPositive(model.input) ? (model.input / 100) * USD_TO_IDR : 0

/**
 * How many tokens the given IDR balance covers at the model's input price.
 * Guarded against division by zero — returns 0 tokens when the price is unusable.
 */
export const coverageTokens = (balanceIDR: number, model: { input?: number | null }): number => {
  const price = pricePerMillionIDR(model)
  return price > 0 ? Math.floor((balanceIDR / price) * 1_000_000) : 0
}

export const formatRupiah = (value: number) => `Rp ${Math.round(value).toLocaleString('id-ID')}`
