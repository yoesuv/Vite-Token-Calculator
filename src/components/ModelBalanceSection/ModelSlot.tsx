import { Box, Button, HStack, Text } from "@chakra-ui/react";
import { type CSSProperties } from "react";
import {
  blendedPricePerMillionUSD,
  coverageRatioPercent,
  coverageTokens,
  formatPriceInfo,
  formatTokenCount,
  isUnlimitedCoverage,
  type Fx,
  type UsageMix,
} from "../../lib/pricing";
import { type CatalogModel } from "../../lib/modelCatalog";
import { PlusIcon } from "../icons";
import { ProviderMark } from "../ProviderMark";

/** Slot caption: index 0 is the primary model, the rest are compare columns. */
const slotLabel = (slot: number) =>
  slot === 0 ? "PRIMARY MODEL" : `COMPARE ${slot}`;

/**
 * Meter label for assistive tech: the width is the only thing on screen, so the
 * proportion it encodes has to be spoken. One decimal keeps a 0.1% sliver
 * distinct from a 0% one; the trailing `.0` is dropped so the leader does not
 * announce "100.0 percent".
 */
const ratioLabel = (percent: number): string => {
  const text = percent.toFixed(1).replace(/\.0$/, "");
  return `${text}% of the best model in this comparison`;
};

/**
 * `role="meter"` is the correct ARIA role for a quantitative gauge, so assistive
 * tech can convey it as a measurement (value out of a range) rather than as an
 * image. Every meter renders the same min/max scale — 0–100 of the leader — and
 * only the value and spoken text vary: an unknown price is *not measured*, so it
 * reports nothing rather than implying a measured zero.
 */
const meterProps = (percent: number | null) =>
  percent === null
    ? {
        role: "meter" as const,
        "aria-label": "Not measured — pricing unavailable",
        "aria-valuemin": 0,
        "aria-valuemax": 100,
      }
    : {
        role: "meter" as const,
        "aria-label": ratioLabel(percent),
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": percent,
        "aria-valuetext": ratioLabel(percent),
      }

/** CSS custom property carrying the fill width, so the bar has no inline style of its own. */
type RatioVars = CSSProperties & { "--coverage-ratio": string };

type ModelSlotProps = {
  /** Zero-based grid position, used only for the caption and the empty label. */
  slot: number;
  /** `undefined` renders the empty "add a model" placeholder. */
  model: CatalogModel | undefined;
  /** Numeric balance — the raw string is parsed once by the parent. */
  balance: number;
  /** Active currency + catalog FX rate. */
  fx: Fx;
  usageMix: UsageMix;
  /**
   * Coverage of the best comparable slot, from `coverageBaselineTokens` in the
   * parent (which sees all slots). `null` only when *no* slot in the row has a
   * measurable price, so a priced slot always gets a baseline — a lone model is
   * its own leader and therefore renders a full 100% bar rather than nothing.
   */
  baselineTokens: number | null;
  onAdd: () => void;
  onClear: (id: string) => void;
};

/**
 * One comparison slot: either the picked model with its coverage + rates, or the
 * empty placeholder that fills the first free selection. Extracted from
 * <ModelBalanceSection> so that file stays about layout and shared state; the
 * `.model-slot` styles still live in ModelBalanceSection.css, which owns the
 * grid this card sits in.
 */
