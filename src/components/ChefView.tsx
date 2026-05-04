import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '../context/Store';
import { Clock, ChefHat, Play, CheckCircle2, Volume2, LogOut, LayoutGrid, Package, Ban, Check, Coffee } from 'lucide-react';
import './ChefView.css';

export default function ChefView() {
  const { orders, staff, menu, menuRequests, raiseMenuRequest, updateOrderStatus, updateStaffActivity, setStaffStatus } = useStore();
  const [activeKdsTab, setActiveKdsTab] = useState<'DINE_IN' | 'TAKE_AWAY'>('DINE_IN');
  const [showStockPanel, setShowStockPanel] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('ALL');
  
  // Kitchen Auth
  const [loggedChefId, setLoggedChefId] = useState<string | null>(() => sessionStorage.getItem('sd_chef_id'));
  const [chefPhone, setChefPhone] = useState('');
  const [chefPin, setChefPin] = useState('');
  const [authError, setAuthError] = useState(false);

  // Audio Notification
  const lastOrderCount = useRef(orders.length);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  // Heartbeat
  useEffect(() => {
    if (!loggedChefId) return;
    updateStaffActivity(loggedChefId);
    const interval = setInterval(() => {
      updateStaffActivity(loggedChefId);
    }, 60000);
    return () => clearInterval(interval);
  }, [loggedChefId]);

  useEffect(() => {
    if (orders.length > lastOrderCount.current) {
      const newOrders = orders.filter(o => o.status === 'PENDING');
      if (newOrders.length > 0) {
        audioRef.current?.play().catch(e => console.log('Audio play failed:', e));
      }
    }
    lastOrderCount.current = orders.length;
  }, [orders]);

  const handleChefLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const member = staff.find(s => s.phone === chefPhone && s.pin === chefPin && s.role === 'CHEF');
    if (member) {
      setLoggedChefId(member.id);
      sessionStorage.setItem('sd_chef_id', member.id);
      setStaffStatus(member.id, 'ONLINE');
      setAuthError(false);
      setChefPhone('');
      setChefPin('');
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    if (loggedChefId) setStaffStatus(loggedChefId, 'OFFLINE');
    setLoggedChefId(null);
    sessionStorage.removeItem('sd_chef_id');
  };

  const filteredOrders = useMemo(() => 
    orders.filter(o => o.type === activeKdsTab && ['PENDING', 'PREPARING', 'READY'].includes(o.status))
    .sort((a, b) => a.createdAt - b.createdAt),
  [orders, activeKdsTab]);

  const currentChef = useMemo(
    () => staff.find((member) => member.id === loggedChefId && member.role === 'CHEF'),
    [loggedChefId, staff]
  );

  const stockCategories = useMemo(
    () => ['ALL', ...Array.from(new Set(menu.map((item) => item.category)))],
    [menu]
  );

  const stockItems = useMemo(() => {
    return menu.filter((item) => {
      const categoryOk = menuCategoryFilter === 'ALL' || item.category === menuCategoryFilter;
      const text = `${item.name} ${item.description} ${item.category}`.toLowerCase();
      const searchOk = menuSearch.trim() === '' || text.includes(menuSearch.toLowerCase());
      return categoryOk && searchOk;
    });
  }, [menu, menuCategoryFilter, menuSearch]);

  const toggleChefBreak = () => {
    if (!loggedChefId || !currentChef) return;
    setStaffStatus(loggedChefId, currentChef.status === 'BREAK' ? 'ONLINE' : 'BREAK');
  };

  if (!loggedChefId) {
    return (
      <div className="kds-auth-overlay">
        <div className="kds-auth-card">
          <ChefHat size={64} className="auth-icon" />
          <h1>Kitchen Console</h1>
          <p>Receive, prepare, and mark orders ready in real time.</p>
          <form onSubmit={handleChefLogin}>
            <input type="tel" placeholder="Mobile Number" value={chefPhone} onChange={e => setChefPhone(e.target.value)} required />
            <input type="password" placeholder="4-Digit PIN" maxLength={4} value={chefPin} onChange={e => setChefPin(e.target.value)} required />
            {authError && <div className="auth-error">Invalid credentials</div>}
            <button type="submit">Start Kitchen Session</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="kds-app">
      <header className="kds-header">
        <div className="kds-header-left">
          <div className="kds-tabs">
            <button className={`kds-tab ${activeKdsTab === 'DINE_IN' && !showStockPanel ? 'active' : ''}`} onClick={() => { setActiveKdsTab('DINE_IN'); setShowStockPanel(false); }}>
              <LayoutGrid size={18} /> DINE-IN ({orders.filter(o => o.type === 'DINE_IN' && ['PENDING', 'PREPARING'].includes(o.status)).length})
            </button>
            <button className={`kds-tab ${activeKdsTab === 'TAKE_AWAY' && !showStockPanel ? 'active' : ''}`} onClick={() => { setActiveKdsTab('TAKE_AWAY'); setShowStockPanel(false); }}>
              <Package size={18} /> TAKE-AWAY ({orders.filter(o => o.type === 'TAKE_AWAY' && ['PENDING', 'PREPARING'].includes(o.status)).length})
            </button>
            <button className={`kds-tab ${showStockPanel ? 'active' : ''}`} onClick={() => setShowStockPanel(true)}>
              <Ban size={18} /> STOCK REQUESTS
            </button>
          </div>
        </div>
        
        <div className="kds-header-center">
          <div className="kds-logo">SMARTDINE<span>PRO</span></div>
        </div>

        <div className="kds-header-right">
          <button className={`kds-break ${currentChef?.status === 'BREAK' ? 'on-break' : ''}`} onClick={toggleChefBreak}>
            <Coffee size={16} /> {currentChef?.status === 'BREAK' ? 'Back Online' : 'Take Break'}
          </button>
          <div className="kds-time">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
          <button className="kds-logout" onClick={handleLogout}><LogOut size={18} /></button>
        </div>
      </header>

      <main className="kds-grid">
        {showStockPanel && (
        <section className="kds-stock-panel">
          <div className="kds-stock-head">
            <h3>Item Availability Requests</h3>
            <p>Send stock updates to billing for approval.</p>
          </div>
          <div className="kds-stock-filters">
            <input
              placeholder="Search item or category"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
            />
            <select value={menuCategoryFilter} onChange={(e) => setMenuCategoryFilter(e.target.value)}>
              {stockCategories.map((category) => (
                <option key={category} value={category}>
                  {category === 'ALL' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
          <div className="kds-stock-list">
            {stockItems.length === 0 && <div className="kds-stock-empty">No menu items for selected filters.</div>}
            {stockItems.map((item) => {
              const soldOutPending = menuRequests.some(
                (request) =>
                  request.menuItemId === item.id && request.requestedAvailability === false && request.status === 'PENDING'
              );
              const availablePending = menuRequests.some(
                (request) =>
                  request.menuItemId === item.id && request.requestedAvailability === true && request.status === 'PENDING'
              );
              return (
                <article key={item.id} className="kds-stock-item">
                  <div className="kds-stock-meta">
                    <div className="kds-stock-name">{item.name}</div>
                    <div className={`kds-stock-state ${item.available ? 'available' : 'soldout'}`}>
                      {item.available ? 'Available' : 'Sold Out'}
                    </div>
                  </div>
                  <div className="kds-stock-actions">
                    <button
                      className="kds-small-btn warn"
                      disabled={soldOutPending}
                      onClick={() => raiseMenuRequest(item.id, false)}
                    >
                      <Ban size={14} />
                      {soldOutPending ? 'Pending' : 'Sold Out'}
                    </button>
                    <button
                      className="kds-small-btn good"
                      disabled={availablePending}
                      onClick={() => raiseMenuRequest(item.id, true)}
                    >
                      <Check size={14} />
                      {availablePending ? 'Pending' : 'Available'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        )}
        {!showStockPanel && (filteredOrders.length === 0 ? (
          <div className="kds-empty">
            <Volume2 size={64} className="pulse" />
            <h2>No {activeKdsTab === 'DINE_IN' ? 'Dine-in' : 'Parcel'} Tickets</h2>
            <p>Waiting for new customer orders</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className={`kds-ticket ${order.status.toLowerCase()}`}>
              {order.complaint && !order.complaint.resolved && <div className="priority-tag">PRIORITY</div>}
              <div className="ticket-header">
                <div className="table-id">{order.type === 'TAKE_AWAY' ? 'PARCEL' : `Table ${order.tableId}`}</div>
                <div className="ticket-timer">
                  <Clock size={14} /> 
                  {Math.floor((Date.now() - order.createdAt) / 60000)}m
                </div>
              </div>

              <div className="ticket-items">
                {order.items.map((item, i) => (
                  <div key={i} className="ticket-item">
                    <span className="qty">{item.quantity}</span>
                    <span className="name">{item.name}</span>
                  </div>
                ))}
              </div>

              <div className="ticket-footer">
                {order.status === 'PENDING' && (
                  <button className="kds-btn fire" onClick={() => updateOrderStatus(order.id, 'PREPARING')}>
                    <Play size={16} fill="currentColor" /> START PREPARING
                  </button>
                )}
                {order.status === 'PREPARING' && (
                  <button className="kds-btn ready" onClick={() => updateOrderStatus(order.id, 'READY')}>
                    <CheckCircle2 size={16} /> READY FOR PICKUP
                  </button>
                )}
                {order.status === 'READY' && (
                  <div className="ticket-waiting">READY FOR PICKUP</div>
                )}
              </div>
            </div>
          ))
        ))}
      </main>
    </div>
  );
}
