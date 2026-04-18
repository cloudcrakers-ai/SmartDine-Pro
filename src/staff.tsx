import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { StoreProvider } from './context/Store'
import StaffAuthWrapper from './components/StaffAuthWrapper'
import BillingView from './components/BillingView'
import ChefView from './components/ChefView'
import WaiterView from './components/WaiterView'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <HashRouter>
        <StaffAuthWrapper>
          <Routes>
            <Route path="/billing" element={<BillingView />} />
            <Route path="/kitchen" element={<ChefView />} />
            {/* Within staff.html, default to billing */}
            <Route path="*" element={<Navigate to="/billing" replace />} />
          </Routes>
        </StaffAuthWrapper>
      </HashRouter>
    </StoreProvider>
  </StrictMode>,
)