export function ModelSlot({
  slot,
  model,
  balance,
  fx,
  usageMix,
  baselineTokens,
  onAdd,
  onClear,
}: ModelSlotProps) {
  if (!model) {
    return (
      <Box className="model-slot empty-slot">
        <button
          className="add-model"
          /* Called as a thunk: `addFirstAvailable` takes optional candidate rows,
             so the click event must not be forwarded as its first argument. */
          onClick={() => onAdd()}
          aria-label={
            slot === 0
              ? "Add model to the primary slot"
              : `Add model to Compare ${slot}`
          }
        >
          <span aria-hidden="true">
            <PlusIcon />
          </span>
          <strong>{slot === 0 ? "Primary model" : `Compare ${slot}`}</strong>
          <small>Select a model below</small>
        </button>
      </Box>
    );
  }

  // A $0 blend means the mix only weights free/unpublished rates: the balance
  // buys unlimited tokens, so the 0 from coverageTokens' guard must not render.
  // A NaN blend means a required price is unknown: show "unavailable" instead
  // of "0 tokens", which would wrongly imply the balance buys nothing.
  const blend = blendedPricePerMillionUSD(model, usageMix);
  const priceUnknown = Number.isNaN(blend);
  const unlimited = isUnlimitedCoverage(model, usageMix);
  // Read once: the displayed count and the meter width must be the same figure,
  // or a re-render could move one without the other.
  const tokens = coverageTokens(balance, model, fx, usageMix);
  const coverage = priceUnknown
    ? { value: '', unit: '' }
    : formatTokenCount(tokens, fx);

  /*
   * Meter state, line only (no percentage on screen). It renders in *every*
   * state, including a row with a single model:
   * - a lone priced slot is its own leader (`coverageBaselineTokens` returns its
   *   own coverage), so the line is full. 100% then means "nothing in this
   *   comparison buys more" — true, and more useful than an absent rule.
   * - unlimited buys unbounded tokens, so it sits at the top of the scale and
   *   draws a full line whatever the baseline says.
   * - an unknown price is not "0 tokens", so it draws no fill: the dashed rule
   *   reads as "nothing measured" rather than "measured at zero".
   * - otherwise the line is the slot's share of the leader.
   * `baselineTokens === null` (no slot in the row has a measurable price) is
   * unreachable for a priced slot, so it only degrades the measured branch to
   * the not-measured style instead of removing the meter.
   */
  const renderCoverageRatio = () => {
    if (priceUnknown) {
      return <Box className="coverage-ratio is-unknown" {...meterProps(null)} />
    }
    if (unlimited) {
      return (
        <Box
          className="coverage-ratio"
          {...meterProps(100)}
          aria-label="Unlimited tokens — the most this balance can buy"
          aria-valuetext="Unlimited tokens — the most this balance can buy"
          style={{ "--coverage-ratio": "100%" } as RatioVars}
        >
          <Box className="coverage-ratio-fill" />
        </Box>
      )
    }
    // Unreachable for a priced slot (see the prop docs), but a fail-safe rather
    // than `null`: dropping the element would strip this card's 13px meter block
    // and shift it against its siblings. An empty meter keeps the row stable and
    // reads as "nothing to compare against", which is what a null baseline means.
    const percent =
      baselineTokens === null ? null : coverageRatioPercent(tokens, baselineTokens)
    return (
      <Box
        className={`coverage-ratio${percent === null ? " is-unknown" : ""}`}
        {...meterProps(percent)}
        /* toFixed(2): `coverageTokens` floors to whole tokens, so a true half is
           49.99999985% here — two decimals says the same thing to the pixel and
           keeps the inline style a stable width. The spoken label below keeps the
           extra precision so a sliver never announces "0%". `coverageRatioPercent`
           clamps to [0,100] and returns 0 for non-finite input, so this is always
           a valid percentage. */
        style={
          { "--coverage-ratio": `${(percent ?? 0).toFixed(2)}%` } as RatioVars
        }
      >
        <Box className="coverage-ratio-fill" />
      </Box>
    )
  }

  const renderCoverageValue = () => {
    if (priceUnknown) {
      return <Text className="coverage-value is-unavailable">Unavailable</Text>
    }
    if (unlimited) {
      return <Text className="coverage-value is-unlimited">Unlimited</Text>
    }
    return (
      <Text className="coverage-value">
        {coverage.value}
        {coverage.unit ? (
          <span className="coverage-unit">{coverage.unit}</span>
        ) : null}
      </Text>
    )
  }

  const renderCoverageNote = () => {
    if (priceUnknown) return "pricing unavailable for this model"
    if (unlimited) return "tokens — no cost at this mix"
    return "tokens with this balance"
  }

  return (
    <Box className="model-slot has-model">
      <HStack className="slot-heading" justify="space-between">
        <Text className="slot-label">{slotLabel(slot)}</Text>
        {/* Every slot is clearable, including the primary: clearing slot 0
            promotes the first compare model, and an empty selection leaves the
            primary slot open for a new pick. */}
        <Button
          variant="plain"
          className="slot-clear"
          onClick={() => onClear(model.id)}
        >
          Clear
        </Button>
      </HStack>
      <Box className="model-select-label">
        <ProviderMark provider={model.provider} />
        <span className="model-ident">
          <strong title={model.displayName}>{model.displayName}</strong>
          <small title={model.fullName}>{model.fullName}</small>
        </span>
      </Box>
      <Box className="coverage-panel">
        <Text className="coverage-label">Estimated coverage</Text>
        {/* A $0 blended rate is free, not unaffordable: show Unlimited instead of
            coverageTokens' 0 guard, which would claim a positive balance buys
            nothing. See isUnlimitedCoverage. */}
        {renderCoverageValue()}
        <Text className="coverage-note">{renderCoverageNote()}</Text>
        {renderCoverageRatio()}
      </Box>
      {/* Both rates come straight from the catalog (`input`/`output`, US cents
          per 1M) and render in the active currency at the active FX rate: 200 →
          $2.00 / Rp 30.000 and 1000 → $10.00 / Rp 150.000 at `15000` IDR. */}
      <Box className="price-block">
        <HStack className="price-row" justify="space-between">
          <Text>Input price</Text>
          <strong>{formatPriceInfo(model, "input", fx)} / 1M</strong>
        </HStack>
        <HStack className="price-row" justify="space-between">
          <Text>Output price</Text>
          <strong>{formatPriceInfo(model, "output", fx)} / 1M</strong>
        </HStack>
      </Box>
    </Box>
  );
}

export default ModelSlot;
