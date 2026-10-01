import { Box, Button, HStack, Text } from "@chakra-ui/react";
import {
  coverageTokens,
  formatPriceInfo,
  formatTokenCount,
  isUnlimitedCoverage,
  type Currency,
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
  currency: Currency;
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
  currency,
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
  const unlimited = isUnlimitedCoverage(model, usageMix);
  const coverage = formatTokenCount(
    coverageTokens(balance, model, currency, usageMix),
    currency,
  );

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
        {unlimited ? (
          <Text className="coverage-value is-unlimited">Unlimited</Text>
        ) : (
          <Text className="coverage-value">
            {coverage.value}
            {coverage.unit ? (
              <span className="coverage-unit">{coverage.unit}</span>
            ) : null}
          </Text>
        )}
        <Text className="coverage-note">
          {unlimited
            ? "tokens — no cost at this mix"
            : "tokens with this balance"}
        </Text>
      </Box>
      {/* Both rates come straight from the catalog (`input`/`output`, US cents
          per 1M) and render in the active currency: 200 → $2.00 / Rp 33.000,
          1000 → $10.00 / Rp 165.000. */}
      <Box className="price-block">
        <HStack className="price-row" justify="space-between">
          <Text>Input price</Text>
          <strong>{formatPriceInfo(model, "input", currency)} / 1M</strong>
        </HStack>
        <HStack className="price-row" justify="space-between">
          <Text>Output price</Text>
          <strong>{formatPriceInfo(model, "output", currency)} / 1M</strong>
        </HStack>
      </Box>
    </Box>
  );
}

export default ModelSlot;
