// Pricing configuration for token estimates.
// API contract: `input`, `output`, and `cache` are US **cents** per 1M tokens
// (`100` → USD 1.00 per 1M). `cache` is the cache *read* rate — the catalog
// ships no cache-write premium.
// Coverage prices a blend of all three rates at the shares in DEFAULT_USAGE_MIX,
// so the assumption behind the number is visible instead of input-only.
// Currency conversion uses the catalog's own FX figure: a row may carry
// `currency: [{ IDR: 15000 }]` meaning *1 USD = 15000 IDR*. The `perUSD` values
// in the registry below are only the fallback while no live rate is known.

/**
 * Currency registry — the single source of truth for everything the API does
 * *not* publish: symbol, locale, fraction digits, and the fallback rate. To add
 * a currency (e.g. EUR, JPY), append one entry here and teach
 * `exchangeRatesFromRows` in modelCatalog.ts to accept its code; every helper
 * below and the UI adapt automatically.
 */
export const CURRENCIES = {
  IDR: {
    /** ISO 4217 code. */
    code: 'IDR',
    symbol: 'Rp',
    displayName: 'Rupiah',
    /** Units of this currency per 1 USD, used until the catalog publishes one. */
    perUSD: 17920,
    /** BCP 47 locale used for number formatting. */
    locale: 'id-ID',
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
    maxDecimals: 2,
    inputMode: 'decimal' as const,
  },
}

export type Currency = keyof typeof CURRENCIES
export type CurrencyConfig = (typeof CURRENCIES)[Currency]

/** All supported currencies in display order (the app-bar select lists these). */
export const CURRENCY_LIST = Object.keys(CURRENCIES) as Currency[]

/**
 * Runtime narrowing of an API/localStorage currency code to a `Currency`. The
 * catalog's `currency` keys and the persisted rate table are plain strings, and
 * `Object.keys(CURRENCIES).includes` would type-error against `Currency`.
 */
export const isSupportedCurrency = (code: string): code is Currency =>
  Object.hasOwn(CURRENCIES, code)

/** Convenience read of a currency's config; throws only on programmer error. */
export const currencyConfig = (currency: Currency): CurrencyConfig => CURRENCIES[currency]

const isPositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

/**
 * How far a live FX figure may sit from the registry fallback in either
 * direction while still counting as that currency's rate. No real-world
 * currency's units-per-USD has ever moved three orders of magnitude, so
 * anything beyond that is a data error, not a rate.
 */
const RATE_TOLERANCE = 1_000

/**
 * A live FX figure the app can still compute with: the rate is positive AND
 * within RATE_TOLERANCE of the registry fallback for its code.
 *
 * The window is the magnitude half of the same rule `isPositive` covers for
 * sign: `1e-320` and `1e308` are strictly positive and finite, yet they floor
 * every converted price to zero (a "free" rate that is not free) or overflow
 * the coverage math to Infinity — silent garbage of the exact kind the strict
 * checks were written to keep out, reached through size instead of value.
 */
export const isUsableRate = (code: Currency, value: unknown): value is number => {
  if (!isPositive(value)) return false
  const fallback = CURRENCIES[code].perUSD
  return value >= fallback / RATE_TOLERANCE && value <= fallback * RATE_TOLERANCE
}

/**
 * Live USD rates published by the model catalog, keyed by supported currency.
 * A missing key means the catalog published nothing usable for that code, so
 * the registry default applies.
 */
export type ExchangeRates = Partial<Record<Currency, number>>

/** Empty rate table — every lookup falls back to `CURRENCIES[..].perUSD`. */
export const EMPTY_RATES: ExchangeRates = {}

/**
 * The active display currency bundled with the rates it converts through.
 * One object instead of a `currency` plus a `rates` parameter pair: a call site
 * cannot forward the active currency without the rate table that goes with it,
 * so prices and coverage can never disagree about what a dollar is worth.
 */
