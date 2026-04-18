import React, { useState, useMemo } from 'react';
import { useStore } from '../context/Store';
import './WaiterView.css';

type Filter = 'all' | 'ready' | 'active';

export default function WaiterView() {
  const { orders, updateOrderStatus } = useStore();
  const [filter, setFilter] = useState<Filter>('all');

  const activeOrders = useMemo(() => {
    const relevant = orders.filter(o => ['PENDING', 'PREPARING', 'READY'].includes(o.status));
    if (filter === 'ready') return relevant.filter(o => o.status === 'READY');
    if (filter === 'active') return relevant.filter(o => o.status !== 'READY');
    return relevant;
  }, [orders, filter]);

  const readyCount = useMemo(() => orders.filter(o => o.status === 'READY').length, [orders]);

  const timeSince = (ts: number) => {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div className="waiter-page">
      <header className="waiter-header">
        <div>
          <div className="waiter-title">Service Panel</div>
          <div className="waiter-subtitle">{activeOrders.length} active order{activeOrders.length !== 1 ? 's' : ''}</div>
        </div>
        {readyCount > 0 && (
          <div className="ready-counter">
            <span className="pulse-dot" />
            {readyCount} Ready to Serve
          </div>
        )}
        <a href="/staff.html#/billing" className="waiter-back-link">← Console</a>
      </header>

      <div className="filter-row">
        {(['all', 'ready', 'active'] as Filter[]).map(f => (
          <button key={f} className={`filter-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All Orders' : f === 'ready' ? '🟢 Ready' : '🔵 In Progress'}
          </button>
        ))}
      </div>

      {activeOrders.length === 0 ? (
        <div className="waiter-empty">
          <div className="waiter-empty-icon">☕</div>
          <div>{filter === 'ready' ? 'No orders ready yet.' : 'All clear — no active orders.'}</div>
        </div>
      ) : (
        <div className="waiter-grid">
          {activeOrders.map((order, idx) => (
            <div key={order.id} className={`waiter-card${order.status === 'READY' ? ' ready-card' : ''}`} style={{ animationDelay: `${idx * 70}ms` }}>
              <div className="waiter-card-top">
                <div>
                  <div className="waiter-table-label">Table</div>
                  <div className="waiter-table-num">{order.tableId}</div>
                </div>
                <span className={`waiter-status-chip ${order.status.toLowerCase()}`}>
                  {order.status === 'PENDING' ? 'Queued' : order.status === 'PREPARING' ? 'Cooking' : 'Ready'}
                </span>
              </div>
              <div className="waiter-card-body">
                <div className="waiter-customer">{order.customerName} <span style={{ fontSize: '0.85em', color: '#94a3b8', fontWeight: 400 }}>({order.customerPhone})</span> · {timeSince(order.createdAt)}</div>
                <div className="waiter-items-summary">
                  {order.items.map(i => `${i.name} ×${i.quantity}`).join(' · ')}
                </div>
              </div>
              {order.status === 'READY' && (
                <div className="waiter-card-footer">
                  <button className="waiter-deliver-btn" onClick={() => updateOrderStatus(order.id, 'DELIVERED')}>
                    ✓ Confirm Delivered
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
