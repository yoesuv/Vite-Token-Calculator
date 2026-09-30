import { useMemo, useState } from 'react'
import { Box, Text } from '@chakra-ui/react'
import { CheckIcon, PlusIcon, SearchIcon, XIcon } from '../icons'
import './ModelPickerSection.css'

type CatalogModel = { id: string; name: string; provider: string }

const catalog: CatalogModel[] = [
  { name: 'Agnes 2.5 Flash', id: 'agnes-2.5-flash', provider: 'agnes' },
  { name: 'Agnes 3 Flash', id: 'agnes-3-flash', provider: 'agnes' },
  { name: 'Agnes Image 2.0 Flash', id: 'agnes-image-2.0-flash', provider: 'agnes' },
  { name: 'Agnes Image 2.1 Flash', id: 'agnes-image-2.1-flash', provider: 'agnes' },
  { name: 'Claude Fable 5', id: 'claude-fable-5', provider: 'claude' },
  { name: 'Claude Fable 5.1', id: 'claude-fable-5.1', provider: 'claude' },
  { name: 'Claude Opus 4.8', id: 'claude-opus-4.8', provider: 'claude' },
  { name: 'Claude Opus 5', id: 'claude-opus-5', provider: 'claude' },
  { name: 'Claude Opus 5.5', id: 'claude-opus-5.5', provider: 'claude' },
  { name: 'Claude Sonnet 5', id: 'claude-sonnet-5', provider: 'claude' },
  { name: 'Claude Sonnet 5.5', id: 'claude-sonnet-5.5', provider: 'claude' },
  { name: 'Deepseek v4 Flash 0731 Alibaba', id: 'deepseek-v4-flash-alibaba', provider: 'deepseek' },
  { name: 'DeepSeek V4 Flash Vision (exp)', id: 'deepseek-v4-flash-vision-exp', provider: 'deepseek' },
  { name: 'Deepseek v4 Pro 0813 Alibaba', id: 'deepseek-v4-pro-alibaba', provider: 'deepseek' },
  { name: 'Deepseek v4.1 Flash', id: 'deepseek-v4.1-flash', provider: 'deepseek' },
  { name: 'Gemini 3.1 Pro High', id: 'gemini-3.1-pro-high', provider: 'google' },
  { name: 'Gemini 3.8 Flash High', id: 'gemini-3.8-flash-high', provider: 'google' },
  { name: 'GLM 5.2', id: 'glm-5.2', provider: 'glm' },
  { name: 'GLM 5.3', id: 'glm-5.3', provider: 'glm' },
  { name: 'GLM 5.3 Flash', id: 'glm-5.3-flash', provider: 'glm' },
]

const initialSelected = ['agnes-2.5-flash']
const providerSymbols: Record<string, string> = { agnes: '∿', claude: '✳', deepseek: '◉', google: 'G', glm: '✣' }

export function ModelPickerSection() {
  const [selected, setSelected] = useState<string[]>(initialSelected)
  const [query, setQuery] = useState('')
  const visibleModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return catalog.filter((model) => `${model.name} ${model.id}`.toLowerCase().includes(normalizedQuery))
  }, [query])

  const toggleModel = (id: string) => {
    setSelected((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < 5 ? [...current, id] : current)
  }

  return (
    <Box as="section" className="picker-section" aria-labelledby="picker-title">
      <div className="picker-intro">
        <div>
          <Text id="picker-title" className="picker-title">Choose model</Text>
          <Text className="picker-description">Compare up to five models using the same balance and usage mix.</Text>
        </div>
        <div className="picker-slots" aria-label="Selected models">
          {Array.from({ length: 5 }, (_, slot) => {
            const model = catalog.find((item) => item.id === selected[slot])
            return model ? (
              <button className="picker-slot picker-slot-selected" key={slot} onClick={() => toggleModel(model.id)} aria-label={`Remove ${model.name}`}>
                <span className={`picker-provider provider-${model.provider}`}>{providerSymbols[model.provider]}</span>
                <span className="picker-slot-copy"><strong>{model.name}</strong><small>{model.id}</small></span>
              </button>
            ) : (
              <button className="picker-slot picker-slot-empty" key={slot} onClick={() => { if (visibleModels[0]) toggleModel(visibleModels[0].id) }}>
                <span className="picker-plus"><PlusIcon /></span><span>Add model</span>
              </button>
            )
          })}
        </div>
      </div>
      <label className="picker-search">
        <SearchIcon aria-hidden="true" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search models" aria-label="Search models" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><XIcon /></button>}
      </label>
      <div className="picker-grid" role="list" aria-label="Available models">
        {visibleModels.map((model) => {
          const isSelected = selected.includes(model.id)
          return <button role="listitem" aria-pressed={isSelected} className={`picker-model ${isSelected ? 'is-selected' : ''}`} key={model.id} onClick={() => toggleModel(model.id)}>
            <span className={`picker-provider provider-${model.provider}`}>{providerSymbols[model.provider]}</span>
            <span className="picker-model-copy"><strong>{model.name}</strong><small>{model.id}</small></span>
            {isSelected && <span className="picker-check"><CheckIcon /></span>}
          </button>
        })}
        {visibleModels.length === 0 && <p className="picker-empty">No models match “{query}”.</p>}
      </div>
      {selected.length >= 5 && <p className="picker-limit">Five models selected. Remove one to compare another.</p>}
    </Box>
  )
}

export default ModelPickerSection
