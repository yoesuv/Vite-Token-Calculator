// Pricing configuration for token estimates.
// Placeholder contract: API `input`/`output` prices are US **cents** per 1M tokens
// (e.g. `input: 100` → $1.00 per 1M input tokens). Replace with the real API
// semantics when the models endpoint is wired in.

/**
 * Currency registry — the single source of truth. To add a currency (e.g. EUR,
 * JPY), append one entry here; every helper below and the UI adapt automatically.
 */
export const CURRENCIES = {
  IDR: {
    /** ISO 4217 code. */
    code: 'IDR',
    symbol: 'Rp',
    displayName: 'Rupiah',
    /** Units of this currency per 1 USD (assumed rate). */
    perUSD: 16500,
    /** BCP 47 locale used for number formatting. */
    locale: 'id-ID',
    /** Balance shown before the user edits the field (≈ USD 1). */
    defaultBalance: '16500',
    /** Fraction digits accepted/displayed for this currency. */
    maxDecimals: 0,
    /** Keyboard hint for the balance input. */
    inputMode: 'numeric' as const,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    displayName: 'US dollar',
    perUSD: 1,
    locale: 'en-US',
    defaultBalance: '1',
    maxDecimals: 2,
    inputMode: 'decimal' as const,
  },
}

export type Currency = keyof typeof CURRENCIES
export type CurrencyConfig = (typeof CURRENCIES)[Currency]

/** All supported currencies in display order (the app-bar select lists these). */
export const CURRENCY_LIST = Object.keys(CURRENCIES) as Currency[]

/** Default balance string per currency (≈ USD 1 at the assumed rate). */
export const DEFAULT_BALANCE = Object.fromEntries(
  CURRENCY_LIST.map((code) => [code, CURRENCIES[code].defaultBalance]),
) as Record<Currency, string>

/** Convenience read of a currency's config; throws only on programmer error. */
export const currencyConfig = (currency: Currency): CurrencyConfig => CURRENCIES[currency]

const isPositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

/**
 * Price per 1M tokens in USD (API cents → dollars).
 * Guarded against missing/zero/negative API values — returns 0 as a safe fallback.
 */
export const pricePerMillionUSD = (model: { input?: number | null }): number =>
  isPositive(model.input) ? model.input / 100 : 0

/**
 * Price per 1M tokens in the selected currency.
 * Guarded against missing/zero/negative API values — returns 0 as a safe fallback.
 */
export const pricePerMillion = (model: { input?: number | null }, currency: Currency): number =>
  pricePerMillionUSD(model) * currencyConfig(currency).perUSD

/** Convert an amount between supported currencies via each currency's perUSD rate. */
export const convertAmount = (value: number, from: Currency, to: Currency): number =>
  from === to ? value : (value / currencyConfig(from).perUSD) * currencyConfig(to).perUSD

/**
 * How many tokens the balance (in the selected currency) covers at the model's
 * input price. Guarded against division by zero — returns 0 tokens when the
 * price is unusable.
 */
export const coverageTokens = (
  balance: number,
  model: { input?: number | null },
  currency: Currency,
): number => {
  const price = pricePerMillionUSD(model)
  if (price <= 0) return 0
  const balanceUSD = balance / currencyConfig(currency).perUSD
  return Math.floor((balanceUSD / price) * 1_000_000)
}

const moneyFormatter = (currency: Currency): Intl.NumberFormat =>
  new Intl.NumberFormat(currencyConfig(currency).locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currencyConfig(currency).maxDecimals,
    maximumFractionDigits: currencyConfig(currency).maxDecimals,
  })

/** Plain number formatter for the balance input (the prefix is rendered separately). */
const numberFormatter = (currency: Currency): Intl.NumberFormat =>
  new Intl.NumberFormat(currencyConfig(currency).locale, {
    minimumFractionDigits: currencyConfig(currency).maxDecimals,
    maximumFractionDigits: currencyConfig(currency).maxDecimals,
  })

/** Format a money value for display in the selected currency (e.g. `Rp 16.500`, `$1.00`). */
export const formatMoney = (value: number, currency: Currency): string =>
  moneyFormatter(currency).format(value)

/** Format a raw balance string for display when the field is not focused. */
export const formatBalanceForDisplay = (balance: string, currency: Currency): string =>
  numberFormatter(currency).format(Number(balance) || 0)

/**
 * Convert a raw balance input string between currencies, keeping the value
 * equivalent at the assumed rates. Trailing decimals are trimmed to the target
 * currency's fraction digits.
 */
export const convertBalance = (balance: string, from: Currency, to: Currency): string => {
  if (from === to) return balance
  const factor = 10 ** currencyConfig(to).maxDecimals
  return String(Math.round(convertAmount(Number(balance) || 0, from, to) * factor) / factor)
}

/** Keep raw user input valid for the selected currency while editing. */
export const sanitizeBalanceInput = (raw: string, currency: Currency): string => {
  const { maxDecimals } = currencyConfig(currency)
  if (maxDecimals === 0) return raw.replace(/\D/g, '')
  return raw.match(new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}`))?.[0] ?? ''
}
