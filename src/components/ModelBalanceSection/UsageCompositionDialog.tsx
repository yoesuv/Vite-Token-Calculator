import { useState, type RefObject } from "react";
import { DEFAULT_USAGE_MIX, type UsageMix } from "../../lib/pricing";
import { Box, Button, HStack, Slider, Text } from "@chakra-ui/react";
import "./UsageCompositionDialog.css";

type UsageCompositionDialogProps = {
  /** The mix currently in effect; the sliders start from it and Apply replaces it. */
  initialMix: UsageMix;
  onApply: (mix: UsageMix) => void;
  onClose: () => void;
  /** The trigger button; focus returns here once the dialog unmounts. */
  triggerRef?: RefObject<HTMLElement | null>;
};

const DEFAULT_MIX: UsageMix = DEFAULT_USAGE_MIX;
const sameMix = (a: UsageMix, b: UsageMix) =>
  a.cache === b.cache && a.input === b.input && a.output === b.output;

type MixKey = keyof UsageMix;
const labels: { key: MixKey; label: string }[] = [
  { key: "cache", label: "Cache Read" },
  { key: "input", label: "Input" },
  { key: "output", label: "Output" },
];

export function UsageCompositionDialog({
  initialMix,
  onApply,
  onClose,
  triggerRef,
}: UsageCompositionDialogProps) {
  // Every exit path funnels through here: the dialog unmounts on close, so focus
  // is handed back to the trigger in the same tick the parent flips its state.
  const close = () => {
    onClose();
    triggerRef?.current?.focus();
  };
  // Local draft: nothing outside this dialog changes until Apply is pressed.
  const [mix, setMix] = useState<UsageMix>(initialMix);
  // Tracks which slider is currently being adjusted. When the adjusted key
  // changes, the next event handler snapshots the previous mix and uses that
  // ratio as the basis for redistribution throughout the rest of the drag.
  // Stored in state (not a ref) because it is read and written only in event
  // handlers, never during render or inside a state updater.
  const [activeKey, setActiveKey] = useState<MixKey | null>(null);
  const [basis, setBasis] = useState<UsageMix | null>(null);

  const changeMix = (key: MixKey, value: number) => {
    // Snapshot the current ratio whenever the user starts adjusting a new key.
    // This keeps the outcome independent of how many change events the pointer
    // fires (0/71/29 in one jump vs 0/90/10 one point at a time from 65/25/10)
    // and makes a round trip restore the starting mix exactly.
    if (activeKey !== key) {
      setActiveKey(key);
      setBasis(mix);
    }

    const currentBasis = activeKey === key ? basis ?? mix : mix;
    const remainingKeys = labels
      .map(({ key: itemKey }) => itemKey)
      .filter((itemKey) => itemKey !== key);
    const basisTotal = currentBasis[remainingKeys[0]] + currentBasis[remainingKeys[1]];
    const targetRemaining = 100 - value;

    setMix((current) => {
      if (basisTotal === 0) {
        return {
          ...current,
          [key]: value,
          [remainingKeys[0]]: Math.round(targetRemaining / 2),
          [remainingKeys[1]]: Math.floor(targetRemaining / 2),
        };
      }

      const firstValue = Math.round(
        (targetRemaining * currentBasis[remainingKeys[0]]) / basisTotal,
      );
      return {
        ...current,
        [key]: value,
        [remainingKeys[0]]: firstValue,
        [remainingKeys[1]]: targetRemaining - firstValue,
      };
    });
  };

  return (
    <Box
      className="usage-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <Box
        as="section"
        className="usage-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="usage-dialog-title"
        aria-describedby="usage-dialog-description"
      >
        <Box className="usage-dialog-header">
          <Box>
            <Text id="usage-dialog-title" className="usage-dialog-title">
              Usage composition
            </Text>
            <Text id="usage-dialog-description" className="usage-dialog-description">
              Adjust the proportion of tokens in one request.
            </Text>
          </Box>
          <button
            className="usage-dialog-close"
            aria-label="Close usage composition dialog"
            onClick={close}
          >
            <span aria-hidden="true">×</span>
          </button>
        </Box>
        <Box className="usage-slider-list">
          {labels.map(({ key, label }) => (
            <Box className="usage-slider-row" key={key}>
              <HStack className="usage-slider-heading" justify="space-between">
                <Text>{label}</Text>
                <strong>{mix[key]}%</strong>
              </HStack>
        <Slider.Root
                className="usage-slider"
                min={0}
                max={100}
                value={[mix[key]]}
                onValueChange={({ value }) => changeMix(key, value[0] ?? 0)}
                aria-label={[`${label} percentage`]}
              >
                <Slider.Control>
                  <Slider.Track>
                    <Slider.Range />
                  </Slider.Track>
                  <Slider.Thumb index={0} />
                </Slider.Control>
              </Slider.Root>
            </Box>
          ))}
        </Box>
        {/* Two deliberate note lines (Default / total rule) beside an action
            pair that drops below them when the row runs out of room. The basis
            is wide enough to keep the first line unbroken on every width where
            the buttons still share the row. */}
        <Box className="usage-dialog-footer">
          <Box className="usage-footer-notes">
            <Text>
              Default: {DEFAULT_USAGE_MIX.cache}% cache, {DEFAULT_USAGE_MIX.input}% input, {DEFAULT_USAGE_MIX.output}% output.
            </Text>
            <Text>Total always equals 100%.</Text>
          </Box>
          <HStack className="usage-dialog-actions" gap="8px">
            <Button
              className="usage-reset"
              variant="plain"
              onClick={() => {
                // Drop the stale basis so the next drag re-snapshots from the reset mix.
                setActiveKey(null);
                setBasis(null);
                setMix(DEFAULT_MIX);
              }}
            >
              Reset
            </Button>
            <Button
              className="usage-apply"
              variant="plain"
              disabled={sameMix(mix, initialMix)}
              onClick={() => {
                onApply(mix);
                close();
              }}
            >
              Apply
            </Button>
          </HStack>
        </Box>
      </Box>
    </Box>
  );
}

export default UsageCompositionDialog;
