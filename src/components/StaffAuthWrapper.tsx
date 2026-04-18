import React, { useState } from 'react';

interface Props {
  children: React.ReactNode;
}

export default function StaffAuthWrapper({ children }: Props) {
  const [pin, setPin] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(() => {
    return localStorage.getItem('sd_staff_auth') === 'true';
  });
  const [error, setError] = useState(false);

  const CORRECT_PIN = '5258';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === CORRECT_PIN) {
      setIsAuthorized(true);
      localStorage.setItem('sd_staff_auth', 'true');
      setError(false);
    } else {
      setError(true);
      setPin('');
    }
  };

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="staff-login-overlay">
      <form className="staff-login-card" onSubmit={handleLogin}>
        <div className="staff-login-icon">🔐</div>
        <h2 className="staff-login-title">Staff Access</h2>
        <p className="staff-login-sub">Please enter your 4-digit PIN to continue.</p>
        
        <div className="pin-input-group">
          <input 
            type="password" 
            maxLength={4} 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            className={`pin-input ${error ? 'error' : ''}`}
            autoFocus
          />
        </div>
        
        {error && <div className="pin-error">Incorrect PIN. Please try again.</div>}
        
        <button type="submit" className="pin-submit-btn">Unlock Console</button>
      </form>

      <style>{`
        .staff-login-overlay {
          position: fixed;
          inset: 0;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          font-family: 'Inter', sans-serif;
        }
        .staff-login-card {
          background: #fff;
          padding: 40px;
          border-radius: 24px;
          width: 100%;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }
        .staff-login-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }
        .staff-login-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }
        .staff-login-sub {
          color: #64748b;
          font-size: 0.9rem;
          margin-bottom: 32px;
        }
        .pin-input-group {
          margin-bottom: 24px;
        }
        .pin-input {
          width: 100%;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          font-size: 2rem;
          text-align: center;
          letter-spacing: 0.5em;
          outline: none;
          transition: all 0.2s;
        }
        .pin-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
        .pin-input.error {
          border-color: #ef4444;
          animation: shake 0.4s;
        }
        .pin-error {
          color: #ef4444;
          font-size: 0.85rem;
          margin-bottom: 16px;
          font-weight: 500;
        }
        .pin-submit-btn {
          width: 100%;
          background: #0f172a;
          color: #fff;
          border: none;
          padding: 16px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .pin-submit-btn:active {
          transform: scale(0.98);
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
      `}</style>
    </div>
  );
}
