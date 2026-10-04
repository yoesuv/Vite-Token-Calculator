import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  HStack,
  Portal,
  Slider,
  Text,
} from "@chakra-ui/react";
import { DEFAULT_USAGE_MIX, type UsageMix } from "../../lib/pricing";
import "./UsageCompositionDialog.css";

type UsageCompositionDialogProps = {
  /** The mix currently in effect; the sliders start from it and Apply replaces it. */
  initialMix: UsageMix;
  onApply: (mix: UsageMix) => void;
  onClose: () => void;
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
}: UsageCompositionDialogProps) {
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
    <Dialog.Root
      open
      onOpenChange={({ open }) => {
        if (!open) onClose();
      }}
    >
      <Portal>
        <Dialog.Backdrop className="usage-dialog-backdrop" />
        <Dialog.Positioner>
          <Dialog.Content className="usage-dialog" maxWidth="720px" width="100%" asChild>
            <section>
              <Dialog.Header className="usage-dialog-header">
                <Box>
                  <Dialog.Title className="usage-dialog-title">
                    Usage composition
                  </Dialog.Title>
                  <Dialog.Description className="usage-dialog-description">
                    Adjust the proportion of tokens in one request.
                  </Dialog.Description>
                </Box>
                <Dialog.CloseTrigger
                  className="usage-dialog-close"
                  aria-label="Close usage composition dialog"
                  asChild
                >
                  <button type="button">
                    <span aria-hidden="true">×</span>
                  </button>
                </Dialog.CloseTrigger>
              </Dialog.Header>
              <Dialog.Body className="usage-slider-list">
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
              </Dialog.Body>
              {/* Two deliberate note lines (Default / total rule) beside an action
                  pair that drops below them when the row runs out of room. The basis
                  is wide enough to keep the first line unbroken on every width where
                  the buttons still share the row. */}
              <Dialog.Footer className="usage-dialog-footer" asChild>
                <footer>
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
                        onClose();
                      }}
                    >
                      Apply
                    </Button>
                  </HStack>
                </footer>
              </Dialog.Footer>
            </section>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export default UsageCompositionDialog;
