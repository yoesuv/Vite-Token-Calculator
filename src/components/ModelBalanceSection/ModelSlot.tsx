import { Box, Button, HStack, Text } from "@chakra-ui/react";
import {
  blendedPricePerMillionUSD,
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
  const coverage = priceUnknown
    ? { value: '', unit: '' }
    : formatTokenCount(coverageTokens(balance, model, fx, usageMix), fx);

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
