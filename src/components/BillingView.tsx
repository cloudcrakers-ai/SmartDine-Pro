import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/Store';
import './BillingView.css';

type Tab = 'orders' | 'requests' | 'qrcodes' | 'pricing';

const TABLE_COUNT = 12;

export default function BillingView() {
  const { orders, menu, menuRequests, markPaid, resolveMenuRequest, clearAllOrders, updateMenuItemPrice } = useStore();
  const [tab, setTab] = useState<Tab>('orders');
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  const baseUrl = window.location.origin;

  const todayOrders = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return orders.filter(o => o.createdAt >= startOfDay.getTime());
  }, [orders]);

  const totalRevenue = useMemo(() =>
    todayOrders.filter(o => o.paymentStatus === 'PAID').reduce((s, o) => s + o.total, 0),
  [todayOrders]);

  const unpaidCount = useMemo(() =>
    todayOrders.filter(o => o.paymentStatus === 'UNPAID' && o.status !== 'CANCELLED').length,
  [todayOrders]);

  const activeCount = useMemo(() =>
    todayOrders.filter(o => ['PENDING', 'PREPARING', 'READY'].includes(o.status)).length,
  [todayOrders]);

  const getMenuItemName = (id: string) => menu.find(m => m.id === id)?.name ?? id;

  const timeFmt = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const exportToCSV = () => {
    const headers = ['Order ID', 'Time', 'Table', 'Customer Name', 'Phone', 'Items', 'Total Revenue (INR)', 'Payment Status'];
    const rows = todayOrders.map(order => [
      order.id,
      new Date(order.createdAt).toLocaleString('en-IN'),
      order.tableId,
      order.customerName,
      order.customerPhone || 'N/A',
      order.items.map(i => `${i.name} (x${i.quantity})`).join(', ').replace(/"/g, '""'),
      order.total.toString(),
      order.paymentStatus
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => `"${r.join('","')}"`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SmartDine_Daily_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQR = (tableNum: number) => {
    const printWindow = window.open('', '_blank', 'width=400,height=500');
    if (!printWindow) return;
    const url = `${baseUrl}/table/${tableNum}`;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Table ${tableNum} QR</title>
      <style>
        body { font-family: 'Inter', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
        h1 { font-size: 3rem; font-weight: 800; margin-bottom: 8px; }
        p { color: #64748b; margin-bottom: 24px; }
        .qr-container { padding: 24px; border: 2px solid #e2e8f0; border-radius: 16px; }
        .url { font-size: 0.7rem; color: #94a3b8; margin-top: 16px; word-break: break-all; }
        @media print { body { padding: 0; } }
      </style></head><body>
        <h1>Table ${tableNum}</h1>
        <p>Scan to view our menu & order</p>
        <div class="qr-container" id="qr-target"></div>
        <div class="url">${url}</div>
        <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    // We can't render React QR in print window easily, so use an SVG approach
    const svg = document.querySelector(`#qr-table-${tableNum} svg`);
    if (svg) {
      const svgClone = svg.cloneNode(true) as SVGElement;
      printWindow.document.getElementById('qr-target')?.appendChild(svgClone);
    }
    printWindow.document.close();
  };

  return (
    <div className="billing-page">
      {/* Header */}
      <header className="billing-header">
        <div className="billing-header-top">
          <div>
            <div className="billing-title">Billing Console</div>
            <div className="billing-subtitle">SmartDine Management</div>
          </div>
          <div className="billing-nav-links">
            <Link to="/kitchen" className="billing-nav-link">Kitchen →</Link>
            <a href="/waiter.html" target="_blank" rel="noopener noreferrer" className="billing-nav-link">Service ↗</a>
          </div>
        </div>
        <div className="billing-summary-row">
          <div className="billing-stat-card">
            <div className="billing-stat-value">{todayOrders.length}</div>
            <div className="billing-stat-label">Total Orders</div>
          </div>
          <div className="billing-stat-card">
            <div className="billing-stat-value revenue">₹{totalRevenue.toFixed(0)}</div>
            <div className="billing-stat-label">Revenue</div>
          </div>
          <div className="billing-stat-card">
            <div className="billing-stat-value" style={{ color: unpaidCount > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{unpaidCount}</div>
            <div className="billing-stat-label">Unpaid</div>
          </div>
          <div className="billing-stat-card">
            <div className="billing-stat-value" style={{ color: 'var(--color-primary)' }}>{activeCount}</div>
            <div className="billing-stat-label">Active</div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="billing-tabs">
        <button className={`billing-tab${tab === 'orders' ? ' active' : ''}`} onClick={() => setTab('orders')}>
          Orders
        </button>
        <button className={`billing-tab${tab === 'requests' ? ' active' : ''}`} onClick={() => setTab('requests')}>
          Menu Requests
          {menuRequests.length > 0 && <span className="badge">{menuRequests.length}</span>}
        </button>
        <button className={`billing-tab${tab === 'qrcodes' ? ' active' : ''}`} onClick={() => setTab('qrcodes')}>
          Table QR Codes
        </button>
        <button className={`billing-tab${tab === 'pricing' ? ' active' : ''}`} onClick={() => setTab('pricing')}>
          Menu Pricing
        </button>
      </div>

      <div className="billing-content">
        {/* ─── Orders Tab ─── */}
        {tab === 'orders' && (
          todayOrders.length === 0 ? (
            <div className="billing-empty">
              <div className="billing-empty-icon">📋</div>
              <div>No orders today yet.</div>
            </div>
          ) : (
            <>
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Table</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Time</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {todayOrders.map((order, idx) => (
                    <tr key={order.id} style={{ animationDelay: `${idx * 40}ms` }}>
                      <td><span className="order-id-cell">{order.id}</span></td>
                      <td style={{ fontWeight: 700 }}>{order.tableId}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{order.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{order.customerPhone}</div>
                      </td>
                      <td style={{ maxWidth: 200, fontSize: '0.8rem', color: 'var(--color-ink-secondary)' }}>
                        {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                      </td>
                      <td style={{ fontWeight: 700 }}>₹{order.total.toFixed(0)}</td>
                      <td><span className={`status-badge ${order.status.toLowerCase()}`}>{order.status}</span></td>
                      <td>
                        <span className={`payment-badge ${order.paymentStatus.toLowerCase()}`}>
                          {order.paymentStatus === 'PENDING_COUNTER' ? 'Pending Counter' : order.paymentStatus}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-ink-tertiary)' }}>{timeFmt(order.createdAt)}</td>
                      <td>
                        <button
                          className={`billing-pay-btn${order.paymentStatus === 'PENDING_COUNTER' ? ' pulse-confirm' : ''}`}
                          disabled={order.paymentStatus === 'PAID' || order.status === 'CANCELLED'}
                          onClick={() => markPaid(order.id)}
                        >
                          {order.paymentStatus === 'PAID' ? '✓ Paid' : 
                           order.paymentStatus === 'PENDING_COUNTER' ? 'Confirm Payment' : 'Mark Paid'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '0 20px' }}>
                <button 
                  onClick={exportToCSV}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#f0fdf4',
                    color: '#16a34a',
                    border: '1px solid #86efac',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  📊 Export to Excel
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('Are you sure you want to permanently delete ALL test orders? This cannot be undone.')) {
                      clearAllOrders();
                    }
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#fee2e2',
                    color: '#ef4444',
                    border: '1px solid #fca5a5',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  🗑️ Clear All Orders
                </button>
              </div>
            </>
          )
        )}

        {/* ─── Menu Requests Tab ─── */}
        {tab === 'requests' && (
          menuRequests.length === 0 ? (
            <div className="billing-empty">
              <div className="billing-empty-icon">✅</div>
              <div>No pending menu change requests from kitchen.</div>
            </div>
          ) : (
            <div className="requests-list">
              {menuRequests.map(req => (
                <div key={req.id} className="request-card">
                  <div className="request-info">
                    <div className="request-item-name">{getMenuItemName(req.menuItemId)}</div>
                    <div className="request-detail">
                      Chef requests to mark as <strong>{req.requestedAvailability ? 'Available' : 'Unavailable'}</strong>
                    </div>
                  </div>
                  <div className="request-actions">
                    <button className="req-approve-btn" onClick={() => resolveMenuRequest(req.id, true)}>Approve</button>
                    <button className="req-reject-btn" onClick={() => resolveMenuRequest(req.id, false)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ─── QR Codes Tab ─── */}
        {tab === 'qrcodes' && (
          <div className="qr-section">
            <div className="qr-section-header">
              <h3 className="qr-section-title">Table QR Codes</h3>
              <p className="qr-section-desc">Each QR code directs customers to the menu for that specific table. Click to enlarge, then print.</p>
            </div>
            <div className="qr-grid">
              {Array.from({ length: TABLE_COUNT }, (_, i) => i + 1).map(num => (
                <div
                  key={num}
                  className={`qr-card${selectedTable === num ? ' qr-card-selected' : ''}`}
                  onClick={() => setSelectedTable(selectedTable === num ? null : num)}
                  id={`qr-table-${num}`}
                >
                  <div className="qr-table-num">Table {num}</div>
                  <div className="qr-code-wrap">
                    <QRCodeSVG
                      value={`${baseUrl}/table/${num}`}
                      size={selectedTable === num ? 200 : 120}
                      level="H"
                      bgColor="transparent"
                      fgColor="#0f172a"
                      includeMargin={false}
                    />
                  </div>
                  <div className="qr-url">{baseUrl}/table/{num}</div>
                  {selectedTable === num && (
                    <div className="qr-actions">
                      <button className="qr-print-btn" onClick={(e) => { e.stopPropagation(); printQR(num); }}>
                        🖨️ Print QR
                      </button>
                      <a
                        className="qr-open-btn"
                        href={`/table/${num}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ↗ Open Menu
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Menu Pricing Tab ─── */}
        {tab === 'pricing' && (
          <div className="pricing-section" style={{ padding: '0 20px 20px' }}>
            <div className="qr-section-header" style={{ marginBottom: '24px' }}>
              <h3 className="qr-section-title">Edit Menu Prices</h3>
              <p className="qr-section-desc">Change the prices below. They are saved instantly to the cloud and update on customer phones automatically.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
              {menu.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ flex: 1, paddingRight: '16px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px', fontSize: '1.05rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{item.category}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 700, color: '#64748b' }}>₹</span>
                    <input 
                      type="number" 
                      defaultValue={item.price}
                      onBlur={(e) => {
                        const newPrice = parseFloat(e.target.value);
                        if (!isNaN(newPrice) && newPrice !== item.price) {
                          updateMenuItemPrice(item.id, newPrice);
                        }
                      }}
                      style={{
                        padding: '4px',
                        border: 'none',
                        background: 'transparent',
                        width: '70px',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
