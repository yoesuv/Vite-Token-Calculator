import { useEffect, useState } from 'react'
import { Box, ChakraProvider, Theme } from '@chakra-ui/react'
import AppHeader from './components/AppHeader/AppHeader'
import { ModelBalanceSection } from './components/ModelBalanceSection/ModelBalanceSection'
import { ModelPickerSection } from './components/ModelPickerSection/ModelPickerSection'
import { convertBalance, CURRENCY_LIST, DEFAULT_BALANCE, type Currency } from './lib/pricing'
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
  const [currency, setCurrency] = useState<Currency>(getInitialCurrency)
  // Balance lives here so switching currency can convert the entered value.
  const [balance, setBalance] = useState(() => DEFAULT_BALANCE[getInitialCurrency()])

  useEffect(() => {
    try { localStorage.setItem('currency', currency) } catch { /* Keep the currency in memory. */ }
  }, [currency])

  const switchCurrency = (next: Currency) => {
    if (next === currency) return
    setBalance((current) => convertBalance(current, currency, next))
    setCurrency(next)
  }

  return (
    // Chakra's official color-mode wrapper: renders the `.dark`/`.light`
    // `chakra-theme` class, sets `color-scheme`, and paints bg/fg tokens.
    <Theme appearance={colorMode}>
      <AppHeader
        colorMode={colorMode}
        onToggleColorMode={toggleColorMode}
        currency={currency}
        onCurrencyChange={switchCurrency}
      />
      <Box as="main" className="page-shell">
        <ModelBalanceSection currency={currency} balance={balance} onBalanceChange={setBalance} />
        <ModelPickerSection />
      </Box>
    </Theme>
  )
}

export default App
