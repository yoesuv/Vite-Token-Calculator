import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  ChakraProvider,
  createSystem,
  defaultConfig,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import './App.css'

const system = createSystem(defaultConfig)

const models = [
  { name: 'GPT-4o', provider: 'OpenAI', price: '$0.01', icon: '◉' },
  { name: 'Claude 3.7 Sonnet', provider: 'Anthropic', price: '$0.015', icon: '✳' },
  { name: 'Gemini 2.5 Pro', provider: 'Google', price: '$0.01', icon: '◆' },
]

function App() {
  const [prompt, setPrompt] = useState('')
  const wordCount = useMemo(() => prompt.trim().split(/\s+/).filter(Boolean).length, [prompt])
  const tokenCount = Math.ceil(prompt.length / 4)

  return (
    <ChakraProvider value={system}>
      <Box as="main" className="page-shell">
        <Heading as="header" className="page-header">
          <span className="brand-mark">✳</span> token<span className="brand-light">wise</span>
        </Heading>

        <Box as="section" className="blueprint-section blueprint-section-one" aria-labelledby="input-title">
          <VStack className="section-content" align="stretch" gap="0">
            <Text className="section-kicker"><span className="section-number">01</span> YOUR INPUT</Text>
            <Heading id="input-title" className="section-heading" as="h1">What are you asking?</Heading>
            <Text className="section-description">Start with a prompt and see how much it costs to run across different models.</Text>
            <Text className="field-label">PASTE A PROMPT OR SAMPLE TEXT</Text>
            <Textarea
              aria-label="Prompt or sample text"
              className="prompt-input"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Write a product description for a cozy neighborhood coffee shop..."
            />
            <HStack className="input-meta" justify="space-between">
              <Text>↳ {wordCount} words · approx. {tokenCount} input tokens</Text>
              <Button variant="plain" className="clear-button" onClick={() => setPrompt('')}>Clear text ×</Button>
            </HStack>
          </VStack>
        </Box>

        <Box as="section" className="blueprint-section blueprint-section-two" aria-labelledby="models-title">
          <VStack className="section-content" align="stretch" gap="0">
            <Text className="section-kicker"><span className="section-number">02</span> MODEL COMPARISON</Text>
            <HStack className="section-heading-row" justify="space-between" align="end">
              <Box>
                <Heading id="models-title" className="section-heading" as="h2">Compare the answers</Heading>
                <Text className="section-description">Choose a model to compare estimated output costs.</Text>
              </Box>
              <Text className="estimate-label">ESTIMATED COST / 1K OUTPUT TOKENS</Text>
            </HStack>
            <SimpleGrid className="model-grid" columns={{ base: 1, md: 3 }} gap="3">
              {models.map((model, index) => (
                <Box className={`model-card model-card-${index}`} key={model.name}>
                  <HStack justify="space-between" align="start">
                    <Text className="model-icon">{model.icon}</Text>
                    <Text className="model-check">✓</Text>
                  </HStack>
                  <Text className="model-name">{model.name}</Text>
                  <Text className="model-provider">{model.provider}</Text>
                  <Text className="model-price">{model.price}</Text>
                  <Text className="model-caption">estimated · varies by usage</Text>
                </Box>
              ))}
            </SimpleGrid>
            <Button className="compare-button" onClick={() => document.getElementById('models-title')?.scrollIntoView({ behavior: 'smooth' })}>
              Compare costs <span>→</span>
            </Button>
          </VStack>
        </Box>
      </Box>
    </ChakraProvider>
  )
}

export default App
