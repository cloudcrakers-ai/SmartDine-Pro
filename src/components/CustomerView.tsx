import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Clock, ListOrdered, Navigation } from 'lucide-react';
import { useStore } from '../context/Store';
import type { OrderItem } from '../types';
import './CustomerView.css';

interface CartEntry {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

function loadSession(tableId: string) {
  try {
    const raw = localStorage.getItem(`sd_session_t${tableId}`);
    if (raw) return JSON.parse(raw) as { name: string; phone: string; loggedIn: boolean };
  } catch {
    // Ignore local storage parse errors.
  }
  return null;
}

function saveSession(tableId: string, name: string, phone: string) {
  localStorage.setItem(`sd_session_t${tableId}`, JSON.stringify({ name, phone, loggedIn: true }));
}

function openUPIPayment(amount: number, orderId: string, merchantName: string) {
  const upiParams = new URLSearchParams({
    pa: 'smartdine@upi',
    pn: merchantName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: `SmartDine Order ${orderId}`,
    tr: orderId,
  });
  window.location.href = `upi://pay?${upiParams.toString()}`;
}

export default function CustomerView() {
  const { tableId } = useParams<{ tableId: string }>();
  const tid = tableId ?? '1';

  const { menu, orders, addOrder, markPaid, requestCounterPayment, raiseComplaint } = useStore();

  const savedSession = useMemo(() => loadSession(tid), [tid]);
  // Force identity confirmation on each scan/session to avoid table-level confusion.
  const [loggedIn, setLoggedIn] = useState(false);
  const [customerName, setCustomerName] = useState(savedSession?.name ?? '');
  const [phone, setPhone] = useState(savedSession?.phone ?? '');
  const [cart, setCart] = useState<CartEntry[]>(() => {
    try {
      const raw = localStorage.getItem(`sd_cart_t${tid}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'orders'>('menu');
  const [paymentProcessing, setPaymentProcessing] = useState<string | null>(null);
  const [isMenuHubOpen, setIsMenuHubOpen] = useState(false);
  const [viewingBillId, setViewingBillId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(`sd_cart_t${tid}`, JSON.stringify(cart));
  }, [cart, tid]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(menu.map((item) => item.category)))], [menu]);
  const filteredMenu = useMemo(
    () => (activeCategory === 'All' ? menu : menu.filter((item) => item.category === activeCategory)),
    [menu, activeCategory]
  );
  const myOrders = useMemo(
    () => orders.filter((order) => order.tableId === tid && order.customerName === customerName),
    [orders, tid, customerName]
  );
  const cartTotal = useMemo(() => cart.reduce((sum, entry) => sum + entry.price * entry.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, entry) => sum + entry.quantity, 0), [cart]);
  const viewingOrder = useMemo(() => orders.find((order) => order.id === viewingBillId) ?? null, [orders, viewingBillId]);

  const addToCart = (id: string, name: string, price: number) => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.menuItemId === id);
      if (existing) {
        return prev.map((entry) => (entry.menuItemId === id ? { ...entry, quantity: entry.quantity + 1 } : entry));
      }
      return [...prev, { menuItemId: id, name, price, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.menuItemId === id);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter((entry) => entry.menuItemId !== id);
      return prev.map((entry) => (entry.menuItemId === id ? { ...entry, quantity: entry.quantity - 1 } : entry));
    });
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    const items: OrderItem[] = cart.map((entry) => ({
      menuItemId: entry.menuItemId,
      name: entry.name,
      price: entry.price,
      quantity: entry.quantity,
    }));
    await addOrder(customerName, phone, tid, items);
    setCart([]);
    setCartOpen(false);
    setOrderPlaced(true);
    window.setTimeout(() => setOrderPlaced(false), 3500);
  };

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (!customerName.trim() || !phone.trim()) return;
    saveSession(tid, customerName.trim(), phone.trim());
    setLoggedIn(true);
  };

  const handlePayAtCounter = async (orderId: string) => {
    if (paymentProcessing) return;
    setPaymentProcessing(orderId);
    try {
      await requestCounterPayment(orderId);
      setViewingBillId(orderId);
    } finally {
      setPaymentProcessing(null);
    }
  };

  const handlePayOnline = async (orderId: string, total: number) => {
    if (paymentProcessing) return;
    setPaymentProcessing(orderId);
    try {
      openUPIPayment(total, orderId, 'SmartDine');
      const confirmed = window.confirm('Did you complete the UPI payment? Press OK to mark this order as paid.');
      if (confirmed) {
        await markPaid(orderId);
      }
    } finally {
      setPaymentProcessing(null);
    }
  };

  const isOrderDelayed = (createdAt: number) => Date.now() - createdAt > 30 * 60_000;

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'Kitchen Received',
      PREPARING: 'Chef Cooking',
      READY: 'Ready To Serve',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    };
    return map[status] || status;
  };

  if (!loggedIn) {
    return (
      <div className="login-overlay">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="brand-name">SmartDine</div>
          <p className="login-subtitle">Enter your name and mobile to place orders for this table with accurate tracking.</p>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="Your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              className="form-input"
              type="tel"
              placeholder="+91"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <button className="login-btn" type="submit">
            Continue To Menu <ArrowRight size={18} />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="customer-page">
      {orderPlaced && (
        <div className="order-success-overlay">
          <div className="success-icon">OK</div>
          <div className="success-title">Order Placed</div>
          <p className="success-sub">Order sent to kitchen. Track progress live in Your Orders.</p>
        </div>
      )}

      <header className="customer-header">
        <div className="header-top">
          <div className="brand">
            <span className="brand-name">SmartDine</span>
            <span className="table-badge">T{tid}</span>
          </div>
          <div className="header-actions">
            {activeTab === 'menu' && (
              <button className="menu-hub-trigger" type="button" onClick={() => setIsMenuHubOpen(true)}>
                Menu
              </button>
            )}
            <button
              className={`nav-icon-btn ${activeTab === 'orders' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveTab(activeTab === 'orders' ? 'menu' : 'orders')}
              aria-label="Toggle orders view"
            >
              <ListOrdered size={22} />
              {myOrders.length > 0 && <span className="action-badge">{myOrders.length}</span>}
            </button>
          </div>
        </div>
        <p className="customer-note">Table {tid}: place your order directly and avoid service delays.</p>
      </header>

      {activeTab === 'orders' && (
        <div className="my-orders-section">
          <div className="section-header-pro">
            <h2>Your Orders</h2>
          </div>
          <div className="orders-container-pro">
            {myOrders.length === 0 ? (
              <div className="empty-orders-pro">
                <Navigation size={44} />
                <p>No orders yet. Open the menu and place your first order in seconds.</p>
                <button type="button" onClick={() => setActiveTab('menu')}>
                  Open Menu
                </button>
              </div>
            ) : (
              myOrders.map((order) => {
                const delayed = isOrderDelayed(order.createdAt) && !['DELIVERED', 'CANCELLED'].includes(order.status);
                return (
                  <div key={order.id} className={`order-card-pro ${order.status.toLowerCase()}`}>
                    <div className="order-card-header">
                      <div className="order-time-label">
                        <Clock size={12} />
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className={`status-pill ${order.status.toLowerCase()}`}>{statusLabel(order.status)}</div>
                    </div>

                    <div className="order-items-minimal">
                      {order.items.map((item, index) => (
                        <div key={index} className="it-row">
                          <span>
                            {item.quantity}x {item.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="order-footer-pro">
                      <div className="total-text">Total: Rs {order.total}</div>
                    </div>

                    {delayed && !order.complaint && (
                      <div className="delay-action">
                        <button
                          className="complaint-btn"
                          type="button"
                          onClick={() => raiseComplaint(order.id, 'Order delayed more than 30 minutes')}
                        >
                          <AlertCircle size={14} />
                          Raise Complaint
                        </button>
                      </div>
                    )}

                    {order.status === 'DELIVERED' && order.paymentStatus === 'UNPAID' && (
                      <div className="payment-pro-block">
                        <button
                          className="pay-pro-btn"
                          type="button"
                          disabled={paymentProcessing === order.id}
                          onClick={() => handlePayOnline(order.id, order.total)}
                        >
                          {paymentProcessing === order.id ? 'Processing...' : 'Pay Online (UPI)'}
                        </button>
                        <button
                          className="view-bill-btn"
                          type="button"
                          disabled={paymentProcessing === order.id}
                          onClick={() => handlePayAtCounter(order.id)}
                        >
                          {paymentProcessing === order.id ? 'Please wait...' : 'Pay At Counter'}
                        </button>
                      </div>
                    )}

                    {order.status === 'DELIVERED' && order.paymentStatus === 'PENDING_COUNTER' && (
                      <div className="payment-pro-block">
                        <button className="view-bill-btn" type="button" onClick={() => setViewingBillId(order.id)}>
                          <Clock size={16} />
                          View Generated Bill
                        </button>
                      </div>
                    )}

                    {order.status === 'DELIVERED' && order.paymentStatus === 'PAID' && (
                      <div className="paid-state">Payment Completed</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {viewingBillId && (
        <div className="bill-modal-root">
          <div className="bill-modal-backdrop" onClick={() => setViewingBillId(null)} />
          <div className="bill-receipt-card">
            <div className="receipt-header">
              <div className="receipt-brand">SmartDine</div>
              <div className="receipt-table">Table {tid}</div>
              <div className="receipt-date">{new Date().toLocaleDateString()}</div>
            </div>
            <div className="receipt-divider" />
            <div className="receipt-items">
              {viewingOrder?.items.map((item, index) => (
                <div key={index} className="r-item">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span>Rs {item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="receipt-divider" />
            <div className="receipt-summary">
              <div className="r-row">
                <span>Subtotal</span>
                <span>Rs {viewingOrder?.total ?? 0}</span>
              </div>
              <div className="r-row">
                <span>Taxes And Fees</span>
                <span>Rs 0.00</span>
              </div>
              <div className="r-total">
                <span>Grand Total</span>
                <span>Rs {viewingOrder?.total ?? 0}</span>
              </div>
            </div>
            <div className="receipt-footer">
              <p className="wait-msg">Show this bill at counter to complete payment.</p>
              <div className="pay-counter-tag">PAY AT COUNTER</div>
              <button className="close-receipt" type="button" onClick={() => setViewingBillId(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'menu' && (
        <div className="menu-container-pro">
          <div className="menu-grid-pro">
            {filteredMenu.map((item) => {
              const qty = cart.find((entry) => entry.menuItemId === item.id)?.quantity || 0;
              return (
                <div key={item.id} className={`menu-item-card-pro ${!item.available ? 'sold-out' : ''}`}>
                  <div className="item-image-pro">
                    <img src={item.image} alt={item.name} />
                  </div>
                  <div className="item-info-pro">
                    <div className="item-name-pro">{item.name}</div>
                    <div className="item-desc-pro">{item.description}</div>
                    <div className="item-footer-pro">
                      <span className="item-price-pro">Rs {item.price}</span>
                      {item.available ? (
                        qty === 0 ? (
                          <button className="item-add-btn-pro" type="button" onClick={() => addToCart(item.id, item.name, item.price)}>
                            Add
                          </button>
                        ) : (
                          <div className="item-qty-pro">
                            <button type="button" onClick={() => removeFromCart(item.id)}>
                              -
                            </button>
                            <span>{qty}</span>
                            <button type="button" onClick={() => addToCart(item.id, item.name, item.price)}>
                              +
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="sold-out-tag">Sold Out</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isMenuHubOpen && (
        <div className="menu-hub-root">
          <div className="menu-hub-backdrop" onClick={() => setIsMenuHubOpen(false)} />
          <div className="menu-hub-content">
            <div className="menu-hub-header">
              <h3>Select Category</h3>
              <button className="close-hub" type="button" onClick={() => setIsMenuHubOpen(false)}>
                x
              </button>
            </div>
            <div className="menu-hub-list">
              {categories.map((category) => {
                const count = category === 'All' ? menu.length : menu.filter((item) => item.category === category).length;
                return (
                  <button
                    key={category}
                    className={`hub-item ${activeCategory === category ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      setActiveCategory(category);
                      setIsMenuHubOpen(false);
                    }}
                  >
                    <span className="hub-cat-name">{category}</span>
                    <span className="hub-cat-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {cartCount > 0 && activeTab === 'menu' && !cartOpen && (
        <div className="sticky-cart-container">
          <button className="sticky-cart-btn" type="button" onClick={() => setCartOpen(true)}>
            <div className="btn-left">
              <span className="cart-count-pill">{cartCount}</span>
              <span className="btn-label">View Cart</span>
            </div>
            <span className="btn-total">Rs {cartTotal}</span>
          </button>
        </div>
      )}

      {cartOpen && (
        <div className="cart-drawer-root">
          <div className="cart-backdrop" onClick={() => setCartOpen(false)} />
          <div className="cart-panel-pro">
            <div className="drawer-knob" />
            <div className="cart-panel-header">
              <h3>My Order</h3>
              <button className="close-drawer" type="button" onClick={() => setCartOpen(false)}>
                x
              </button>
            </div>
            {cart.length === 0 ? (
              <div className="cart-empty-pro">Your cart is empty</div>
            ) : (
              <>
                <div className="cart-items-pro">
                  {cart.map((item) => (
                    <div key={item.menuItemId} className="cart-item-pro">
                      <div className="c-item-info">
                        <div className="c-item-name">{item.name}</div>
                        <div className="c-item-price">Rs {item.price}</div>
                      </div>
                      <div className="item-qty-pro small">
                        <button type="button" onClick={() => removeFromCart(item.menuItemId)}>
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => addToCart(item.menuItemId, item.name, item.price)}>
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cart-footer-pro">
                  <div className="cart-total-pro">
                    <span>Grand Total</span>
                    <span>Rs {cartTotal}</span>
                  </div>
                  <button className="checkout-btn-pro" type="button" onClick={handlePlaceOrder}>
                    Place Order
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
