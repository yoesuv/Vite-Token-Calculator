import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

/**
 * App design tokens as Chakra UI semantic tokens.
 *
 * Light values are the `_light` base; dark values ride on Chakra's `_dark`
 * condition, which resolves to `.dark &`. The `.dark` class is applied to
 * <html> by the pre-paint script in index.html and kept in sync by
 * `useColorMode()` — that is what flips every token below.
 *
 * Standard Chakra semantic names (`bg`, `bg.panel`, `fg`, `fg.muted`,
 * `fg.subtle`, `border`, `border.subtle`, …) are used where they fit so
 * built-in Chakra components follow the same palette; app-specific tokens
 * keep descriptive names. Every token is emitted as a CSS custom property
 * (e.g. `--chakra-colors-fg-muted`) that plain CSS can consume.
 */
const config = defineConfig({
  theme: {
    tokens: {
      fonts: {
        body: { value: "'DM Sans', sans-serif" },
        heading: { value: "'Space Grotesk', sans-serif" },
        mono: { value: "'DM Mono', monospace" },
      },
    },
    semanticTokens: {
      colors: {
        // Page canvas + core content colors (html bg/color are wired to these by Chakra's base styles).
        bg: {
          DEFAULT: { value: { _light: '#f7f6f2', _dark: '#191816' } },
          panel: { value: { _light: '#ffffff', _dark: '#21201d' } }, // cards, app bar, popovers
          subtle: { value: { _light: '#fcfaf8', _dark: '#262320' } },
          muted: { value: { _light: '#fafbfd', _dark: '#1e2127' } },
        },
        fg: {
          DEFAULT: { value: { _light: '#24231f', _dark: '#eceae4' } },
          heading: { value: { _light: '#272620', _dark: '#f2f0ea' } },
          muted: { value: { _light: '#77756f', _dark: '#a5a29a' } },
          subtle: { value: { _light: '#8b8881', _dark: '#8b8881' } },
        },
        border: {
          DEFAULT: { value: { _light: '#e4e1da', _dark: '#34322d' } },
          subtle: { value: { _light: '#d5d5d5', _dark: '#3d3b35' } },
        },
        // Brand accent — shared by both modes.
        accent: { value: { _light: '#ed694c', _dark: '#ed694c' } },
        // Form controls.
        'input-bg': { value: { _light: '#fafafa', _dark: '#1b1a18' } },
        'focus-ring': { value: { _light: '#11111118', _dark: '#f2f0ea18' } },
        // Neutral icon chip.
        'icon-bg': { value: { _light: '#f0f0f0', _dark: '#2d2b27' } },
        'icon-fg': { value: { _light: '#555555', _dark: '#b5b2aa' } },
        // Warm icon chip (model/provider slot 1).
        'icon-bg-1': { value: { _light: '#f5e9e3', _dark: '#3a2b24' } },
        'icon-fg-1': { value: { _light: '#b56d59', _dark: '#d99c88' } },
        // Cool icon chip (model/provider slot 2).
        'icon-bg-2': { value: { _light: '#e8eef7', _dark: '#242b36' } },
        'icon-fg-2': { value: { _light: '#52729f', _dark: '#8fa9cd' } },
        // Availability checkmark.
        'check-fg': { value: { _light: '#477153', _dark: '#7aa888' } },
        // Solid CTA buttons (inverted pair).
        'button-bg': { value: { _light: '#111111', _dark: '#f2f0ea' } },
        'button-fg': { value: { _light: '#ffffff', _dark: '#191816' } },
      },
      shadows: {
        section: {
          value: {
            _light: '0 16px 40px #302a1710',
            _dark: '0 16px 40px #00000059',
          },
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
