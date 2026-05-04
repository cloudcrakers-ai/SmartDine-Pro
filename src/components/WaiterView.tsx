import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../context/Store';
import { CheckCircle2, ClipboardList, Clock, Coffee, LogOut, Play } from 'lucide-react';
import './WaiterView.css';

type Filter = 'all' | 'assigned' | 'ready';

export default function WaiterView() {
  const { orders, staff, updateOrderStatus, updateStaffActivity, setStaffStatus } = useStore();
  const [filter, setFilter] = useState<Filter>('assigned');

  const [loggedWaiterId, setLoggedWaiterId] = useState<string | null>(() => localStorage.getItem('sd_waiter_id'));
  const [waiterPhone, setWaiterPhone] = useState('');
  const [waiterPin, setWaiterPin] = useState('');
  const [authError, setAuthError] = useState(false);

  const currentStaff = useMemo(() => staff.find((member) => member.id === loggedWaiterId), [staff, loggedWaiterId]);

  useEffect(() => {
    if (!loggedWaiterId) return;
    updateStaffActivity(loggedWaiterId);
    if (currentStaff?.status === 'OFFLINE') {
      setStaffStatus(loggedWaiterId, 'ONLINE');
    }
    const interval = setInterval(() => {
      updateStaffActivity(loggedWaiterId);
    }, 60000);
    return () => clearInterval(interval);
  }, [loggedWaiterId, currentStaff?.status]);

  const handleWaiterLogin = (event: React.FormEvent) => {
    event.preventDefault();
    const member = staff.find(
      (person) => person.phone === waiterPhone && person.pin === waiterPin && person.role === 'WAITER'
    );
    if (member) {
      setLoggedWaiterId(member.id);
      localStorage.setItem('sd_waiter_id', member.id);
      localStorage.setItem('sd_waiter_name', member.name);
      setStaffStatus(member.id, 'ONLINE');
      setAuthError(false);
      setWaiterPhone('');
      setWaiterPin('');
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    if (loggedWaiterId) setStaffStatus(loggedWaiterId, 'OFFLINE');
    setLoggedWaiterId(null);
    localStorage.removeItem('sd_waiter_id');
    localStorage.removeItem('sd_waiter_name');
  };

  const toggleWorkMode = () => {
    if (!loggedWaiterId || !currentStaff) return;
    const nextStatus = currentStaff.status === 'ONLINE' ? 'BREAK' : 'ONLINE';
    setStaffStatus(loggedWaiterId, nextStatus);
  };

  const activeOrders = useMemo(
    () => orders.filter((order) => ['PENDING', 'PREPARING', 'READY'].includes(order.status)),
    [orders]
  );
  const myOrders = useMemo(
    () => activeOrders.filter((order) => order.assignedTo === loggedWaiterId),
    [activeOrders, loggedWaiterId]
  );
  const displayOrders = useMemo(() => {
    if (filter === 'assigned') return myOrders;
    if (filter === 'ready') return activeOrders.filter((order) => order.status === 'READY');
    return activeOrders;
  }, [filter, myOrders, activeOrders]);

  const timeSince = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  if (!loggedWaiterId) {
    return (
      <div className="waiter-auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">SD</div>
            <h1>Service Console</h1>
            <p>Start your shift to deliver orders without delay.</p>
          </div>
          <form onSubmit={handleWaiterLogin} className="auth-form">
            <div className="input-group">
              <label>Phone Number</label>
              <input
                type="tel"
                placeholder="9876543210"
                value={waiterPhone}
                onChange={(e) => setWaiterPhone(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label>Private PIN</label>
              <input
                type="password"
                placeholder="****"
                maxLength={4}
                value={waiterPin}
                onChange={(e) => setWaiterPin(e.target.value)}
                required
              />
            </div>
            {authError && <p className="auth-error">Invalid credentials. Please check with manager.</p>}
            <button type="submit" className="auth-submit">
              Start Shift
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="waiter-pro-app">
      <nav className="waiter-nav">
        <div className="nav-profile">
          <div className="avatar">{currentStaff?.name.charAt(0)}</div>
          <div className="info">
            <span className="name">{currentStaff?.name}</span>
            <span className={`status-badge ${currentStaff?.status.toLowerCase()}`}>{currentStaff?.status}</span>
          </div>
        </div>
        <div className="nav-actions">
          <button className={`mode-toggle ${currentStaff?.status === 'BREAK' ? 'on-break' : ''}`} onClick={toggleWorkMode}>
            {currentStaff?.status === 'BREAK' ? <Play size={18} /> : <Coffee size={18} />}
            <span>{currentStaff?.status === 'BREAK' ? 'Resume' : 'Break'}</span>
          </button>
          <button className="logout-icon" onClick={handleLogout}>
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <div className="waiter-dashboard">
        <div className="dashboard-header">
          <div className="stat-pills">
            <button className={filter === 'assigned' ? 'active' : ''} onClick={() => setFilter('assigned')}>
              My Queue ({myOrders.length})
            </button>
            <button className={filter === 'ready' ? 'active' : ''} onClick={() => setFilter('ready')}>
              Ready Pickup ({activeOrders.filter((order) => order.status === 'READY').length})
            </button>
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
              All Active
            </button>
          </div>
        </div>

        <div className="order-feed">
          {displayOrders.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={48} />
              <h3>No pending service tasks</h3>
              <p>New tickets will appear here live as customers place orders.</p>
            </div>
          ) : (
            displayOrders.map((order) => (
              <div
                key={order.id}
                className={`pro-order-card ${order.status.toLowerCase()} ${order.assignedTo === loggedWaiterId ? 'mine' : ''}`}
              >
                {order.complaint && !order.complaint.resolved && <div className="complaint-ribbon">PRIORITY</div>}
                <div className="card-top">
                  <div className="table-circle">{order.type === 'TAKE_AWAY' ? 'P' : `T${order.tableId}`}</div>
                  <div className="order-meta">
                    <span className="customer">{order.customerName || (order.type === 'TAKE_AWAY' ? 'Takeaway' : 'Walk-in')}</span>
                    <span className="time">
                      <Clock size={12} /> {timeSince(order.createdAt)}
                    </span>
                  </div>
                  <div className="status-tag">{order.status}</div>
                </div>

                <div className="card-items">
                  {order.items.map((item, index) => (
                    <div key={index} className="item-line">
                      <span className="qty">{item.quantity}x</span>
                      <span className="name">{item.name}</span>
                    </div>
                  ))}
                </div>

                <div className="card-footer">
                  {order.status === 'READY' ? (
                    <button className="action-btn deliver" onClick={() => updateOrderStatus(order.id, 'DELIVERED', loggedWaiterId)}>
                      <CheckCircle2 size={18} /> Confirm Delivered
                    </button>
                  ) : (
                    <div className="assigned-tag">
                      {order.assignedTo === loggedWaiterId ? 'Assigned to you' : 'Assigned to another waiter'}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
