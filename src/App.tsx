import { useCallback, useEffect, useState } from 'react'
import { Box, ChakraProvider, Theme } from '@chakra-ui/react'
import AppHeader from './components/AppHeader/AppHeader'
import { ModelBalanceSection } from './components/ModelBalanceSection/ModelBalanceSection'
import { ModelPickerSection } from './components/ModelPickerSection/ModelPickerSection'
import { ModelSelectionProvider } from './lib/ModelSelectionProvider'
import { useModelSelection } from './lib/useModelSelection'
import {
  convertBalance,
  CURRENCY_LIST,
  defaultBalanceFor,
  makeFx,
  type Currency,
} from './lib/pricing'
import { system } from './theme'
import { useColorMode } from './lib/useColorMode'
import './App.css'

function getInitialCurrency(): Currency {
  try {
    const stored = localStorage.getItem('currency')
    if (stored && (CURRENCY_LIST as string[]).includes(stored)) return stored as Currency
  } catch {
    // Storage may be unavailable in private browsing or restricted environments.
  }
  return 'IDR'
}

function App() {
  return (
    <ChakraProvider value={system}>
      <AppShell />
    </ChakraProvider>
  )
}

/** Sits inside the provider so hooks can consume the system. */
function AppShell() {
  // Single source of truth for color mode: the <Theme> wrapper, the <html>
  // sync, and the header toggle all read from this one instance.
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    // Chakra's official color-mode wrapper: renders the `.dark`/`.light`
    // `chakra-theme` class, sets `color-scheme`, and paints bg/fg tokens.
    <Theme appearance={colorMode}>
      {/* One provider feeds both sections: the catalog is fetched once, and the
          picker's selection is what the comparison slots render. <Workspace>
          sits inside it because the FX rate the balances depend on arrives with
          the catalog. */}
      <ModelSelectionProvider>
        <Workspace colorMode={colorMode} onToggleColorMode={toggleColorMode} />
      </ModelSelectionProvider>
    </Theme>
  )
}

/**
 * Currency + balance state, and the layout that consumes them.
 *
 * Reads the catalog's rate table, so it must render inside
 * <ModelSelectionProvider>; the header and both sections get one resolved `Fx`
 * so the price lines, the coverage math, and the balance input can never differ
 * about the USD figure behind them.
 */
function Workspace({
  colorMode,
  onToggleColorMode,
}: {
  colorMode: 'light' | 'dark'
  onToggleColorMode: () => void
}) {
  const { rates } = useModelSelection()
  const [currency, setCurrency] = useState<Currency>(getInitialCurrency)
  // `null` = the placeholder the user never touched: the displayed balance is
  // *derived* below from `currency` and the catalog's rates (≈ USD 1), so a rate
  // arriving or a currency switch re-derives it in the same render — no reseed
  // effect, no ref sentinel, no extra pass. Only a typed value is stored.
  const [enteredBalance, setEnteredBalance] = useState<string | null>(null)

  useEffect(() => {
    try { localStorage.setItem('currency', currency) } catch { /* Keep the currency in memory. */ }
  }, [currency])

  const fx = makeFx(currency, rates)

  // Derived: the placeholder means "≈ USD 1" at whatever rate is active, so it
  // reads 15000 while the catalog says 15000 and 17920 until it says anything.
  const balance = enteredBalance ?? defaultBalanceFor(fx)

  const handleBalanceChange = useCallback((next: string) => {
    setEnteredBalance(next)
  }, [])

  const switchCurrency = (next: Currency) => {
    if (next === currency) return
    // Convert at the incoming rate table, then make the new `Fx` explicit: both
    // sides of one switch must use the same USD figure or the converted balance
    // would contradict the prices it is about to be compared against. An
    // untouched placeholder stays null and re-derives as ≈ USD 1 in `next`.
    setEnteredBalance((current) =>
      current === null ? null : convertBalance(current, fx, makeFx(next, rates)),
    )
    setCurrency(next)
  }

  return (
    <>
      <AppHeader
        colorMode={colorMode}
        onToggleColorMode={onToggleColorMode}
        currency={currency}
        onCurrencyChange={switchCurrency}
      />
      <Box as="main" className="page-shell">
        <ModelBalanceSection fx={fx} balance={balance} onBalanceChange={handleBalanceChange} />
        <ModelPickerSection fx={fx} />
      </Box>
    </>
  )
}

export default App
