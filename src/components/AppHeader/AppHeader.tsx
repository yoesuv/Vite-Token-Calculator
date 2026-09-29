import { Box, Button, Heading, HStack, Text } from '@chakra-ui/react'
import { CURRENCY_LIST, currencyConfig, type Currency } from '../../lib/pricing'
import type { ColorMode } from '../../lib/useColorMode'
import './AppHeader.css'

type AppHeaderProps = {
  colorMode: ColorMode
  onToggleColorMode: () => void
  currency: Currency
  onCurrencyChange: (currency: Currency) => void
}

function AppHeader({ colorMode, onToggleColorMode, currency, onCurrencyChange }: AppHeaderProps) {
  // colorMode state is owned by AppShell — the hook must only be instantiated
  // once, otherwise components would hold divergent copies of the mode.
  const isDark = colorMode === 'dark'

  return (
    <Box as="header" className="app-bar">
      <Box className="app-bar-inner">
        <HStack className="brand-block" align="center">
          <Box className="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" role="presentation">
              <rect x="8" y="4" width="16" height="24" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M11.5 9.5h9M12 14.5h.01M16 14.5h.01M20 14.5h.01M12 19h.01M16 19h.01M20 19h.01M12 23.5h.01M16 23.5h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </Box>
          <Box className="brand-copy">
            <Heading as="h1" className="app-title">Token Calculator</Heading>
            <Text className="app-subtitle">See how far your prompt goes across different AI models.</Text>
          </Box>
        </HStack>
        <HStack className="app-bar-actions" gap="2">
          <select
            className="currency-select"
            aria-label="Select currency"
            value={currency}
            onChange={(event) => onCurrencyChange(event.target.value as Currency)}
          >
            {CURRENCY_LIST.map((code) => (
              <option key={code} value={code}>
                {currencyConfig(code).symbol} · {code}
              </option>
            ))}
          </select>
          <Button
            variant="plain"
            className="theme-toggle"
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            onClick={onToggleColorMode}
          >
            <span className="theme-toggle-icon" aria-hidden="true">{isDark ? '☀' : '☾'}</span>
            {isDark ? 'Light' : 'Dark'}
          </Button>
        </HStack>
      </Box>
    </Box>
  )
}

export default AppHeader
