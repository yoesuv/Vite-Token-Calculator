import { useState } from "react";
import { Portal, Popover } from "@chakra-ui/react";
import { CheckIcon, InfoIcon, PencilIcon, XIcon } from "../icons";
import { type CatalogModel } from "../../lib/modelCatalog";
import {
  centsFromDisplayPrice,
  currencyConfig,
  editablePriceText,
  formatPriceInfo,
  parsePriceInput,
  sanitizeBalanceInput,
  type Fx,
  type PriceKind,
} from "../../lib/pricing";
import { useModelSelection } from "../../lib/useModelSelection";
import { formatApiTimestamp } from "../../lib/formatDate";
import { ProviderMark } from "../ProviderMark";
import "./ModelInfoPopover.css";

/** Compact token count: 128000 -> "128K", 1000000 -> "1M". */
const tokenFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const formatTokens = (tokens: number | null | undefined): string =>
  Number.isFinite(tokens) && (tokens as number) > 0 ? tokenFormatter.format(tokens as number) : "—";

/** "moonshotai" -> "Moonshotai"; already-styled slugs like "x-ai" are left alone. */
const formatProvider = (provider: string): string =>
  provider.charAt(0).toUpperCase() + provider.slice(1);

/**
 * ["text","image"] -> "Text, Image". Defensive because `modalities` is a raw
 * API field that `validateCatalogRows` never checks: a row missing it (or with
 * non-string entries) must show "—", not throw. An empty list also reads as
 * unknown, not free.
 */
const formatModalities = (modalities: string[] | null | undefined): string =>
  Array.isArray(modalities) &&
  modalities.length > 0 &&
  modalities.every((m) => typeof m === "string")
    ? modalities.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(", ")
    : "—";

/**
 * Rows rendered in the info popover. Each value is a pure function of the
 * catalog row (plus the active currency and its FX rate for prices), so adding a
 * fact is one line here and the layout stays a flat label/value list.
 */
const MODEL_FACTS: {
  key: string;
  label: string;
  value: (model: CatalogModel, fx: Fx) => string;
  /** Returning false drops the row entirely (e.g. an unpublished cutoff). */
  show?: (model: CatalogModel) => boolean;
  /** Price rows only: the row gets a pencil that opens the inline price editor. */
  edit?: PriceKind;
}[] = [
  { key: "provider", label: "Provider", value: (m) => formatProvider(m.provider) },
  { key: "input", label: "Input · per 1M", value: (m, fx) => formatPriceInfo(m, "input", fx), edit: "input" },
  { key: "output", label: "Output · per 1M", value: (m, fx) => formatPriceInfo(m, "output", fx), edit: "output" },
  { key: "cache", label: "Cache read · per 1M", value: (m, fx) => formatPriceInfo(m, "cache", fx), edit: "cache" },
  { key: "context", label: "Context", value: (m) => formatTokens(m.context) },
  {
    key: "max-output",
    label: "Max Output",
    value: (m) => formatTokens(m.max),
    show: (m) => formatTokens(m.max) !== "—",
  },
  { key: "modalities", label: "Modalities", value: (m) => formatModalities(m.modalities) },
  { key: "released", label: "Released", value: (m) => formatApiTimestamp(m.released) },
  {
    key: "cutoff",
    label: "Knowledge cutoff",
    value: (m) => formatApiTimestamp(m.cutoff),
    // No *displayable* cutoff (null/undefined/malformed) → omit the row
    // rather than show "—".
    show: (m) => formatApiTimestamp(m.cutoff) !== "—",
  },
];

/**
 * Inline editor for one price: a numeric field prefilled with the current price
 * in the active currency, plus Save/Cancel. Enter saves, Escape cancels. Save is
 * disabled until the text parses to a non-negative number.
 */
function PriceEditor({
  model,
  kind,
  fx,
  label,
  onSave,
  onCancel,
}: {
  model: CatalogModel;
  kind: PriceKind;
  fx: Fx;
  label: string;
  onSave: (cents: number) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(() => editablePriceText(model, kind, fx));
  const parsed = parsePriceInput(draft, fx.currency);

  const save = () => {
    if (parsed === null) return;
    onSave(centsFromDisplayPrice(parsed, fx));
  };

  return (
    <span className="picker-pop-editor">
      <input
        className="picker-pop-input"
        autoFocus
        inputMode={currencyConfig(fx.currency).inputMode}
        aria-label={`${label} for ${model.displayName}`}
        value={draft}
        onChange={(event) => setDraft(sanitizeBalanceInput(event.target.value, fx.currency))}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save();
          } else if (event.key === "Escape") {
            // Stop here so the popover stays open and only the edit is cancelled.
            event.stopPropagation();
            onCancel();
          }
        }}
      />
      <button
        type="button"
        className="picker-pop-edit"
        aria-label={`Save ${label} for ${model.displayName}`}
        onClick={save}
        disabled={parsed === null}
      >
        <CheckIcon />
      </button>
      <button
        type="button"
        className="picker-pop-edit"
        aria-label={`Cancel editing ${label} for ${model.displayName}`}
        onClick={onCancel}
      >
        <XIcon />
      </button>
    </span>
  );
}

