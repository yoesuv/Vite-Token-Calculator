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
  try {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  } catch {
    return 'light'
  }
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
  // Only sync the document — persistence is owned by toggleColorMode so an
  // OS-derived initial mode never gets written to storage as if the user had
  // picked it. Once the user toggles, their choice (and any later toggles)
  // are persisted, and future OS changes stop being followed.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', colorMode === 'dark')
    document.documentElement.style.colorScheme = colorMode
  }, [colorMode])

  const toggleColorMode = useCallback(() => {
    setColorMode((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem(STORAGE_KEY, next) } catch { /* Keep the mode in memory. */ }
      return next
    })
  }, [])

  return { colorMode, toggleColorMode }
}