export type Fx = { currency: Currency; rates: ExchangeRates }

export const makeFx = (currency: Currency, rates: ExchangeRates = EMPTY_RATES): Fx => ({
  currency,
  rates,
})

/**
 * Units of `currency` per 1 USD: the catalog's live rate when it published a
 * usable one, otherwise the registry default. USD is pinned to the registry (1)
 * rather than read from the response — its rate is the definition of the table,
 * not a figure to be overridden by an API row.
 */
export const ratePerUSD = (fx: Fx, currency: Currency = fx.currency): number => {
  if (currency === 'USD') return CURRENCIES.USD.perUSD
  const live = fx.rates[currency]
  return isPositive(live) ? live : CURRENCIES[currency].perUSD
}

/**
 * The starting balance for `fx`: ≈ USD 1 at the rate actually in use, so a live
 * `15000` seeds `15000` and the static fallback seeds `17920`. Trimmed to the
 * currency's fraction digits (USD → `1`).
 */
export const defaultBalanceFor = (fx: Fx, currency: Currency = fx.currency): string => {
  const factor = 10 ** CURRENCIES[currency].maxDecimals
  return String(Math.round(ratePerUSD(fx, currency) * factor) / factor)
}

/**
 * Largest balance (in `currency`'s own units) that survives the trip through
 * `Number` intact: `MAX_SAFE_INTEGER` minor units, so a whole amount here is an
 * exact integer of cents/rupiah and the `* 1_000_000 / price` in `coverageTokens`
 * cannot overflow to `Infinity`. One shared ceiling for the input sanitizer and
 * the coverage guard, so the two can never disagree about a valid amount.
 */
export const maxSafeBalance = (currency: Currency): number =>
  Number.MAX_SAFE_INTEGER / 10 ** currencyConfig(currency).maxDecimals

/** Which per-token rate to read off a catalog row; the API ships all three, in cents. */
export type PriceKind = 'input' | 'output' | 'cache'

/** Any row that carries the price columns. Optional so partial rows still render. */
export type PricedModel = { input?: number | null; output?: number | null; cache?: number | null }

/** Shares of a processed token stream: cache reads, fresh input, output. */
export type UsageMix = { cache: number; input: number; output: number }

/**
 * The mix every estimate uses. Fixed for now and passed explicitly at the call
 * site — the slider UI replaces this constant with state later, and nothing ever
 * priced itself against an invisible assumption.
 */
export const DEFAULT_USAGE_MIX: UsageMix = { cache: 65, input: 25, output: 10 }

/** Shown when the API publishes no rate for a column, so "unknown" never reads as "free". */
const PRICE_UNAVAILABLE = '—'

/**
 * US cents per 1M tokens → dollars per 1M (the API's unit; `100` means USD 1).
 * Guarded against missing/zero/negative API values — returns 0 as a safe fallback.
 */
const centsToUSD = (cents: number | null | undefined): number =>
  isPositive(cents) ? cents / 100 : 0

/**
 * Price per 1M tokens in USD for the requested kind. The catalog's unit is US
 * cents (`output: 1000` → USD 10 per 1M), so this is the published rate as-is.
 */
export const pricePerMillionUSD = (model: PricedModel, kind: PriceKind): number =>
  centsToUSD(model[kind])

/**
 * Price per 1M tokens in the active currency. The catalog publishes prices in
 * USD and the FX figure in the same response, so USD mode is the published
 * figure as-is and every other currency scales through `ratePerUSD` — the live
 * catalog rate when there is one, the registry default otherwise. The same rate
 * prices the rates, the balance and the coverage, so the three can never
 * disagree about what a dollar is worth.
 */
export const pricePerMillion = (model: PricedModel, kind: PriceKind, fx: Fx): number =>
  pricePerMillionUSD(model, kind) * ratePerUSD(fx)

