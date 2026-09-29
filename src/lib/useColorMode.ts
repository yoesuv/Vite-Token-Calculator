import { useCallback, useEffect, useState } from 'react'

export type ColorMode = 'light' | 'dark'

/** Same key the app used before the Chakra migration, so stored choices survive. */
const STORAGE_KEY = 'theme'

function getInitialColorMode(): ColorMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Storage may be unavailable in private browsing or restricted environments.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Color mode state for the app.
 *
 * Chakra v3.37 switches semantic tokens via its `_dark` condition, which
 * compiles to `.dark &` — so the `.dark` class must sit on <html>. Chakra's
 * `<Theme appearance>` component renders that class on its wrapper div and
 * sets `color-scheme`, but ships no state hook, so we own the state,
 * persistence, and the document-level sync here.
 *
 * Call this hook exactly ONCE (AppShell) and pass `colorMode` / handlers down
 * as props — each call creates an independent useState, and divergent copies
 * leave the `<Theme>` wrapper stuck on the initial mode.
 */
export function useColorMode() {
  const [colorMode, setColorMode] = useState<ColorMode>(getInitialColorMode)

  // Mirror the mode onto <html>: Chakra's token CSS flips on `html.dark`, and
  // the UA needs `color-scheme` for scrollbars and native controls.
  // (index.html applies the same class pre-paint to avoid a flash.)
  // Persist here too — committed effects keep storage in sync with the
  // rendered mode, unlike writes inside updater functions.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', colorMode === 'dark')
    document.documentElement.style.colorScheme = colorMode
    try { localStorage.setItem(STORAGE_KEY, colorMode) } catch { /* Keep the mode in memory. */ }
  }, [colorMode])

  const toggleColorMode = useCallback(() => {
    setColorMode((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { colorMode, toggleColorMode }
}
