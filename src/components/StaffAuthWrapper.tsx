import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import './StaffAuthWrapper.css';

interface Props {
  children: React.ReactNode;
}

export default function StaffAuthWrapper({ children }: Props) {
  const [pin, setPin] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(() => sessionStorage.getItem('sd_staff_auth') === 'true');
  const [error, setError] = useState(false);

  const CORRECT_PIN = '5258';

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (pin === CORRECT_PIN) {
      setIsAuthorized(true);
      sessionStorage.setItem('sd_staff_auth', 'true');
      setError(false);
      return;
    }
    setError(true);
    setPin('');
  };

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="staff-login-overlay">
      <form className="staff-login-card" onSubmit={handleLogin}>
        <div className="staff-login-icon">
          <ShieldCheck size={40} />
        </div>
        <h2 className="staff-login-title">Staff Console Access</h2>
        <p className="staff-login-sub">Enter your 4-digit PIN to continue to operations.</p>

        <div className="pin-input-group">
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="0000"
            className={`pin-input ${error ? 'error' : ''}`}
            autoFocus
          />
        </div>

        {error && <div className="pin-error">Incorrect PIN. Please try again.</div>}

        <button type="submit" className="pin-submit-btn">
          Unlock Console
        </button>
      </form>
    </div>
  );
}
