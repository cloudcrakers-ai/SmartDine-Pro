import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { StoreProvider } from './context/Store'
import WaiterView from './components/WaiterView'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <HashRouter>
        <WaiterView />
      </HashRouter>
    </StoreProvider>
  </StrictMode>,
)
