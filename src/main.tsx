import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Initializes Firebase + App Check before the app renders.
import './lib/firebase.ts'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
