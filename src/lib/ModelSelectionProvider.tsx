// Owns the model catalog fetch and the models being compared, so
// <ModelPickerSection> and <ModelBalanceSection> read the same state: a pick in
// one is instantly reflected in the other, and the catalog loads once.
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { describeError, fetchAiModels } from './models'
import { MAX_SELECTED, sortForDisplay, toCatalogModels, type CatalogModel } from './modelCatalog'
import {
  persistRates,
  readPersistedRates,
  type ExchangeRates,
  type PriceKind,
  type PriceOverrideMap,
} from './pricing'
import { ModelSelectionContext, type ModelSelection, type SelectionStatus } from './useModelSelection'

/** Slot-order selection plus the limit notice, mutated only through the reducer. */
interface SelectionState {
  /** Selected ids in slot order. Index 0 is the primary model. */
  ids: string[]
  /**
   * Bumped on every blocked pick (0 = notice hidden). A counter rather than a
   * boolean so each rejected click restarts the auto-dismiss timer.
   */
  alerts: number
  /**
   * Ids present in the currently loaded catalog. Used to reject stray ids
   * (e.g. stale URL params or hand-typed values) that would otherwise be
   * invisible in `selectedModels` yet still consume a MAX_SELECTED slot.
   */
  _catalogIds: Set<string>
}

type SelectionAction =
  | { type: 'toggle'; id: string }
  | { type: 'addFirstAvailable'; candidates: string[]; fallback: string[] }
  | { type: 'remove'; id: string }
  | { type: 'prune'; allowed: Set<string> }
  | { type: 'fillDefault'; id: string }
  | { type: 'hideNotice' }

const EMPTY_SELECTION: SelectionState = { ids: [], alerts: 0, _catalogIds: new Set<string>() }

/**
 * Pure selection machine. Every branch decides against the latest state, so
 * dispatches batched before a render compose instead of each reading a stale
 * render closure. The alert counter lives inside the state purely, so a bump
 * can never be double-applied by StrictMode's double invocation — and no side
 * effect runs here: the provider's effect drives the auto-hide timer off `alerts`.
 */
function selectionReducer(
  state: SelectionState,
  action: SelectionAction,
): SelectionState {
  switch (action.type) {
    case 'toggle': {
      if (state.ids.includes(action.id)) {
        // Deselecting frees a slot, so the limit notice stands down.
        return { ...state, ids: state.ids.filter((id) => id !== action.id), alerts: 0 }
      }
      // Ignore ids that are not in the current catalog — they would be
      // invisible in `selectedModels` but still consume a MAX_SELECTED slot.
      if (!state._catalogIds.has(action.id)) {
        return state
      }
      if (state.ids.length >= MAX_SELECTED) {
        // Rejected pick: surface the notice instead of silently ignoring it.
        return { ...state, alerts: state.alerts + 1 }
      }
      return { ...state, ids: [...state.ids, action.id] }
    }
    case 'addFirstAvailable': {
      if (state.ids.length >= MAX_SELECTED) {
        return { ...state, alerts: state.alerts + 1 }
      }
      // Prefer the search-visible rows, then fall back to the whole catalog, so
      // a click never re-picks a model that is already selected.
      const firstFree = (ids: string[]) =>
        ids.find((id) => state._catalogIds.has(id) && !state.ids.includes(id))
      const nextId = firstFree(action.candidates) ?? firstFree(action.fallback)
      if (nextId === undefined) return state
      return { ...state, ids: [...state.ids, nextId] }
    }
    case 'remove':
      return { ...state, ids: state.ids.filter((id) => id !== action.id), alerts: 0 }
    case 'prune':
      // Drop selections the (re)loaded catalog no longer contains, so the
      // limit check counts only models that are really compared.
      return {
        ...state,
        ids: state.ids.every((id) => action.allowed.has(id))
          ? state.ids
          : state.ids.filter((id) => action.allowed.has(id)),
        _catalogIds: action.allowed,
      }
    case 'fillDefault':
      // First successful load pre-selects the primary; a selection already
      // made by an earlier load wins over re-filling it.
      return state.ids.length > 0 ? state : { ...state, ids: [action.id] }
    case 'hideNotice':
      return { ...state, alerts: 0 }
  }
}

