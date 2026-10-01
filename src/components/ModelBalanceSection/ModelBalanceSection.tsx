import { useRef, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Skeleton,
  Text,
  VisuallyHidden,
} from "@chakra-ui/react";
import {
  currencyConfig,
  DEFAULT_USAGE_MIX,
  formatBalanceForDisplay,
  sanitizeBalanceInput,
  type Currency,
  type UsageMix,
} from "../../lib/pricing";
import { MAX_SELECTED } from "../../lib/modelCatalog";
import { useModelSelection } from "../../lib/useModelSelection";
import { UsageIcon, WalletIcon } from "../icons";
import { ModelSlot } from "./ModelSlot";
import { UsageCompositionDialog } from "./UsageCompositionDialog";
import "./ModelBalanceSection.css";

type ModelBalanceSectionProps = {
  currency: Currency;
  balance: string;
  onBalanceChange: (balance: string) => void;
};

// The usage mix renders from state instead of literal strings, so the caption,
// the popover, and coverageTokens can never disagree: the sliders edit a draft
// and only Apply replaces this baseline.
const mixCaption = (mix: UsageMix) =>
  `Cache read ${mix.cache}% · Input ${mix.input}% · Output ${mix.output}%`;

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
  const [usageMix, setUsageMix] = useState<UsageMix>(DEFAULT_USAGE_MIX);
  // The dialog restores focus here when it closes; see UsageCompositionDialog.
  const usageTriggerRef = useRef<HTMLButtonElement | null>(null);
  // While editing, show raw digits so the cursor behaves; format with separators only when blurred.
  const [balanceFocused, setBalanceFocused] = useState(false);
  const numericBalance = Number(balance) || 0;
  const config = currencyConfig(currency);

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
            ref={usageTriggerRef}
            className="usage-button"
            onClick={() => setUsageOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={usageOpen}
          >
            <UsageIcon aria-hidden="true" />
            <span>Usage composition</span>
          </Button>
          <Text className="usage-caption">{mixCaption(usageMix)}</Text>
          {/* Conditional mount is load-bearing: unmounting is what discards the
              dialog's draft mix, so Apply-vs-discard keeps working. */}
          {usageOpen && (
            <UsageCompositionDialog
              initialMix={usageMix}
              onApply={setUsageMix}
              onClose={() => setUsageOpen(false)}
              triggerRef={usageTriggerRef}
            />
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
          /* Selection is an ordered list, so empty slots are always trailing:
             clearing COMPARE 2 promotes COMPARE 3 and 4 up one position. */
          Array.from({ length: MAX_SELECTED }, (_, slot) => (
            <ModelSlot
              key={slot}
              slot={slot}
              model={selectedModels[slot]}
              balance={numericBalance}
              currency={currency}
              usageMix={usageMix}
              onAdd={addFirstAvailable}
              onClear={removeModel}
            />
          ))}
      </Box>
    </Box>
  );
}

export default ModelBalanceSection;
