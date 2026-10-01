import { useState } from "react";
import {
  Box,
  Button,
  HStack,
  Skeleton,
  Text,
  VisuallyHidden,
} from "@chakra-ui/react";
import {
  coverageTokens,
  currencyConfig,
  DEFAULT_USAGE_MIX,
  formatBalanceForDisplay,
  formatPriceInfo,
  sanitizeBalanceInput,
  type Currency,
} from "../../lib/pricing";
import { MAX_SELECTED, type CatalogModel } from "../../lib/modelCatalog";
import { useModelSelection } from "../../lib/useModelSelection";
import { PlusIcon, UsageIcon, WalletIcon } from "../icons";
import { ProviderMark } from "../ProviderMark";
import "./ModelBalanceSection.css";

type ModelBalanceSectionProps = {
  currency: Currency;
  balance: string;
  onBalanceChange: (balance: string) => void;
};

/** Slot caption: index 0 is the primary model, the rest are compare columns. */
const slotLabel = (slot: number) =>
  slot === 0 ? "PRIMARY MODEL" : `COMPARE ${slot}`;

// The usage mix renders from DEFAULT_USAGE_MIX instead of literal strings, so the
// caption, the popover, and coverageTokens can never disagree. Slider editing
// replaces these two consts with state and passes that as the mix argument.
const MIX_CAPTION = `Cache read ${DEFAULT_USAGE_MIX.cache}% · Input ${DEFAULT_USAGE_MIX.input}% · Output ${DEFAULT_USAGE_MIX.output}%`;
const MIX_DETAIL = `Coverage blends each model's cache-read, input, and output rates — ${DEFAULT_USAGE_MIX.cache}% cache reads, ${DEFAULT_USAGE_MIX.input}% input tokens, ${DEFAULT_USAGE_MIX.output}% output tokens of every request. Cache-read tokens count toward the total, and a model with no cache rate prices that share as free. Editing the mix lands with the slider.`;

/**
 * Balance + the comparison slots. The slots mirror the shared selection from
 * <ModelPickerSection> (see useModelSelection), so picking a model there fills
 * the next free slot here — and clearing one unchecks it in the picker.
 */
export function ModelBalanceSection({
  currency,
  balance,
  onBalanceChange,
}: ModelBalanceSectionProps) {
  const {
    status,
    errorMessage,
    retry,
    selectedModels,
    removeModel,
    addFirstAvailable,
  } = useModelSelection();
  const [usageOpen, setUsageOpen] = useState(false);
  // While editing, show raw digits so the cursor behaves; format with separators only when blurred.
  const [balanceFocused, setBalanceFocused] = useState(false);
  const numericBalance = Number(balance) || 0;
  const config = currencyConfig(currency);

  /**
   * Selection is an ordered list, so empty slots are always trailing: clearing
   * COMPARE 2 promotes COMPARE 3 and 4 up one position.
   */
  const renderSlot = (slot: number) => {
    const model: CatalogModel | undefined = selectedModels[slot];
    if (!model) {
      return (
        <Box className="model-slot empty-slot" key={slot}>
          <button
            className="add-model"
            onClick={() => addFirstAvailable()}
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
    return (
      <Box className="model-slot has-model" key={slot}>
        <HStack className="slot-heading" justify="space-between">
          <Text className="slot-label">{slotLabel(slot)}</Text>
          {/* Every slot is clearable, including the primary: clearing slot 0
              promotes the first compare model, and an empty selection leaves the
              primary slot open for a new pick. */}
          <Button
            variant="plain"
            className="slot-clear"
            onClick={() => removeModel(model.id)}
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
          <Text className="coverage-value">
            {(
              coverageTokens(
                numericBalance,
                model,
                currency,
                DEFAULT_USAGE_MIX,
              ) / 1000000
            ).toFixed(2)}
            M
          </Text>
          <Text className="coverage-note">tokens with this balance</Text>
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
  };

  return (
    <Box
      as="section"
      className="balance-section"
      aria-labelledby="balance-title"
      aria-busy={status === "loading"}
    >
      <Box className="balance-top">
        <Box className="balance-amount-block">
          <Text className="balance-eyebrow">
            <WalletIcon aria-hidden="true" />
            <span>AVAILABLE BALANCE</span>
          </Text>
          <HStack className="balance-input-row" gap="2">
            <Text className="currency-prefix">{config.symbol}</Text>
            <input
              id="balance-title"
              className="balance-input"
              aria-label={`Available balance in ${config.displayName}`}
              inputMode={config.inputMode}
              value={
                balanceFocused
                  ? balance
                  : formatBalanceForDisplay(balance, currency)
              }
              onFocus={() => setBalanceFocused(true)}
              onBlur={() => setBalanceFocused(false)}
              onChange={(event) =>
                onBalanceChange(
                  sanitizeBalanceInput(event.target.value, currency),
                )
              }
            />
          </HStack>
          <Text className="balance-help">
            Editing this value does not change your account balance.
          </Text>
        </Box>
        <Box className="usage-area">
          <Button
            className="usage-button"
            onClick={() => setUsageOpen((open) => !open)}
            aria-expanded={usageOpen}
          >
            <UsageIcon aria-hidden="true" />
            <span>Usage composition</span>
          </Button>
          <Text className="usage-caption">{MIX_CAPTION}</Text>
          {usageOpen && (
            <Box className="usage-popover" role="status">
              {MIX_DETAIL}
            </Box>
          )}
        </Box>
      </Box>
      <Box className="model-slots">
        {status === "loading" && (
          <>
            <VisuallyHidden role="status">Loading models...</VisuallyHidden>
            {Array.from({ length: MAX_SELECTED }, (_, slot) => (
              <Box className="model-slot" key={slot}>
                <Skeleton h="12px" w="90px" borderRadius="3px" />
                <Skeleton
                  className="slot-skeleton-name"
                  h="38px"
                  borderRadius="9px"
                />
                <Skeleton
                  className="slot-skeleton-panel"
                  h="82px"
                  borderRadius="3px"
                />
              </Box>
            ))}
          </>
        )}
        {status === "error" && (
          <Box className="model-slot slot-state">
            <Text>{errorMessage}</Text>
            <Button className="slot-retry" onClick={retry}>
              Try again
            </Button>
          </Box>
        )}
        {status === "ready" &&
          Array.from({ length: MAX_SELECTED }, (_, slot) => renderSlot(slot))}
      </Box>
    </Box>
  );
}

export default ModelBalanceSection;