export function ModelSelectionProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<CatalogModel[]>([])
  // Session-only price edits from the info popover. In-memory on purpose: a page
  // refresh discards them and the API prices come back.
  const [priceOverrides, setPriceOverrides] = useState<PriceOverrideMap>({})
  // Seeded from the last successful load so the first paint already prices in
  // the catalog's own FX rate instead of the registry default (see pricing.ts).
  const [rates, setRates] = useState<ExchangeRates>(readPersistedRates)
  const [status, setStatus] = useState<SelectionStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  // Bumped by the retry button to re-run the fetch effect.
  const [reloadKey, setReloadKey] = useState(0)
  const [{ ids: selectedIds, alerts: limitAlertKey }, dispatch] = useReducer(
    selectionReducer,
    EMPTY_SELECTION,
  )
  // Set once a non-empty catalog has loaded, so "retry" after the user emptied
  // the selection does not resurrect a model they deliberately removed.
  const defaultedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetchAiModels()
      .then(({ models: apiModels, rates: nextRates }) => {
        if (cancelled) return
        const next = sortForDisplay(toCatalogModels(apiModels))
        // Default primary = row 0 of the display order, i.e. the same model as
        // the first card in the picker grid.
        const primaryId = next.length > 0 ? next[0].id : ''
        const nextIds = new Set(next.map((model) => model.id))
        setCatalog(next)
        // An empty table means this response published no usable `currency`, so
        // keep what is already in hand (cache, then registry default) rather than
        // regressing to the assumed rate on every reload.
        if (Object.keys(nextRates).length > 0) {
          setRates(nextRates)
          persistRates(nextRates)
        }
        // Drop selections the (re)loaded catalog no longer contains, so the
        // limit check counts only models that are really compared.
        dispatch({ type: 'prune', allowed: nextIds })
        // First successful load pre-selects that model. The ref is written here,
        // not inside the reducer, which stays pure for React's double invocation
        // in StrictMode.
        if (!defaultedRef.current && primaryId) {
          defaultedRef.current = true
          dispatch({ type: 'fillDefault', id: primaryId })
        }
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setErrorMessage(describeError(error))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // Auto-hide the limit notice shortly after the last blocked attempt.
  useEffect(() => {
    if (limitAlertKey === 0) return
    const timer = window.setTimeout(() => dispatch({ type: 'hideNotice' }), 4000)
    return () => window.clearTimeout(timer)
  }, [limitAlertKey])

  // Overrides are merged here, once, so the picker, the slots, and the coverage
  // math all read the same prices. Only the three price columns change. Declared
  // before the callbacks below, which read `models`.
  const models = useMemo(
    () =>
      catalog.map((model) => {
        const overrides = priceOverrides[model.id]
        return overrides ? { ...model, ...overrides } : model
      }),
    [catalog, priceOverrides],
  )

  /** Remove a model and stand down the notice — a slot just freed up. */
  const deselect = useCallback((id: string) => {
    dispatch({ type: 'remove', id })
  }, [])

  const toggleModel = useCallback((id: string) => {
    dispatch({ type: 'toggle', id })
  }, [])

  const addFirstAvailable = useCallback(
    (candidates?: CatalogModel[]) => {
      dispatch({
        type: 'addFirstAvailable',
        candidates: (candidates ?? models).map((model) => model.id),
        fallback: models.map((model) => model.id),
      })
    },
    [models],
  )

  const retry = useCallback(() => {
    // Initial state is already 'loading'; retries re-set it here (event handler, not effect).
    setStatus('loading')
    setReloadKey((key) => key + 1)
  }, [])

  const setPriceOverride = useCallback((id: string, kind: PriceKind, cents: number) => {
    setPriceOverrides((current) => ({
      ...current,
      [id]: { ...current[id], [kind]: cents },
    }))
  }, [])

  const modelById = useMemo(
    () => new Map(models.map((model) => [model.id, model])),
    [models],
  )

  // Ordered by selection, not by the catalog: index 0 is the primary model.
  const selectedModels = useMemo(
    () =>
      selectedIds
        .map((id) => modelById.get(id))
        .filter((model): model is CatalogModel => model !== undefined),
    [modelById, selectedIds],
  )

  const value = useMemo<ModelSelection>(
    () => ({
      models,
      rates,
      status,
      errorMessage,
      retry,
      selectedIds,
      selectedModels,
      toggleModel,
      removeModel: deselect,
      addFirstAvailable,
      limitAlertKey,
      setPriceOverride,
      priceOverrides,
    }),
    [
      models,
      rates,
      status,
      errorMessage,
      retry,
      selectedIds,
      selectedModels,
      toggleModel,
      deselect,
      addFirstAvailable,
      limitAlertKey,
      setPriceOverride,
      priceOverrides,
    ],
  )

  return (
    <ModelSelectionContext.Provider value={value}>
      {children}
    </ModelSelectionContext.Provider>
  )
}
