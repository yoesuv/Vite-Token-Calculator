import { useMemo, useState } from "react";
import { Box, Skeleton, Text, VisuallyHidden } from "@chakra-ui/react";
import { CheckIcon, InfoIcon, PlusIcon, SearchIcon, XIcon } from "../icons";
import { MAX_SELECTED, type CatalogModel } from "../../lib/modelCatalog";
import { type Currency } from "../../lib/pricing";
import { useModelSelection } from "../../lib/useModelSelection";
import { ProviderMark } from "../ProviderMark";
import { ModelInfoPopover } from "./ModelInfoPopover";
import "./ModelPickerSection.css";

/**
 * Copy for the slots-full notice; shared by the banner and its hidden live
 * region. Prose version of MAX_SELECTED — update both together.
 */
const LIMIT_NOTICE = "Five models selected. Remove one to compare another.";

/**
 * Model catalog browser. Selection state lives in <ModelSelectionProvider> so
 * the comparison slots in ModelBalanceSection mirror every pick here.
 *
 * `currency` prices the per-model info popovers; it defaults to USD so the
 * section still renders standalone, but App passes the app's active currency.
 */
export function ModelPickerSection({
  currency = "USD",
}: {
  currency?: Currency;
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
  // Search text is local to this view; it is not part of the shared selection.
  const [query, setQuery] = useState("");

  const visibleModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return models.filter((model) =>
      `${model.displayName} ${model.fullName} ${model.provider}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [models, query]);

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
            Compare up to five models using the same balance and usage mix.
          </Text>
        </div>
        <div className="picker-slots" aria-label="Selected models">
          {Array.from({ length: MAX_SELECTED }, (_, slot) => {
            const model = selectedModels[slot];
            return model ? (
              <button
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
                className="picker-slot picker-slot-empty"
                key={slot}
                onClick={() => addFirstAvailable(visibleModels)}
                // Nothing to add until the catalog arrives.
                disabled={status !== "ready"}
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
        <p className="picker-alert">
          <InfoIcon aria-hidden="true" />
          {LIMIT_NOTICE}
        </p>
      </div>
      {/* Persistent live region (more reliable than mounting/unmounting the
          visible banner). The keyed child forces a DOM mutation on EVERY
          rejected attempt, so screen readers re-announce instead of staying
          silent when the notice is already shown. */}
      <VisuallyHidden role="alert" aria-atomic="true">
        {limitAlertKey > 0 && <span key={limitAlertKey}>{LIMIT_NOTICE}</span>}
      </VisuallyHidden>
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
              currency={currency}
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
  currency,
  onToggle,
}: {
  model: CatalogModel;
  isSelected: boolean;
  currency: Currency;
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
        <ModelInfoPopover model={model} currency={currency} />
      </div>
    </div>
  );
}

export default ModelPickerSection;
