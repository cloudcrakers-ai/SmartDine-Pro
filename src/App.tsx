import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './context/Store';
import BillingView from './components/BillingView';
import ChefView from './components/ChefView';
import CustomerView from './components/CustomerView';
import StaffAuthWrapper from './components/StaffAuthWrapper';
import WaiterView from './components/WaiterView';
import './App.css';

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route path="/table/:tableId" element={<CustomerView />} />
          <Route path="/waiter" element={<WaiterView />} />
          <Route path="/staff/kitchen" element={<ChefView />} />
          <Route
            path="/staff/billing"
            element={
              <StaffAuthWrapper>
                <BillingView />
              </StaffAuthWrapper>
            }
          />
          <Route path="/staff/*" element={<Navigate to="/staff/billing" replace />} />
          <Route path="*" element={<Navigate to="/table/1" replace />} />
        </Routes>
      </HashRouter>
    </StoreProvider>
  );
}
