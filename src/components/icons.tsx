import { Icon, type IconProps } from "@chakra-ui/react";
import {
  LuCheck,
  LuInfo,
  LuMoon,
  LuPlus,
  LuSearch,
  LuSun,
  LuWallet,
  LuCalculator,
  LuSlidersHorizontal,
  LuX,
} from "react-icons/lu";

/**
 * Shared UI icons.
 *
 * Standard UI glyphs come from `react-icons` (Lucide set) and are wrapped in
 * Chakra's `<Icon>` component so every call site keeps Chakra's sizing/color
 * conventions (`boxSize`, `color` → `currentColor`) and can still be styled
 * from parent CSS.
 *
 * `react-icons` is used instead of `@chakra-ui/icons` because the latter is
 * stuck on Chakra v2 and fails to bundle against v3 (it imports removed v2
 * APIs such as `forwardRef` and `Icon` from `@chakra-ui/react`).
 *
 * The brand mark (`TokenIcon`) stays a bespoke `createIcon` glyph — it is
 * product identity, not a generic UI symbol.
 *
 * Model/provider slot marks are intentionally NOT here — those are brand logos
 * rendered by the shared <ProviderMark> component (src/components/ProviderMark.tsx).
 */

/** Wrap a react-icons SVG component so it renders through Chakra's <Icon>. */
function glyph(Glyph: React.ComponentType<{ size?: number | string }>) {
  return function GlyphIcon(props: IconProps) {
    return (
      <Icon {...props} asChild>
        <Glyph />
      </Icon>
    );
  };
}

export const SunIcon = glyph(LuSun);
export const MoonIcon = glyph(LuMoon);
export const WalletIcon = glyph(LuWallet);
export const UsageIcon = glyph(LuSlidersHorizontal);
export const CalculatorIcon = glyph(LuCalculator);
export const PlusIcon = glyph(LuPlus);
export const SearchIcon = glyph(LuSearch);
export const CheckIcon = glyph(LuCheck);
export const InfoIcon = glyph(LuInfo);
export const XIcon = glyph(LuX);
