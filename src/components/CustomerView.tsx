import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../context/Store';
import type { OrderItem } from '../types';
import './CustomerView.css';

interface CartEntry { menuItemId: string; name: string; price: number; quantity: number; }

/* ─── Session persistence ─── */
function loadSession(tableId: string) {
  try {
    const raw = localStorage.getItem(`sd_session_t${tableId}`);
    if (raw) return JSON.parse(raw) as { name: string; phone: string; loggedIn: boolean };
  } catch { /* ignore */ }
  return null;
}

function saveSession(tableId: string, name: string, phone: string) {
  localStorage.setItem(`sd_session_t${tableId}`, JSON.stringify({ name, phone, loggedIn: true }));
}

/* ─── UPI Payment Helper ─── */
function openUPIPayment(amount: number, orderId: string, merchantName: string) {
  const upiParams = new URLSearchParams({
    pa: 'smartdine@upi',           // UPI VPA (replace with real one)
    pn: merchantName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: `SmartDine Order ${orderId}`,
    tr: orderId,
  });
  const upiUrl = `upi://pay?${upiParams.toString()}`;
  window.location.href = upiUrl;
}

export default function CustomerView() {
  const { tableId } = useParams<{ tableId: string }>();
  const tid = tableId ?? '1';
  const { menu, orders, addOrder, markPaid, requestCounterPayment } = useStore();

  const savedSession = useMemo(() => loadSession(tid), [tid]);
  const [loggedIn, setLoggedIn] = useState(savedSession?.loggedIn ?? false);
  const [customerName, setCustomerName] = useState(savedSession?.name ?? '');
  const [phone, setPhone] = useState(savedSession?.phone ?? '');
  const [cart, setCart] = useState<CartEntry[]>(() => {
    try { const raw = localStorage.getItem(`sd_cart_t${tid}`); return raw ? JSON.parse(raw) : []; }
    catch { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'orders'>('menu');
  const [paymentProcessing, setPaymentProcessing] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(`sd_cart_t${tid}`, JSON.stringify(cart)); }, [cart, tid]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menu.map(i => i.category)));
    return ['All', ...cats];
  }, [menu]);

  const filtered = useMemo(() => {
    return activeCategory === 'All' ? menu : menu.filter(i => i.category === activeCategory);
  }, [menu, activeCategory]);

  const myOrders = useMemo(() => orders.filter(o => o.tableId === tid && o.customerName === customerName), [orders, tid, customerName]);
  const unpaidTotal = useMemo(() => myOrders.filter(o => o.paymentStatus === 'UNPAID' && o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0), [myOrders]);
  const cartTotal = useMemo(() => cart.reduce((s, c) => s + c.price * c.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, c) => s + c.quantity, 0), [cart]);

  const addToCart = (id: string, name: string, price: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === id);
      if (existing) return prev.map(c => c.menuItemId === id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: id, name, price, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === id);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter(c => c.menuItemId !== id);
      return prev.map(c => c.menuItemId === id ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const getCartQty = (id: string) => cart.find(c => c.menuItemId === id)?.quantity || 0;

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;
    const items: OrderItem[] = cart.map(c => ({ menuItemId: c.menuItemId, name: c.name, price: c.price, quantity: c.quantity }));
    addOrder(customerName, phone, tid, items);
    setCart([]);
    setCartOpen(false);
    setOrderPlaced(true);
    setTimeout(() => setOrderPlaced(false), 3500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerName.trim()) {
      saveSession(tid, customerName.trim(), phone);
      setLoggedIn(true);
    }
  };

  const handlePayOrder = (orderId: string, amount: number) => {
    setPaymentProcessing(orderId);
    // Attempt UPI deep link
    openUPIPayment(amount, orderId, 'SmartDine Restaurant');
    // Fallback: after 3s if still on page, mark as "pay at counter"
    setTimeout(() => {
      setPaymentProcessing(null);
    }, 3000);
  };

  const handlePayAtCounter = (orderId: string) => {
    requestCounterPayment(orderId);
  };

  const handlePayAll = () => {
    const unpaid = myOrders.filter(o => o.paymentStatus === 'UNPAID' && o.status !== 'CANCELLED');
    if (unpaid.length > 0) {
      openUPIPayment(unpaidTotal, `BATCH-${Date.now().toString(36).toUpperCase()}`, 'SmartDine Restaurant');
    }
  };

  const getStatusStep = (status: string) => {
    if (status === 'PENDING') return 0;
    if (status === 'PREPARING') return 1;
    if (status === 'READY') return 2;
    if (status === 'DELIVERED') return 3;
    return 0;
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = { PENDING: 'Received by kitchen', PREPARING: 'Being prepared', READY: 'Ready for pickup', DELIVERED: 'Served', CANCELLED: 'Cancelled' };
    return map[status] || status;
  };

  const timeFmt = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  /* ─── Login Screen ─── */
  if (!loggedIn) {
    return (
      <div className="login-overlay">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="brand-name" style={{ fontFamily: 'var(--font-display)' }}>SmartDine</div>
          <p className="login-subtitle">Welcome to Table {tid}. Let's get your order started.</p>
          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input className="form-input" type="text" placeholder="e.g. Karthik" value={customerName} onChange={e => setCustomerName(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" type="tel" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} required />
          </div>
          <button className="login-btn" type="submit">View Menu →</button>
        </form>
      </div>
    );
  }

  return (
    <div className="customer-page">
      {/* Order Success Animation */}
      {orderPlaced && (
        <div className="order-success-overlay">
          <div className="success-icon">✓</div>
          <div className="success-title">Order Sent to Kitchen</div>
          <p className="success-sub">Your chef is on it. Sit back and relax — we'll update you in real time.</p>
        </div>
      )}

      {/* Header */}
      <header className="customer-header">
        <div className="header-top">
          <div className="brand">
            <span className="brand-name">SmartDine</span>
            <span className="table-badge">Table {tid}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {myOrders.length > 0 && (
              <button className="orders-btn" onClick={() => setActiveTab(activeTab === 'orders' ? 'menu' : 'orders')}>
                <span>📋</span>
                <span>{activeTab === 'orders' ? 'Menu' : 'My Orders'}</span>
                {myOrders.filter(o => o.paymentStatus === 'UNPAID' && o.status !== 'CANCELLED').length > 0 && (
                  <span className="cart-count">{myOrders.filter(o => o.paymentStatus === 'UNPAID' && o.status !== 'CANCELLED').length}</span>
                )}
              </button>
            )}
            {activeTab === 'menu' && (
              <button className="cart-btn" onClick={() => setCartOpen(true)}>
                <span>🛒</span>
                {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
              </button>
            )}
          </div>
        </div>
        {activeTab === 'menu' && (
          <div className="categories-scroll hide-scrollbar">
            {categories.map(cat => (
              <button key={cat} className={`cat-pill${activeCategory === cat ? ' active' : ''}`} onClick={() => setActiveCategory(cat)}>
                {cat}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ─── MY ORDERS TAB ─── */}
      {activeTab === 'orders' && (
        <div className="my-orders-section">
          <div className="my-orders-header">
            <div>
              <div className="my-orders-title">Your Orders</div>
              <div className="my-orders-sub">Hi {customerName} · Table {tid}</div>
            </div>
            {unpaidTotal > 0 && (
              <div className="bill-summary-chip">
                <span className="bill-label">Total Due</span>
                <span className="bill-amount">₹{unpaidTotal.toFixed(0)}</span>
              </div>
            )}
          </div>

          {myOrders.length === 0 ? (
            <div className="my-orders-empty">
              <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.3 }}>🍽️</div>
              <div>You haven't placed any orders yet.</div>
              <button className="back-to-menu-btn" onClick={() => setActiveTab('menu')}>Browse Menu</button>
            </div>
          ) : (
            <div className="my-orders-list">
              {myOrders.map((order, idx) => {
                const step = getStatusStep(order.status);
                return (
                  <div key={order.id} className={`my-order-card${order.status === 'READY' ? ' ready-glow' : ''}`} style={{ animationDelay: `${idx * 60}ms` }}>
                    <div className="tracker-status-bar">
                      {[0, 1, 2, 3].map(s => (
                        <div key={s} className={`tracker-step${s < step ? ' done' : s === step ? ' current' : ''}`} />
                      ))}
                    </div>

                    <div className="my-order-top">
                      <div>
                        <span className={`tracker-label ${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span>
                        <span className="my-order-time">{timeFmt(order.createdAt)}</span>
                      </div>
                      <span className={`my-order-payment ${order.paymentStatus.toLowerCase()}`}>
                        {order.paymentStatus === 'PAID' ? '✓ Paid' : 
                         order.paymentStatus === 'PENDING_COUNTER' ? '⌛ Awaiting counter' : 'Unpaid'}
                      </span>
                    </div>

                    <div className="my-order-items">
                      {order.items.map((item, i) => (
                        <div key={i} className="my-order-item-row">
                          <span>{item.name} <span className="my-item-qty">×{item.quantity}</span></span>
                          <span className="my-item-price">₹{(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="my-order-footer">
                      <div className="my-order-total">
                        <span>Order Total</span>
                        <span className="my-order-total-value">₹{order.total.toFixed(0)}</span>
                      </div>
                      {order.paymentStatus === 'UNPAID' && order.status !== 'CANCELLED' && (
                        <div className="pay-actions">
                          <button
                            className="pay-now-btn"
                            onClick={() => handlePayOrder(order.id, order.total)}
                            disabled={paymentProcessing === order.id}
                          >
                            {paymentProcessing === order.id ? 'Opening UPI...' : `Pay ₹${order.total.toFixed(0)}`}
                          </button>
                          {order.paymentStatus === 'PENDING_COUNTER' ? (
                            <div className="pending-counter-msg">Please pay at the counter</div>
                          ) : (
                            <button className="pay-counter-btn" onClick={() => handlePayAtCounter(order.id)}>
                              Pay at Counter
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {unpaidTotal > 0 && (
                <div className="grand-total-card">
                  <div className="grand-total-row">
                    <span>Total Outstanding</span>
                    <span className="grand-total-value">₹{unpaidTotal.toFixed(0)}</span>
                  </div>
                  <button className="pay-all-btn" onClick={handlePayAll}>
                    Pay All via UPI — ₹{unpaidTotal.toFixed(0)}
                  </button>
                  <button className="pay-counter-all-btn" onClick={() => myOrders.filter(o => o.paymentStatus === 'UNPAID' && o.status !== 'CANCELLED').forEach(o => requestCounterPayment(o.id))}>
                    Wait for Counter Confirmation
                  </button>
                  <p className="pay-note">UPI will open Google Pay, PhonePe, or Paytm on your phone.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── MENU TAB ─── */}
      {activeTab === 'menu' && (
        <>
          {myOrders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length > 0 && (
            <div className="mini-tracker" onClick={() => setActiveTab('orders')}>
              <div className="mini-tracker-left">
                <span className="mini-tracker-dot" />
                <span>{myOrders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length} active order{myOrders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length > 1 ? 's' : ''}</span>
              </div>
              <span className="mini-tracker-arrow">View →</span>
            </div>
          )}

          <div className="menu-section-label">{activeCategory === 'All' ? 'Our Menu' : activeCategory}</div>
          <div className="menu-grid">
            {filtered.map((item, idx) => {
              const qty = getCartQty(item.id);
              return (
                <div key={item.id} className={`menu-card${!item.available ? ' unavailable' : ''}`} style={{ animationDelay: `${idx * 60}ms` }}>
                  <div className="card-image-wrap">
                    <img src={item.image} alt={item.name} loading="lazy" />
                  </div>
                  <div className="card-body">
                    <div>
                      <div className="card-name">{item.name}</div>
                      <div className="card-desc">{item.description}</div>
                    </div>
                    <div className="card-footer">
                      <span className="card-price">₹{item.price.toFixed(0)}</span>
                      {!item.available ? (
                        <span className="unavailable-tag">Sold Out</span>
                      ) : qty === 0 ? (
                        <button className="add-btn" onClick={() => addToCart(item.id, item.name, item.price)}>+</button>
                      ) : (
                        <div className="qty-control">
                          <button className="qty-btn" onClick={() => removeFromCart(item.id)}>−</button>
                          <span className="qty-value">{qty}</span>
                          <button className="qty-btn" onClick={() => addToCart(item.id, item.name, item.price)}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <>
          <div className="cart-overlay" onClick={() => setCartOpen(false)} />
          <div className="cart-drawer">
            <div className="drawer-handle" />
            <div className="drawer-title">Your Order</div>
            {cart.length === 0 ? (
              <p style={{ color: 'var(--color-ink-tertiary)', textAlign: 'center', padding: '32px 0' }}>Your cart is empty. Add items from the menu.</p>
            ) : (
              <>
                {cart.map(item => (
                  <div key={item.menuItemId} className="cart-item-row">
                    <div>
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-meta">₹{item.price.toFixed(0)} × {item.quantity}</div>
                    </div>
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => removeFromCart(item.menuItemId)}>−</button>
                      <span className="qty-value">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => addToCart(item.menuItemId, item.name, item.price)}>+</button>
                    </div>
                  </div>
                ))}
                <div className="cart-total-row">
                  <span className="cart-total-label">Total</span>
                  <span className="cart-total-value">₹{cartTotal.toFixed(0)}</span>
                </div>
                <button className="place-order-btn" onClick={handlePlaceOrder}>
                  Send to Kitchen — ₹{cartTotal.toFixed(0)}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
