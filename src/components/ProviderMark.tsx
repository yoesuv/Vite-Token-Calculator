import { type ComponentType } from "react";
import {
  AgnesAI,
  Claude,
  Cohere,
  DeepSeek,
  Gemini,
  Grok,
  Hunyuan,
  Kimi,
  Meta,
  Minimax,
  Mistral,
  Moonshot,
  OpenAI,
  Perplexity,
  Qwen,
  Stepfun,
  Upstage,
  XAI,
  XiaomiMiMo,
  Zhipu,
} from "@lobehub/icons";
import "./ProviderMark.css";

/**
 * Brand mark per API provider from `@lobehub/icons`. Multi-color brands use
 * their `.Color` variant; monochrome brands render with `currentColor`, tinted
 * by the `.provider-*` chip CSS. Icons default to `1em`, so the chip's
 * `font-size` keeps sizing them.
 *
 * Shared by the picker grid, the picker slot strip, and the comparison slots —
 * see ProviderMark.css for the chip styling.
 */
type ProviderIcon = ComponentType<{ size?: string | number }>;
const providerIcons: Record<string, ProviderIcon> = {
  agnes: AgnesAI,
  anthropic: Claude.Color,
  claude: Claude.Color,
  cohere: Cohere.Color,
  deepseek: DeepSeek.Color,
  gemini: Gemini.Color,
  glm: Zhipu.Color,
  google: Gemini.Color,
  meta: Meta.Color,
  minimax: Minimax.Color,
  mistral: Mistral.Color,
  moonshot: Kimi.Color,
  moonshotai: Moonshot,
  openai: OpenAI,
  perplexity: Perplexity.Color,
  qwen: Qwen.Color,
  stepfun: Stepfun,
  tencent: Hunyuan.Color,
  upstage: Upstage.Color,
  xiaomi: XiaomiMiMo,
  "x-ai": Grok,
  xai: XAI,
  "z-ai": Zhipu.Color,
  zhipu: Zhipu.Color,
};

/** Brand glyph when known, capitalized initial otherwise. */
export function ProviderMark({ provider }: { provider: string }) {
  // Own-property lookup: inherited keys like "__proto__" would resolve to
  // Object.prototype and crash the render instead of hitting the fallback.
  const Icon = Object.hasOwn(providerIcons, provider)
    ? providerIcons[provider]
    : undefined;
  return (
    <span className={`provider-mark provider-${provider}`}>
      {Icon ? <Icon /> : provider.charAt(0).toUpperCase()}
    </span>
  );
}
