// Pricing configuration for token estimates.
// API contract: `input`, `output`, and `cache` are US **cents** per 1M tokens
// (`100` → USD 1.00 per 1M). `cache` is the cache *read* rate — the catalog
// ships no cache-write premium.
// Coverage prices a blend of all three rates at the shares in DEFAULT_USAGE_MIX,
// so the assumption behind the number is visible instead of input-only.

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
    perUSD: 17920,
    /** BCP 47 locale used for number formatting. */
    locale: 'id-ID',
    /** Balance shown before the user edits the field (≈ USD 1). */
    defaultBalance: '17920',
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
 * Price per 1M tokens in the app's active currency. The catalog only publishes
 * USD, so USD mode is the figure as-is and IDR scales through that currency's
 * `perUSD` rate — the same rate the balance and coverage use, so the two never
 * disagree about what a dollar is worth.
 */
export const pricePerMillion = (model: PricedModel, kind: PriceKind, currency: Currency): number =>
  pricePerMillionUSD(model, kind) * currencyConfig(currency).perUSD

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

/** Convert an amount between supported currencies via each currency's perUSD rate. */
export const convertAmount = (value: number, from: Currency, to: Currency): number =>
  from === to ? value : (value / currencyConfig(from).perUSD) * currencyConfig(to).perUSD

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
  currency: Currency,
  mix: UsageMix,
): number => {
  const price = blendedPricePerMillionUSD(model, mix)
  if (price <= 0) return 0
  const balanceUSD = balance / currencyConfig(currency).perUSD
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
export const formatTokenCount = (tokens: number, currency: Currency): TokenCount => {
  const count = Math.max(0, Math.floor(tokens))
  const tier = TOKEN_SCALES.find(({ limit }) => count >= limit)
  if (!tier) {
    return { value: count.toLocaleString(currencyConfig(currency).locale), unit: '' }
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
 * currency: `output: 1000` reads `$10.00` in USD mode and `Rp 165.000` in IDR
 * mode. Only the display unit changes — no token math, the number is still the
 * catalog's own price.
 *
 * A published `0` renders as a free rate (`$0.00`); only a missing or unusable
 * column falls back to the em dash, so "free" and "unknown" stay distinguishable.
 */
export const formatPriceInfo = (
  model: PricedModel,
  kind: PriceKind,
  currency: Currency,
): string => {
  const cents = model[kind]
  const published = typeof cents === 'number' && Number.isFinite(cents) && cents >= 0
  return published ? formatMoney(pricePerMillion(model, kind, currency), currency) : PRICE_UNAVAILABLE
}

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
