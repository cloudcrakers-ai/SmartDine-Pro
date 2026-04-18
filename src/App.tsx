import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/Store';
import CustomerView from './components/CustomerView';
import ChefView from './components/ChefView';
import WaiterView from './components/WaiterView';
import BillingView from './components/BillingView';
import './App.css';

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          {/* Customer scans QR → /table/5 */}
          <Route path="/table/:tableId" element={<CustomerView />} />

          {/* Default: redirect to table 1 (demo) */}
          <Route path="*" element={<Navigate to="/table/1" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
