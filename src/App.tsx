import { useEffect, useState } from 'react'
import { Box, ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react'
import AppHeader from './components/AppHeader/AppHeader'
import { ModelBalanceSection } from './components/ModelBalanceSection/ModelBalanceSection'
import { convertBalance, CURRENCY_LIST, DEFAULT_BALANCE, type Currency } from './lib/pricing'
import './App.css'

const system = createSystem(defaultConfig)
type Theme = 'light' | 'dark'
function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Storage may be unavailable in private browsing or restricted environments.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

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
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [currency, setCurrency] = useState<Currency>(getInitialCurrency)
  // Balance lives here so switching currency can convert the entered value.
  const [balance, setBalance] = useState(() => DEFAULT_BALANCE[getInitialCurrency()])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('theme', theme) } catch { /* Keep the theme in memory. */ }
  }, [theme])

  useEffect(() => {
    try { localStorage.setItem('currency', currency) } catch { /* Keep the currency in memory. */ }
  }, [currency])

  const switchCurrency = (next: Currency) => {
    if (next === currency) return
    setBalance((current) => convertBalance(current, currency, next))
    setCurrency(next)
  }

  return (
    <ChakraProvider value={system}>
      <AppHeader
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        currency={currency}
        onCurrencyChange={switchCurrency}
      />
      <Box as="main" className="page-shell">
        <ModelBalanceSection currency={currency} balance={balance} onBalanceChange={setBalance} />
      </Box>
    </ChakraProvider>
  )
}

export default App