/**
 * Blended USD per 1M *processed* tokens for the mix: every share pays its own
 * rate, so 65/25/10 against `cache: 10, input: 200, output: 1000` cents is
 * (65×$0.10 + 25×$2.00 + 10×$10.00) ÷ 100 = $1.565 per 1M.
 *
 * Weights normalize by their sum instead of trusting 100, so a future slider
 * that ends on 65/25/15 is rescaled rather than reading 5% high.
 *
 * A row with no cache rate contributes $0 to that share — free or near-free
 * cache reads, exactly as the catalog numbers it, not an input-rate fallback.
 */
export const blendedPricePerMillionUSD = (model: PricedModel, mix: UsageMix): number => {
  const total = mix.cache + mix.input + mix.output
  if (total <= 0) return 0
  return (
    mix.cache * pricePerMillionUSD(model, 'cache') +
    mix.input * pricePerMillionUSD(model, 'input') +
    mix.output * pricePerMillionUSD(model, 'output')
  ) / total
}

/** Convert an amount between supported currencies at one rate table. */
export const convertAmount = (value: number, from: Currency, to: Currency, rates: ExchangeRates): number =>
  from === to
    ? value
    : (value / ratePerUSD(makeFx(from, rates))) * ratePerUSD(makeFx(to, rates))

/**
 * How many tokens the balance (in the selected currency) covers at the model's
 * blended rate for `mix`. Cache-read tokens count in the total — they are tokens
 * you paid to process. Guarded: returns 0 whenever the blended rate works out to
 * 0, which now covers three cases — the mix is empty, the model publishes no rate
 * for any column the mix weights, or every weighted rate is a published 0. Read
 * that 0 with `isUnlimitedCoverage` before displaying it: a $0 rate means free,
 * not worthless.
 */
export const coverageTokens = (
  balance: number,
  model: PricedModel,
  fx: Fx,
  mix: UsageMix,
): number => {
  const price = blendedPricePerMillionUSD(model, mix)
  if (price <= 0) return 0
  const balanceUSD = balance / ratePerUSD(fx)
  return Math.floor((balanceUSD / price) * 1_000_000)
}

/**
 * True when the mix weights only rates the catalog calls free (`0`) or absent.
 * Per modelCatalog — "no cache rate means free cache reads by policy" — a $0
 * blend is *unbounded* coverage, not unaffordable coverage: the same balance
 * buys an unlimited number of tokens at that mix. So `coverageTokens`' 0 guard
 * must never be rendered as a token count when this returns true.
 *
 * An empty mix (every share 0) is not free, it is meaningless; the sliders
 * cannot build one, but the total check keeps a hand-made mix from claiming ∞.
 */
export const isUnlimitedCoverage = (model: PricedModel, mix: UsageMix): boolean =>
  mix.cache + mix.input + mix.output > 0 && blendedPricePerMillionUSD(model, mix) <= 0

/** Biggest first, so a count always lands on the smallest suffix under 1000. */
const TOKEN_SCALES = [
  { limit: 1_000_000_000_000, suffix: 'T', decimals: 0 },
  { limit: 1_000_000_000, suffix: 'B', decimals: 2 },
  { limit: 1_000_000, suffix: 'M', decimals: 2 },
  { limit: 1_000, suffix: 'K', decimals: 1 },
] as const

/** Split so the UI can set the number and its suffix at different sizes. */
export type TokenCount = { value: string; unit: string }

/**
 * Scale a token count for display: 66_666_666 → `66.67` + `M`, 5_000_000_000 →
 * `5.00` + `B`, 420_000 → `420.0` + `K`, 812 → `812` + no unit (grouped per the
 * active currency's locale). The unit comes back separate so the JSX can render
 * it as `.coverage-unit`; one node would inherit the 30px headline size and
 * stretch `999.99M` past the 180px minimum slot width.
 *
 * Formatting the scale here means a near-free mix never prints `5000.00M` and a
 * small balance never prints `0.00M`. T drops its decimals: it only carries
 * counts in the hundreds, and a fixed digit budget keeps the widest string
 * inside a narrow slot.
 */
