import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Initializes Firebase + App Check before the app renders.
import './lib/firebase.ts'
// Starts GA4 analytics (no-op when unconfigured; see src/lib/analytics.ts).
import { startAnalytics } from './lib/analytics'
import App from './App.tsx'

startAnalytics()

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Unable to start the application: missing #root element')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
