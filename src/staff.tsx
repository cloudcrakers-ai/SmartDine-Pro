import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { StoreProvider } from './context/Store'
import StaffAuthWrapper from './components/StaffAuthWrapper'
import BillingView from './components/BillingView'
import ChefView from './components/ChefView'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route
            path="/billing"
            element={
              <StaffAuthWrapper>
                <BillingView />
              </StaffAuthWrapper>
            }
          />
          <Route path="/kitchen" element={<ChefView />} />
          <Route path="*" element={<Navigate to="/billing" replace />} />
        </Routes>
      </HashRouter>
    </StoreProvider>
  </StrictMode>,
)
