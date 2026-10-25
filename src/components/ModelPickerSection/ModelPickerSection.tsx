import { useMemo, useState } from "react";
import { Box, Skeleton, Text, VisuallyHidden } from "@chakra-ui/react";
import {
  CheckIcon,
  ChevronDownIcon,
  DefaultSortIcon,
  InfoIcon,
  NewestSortIcon,
  OldestSortIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "../icons";
import {
  MAX_SELECTED,
  sortByRelease,
  type CatalogModel,
  type SortOption,
} from "../../lib/modelCatalog";
import { makeFx, type Fx } from "../../lib/pricing";
import { useModelSelection } from "../../lib/useModelSelection";
import { ProviderMark } from "../ProviderMark";
import { ModelInfoPopover } from "./ModelInfoPopover";
import "./ModelPickerSection.css";

/**
 * Copy for the slots-full notice; shared by the banner and its hidden live
 * region. Derived from MAX_SELECTED so it stays in sync with the slot count.
 */
const LIMIT_NOTICE = `${MAX_SELECTED} models selected. Remove one to compare another.`;

/**
 * Model catalog browser. Selection state lives in <ModelSelectionProvider> so
 * the comparison slots in ModelBalanceSection mirror every pick here.
 *
 * `fx` prices the per-model info popovers; it defaults to USD at the registry
 * rate so the section still renders standalone, but App passes the active
 * currency together with the catalog's FX table.
 */
export function ModelPickerSection({
  fx = makeFx("USD"),
}: {
  fx?: Fx;
} = {}) {
  const {
    models,
    status,
    errorMessage,
    retry,
    selectedIds,
    selectedModels,
    toggleModel,
    addFirstAvailable,
    limitAlertKey,
  } = useModelSelection();
  // Search text and sort mode are local to this view; neither is part of the
  // shared selection state in <ModelSelectionProvider>.
  const [query, setQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("default");

  const visibleModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    // 1. Filter by search text
    const filtered = models.filter((model) =>
      `${model.displayName} ${model.fullName} ${model.provider}`
        .toLowerCase()
        .includes(normalizedQuery),
    );

    // 2. Apply sort order (default preserves incoming alphabetical order)
    return sortByRelease(filtered, sortOption);
  }, [models, query, sortOption]);

  return (
    <Box
      as="section"
      className="picker-section"
      aria-labelledby="picker-title"
      aria-busy={status === "loading"}
    >
      <div className="picker-intro">
        <div className="picker-heading">
          <Text id="picker-title" className="picker-title">
            Choose model
          </Text>
          <Text className="picker-description">
            Choose up to five models to compare costs with your balance and usage mix.
          </Text>
        </div>
        <div className="picker-slots" aria-label="Selected models">
          {Array.from({ length: MAX_SELECTED }, (_, slot) => {
            const model = selectedModels[slot];
            return model ? (
              <button
                type="button"
                className="picker-slot picker-slot-selected"
                key={slot}
                onClick={() => toggleModel(model.id)}
                aria-label={`Remove ${model.displayName}`}
              >
                <ProviderMark provider={model.provider} />
                <span className="picker-slot-copy">
                  <strong>{model.displayName}</strong>
                  <small>{model.fullName}</small>
                </span>
              </button>
            ) : (
              <button
                type="button"
                className="picker-slot picker-slot-empty"
                key={slot}
                onClick={() => addFirstAvailable(visibleModels)}
                // Nothing to add until the catalog arrives, and nothing to add
                // once every catalog model is already selected (avoids a
                // silent no-op from addFirstAvailable).
                disabled={
                  status !== "ready" ||
                  !models.some((model) => !selectedIds.includes(model.id))
                }
              >
                <span className="picker-plus">
                  <PlusIcon />
                </span>
                <span>Add model</span>
              </button>
            );
          })}
        </div>
      </div>
      {/* Always mounted so enter AND exit transitions can play; the wrapper
          collapses via the grid 0fr→1fr trick to animate its height. */}
      <div
        className={`picker-alert-region ${limitAlertKey > 0 ? "is-visible" : ""}`}
      >
        <div className="picker-alert-inner">
          <p className="picker-alert">
            <InfoIcon aria-hidden="true" />
            {LIMIT_NOTICE}
          </p>
        </div>
      </div>
      {/* Persistent live region (more reliable than mounting/unmounting the
          visible banner). The keyed child forces a DOM mutation on EVERY
          rejected attempt, so screen readers re-announce instead of staying
          silent when the notice is already shown. */}
      <VisuallyHidden role="alert" aria-atomic="true">
        {limitAlertKey > 0 && <span key={limitAlertKey}>{LIMIT_NOTICE}</span>}
      </VisuallyHidden>
      <div className="picker-controls-row">
        {/* Filter Dropdown (Left) */}
        <div className="picker-filter-wrapper">
          <VisuallyHidden as="label" htmlFor="model-sort">
            Sort models
          </VisuallyHidden>
          {/* Dynamic Icon: Changes based on selected sort option */}
          {sortOption === "default" && <DefaultSortIcon aria-hidden="true" />}
          {sortOption === "newest" && <NewestSortIcon aria-hidden="true" />}
          {sortOption === "oldest" && <OldestSortIcon aria-hidden="true" />}
          
          <select
            id="model-sort"
            className="picker-sort-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
          >
            <option value="default">Default Order</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <ChevronDownIcon aria-hidden="true" />
        </div>

        {/* Search Input (Right) */}
        <label className="picker-search">
          <SearchIcon aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search models"
            aria-label="Search models"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <XIcon />
            </button>
          )}
        </label>
      </div>
      <div className="picker-grid" role="list" aria-label="Available models">
        {status === "loading" && (
          <>
            <VisuallyHidden role="status">Loading models...</VisuallyHidden>
            {Array.from({ length: 8 }, (_, index) => (
              <div className="picker-skeleton" key={index}>
                <Skeleton h="100%" w="100%" borderRadius="11px" />
              </div>
            ))}
          </>
        )}
        {status === "error" && (
          <p className="picker-status" role="alert">
            {errorMessage}
            <button type="button" className="picker-retry" onClick={retry}>
              Try again
            </button>
          </p>
        )}
        {status === "ready" &&
          visibleModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              fx={fx}
              isSelected={selectedIds.includes(model.id)}
              onToggle={() => toggleModel(model.id)}
            />
          ))}
        {status === "ready" &&
          visibleModels.length === 0 &&
          models.length > 0 && (
            <p className="picker-empty">No models match “{query}”.</p>
          )}
        {status === "ready" && models.length === 0 && (
          <p className="picker-empty">No models available yet.</p>
        )}
      </div>
    </Box>
  );
}

/**
 * One catalog card. The whole tile is a button that toggles selection. The info
 * popover (<ModelInfoPopover>) is a SIBLING of that button, not a child: a
 * <button> may not contain another interactive element, and a click on the info
 * control must not also toggle the model. Both it and the selected check float
 * in the right-edge cluster (see .picker-model-actions).
 */
function ModelCard({
  model,
  isSelected,
  fx,
  onToggle,
}: {
  model: CatalogModel;
  isSelected: boolean;
  fx: Fx;
  onToggle: () => void;
}) {
  return (
    <div className="picker-model-wrap" role="listitem">
      <button
        type="button"
        aria-pressed={isSelected}
        className={`picker-model ${isSelected ? "is-selected" : ""}`}
        onClick={onToggle}
      >
        <ProviderMark provider={model.provider} />
        <span className="picker-model-copy">
          <strong>{model.displayName}</strong>
          <small>{model.fullName}</small>
        </span>
      </button>
      <div className="picker-model-actions">
        {isSelected && (
          <span className="picker-check" aria-hidden="true">
            <CheckIcon />
          </span>
        )}
        <ModelInfoPopover model={model} fx={fx} />
      </div>
    </div>
  );
}

export default ModelPickerSection;
