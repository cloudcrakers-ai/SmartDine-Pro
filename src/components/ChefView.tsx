import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/Store';
import './ChefView.css';

export default function ChefView() {
  const { orders, menu, updateOrderStatus, raiseMenuRequest } = useStore();
  const [activeTab, setActiveTab] = useState<'queue' | 'stock'>('queue');

  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'PENDING'), [orders]);
  const preparingOrders = useMemo(() => orders.filter(o => o.status === 'PREPARING'), [orders]);
  const allActive = useMemo(() => [...pendingOrders, ...preparingOrders], [pendingOrders, preparingOrders]);

  const timeSince = (ts: number) => {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  const handleStockToggle = (itemId: string, currentlyAvailable: boolean) => {
    raiseMenuRequest(itemId, !currentlyAvailable);
  };

  return (
    <div className="chef-page">
      {/* Header */}
      <header className="chef-header">
        <div className="chef-brand">
          <span className="chef-brand-dot" />
          Kitchen Display
        </div>
        <Link to="/billing" className="chef-back-link">← Console</Link>
        <div className="chef-stats">
          <div className="chef-stat">
            <div className="chef-stat-value">{pendingOrders.length}</div>
            <div className="chef-stat-label">Incoming</div>
          </div>
          <div className="chef-stat">
            <div className="chef-stat-value">{preparingOrders.length}</div>
            <div className="chef-stat-label">In Progress</div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="chef-tabs">
        <button className={`chef-tab${activeTab === 'queue' ? ' active' : ''}`} onClick={() => setActiveTab('queue')}>
          Order Queue
          {allActive.length > 0 && <span className="tab-count">{allActive.length}</span>}
        </button>
        <button className={`chef-tab${activeTab === 'stock' ? ' active' : ''}`} onClick={() => setActiveTab('stock')}>
          Stock Control
        </button>
      </div>

      {/* Queue View */}
      {activeTab === 'queue' && (
        <div className="chef-queue">
          {allActive.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🍳</div>
              <div className="empty-state-text">No active orders. Kitchen is clear.</div>
            </div>
          ) : (
            allActive.map((order, idx) => (
              <div key={order.id} className={`chef-order-card${order.status === 'PENDING' ? ' new-order' : ''}`} style={{ animationDelay: `${idx * 80}ms` }}>
                <div className="order-card-header">
                  <div>
                    <div className="order-id-badge">{order.id}</div>
                    <div className="order-time">{timeSince(order.createdAt)}</div>
                  </div>
                  <div className="order-table-badge">Table {order.tableId}</div>
                </div>
                <div className="order-items-list">
                  {order.items.map((item, i) => (
                    <div key={i} className="order-item-row">
                      <span className="item-name">{item.name}</span>
                      <span className="item-qty">× {item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="order-card-actions">
                  {order.status === 'PENDING' && (
                    <>
                      <button className="chef-action-btn primary" onClick={() => updateOrderStatus(order.id, 'PREPARING')}>
                        Start Preparing
                      </button>
                      <button className="chef-action-btn ghost" onClick={() => updateOrderStatus(order.id, 'CANCELLED')}>
                        Reject
                      </button>
                    </>
                  )}
                  {order.status === 'PREPARING' && (
                    <button className="chef-action-btn success" onClick={() => updateOrderStatus(order.id, 'READY')}>
                      ✓ Mark Ready
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Stock Control */}
      {activeTab === 'stock' && (
        <div className="stock-grid">
          {menu.map(item => (
            <div key={item.id} className={`stock-item${item.requestPending ? ' stock-pending' : ''}`}>
              <div>
                <div className="stock-name">{item.name}</div>
                <div className="stock-category">{item.category} · ₹{item.price.toFixed(0)}</div>
              </div>
              <button className={`stock-toggle${item.available ? ' on' : ''}`} onClick={() => handleStockToggle(item.id, item.available)} title={item.available ? 'Mark as unavailable' : 'Request to re-enable'} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
