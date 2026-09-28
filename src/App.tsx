import { useEffect, useState } from 'react'
import { Box, ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react'
import AppHeader from './components/AppHeader/AppHeader'
import { ModelBalanceSection } from './components/ModelBalanceSection/ModelBalanceSection'
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

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('theme', theme) } catch { /* Keep the theme in memory. */ }
  }, [theme])

  return (
    <ChakraProvider value={system}>
      <AppHeader theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
      <Box as="main" className="page-shell">
        <ModelBalanceSection />
      </Box>
    </ChakraProvider>
  )
}

export default App