export const formatTokenCount = (tokens: number, fx: Fx): TokenCount => {
  const count = Math.max(0, Math.floor(tokens))
  const tier = TOKEN_SCALES.find(({ limit }) => count >= limit)
  if (!tier) {
    return { value: count.toLocaleString(currencyConfig(fx.currency).locale), unit: '' }
  }
  /*
   * 999_999_999 is under 1B but its M reading rounds up to `1000.00M`, and a
   * four-digit head is what overflows a narrow slot. Step one tier up instead:
   * `1.00B` says the same thing inside the digit budget. T is the widest tier, so
   * it has nothing to step to and keeps `5000T`.
   */
  const wider = TOKEN_SCALES[TOKEN_SCALES.indexOf(tier) - 1]
  if (wider && Number((count / tier.limit).toFixed(tier.decimals)) >= 1000) {
    return { value: (count / wider.limit).toFixed(wider.decimals), unit: wider.suffix }
  }
  return { value: (count / tier.limit).toFixed(tier.decimals), unit: tier.suffix }
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

/**
 * The published per-1M rate for the requested kind, shown in the active
 * currency at the active rate: `output: 1000` cents is `$10.00` in USD mode and
 * `Rp 150.000` when the catalog publishes `15000` IDR per USD (or `Rp 165.000`
 * on the static fallback). Only the display unit and the FX figure change — no
 * token math, the USD number is still the catalog's own price.
 *
 * A published `0` renders as a free rate (`$0.00`); only a missing or unusable
 * column falls back to the em dash, so "free" and "unknown" stay distinguishable.
 */
export const formatPriceInfo = (
  model: PricedModel,
  kind: PriceKind,
  fx: Fx,
): string => {
  const cents = model[kind]
  const published = typeof cents === 'number' && Number.isFinite(cents) && cents >= 0
  return published ? formatMoney(pricePerMillion(model, kind, fx), fx.currency) : PRICE_UNAVAILABLE
}

/** Format a raw balance string for display when the field is not focused. */
export const formatBalanceForDisplay = (balance: string, currency: Currency): string =>
  numberFormatter(currency).format(Number(balance) || 0)

/**
 * Convert a raw balance input string between currencies, keeping the value
 * equivalent at the active rate table (the catalog's, or the registry defaults
 * until it arrives). Trailing decimals are trimmed to the target currency's
 * fraction digits.
 */
export const convertBalance = (balance: string, from: Fx, to: Fx): string => {
  if (from.currency === to.currency) return balance
  const factor = 10 ** currencyConfig(to.currency).maxDecimals
  return String(
    Math.round(convertAmount(Number(balance) || 0, from.currency, to.currency, to.rates) * factor) / factor,
  )
}

/**
 * The locale's real grouping and decimal separators, read from `Intl` itself
 * rather than assumed. Cached per currency — these are locale constants, so the
 * work of `formatToParts` is paid once, not on every keystroke.
 *
 * Needed because `formatBalanceForDisplay` *renders* with these separators
 * (USD `1,000.00`, IDR `15.000`) and the input must be able to *re-read* the
 * same string: strip the group mark, fold the decimal mark to `.` (the only
 * separator the precision regex understands), and only then validate.
 */
const localeSeparators = (() => {
  const cache = new Map<Currency, { group: string; decimal: string }>()
  return (currency: Currency) => {
    const hit = cache.get(currency)
    if (hit) return hit
    const parts = new Intl.NumberFormat(currencyConfig(currency).locale).formatToParts(1234567.5)
    const find = (type: Intl.NumberFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? ''
    const sep = { group: find('group'), decimal: find('decimal') }
    cache.set(currency, sep)
    return sep
  }
})()

/**
 * Keep raw user input valid for the selected currency while editing.
 *
 * Paste is the case that matters: a copied `1,000.00` (USD) or `15.000`
 * (IDR) is the app's *own* formatted output, so the locale's grouping/decimal
 * separators are resolved and stripped first and must never be read as digits.
 * Otherwise `1,000.00` collapses to `1` (it stopped at the group comma) and an
 * id-ID decimal comma `1,50` (= 1.50) explodes to `150`. A currency with no
 * fraction digits keeps only the leading integer run, so `1,50` is floored to
 * `1` rather than merged into `150`.
 */
export const sanitizeBalanceInput = (raw: string, currency: Currency): string => {
  const { maxDecimals } = currencyConfig(currency)
  const { group, decimal } = localeSeparators(currency)
  // A balance is non-negative: a minus sign anywhere makes the amount ambiguous,
  // so reject it rather than drop the sign and silently flip the value.
  if (/[-\u2212]/.test(raw)) return ''
  let value = raw
  if (group) value = value.split(group).join('')
  if (decimal && decimal !== '.') value = value.split(decimal).join('.')
  // Drop a leading label a paste may carry ("Rp ", "$"). Stripped from the front
  // only, so punctuation between digits (e.g. "12:30") is never merged into a
  // larger number; a leading "." is kept so ".50" stays 0.50, not 50.
  value = value.replace(/^[^\d.]+/, '')
  const trimmed =
    maxDecimals === 0
      ? value.match(/^\d*/)?.[0] ?? ''
      : value.match(new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}`))?.[0] ?? ''
  // A balance is a real amount of money, not a stress test: past the currency's
  // safe ceiling `Number` cannot represent it (it overflows to Infinity, and the
  // derived token count overflows with it), so reject rather than let the field
  // render the symbol for infinity and every slot render `InfinityT`.
  if (trimmed && !(Number(trimmed) <= maxSafeBalance(currency))) return ''
  return trimmed
}

/** Key holding the last successful catalog rate table (see persistRates). */
const RATES_STORAGE_KEY = 'exchangeRates'

/**
 * Read the persisted rate table written by the previous successful catalog load.
 * Returns `EMPTY_RATES` when nothing is stored, the JSON is corrupt, or the
 * shape is wrong — a stale or hand-edited entry must degrade to the registry
 * defaults rather than throw during the first render.
 *
 * Unknown codes are dropped on read as well as on write: `Currency` is derived
 * from `CURRENCIES`, so a cached `EUR` would type as supported and then read
 * `CURRENCIES.EUR` as `undefined`. Rates outside the usable window are dropped
 * too, so a table poisoned by an earlier malformed response heals itself on
 * the next read instead of persisting the garbage (see isUsableRate).
 */
export const readPersistedRates = (): ExchangeRates => {
  try {
    const stored = localStorage.getItem(RATES_STORAGE_KEY)
    if (!stored) return EMPTY_RATES
    const parsed: unknown = JSON.parse(stored)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return EMPTY_RATES
    const rates: ExchangeRates = {}
    for (const [code, value] of Object.entries(parsed)) {
      if (isSupportedCurrency(code) && code !== 'USD' && isUsableRate(code, value)) rates[code] = value
    }
    return rates
  } catch {
    // Storage may be unavailable (private browsing, restricted embeds), or the
    // payload may not be JSON. Either way: fall back to the registry defaults.
    return EMPTY_RATES
  }
}

/**
 * Persist a rate table for the next visit. Skips an empty table so a catalog
 * that publishes no `currency` field cannot wipe a good cached rate, and stays
 * silent on quota/availability errors — the rate is a display refinement, never
 * worth a visible failure.
 */
export const persistRates = (rates: ExchangeRates): void => {
  if (Object.keys(rates).length === 0) return
  try {
    localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(rates))
  } catch {
    // Keep the in-memory rate table; nothing else depends on the cache.
  }
}
