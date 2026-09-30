import { Box, Button, Heading, HStack, Text } from "@chakra-ui/react";
import {
  CURRENCY_LIST,
  currencyConfig,
  type Currency,
} from "../../lib/pricing";
import type { ColorMode } from "../../lib/useColorMode";
import { MoonIcon, SunIcon, CalculatorIcon } from "../icons";
import "./AppHeader.css";

type AppHeaderProps = {
  colorMode: ColorMode;
  onToggleColorMode: () => void;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
};

function AppHeader({
  colorMode,
  onToggleColorMode,
  currency,
  onCurrencyChange,
}: AppHeaderProps) {
  // colorMode state is owned by AppShell — the hook must only be instantiated
  // once, otherwise components would hold divergent copies of the mode.
  const isDark = colorMode === "dark";

  return (
    <Box as="header" className="app-bar">
      <Box className="app-bar-inner">
        <HStack className="brand-block" align="center">
          <Box className="brand-icon" aria-hidden="true">
            <CalculatorIcon />
          </Box>
          <Box className="brand-copy">
            <Heading as="h1" className="app-title">
              Token Calculator
            </Heading>
            <Text className="app-subtitle">
              See how far your prompt goes across different AI models.
            </Text>
          </Box>
        </HStack>
        <HStack className="app-bar-actions" gap="2">
          <select
            className="currency-select"
            aria-label="Select currency"
            value={currency}
            onChange={(event) =>
              onCurrencyChange(event.target.value as Currency)
            }
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
            aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
            onClick={onToggleColorMode}
          >
            <span className="theme-toggle-icon" aria-hidden="true">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </span>
            {isDark ? "Light" : "Dark"}
          </Button>
        </HStack>
      </Box>
    </Box>
  );
}

export default AppHeader;
