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
  currencyConfig,
  DEFAULT_USAGE_MIX,
  formatBalanceForDisplay,
  maxSafeBalance,
  sanitizeBalanceInput,
  type Fx,
  type UsageMix,
} from "../../lib/pricing";
import { MAX_SELECTED } from "../../lib/modelCatalog";
import { useModelSelection } from "../../lib/useModelSelection";
import { UsageIcon, WalletIcon } from "../icons";
import { ModelSlot } from "./ModelSlot";
import { UsageCompositionDialog } from "./UsageCompositionDialog";
import "./ModelBalanceSection.css";

type ModelBalanceSectionProps = {
  /** Active currency + catalog FX rate, resolved once by <Workspace>. */
  fx: Fx;
  /** Unrounded balance in the active currency, used for coverage calculations. */
  balance: number;
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
  fx,
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
  // While editing, show raw digits so the cursor behaves; format with separators only when blurred.
  const [balanceFocused, setBalanceFocused] = useState(false);
  const config = currencyConfig(fx.currency);

  // Sanitizing onChange does not cover currency-derived balances: a valid USD
  // amount can convert to an IDR value above MAX_SAFE_INTEGER, where `Number`
  // loses integer precision. Cap the calculation balance to the currency's safe
  // ceiling and warn the user rather than silently producing wrong coverage.
  const balanceOutOfRange = balance > maxSafeBalance(fx.currency);
  const calculationBalance = balanceOutOfRange ? maxSafeBalance(fx.currency) : balance;

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
          {/* The section names itself after `#balance-title` — the input's id.
              While the input is swapped for the loading skeleton below, this
              stand-in keeps that aria-labelledby reference resolving to the
              same phrase instead of dangling. */}
          {status === "loading" && (
            <VisuallyHidden id="balance-title">
              Available balance in {config.displayName}
            </VisuallyHidden>
          )}
          <HStack
            className={`balance-input-row${
              status === "loading" ? " is-loading" : ""
            }`}
            gap="2"
          >
            {status === "loading" ? (
              /* The catalog carries the live rate this figure is denominated
                 in, so until it lands any number here could be the wrong one
                 (17920 placeholder vs 15000 live) and would visibly swap when
                 the response arrives. Shimmer two blocks in the row's own
                 frame instead — same approach as the slot skeletons below. */
              <>
                <Skeleton
                  className="balance-skeleton-symbol"
                  h="24px"
                  w="34px"
                  borderRadius="4px"
                />
                <Skeleton
                  className="balance-skeleton-amount"
                  flex="1"
                  borderRadius="6px"
                />
              </>
            ) : (
              <>
                <Text className="currency-prefix">{config.symbol}</Text>
                <input
                  id="balance-title"
                  className="balance-input"
                  aria-label={`Available balance in ${config.displayName}`}
                  inputMode={config.inputMode}
                  value={
                    balanceFocused
                      ? String(balance)
                      : formatBalanceForDisplay(String(balance), fx.currency)
                  }
                  onFocus={() => setBalanceFocused(true)}
                  onBlur={() => setBalanceFocused(false)}
                  onChange={(event) =>
                    onBalanceChange(
                      sanitizeBalanceInput(event.target.value, fx.currency),
                    )
                  }
                />
              </>
            )}
          </HStack>
          <Text className="balance-help">
            Adjust this amount to compare model costs against your balance.
          </Text>
          {balanceOutOfRange && (
            <Text className="balance-warning" role="alert">
              This amount exceeds the safe limit for {config.displayName} and may
              produce inaccurate estimates. Enter a smaller amount or switch to a
              currency with higher precision.
            </Text>
          )}
        </Box>
        <Box className="usage-area">
          <Button
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
                {/* Mirror the filled slot's price block (two price rows) so the
                    loading card matches its final height and the row does not
                    jump when the catalog responds. */}
                <Box className="price-block">
                  <Skeleton h="15px" w="70%" borderRadius="3px" />
                  <Skeleton h="15px" w="55%" borderRadius="3px" />
                </Box>
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
              balance={calculationBalance}
              fx={fx}
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
