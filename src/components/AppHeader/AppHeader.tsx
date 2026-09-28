import { Box, Button, Heading, HStack, Text } from '@chakra-ui/react'
import './AppHeader.css'

type AppHeaderProps = {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

function AppHeader({ theme, onToggleTheme }: AppHeaderProps) {
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
        <Button
          variant="plain"
          className="theme-toggle"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          onClick={onToggleTheme}
        >
          <span className="theme-toggle-icon" aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </Button>
      </Box>
    </Box>
  )
}

export default AppHeader
