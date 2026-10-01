// Owns the model catalog fetch and the models being compared, so
// <ModelPickerSection> and <ModelBalanceSection> read the same state: a pick in
// one is instantly reflected in the other, and the catalog loads once.
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { describeError, fetchAiModels } from './models'
import { MAX_SELECTED, sortForDisplay, toCatalogModels, type CatalogModel } from './modelCatalog'
import { ModelSelectionContext, type ModelSelection, type SelectionStatus } from './useModelSelection'

export function ModelSelectionProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<CatalogModel[]>([])
  const [status, setStatus] = useState<SelectionStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  // Bumped by the retry button to re-run the fetch effect.
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [limitAlertKey, setLimitAlertKey] = useState(0)
  // Set once a non-empty catalog has loaded, so "retry" after the user emptied
  // the selection does not resurrect a model they deliberately removed.
  const defaultedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetchAiModels()
      .then((apiModels) => {
        if (cancelled) return
        const next = sortForDisplay(toCatalogModels(apiModels))
        // Default primary = row 0 of the display order, i.e. the same model as
        // the first card in the picker grid.
        const primaryId = next.length > 0 ? next[0].id : ''
        const nextIds = new Set(next.map((model) => model.id))
        setModels(next)
        // Drop selections the (re)loaded catalog no longer contains, so the
        // limit check counts only models that are really compared.
        setSelectedIds((current) =>
          current.every((id) => nextIds.has(id))
            ? current
            : current.filter((id) => nextIds.has(id)),
        )
        // First successful load pre-selects that model. The ref is written here,
        // not inside the updater, which stays pure for React's double invocation
        // in StrictMode.
        if (!defaultedRef.current && primaryId) {
          defaultedRef.current = true
          setSelectedIds((current) => (current.length > 0 ? current : [primaryId]))
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
    const timer = window.setTimeout(() => setLimitAlertKey(0), 4000)
    return () => window.clearTimeout(timer)
  }, [limitAlertKey])

  /** Remove a model and stand down the notice — a slot just freed up. */
  const deselect = useCallback((id: string) => {
    setSelectedIds((current) => current.filter((item) => item !== id))
    setLimitAlertKey(0)
  }, [])

  const toggleModel = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) {
        deselect(id)
        return
      }
      if (selectedIds.length >= MAX_SELECTED) {
        // Rejected pick: surface the notice instead of silently ignoring the click.
        setLimitAlertKey((key) => key + 1)
        return
      }
      setSelectedIds((current) =>
        current.includes(id) || current.length >= MAX_SELECTED
          ? current
          : [...current, id],
      )
    },
    [deselect, selectedIds],
  )

  const addFirstAvailable = useCallback(
    (candidates?: CatalogModel[]) => {
      if (selectedIds.length >= MAX_SELECTED) {
        setLimitAlertKey((key) => key + 1)
        return
      }
      const isFree = (model: CatalogModel) => !selectedIds.includes(model.id)
      // Prefer the search-visible rows, then fall back to the whole catalog, so
      // a click never re-picks a model that is already selected.
      const next = candidates?.find(isFree) ?? models.find(isFree)
      if (!next) return
      const id = next.id
      setSelectedIds((current) =>
        current.includes(id) || current.length >= MAX_SELECTED
          ? current
          : [...current, id],
      )
    },
    [models, selectedIds],
  )

  const retry = useCallback(() => {
    // Initial state is already 'loading'; retries re-set it here (event handler, not effect).
    setStatus('loading')
    setReloadKey((key) => key + 1)
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
      status,
      errorMessage,
      retry,
      selectedIds,
      selectedModels,
      toggleModel,
      removeModel: deselect,
      addFirstAvailable,
      limitAlertKey,
    }),
    [
      models,
      status,
      errorMessage,
      retry,
      selectedIds,
      selectedModels,
      toggleModel,
      deselect,
      addFirstAvailable,
      limitAlertKey,
    ],
  )

  return (
    <ModelSelectionContext.Provider value={value}>
      {children}
    </ModelSelectionContext.Provider>
  )
}
