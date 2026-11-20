import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'
import { fontsReady } from './lib/fonts'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found')

// The first paint waits (briefly) for the fonts, so nothing jumps afterwards.
void fontsReady().then(() => {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
