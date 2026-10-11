import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { StoreProvider } from './engine/store'
import { initTheme } from './engine/theme'

// Initialize theme system (applies persisted preference, listens for OS changes)
const cleanupTheme = initTheme();
// Cleanup on HMR dispose (Vite dev mode)
if (import.meta.hot) {
  import.meta.hot.dispose(() => cleanupTheme());
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </React.StrictMode>,
)
