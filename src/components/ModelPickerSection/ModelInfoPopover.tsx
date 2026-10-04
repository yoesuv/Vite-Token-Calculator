import { Portal, Popover } from "@chakra-ui/react";
import { InfoIcon } from "../icons";
import { type CatalogModel } from "../../lib/modelCatalog";
import { formatPriceInfo, type Fx } from "../../lib/pricing";
import { ProviderMark } from "../ProviderMark";
import "./ModelInfoPopover.css";

/** Compact token count for context windows: 128000 -> "128K", 1000000 -> "1M". */
const contextFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const formatContext = (tokens: number): string =>
  Number.isFinite(tokens) && tokens > 0 ? contextFormatter.format(tokens) : "—";

/**
 * Is this a timestamp we can actually show? `validateCatalogRows` never checks
 * the timestamps, so the shape is only a compile-time promise: `{}` (or a
 * missing/non-number/out-of-range `_seconds`) must count as unpublished. An
 * out-of-range instant still *builds* a Date — only its getTime() tells on it.
 */
const isDisplayableTimestamp = (
  ts: { _seconds: number } | null | undefined,
): ts is { _seconds: number } => {
  if (ts === null || ts === undefined || typeof ts._seconds !== "number" || !Number.isFinite(ts._seconds)) {
    return false;
  }
  return Number.isFinite(new Date(ts._seconds * 1000).getTime());
};

/**
 * Short date from the API's Firestore timestamp shape (`{_seconds}`), or "—"
 * for anything malformed — never the literal "Invalid Date". Formatted in UTC:
 * the API publishes midnight-UTC dates, and a viewer west of UTC would
 * otherwise be shown the day before.
 */
const formatTimestamp = (ts: { _seconds: number } | null | undefined): string => {
  if (!isDisplayableTimestamp(ts)) return "—";
  return new Date(ts._seconds * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

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
}[] = [
  { key: "provider", label: "Provider", value: (m) => formatProvider(m.provider) },
  { key: "input", label: "Input · per 1M", value: (m, fx) => formatPriceInfo(m, "input", fx) },
  { key: "output", label: "Output · per 1M", value: (m, fx) => formatPriceInfo(m, "output", fx) },
  { key: "cache", label: "Cache read · per 1M", value: (m, fx) => formatPriceInfo(m, "cache", fx) },
  { key: "context", label: "Context", value: (m) => formatContext(m.context) },
  { key: "modalities", label: "Modalities", value: (m) => formatModalities(m.modalities) },
  { key: "released", label: "Released", value: (m) => formatTimestamp(m.released) },
  {
    key: "cutoff",
    label: "Knowledge cutoff",
    value: (m) => formatTimestamp(m.cutoff),
    // No *displayable* cutoff (null/undefined/malformed) → omit the row
    // rather than show "—".
    show: (m) => isDisplayableTimestamp(m.cutoff),
  },
];

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
  return (
    <Popover.Root positioning={{ placement: "bottom-end" }}>
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
          <Popover.Content className="picker-pop">
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
                  (fact) => (
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
