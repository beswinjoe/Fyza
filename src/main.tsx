import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { RouterProvider } from './engine/router'
import { AuthProvider } from './engine/auth'
import { initTheme } from './engine/theme'

// Initialize theme system (applies persisted preference, listens for OS changes)
const cleanupTheme = initTheme();
// Cleanup on HMR dispose (Vite dev mode)
if (import.meta.hot) {
  import.meta.hot.dispose(() => cleanupTheme());
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </RouterProvider>
  </React.StrictMode>,
)
