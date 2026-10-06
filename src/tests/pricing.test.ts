import { describe, expect, it } from 'vitest'
import {
  blendedPricePerMillionUSD,
  convertBalance,
  coverageTokens,
  DEFAULT_USAGE_MIX,
  EMPTY_RATES,
  formatPriceInfo,
  isUnlimitedCoverage,
  makeFx,
  pricePerMillionUSD,
  ratePerUSD,
  sanitizeBalanceInput,
} from '../lib/pricing'

const usdFx = makeFx('USD')

/** Normal, paid model: $2 input, $1 output per 1M. */
const paidModel = { input: 200, output: 100 }

/** Free model: all rates are published as 0. */
const freeModel = { input: 0, output: 0, cache: 0 }

describe('ratePerUSD', () => {
  it('uses a live rate inside the plausible window', () => {
    expect(ratePerUSD(makeFx('IDR', { IDR: 15000 }))).toBe(15000)
  })

  it('falls back to the registry default when the rate is too small', () => {
    expect(ratePerUSD(makeFx('IDR', { IDR: 1e-320 }))).toBe(17920)
  })

  it('falls back to the registry default when the rate is too large', () => {
    expect(ratePerUSD(makeFx('IDR', { IDR: 1e308 }))).toBe(17920)
  })

  it('falls back to the registry default for a negative rate', () => {
    expect(ratePerUSD(makeFx('IDR', { IDR: -1 }))).toBe(17920)
  })

  it('ignores a live USD rate and always returns 1', () => {
    expect(ratePerUSD(makeFx('USD', { USD: 0.9 }))).toBe(1)
  })
})

describe('pricePerMillionUSD', () => {
  it('converts cache cents to dollars, treating missing as free', () => {
    expect(pricePerMillionUSD({ cache: 10 }, 'cache')).toBe(0.1)
    expect(pricePerMillionUSD({}, 'cache')).toBe(0)
    expect(pricePerMillionUSD({ cache: null }, 'cache')).toBe(0)
  })

  it('converts input/output cents to dollars', () => {
    expect(pricePerMillionUSD(paidModel, 'input')).toBe(2)
    expect(pricePerMillionUSD(paidModel, 'output')).toBe(1)
  })

  it('treats missing or invalid input/output as unavailable', () => {
    expect(pricePerMillionUSD({}, 'input')).toBeNaN()
    expect(pricePerMillionUSD({ input: -1 }, 'input')).toBeNaN()
    expect(pricePerMillionUSD({ input: NaN }, 'input')).toBeNaN()
  })
})

describe('blendedPricePerMillionUSD', () => {
  it('computes the default blend for a paid model', () => {
    // (65*0 + 25*2 + 10*1) / 100 = 0.6
    expect(blendedPricePerMillionUSD(paidModel, DEFAULT_USAGE_MIX)).toBe(0.6)
  })

  it('rejects mixes with negative weights', () => {
    expect(blendedPricePerMillionUSD(paidModel, { cache: 0, input: -1, output: 2 })).toBe(0)
  })

  it('rejects empty mixes', () => {
    expect(blendedPricePerMillionUSD(paidModel, { cache: 0, input: 0, output: 0 })).toBe(0)
  })

  it('returns NaN when required prices are unavailable', () => {
    expect(blendedPricePerMillionUSD({}, DEFAULT_USAGE_MIX)).toBeNaN()
  })

  it('returns 0 for a fully free model', () => {
    expect(blendedPricePerMillionUSD(freeModel, DEFAULT_USAGE_MIX)).toBe(0)
  })

  it('returns NaN when only cache is available but input/output are missing', () => {
    expect(blendedPricePerMillionUSD({ cache: 100 }, DEFAULT_USAGE_MIX)).toBeNaN()
  })
})

describe('isUnlimitedCoverage', () => {
  it('is true for a fully free model', () => {
    expect(isUnlimitedCoverage(freeModel, DEFAULT_USAGE_MIX)).toBe(true)
  })

  it('is false for a paid model', () => {
    expect(isUnlimitedCoverage(paidModel, DEFAULT_USAGE_MIX)).toBe(false)
  })

  it('is false when required prices are unavailable', () => {
    expect(isUnlimitedCoverage({}, DEFAULT_USAGE_MIX)).toBe(false)
  })

  it('is false for invalid mixes', () => {
    expect(isUnlimitedCoverage(freeModel, { cache: 0, input: -1, output: 2 })).toBe(false)
  })
})

