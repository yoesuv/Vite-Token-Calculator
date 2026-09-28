import { useState } from 'react'
import { Box, Button, HStack, Text } from '@chakra-ui/react'
import {
  coverageTokens,
  currencyConfig,
  formatBalanceForDisplay,
  formatMoney,
  pricePerMillion,
  sanitizeBalanceInput,
  type Currency,
} from '../../lib/pricing'
import './ModelBalanceSection.css'

// Mirrors the model API response so the temporary catalog can be replaced by an API response.
export type Model = {
  id: string
  name: string
  input: number
  output: number
  cache: number
  context: number
  modalities: string[]
  cutoff?: string | null
  released?: { _seconds: number; _nanoseconds: number } | null
}

const initialModels: Model[] = [
  { id: 'gpt-6-astra', name: 'GPT 6 Astra', input: 100, output: 900, cache: 30, context: 1048576, modalities: ['text', 'image', 'video'] },
  { id: 'claude-opus-4.8', name: 'Claude Opus 4.8', input: 500, output: 2500, cache: 50, context: 1000000, modalities: ['text', 'image'] },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', input: 125, output: 1000, cache: 35, context: 1048576, modalities: ['text', 'image', 'video'] },
  { id: 'moonshotai/kimi-k3', name: 'Kimi K3', input: 100, output: 900, cache: 30, context: 1048576, modalities: ['text', 'image', 'video'] },
  { id: 'meta/llama-4-maverick', name: 'Llama 4 Maverick', input: 150, output: 850, cache: 25, context: 1048576, modalities: ['text', 'image'] },
]

// Comparison stays readable with at most 6 slots, even if the API returns more models.
const SLOT_LIMIT = 6

type ModelBalanceSectionProps = {
  currency: Currency
  balance: string
  onBalanceChange: (balance: string) => void
}

export function ModelBalanceSection({ currency, balance, onBalanceChange }: ModelBalanceSectionProps) {
  const [models] = useState<Model[]>(initialModels)
  // Slot count follows the catalog: one slot per model (capped), first two pre-selected.
  const [selected, setSelected] = useState<(string | null)[]>(() =>
    Array.from({ length: Math.min(models.length, SLOT_LIMIT) }, (_, index) => index < 2 ? models[index].id : null),
  )
  const [usageOpen, setUsageOpen] = useState(false)
  // While editing, show raw digits so the cursor behaves; format with separators only when blurred.
  const [balanceFocused, setBalanceFocused] = useState(false)
  const numericBalance = Number(balance) || 0
  const config = currencyConfig(currency)
  const currentModel = (id: string | null) => models.find((model) => model.id === id)
  const addModel = (slot: number) => {
    const nextModel = models.find((model) => !selected.includes(model.id))
    if (nextModel) setSelected((items) => items.map((item, index) => index === slot ? nextModel.id : item))
  }
  const clearModel = (slot: number) => setSelected((items) => items.map((item, index) => index === slot ? null : item))

  return (
    <Box as="section" className="balance-section" aria-labelledby="balance-title">
      <Box className="balance-top">
        <Box className="balance-amount-block">
          <Text className="balance-eyebrow">▱ &nbsp;AVAILABLE BALANCE</Text>
          <HStack className="balance-input-row" gap="2">
            <Text className="currency-prefix">{config.symbol}</Text>
            <input id="balance-title" className="balance-input" aria-label={`Available balance in ${config.displayName}`} inputMode={config.inputMode} value={balanceFocused ? balance : formatBalanceForDisplay(balance, currency)} onFocus={() => setBalanceFocused(true)} onBlur={() => setBalanceFocused(false)} onChange={(event) => onBalanceChange(sanitizeBalanceInput(event.target.value, currency))} />
          </HStack>
          <Text className="balance-help">Editing this value does not change your account balance.</Text>
        </Box>
        <Box className="usage-area">
          <Button className="usage-button" onClick={() => setUsageOpen((open) => !open)} aria-expanded={usageOpen}>✣ &nbsp; Usage composition</Button>
          <Text className="usage-caption">Cache read 90% · Input 9% · Output 1%</Text>
          {usageOpen && <Box className="usage-popover" role="status">Estimates assume 90% cache reads, 9% input tokens, and 1% output tokens.</Box>}
        </Box>
      </Box>
      <Box className="model-slots">
        {selected.map((id, slot) => {
          const model = currentModel(id)
          return <Box className={`model-slot ${model ? 'has-model' : 'empty-slot'}`} key={slot}>
            <HStack className="slot-heading" justify="space-between">
              <Text className="slot-label">{slot === 0 ? 'PRIMARY MODEL' : `COMPARE ${slot}`}</Text>
              {slot > 0 && model && <Button variant="plain" className="slot-clear" onClick={() => clearModel(slot)}>Clear</Button>}
            </HStack>
            {model ? <>
              <Box className="model-select-label">
                <span className={`provider-mark provider-mark-${slot}`}>{slot === 1 ? '✳' : slot === 2 ? '◆' : '◎'}</span>
                <span className="model-ident"><strong>{model.name}</strong><small>{model.id}</small></span>
              </Box>
              <Box className="coverage-panel">
                <Text className="coverage-label">Estimated coverage</Text>
                <Text className="coverage-value">{(coverageTokens(numericBalance, model, currency) / 1000000).toFixed(2)}M</Text>
                <Text className="coverage-note">tokens with the primary balance</Text>
              </Box>
              <HStack className="price-row" justify="space-between"><Text>Estimated price</Text><strong>{formatMoney(pricePerMillion(model, currency), currency)} / 1M tokens</strong></HStack>
            </> : <button className="add-model" onClick={() => addModel(slot)} aria-label={`Add model to Compare ${slot}`}><span>+</span><strong>Compare {slot}</strong><small>Select a model below</small></button>}
          </Box>
        })}
      </Box>
    </Box>
  )
}

export default ModelBalanceSection