/**
 * One price row: the formatted value with a pencil button, or the editor while
 * this row is the one being edited. A session override shows an "edited" tag.
 */
function PriceRow({
  model,
  kind,
  label,
  fx,
  editing,
  onStartEdit,
  onStopEdit,
}: {
  model: CatalogModel;
  kind: PriceKind;
  label: string;
  fx: Fx;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
}) {
  const { priceOverrides, setPriceOverride } = useModelSelection();
  const edited = priceOverrides[model.id]?.[kind] !== undefined;

  return (
    <div className="picker-pop-row">
      <dt>{label}</dt>
      <dd>
        {editing ? (
          <PriceEditor
            model={model}
            kind={kind}
            fx={fx}
            label={label}
            onSave={(cents) => {
              setPriceOverride(model.id, kind, cents);
              onStopEdit();
            }}
            onCancel={onStopEdit}
          />
        ) : (
          <span className="picker-pop-value">
            {formatPriceInfo(model, kind, fx)}
            {edited && <span className="picker-pop-edited">edited</span>}
            <button
              type="button"
              className="picker-pop-edit"
              aria-label={`Edit ${label} for ${model.displayName}`}
              onClick={onStartEdit}
            >
              <PencilIcon />
            </button>
          </span>
        )}
      </dd>
    </div>
  );
}

/**
 * Per-model info affordance: a round "i" trigger that opens a click popover of
 * the model's published facts. It renders the trigger button *and* the panel,
 * so the caller only drops it into a layout — the picker places it in each
 * card's top-right action cluster (see ModelPickerSection).
 *
 * The panel is portalled to <body>: it carries a high popover z-index and, when
 * rendered inline, a card's centering transform would make the card a
 * containing block and stack the panel *behind* sibling cards. Detaching it
 * escapes that and keeps it on top.
 */
export function ModelInfoPopover({
  model,
  fx,
}: {
  model: CatalogModel;
  fx: Fx;
}) {
  // At most one price row is in edit mode at a time.
  const [editing, setEditing] = useState<PriceKind | null>(null);
  const { priceOverrides } = useModelSelection();
  // Wide while editing and also after a save, so the "edited" state keeps the room.
  const wide = editing !== null || Object.keys(priceOverrides[model.id] ?? {}).length > 0;

  return (
    <Popover.Root
      positioning={{ placement: "bottom-end" }}
      // While a price is being edited, Escape cancels the edit (handled in the
      // input) instead of closing the whole panel.
      closeOnEscape={editing === null}
      onOpenChange={({ open }) => {
        // Closing the panel (outside click, trigger) discards an unsaved edit.
        if (!open) setEditing(null);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className="picker-info"
          aria-label={`More information about ${model.displayName}`}
        >
          <InfoIcon />
        </button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content className={`picker-pop ${wide ? "is-editing" : ""}`}>
            <Popover.Arrow>
              <Popover.ArrowTip />
            </Popover.Arrow>
            <Popover.Body>
              <div className="picker-pop-head">
                <ProviderMark provider={model.provider} />
                <span className="picker-pop-title">
                  {/* Title part gives the dialog an accessible name (the
                      model's display name); asChild keeps the styled elements. */}
                  <Popover.Title asChild>
                    <strong>{model.displayName}</strong>
                  </Popover.Title>
                  <small>{model.fullName}</small>
                </span>
              </div>
              <dl className="picker-pop-rows">
                {MODEL_FACTS.filter((fact) => !fact.show || fact.show(model)).map(
                  (fact) =>
                    fact.edit ? (
                      <PriceRow
                        key={fact.key}
                        model={model}
                        kind={fact.edit}
                        label={fact.label}
                        fx={fx}
                        editing={editing === fact.edit}
                        onStartEdit={() => setEditing(fact.edit ?? null)}
                        onStopEdit={() => setEditing(null)}
                      />
                    ) : (
                      <div className="picker-pop-row" key={fact.key}>
                        <dt>{fact.label}</dt>
                        <dd>{fact.value(model, fx)}</dd>
                      </div>
                    ),
                )}
              </dl>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

export default ModelInfoPopover;
