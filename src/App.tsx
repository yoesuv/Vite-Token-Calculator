import { useState } from 'react'
import { Button, ChakraProvider, createSystem, defaultConfig, Heading, Text } from '@chakra-ui/react'
import './App.css'

const system = createSystem(defaultConfig)

function App() {
  const [prompt, setPrompt] = useState('')
  const [models, setModels] = useState(['GPT-4o', 'Claude 3.7 Sonnet', 'Gemini 2.5 Pro'])

  return (
    <ChakraProvider value={system}>
      <main className="page-shell">
        <header className="topbar">
          <a className="brand" href="#"><span className="brand-mark">✳</span> token<span className="brand-light">wise</span></a>
          <nav><a href="#calculator">Calculator</a><a href="#how-it-works">How it works</a></nav>
          <a className="github-link" href="https://github.com" target="_blank" rel="noreferrer">Built for curious minds <span>↗</span></a>
        </header>

        <section className="hero">
          <div className="eyebrow"><span className="status-dot" /> THE AI COST PLAYGROUND</div>
          <Heading as="h1">Know what your<br /><span>AI really costs.</span></Heading>
          <Text className="hero-copy">Compare token usage and pricing across the models you love.<br className="desktop-break" /> No spreadsheets. No surprises. Just the numbers.</Text>
          <div className="hero-note"><span>↘</span> Start with a prompt. We’ll do the math.</div>
        </section>

        <section className="calculator" id="calculator">
          <div className="card-heading"><div><div className="step-label">01 <span>— YOUR INPUT</span></div><Heading as="h2">What are you asking?</Heading></div><span className="sparkle">✳</span></div>
          <label className="input-label" htmlFor="prompt">PASTE A PROMPT OR SAMPLE TEXT</label>
          <textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Write a product description for a cozy neighborhood coffee shop..." />
          <div className="input-footer"><span>↳ {prompt.trim() ? prompt.trim().split(/\s+/).length : 0} words · approx. {Math.ceil(prompt.length / 4)} input tokens</span><button onClick={() => setPrompt('')}>Clear text <span>×</span></button></div>

          <div className="model-section">
            <div className="step-label">02 <span>— PICK YOUR MODELS</span></div>
            <div className="model-head"><Heading as="h2">Who’s answering?</Heading><button className="text-button" onClick={() => setModels(models.length === 3 ? ['GPT-4o'] : ['GPT-4o', 'Claude 3.7 Sonnet', 'Gemini 2.5 Pro'])}>{models.length === 3 ? 'Clear all' : 'Add popular models'} <span>↗</span></button></div>
            <div className="model-list">{models.map((model, index) => <div className="model-row" key={model}><span className={`model-icon model-${index}`}>{['◉', '✳', '◆'][index]}</span><span className="model-name">{model}</span><span className="model-provider">{['OpenAI', 'Anthropic', 'Google'][index]}</span><span className="model-check">✓</span></div>)}</div>
          </div>
          <Button className="compare-button" onClick={() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })}>Compare costs <span>→</span></Button>
          <div className="results" id="results"><div className="results-label">YOUR ESTIMATED COST <span>PER 1K OUTPUT TOKENS</span></div><div className="price-grid">{models.map((model, index) => <div className="price-card" key={model}><span>{model}</span><strong>{['$0.01', '$0.015', '$0.01'][index]}</strong><small>estimated · varies by usage</small></div>)}</div></div>
        </section>
        <footer id="how-it-works"><span>Made for better-informed AI decisions.</span><span>Pricing is an estimate, not a promise. <b>✳</b></span></footer>
      </main>
    </ChakraProvider>
  )
}

export default App
