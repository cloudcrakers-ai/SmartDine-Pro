import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.tsx'

// If running as a native APK, default to the Waiter Dashboard
if (Capacitor.isNativePlatform()) {
  if (window.location.hash === '' || window.location.hash === '#/') {
    window.location.hash = '#/waiter';
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
