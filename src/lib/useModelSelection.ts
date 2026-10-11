// Shared catalog + selection contract for the model picker and the comparison
// slots. Split from ModelSelectionProvider.tsx (component-only module) so Fast
// Refresh keeps working and eslint's react-refresh rule stays satisfied.
import { createContext, useContext } from 'react'
import { type CatalogModel } from './modelCatalog'
import { type ExchangeRates, type PriceKind, type PriceOverrideMap } from './pricing'

export type SelectionStatus = 'loading' | 'ready' | 'error'

/** Everything <ModelSelectionProvider> publishes; read it with useModelSelection(). */
export type ModelSelection = {
  /** Every catalog row, in display order (alphabetical by full API name). */
  models: CatalogModel[]
  /**
   * FX table (units per 1 USD) derived from the catalog's `currency` field,
   * seeded from localStorage. Empty when neither has a rate, which is the cue
   * for `ratePerUSD` to use the registry default.
   */
  rates: ExchangeRates
  /** Catalog fetch state; the picker and the slots render from the same copy. */
  status: SelectionStatus
  errorMessage: string
  /** Re-run the catalog fetch after a failure. */
  retry: () => void
  /** Selected ids in slot order. Index 0 is the primary model. */
  selectedIds: string[]
  /** Selected rows in slot order; empty trailing slots are simply absent. */
  selectedModels: CatalogModel[]
  /** Select or deselect a model from the picker grid / picker slot strip. */
  toggleModel: (id: string) => void
  /** Remove one model from a comparison slot; later slots shift up. */
  removeModel: (id: string) => void
  /**
   * Fill the first free slot. `candidates` (the search-visible rows) are tried
   * before the full catalog, and already-selected rows are always skipped.
   */
  addFirstAvailable: (candidates?: CatalogModel[]) => void
  /**
   * Bumped on every blocked pick (0 = notice hidden). A counter rather than a
   * boolean so each rejected click restarts the auto-dismiss timer.
   */
  limitAlertKey: number
  /**
   * Session-only price overrides, keyed by model id. `models` and
   * `selectedModels` already have them applied; this map is for the "edited" marker.
   */
  priceOverrides: PriceOverrideMap
  /**
   * Set one price (US cents per 1M) for a model until page refresh. Overrides
   * flow into `models` and `selectedModels`, so every price and coverage figure
   * updates together.
   */
  setPriceOverride: (id: string, kind: PriceKind, cents: number) => void
}

export const ModelSelectionContext = createContext<ModelSelection | null>(null)

/**
 * Read the shared catalog + selection. Throws when the provider is missing
 * rather than silently rendering an empty catalog.
 */
export function useModelSelection(): ModelSelection {
  const context = useContext(ModelSelectionContext)
  if (!context) {
    throw new Error(
      'useModelSelection must be used inside <ModelSelectionProvider>.',
    )
  }
  return context
}