describe('coverageTokens', () => {
  it('returns 0 when the blend is free/unlimited', () => {
    expect(coverageTokens(100, freeModel, usdFx, DEFAULT_USAGE_MIX)).toBe(0)
  })

  it('returns 0 for an invalid mix', () => {
    expect(coverageTokens(100, paidModel, usdFx, { cache: 0, input: -1, output: 2 })).toBe(0)
  })

  it('returns 0 when required prices are unavailable', () => {
    expect(coverageTokens(100, {}, usdFx, DEFAULT_USAGE_MIX)).toBe(0)
  })

  it('guards against tiny prices producing Infinity', () => {
    expect(coverageTokens(1, { input: 1e-300, output: 1e-300 }, usdFx, DEFAULT_USAGE_MIX)).toBe(0)
  })

  it('rejects non-finite balances', () => {
    expect(coverageTokens(Infinity, paidModel, usdFx, DEFAULT_USAGE_MIX)).toBe(0)
    expect(coverageTokens(NaN, paidModel, usdFx, DEFAULT_USAGE_MIX)).toBe(0)
  })

  it('rejects negative balances', () => {
    expect(coverageTokens(-5, paidModel, usdFx, DEFAULT_USAGE_MIX)).toBe(0)
  })

  it('computes a normal coverage figure', () => {
    // $100 at $0.60 per 1M -> 166_666_666 tokens
    expect(coverageTokens(100, paidModel, usdFx, DEFAULT_USAGE_MIX)).toBe(166_666_666)
  })
})

describe('convertBalance', () => {
  it('converts USD to IDR with fallback rates and caps to safe integer', () => {
    expect(convertBalance(String(90071992547409.9), makeFx('USD', EMPTY_RATES), makeFx('IDR', EMPTY_RATES)))
      .toBe(String(Number.MAX_SAFE_INTEGER))
  })

  it('rounds IDR conversions to zero decimals', () => {
    // 1 USD -> 17920 IDR, exact integer
    expect(convertBalance('1', makeFx('USD', EMPTY_RATES), makeFx('IDR', EMPTY_RATES))).toBe('17920')
  })

  it('rounds USD conversions to two decimals', () => {
    expect(convertBalance('17920', makeFx('IDR', EMPTY_RATES), makeFx('USD', EMPTY_RATES))).toBe('1')
  })

  it('returns the same string for identical currencies', () => {
    expect(convertBalance('1234.56', makeFx('USD'), makeFx('USD'))).toBe('1234.56')
  })

  it('returns zero for non-finite input', () => {
    expect(convertBalance('Infinity', makeFx('USD'), makeFx('IDR'))).toBe('0')
  })
})

describe('sanitizeBalanceInput', () => {
  it('accepts valid USD grouping and decimals', () => {
    expect(sanitizeBalanceInput('1,234.56', 'USD')).toBe('1234.56')
  })

  it('accepts valid IDR grouping', () => {
    expect(sanitizeBalanceInput('15.000', 'IDR')).toBe('15000')
  })

  it('rejects IDR strings that use the group separator as a decimal', () => {
    expect(sanitizeBalanceInput('1.50', 'IDR')).toBe('')
    expect(sanitizeBalanceInput('12.34', 'IDR')).toBe('')
  })

  it('rejects malformed USD grouping', () => {
    expect(sanitizeBalanceInput('12,34.56', 'USD')).toBe('')
    expect(sanitizeBalanceInput('1234,56', 'USD')).toBe('')
  })

  it('rejects negative input', () => {
    expect(sanitizeBalanceInput('-100', 'USD')).toBe('')
    expect(sanitizeBalanceInput('−100', 'USD')).toBe('')
  })

  it('rejects amounts above the safe ceiling', () => {
    expect(sanitizeBalanceInput(String(Number.MAX_SAFE_INTEGER + 1), 'USD')).toBe('')
  })
})

describe('formatPriceInfo', () => {
  it('shows unavailable for missing required prices', () => {
    expect(formatPriceInfo({}, 'input', usdFx)).toBe('—')
  })

  it('shows free for a published zero', () => {
    expect(formatPriceInfo({ input: 0 }, 'input', usdFx)).toBe('$0.00')
  })
})
