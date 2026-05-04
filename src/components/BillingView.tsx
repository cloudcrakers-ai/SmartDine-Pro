import React, { useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  AlertCircle,
  DollarSign,
  ListOrdered,
  Minus,
  Package,
  Plus,
  Printer,
  Share2,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { storage } from '../firebase';
import { useStore } from '../context/Store';
import './BillingView.css';

type Tab = 'orders' | 'staff' | 'complaints' | 'pricing' | 'qrcodes' | 'requests';

const TABLE_COUNT = 12;

type ParcelCartItem = { id: string; name: string; price: number; quantity: number };

export default function BillingView() {
  const {
    orders,
    menu,
    menuRequests,
    staff,
    markPaid,
    resolveMenuRequest,
    updateMenuItemPrice,
    addMenuItem,
    addStaff,
    removeStaff,
    resolveComplaint,
    addOrder,
    clearAllOrders,
    setMenuItemAvailability,
  } = useStore();

  const [tab, setTab] = useState<Tab>('orders');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showParcelModal, setShowParcelModal] = useState(false);
  const [activeQRTable, setActiveQRTable] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [clearingOrders, setClearingOrders] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [dashboardMode, setDashboardMode] = useState(false);

  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', category: '' });
  const [newStaff, setNewStaff] = useState({ name: '', phone: '', pin: '', role: 'WAITER' as 'WAITER' | 'CHEF' });
  const [parcelCustomer, setParcelCustomer] = useState({ name: '', phone: '' });
  const [parcelCart, setParcelCart] = useState<ParcelCartItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const baseUrl = window.location.origin;

  const categories = useMemo(() => {
    const unique = Array.from(new Set(menu.map((item) => item.category)));
    return unique.length > 0 ? unique : ['Mains', 'Starters', 'Desserts', 'Beverages'];
  }, [menu]);

  const todayOrders = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return orders.filter((order) => order.createdAt >= start.getTime());
  }, [orders]);

  const billableOrders = useMemo(
    () => todayOrders.filter((order) => order.status === 'DELIVERED' && order.paymentStatus !== 'PAID'),
    [todayOrders]
  );
  const completedOrdersToday = useMemo(
    () => todayOrders.filter((order) => order.paymentStatus === 'PAID'),
    [todayOrders]
  );
  const paidRevenue = useMemo(
    () => todayOrders.filter((order) => order.paymentStatus === 'PAID').reduce((sum, order) => sum + order.total, 0),
    [todayOrders]
  );
  const activeComplaints = useMemo(
    () => orders.filter((order) => order.complaint && !order.complaint.resolved),
    [orders]
  );

  const staffStats = useMemo(() => {
    return staff
      .map((member) => {
        const deliveries = orders.filter((order) => order.deliveredBy === member.id);
        const breakMinutes = (member.breakSessions || []).reduce((minutes, session) => {
          const end = session.end || Date.now();
          return minutes + Math.floor((end - session.start) / 60000);
        }, 0);
        return {
          ...member,
          deliveryCount: deliveries.length,
          deliveryValue: deliveries.reduce((sum, order) => sum + order.total, 0),
          breakMinutes,
        };
      })
      .sort((a, b) => b.deliveryCount - a.deliveryCount);
  }, [orders, staff]);

  const getMenuItemName = (menuItemId: string) => menu.find((item) => item.id === menuItemId)?.name ?? menuItemId;

  const addToParcelCart = (item: { id: string; name: string; price: number }) => {
    setParcelCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id);
      if (existing) {
        return prev.map((entry) => (entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromParcelCart = (id: string) => {
    setParcelCart((prev) =>
      prev
        .map((entry) => (entry.id === id ? { ...entry, quantity: entry.quantity - 1 } : entry))
        .filter((entry) => entry.quantity > 0)
    );
  };

  const handleAddItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newItem.name || !newItem.price || !newItem.category) return;
    setUploading(true);
    try {
      let image =
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
      const file = fileInputRef.current?.files?.[0];
      if (file) {
        const storageRef = ref(storage, `menu/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        image = await getDownloadURL(snapshot.ref);
      }
      await addMenuItem({
        name: newItem.name.trim(),
        description: newItem.description.trim(),
        price: Number(newItem.price),
        category: newItem.category.trim(),
        image,
        available: true,
      });
      setNewItem({ name: '', description: '', price: '', category: '' });
      setIsCustomCategory(false);
      setShowAddModal(false);
    } finally {
      setUploading(false);
    }
  };

  const handleAddStaff = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newStaff.name || !newStaff.phone || !newStaff.pin) return;
    addStaff(newStaff.name.trim(), newStaff.phone.trim(), newStaff.pin.trim(), newStaff.role);
    setNewStaff({ name: '', phone: '', pin: '', role: 'WAITER' });
  };

  const handleParcelOrder = async () => {
    if (!parcelCustomer.name.trim() || parcelCart.length === 0) return;
    await addOrder(
      parcelCustomer.name.trim(),
      parcelCustomer.phone.trim(),
      'PARCEL',
      parcelCart.map((item) => ({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      'TAKE_AWAY'
    );
    setShowParcelModal(false);
    setParcelCustomer({ name: '', phone: '' });
    setParcelCart([]);
  };

  const printBill = (orderId: string) => {
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>Bill ${order.id}</title></head>
        <body style="width:320px;font-family:Arial,sans-serif;padding:16px">
          <h2 style="text-align:center;margin:0 0 12px">SmartDine</h2>
          <div style="font-size:12px;margin-bottom:10px">Receipt: ${order.id.slice(-6).toUpperCase()}</div>
          <div style="font-size:12px;margin-bottom:10px">Table: ${order.tableId} | Customer: ${order.customerName}</div>
          <hr />
          ${order.items
            .map(
              (item) =>
                `<div style="display:flex;justify-content:space-between;font-size:13px;margin:4px 0"><span>${item.name} x ${item.quantity}</span><span>Rs ${
                  item.price * item.quantity
                }</span></div>`
            )
            .join('')}
          <hr />
          <div style="display:flex;justify-content:space-between;font-weight:700"><span>Total</span><span>Rs ${order.total}</span></div>
          <script>window.onload=function(){window.print();window.close();}</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const printQR = (tableNo: number) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const url = `${baseUrl}/table/${tableNo}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
    win.document.write(`
      <html>
        <head><title>Table ${tableNo} QR</title></head>
        <body style="display:grid;place-items:center;height:100vh;font-family:Arial,sans-serif">
          <div style="text-align:center">
            <h2>Table ${tableNo}</h2>
            <img src="${qrUrl}" alt="QR for table ${tableNo}" style="width:220px;height:220px;display:block;margin:12px auto" />
            <p>${url}</p>
          </div>
          <script>window.onload=function(){window.print();window.close();}</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const shareQR = (tableNo: number) => {
    const url = `${baseUrl}/table/${tableNo}`;
    if (navigator.share) {
      navigator.share({
        title: `Table ${tableNo} Ordering Link`,
        text: `Scan or open this link to order from table ${tableNo}`,
        url,
      });
      return;
    }
    window.alert(url);
  };

  const exportCompletedOrdersCsv = () => {
    if (completedOrdersToday.length === 0) {
      window.alert('No completed orders to export for today.');
      return;
    }
    const headers = [
      'Order ID',
      'Date Time',
      'Type',
      'Table',
      'Customer',
      'Phone',
      'Items',
      'Total',
      'Payment Status',
    ];
    const rows = completedOrdersToday.map((order) => {
      const items = order.items.map((item) => `${item.name} x${item.quantity}`).join('; ');
      return [
        order.id,
        new Date(order.createdAt).toLocaleString('en-IN'),
        order.type,
        order.tableId,
        order.customerName,
        order.customerPhone,
        items,
        order.total.toString(),
        order.paymentStatus,
      ];
    });
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smartdine-completed-orders-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearOrders = async () => {
    const confirmed = window.confirm(
      'This will permanently delete all order records from Firebase. Do you want to continue?'
    );
    if (!confirmed) return;
    setClearingOrders(true);
    try {
      await clearAllOrders();
      window.alert('Order data cleared successfully.');
    } catch {
      window.alert('Failed to clear order data. Please try again.');
    } finally {
      setClearingOrders(false);
    }
  };

  return (
    <div className="billing-page">
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Menu Item</h3>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form className="modal-form" onSubmit={handleAddItem}>
              <label>
                Name
                <input
                  className="form-input"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  className="form-input"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
              </label>
              <div className="form-row">
                <label>
                  Price (Rs)
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Category
                  {!isCustomCategory ? (
                    <select
                      className="form-input"
                      value={newItem.category}
                      onChange={(e) => {
                        if (e.target.value === 'NEW') {
                          setIsCustomCategory(true);
                          setNewItem({ ...newItem, category: '' });
                        } else {
                          setNewItem({ ...newItem, category: e.target.value });
                        }
                      }}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                      <option value="NEW">Create New Category</option>
                    </select>
                  ) : (
                    <input
                      className="form-input"
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      placeholder="Category name"
                      required
                    />
                  )}
                </label>
              </div>
              <label>
                Image
                <input ref={fileInputRef} type="file" accept="image/*" className="form-input" />
              </label>
              <button className="primary-btn" type="submit" disabled={uploading}>
                {uploading ? 'Saving...' : 'Save Item'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showParcelModal && (
        <div className="modal-overlay" onClick={() => setShowParcelModal(false)}>
          <div className="modal-content parcel-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Takeaway Order</h3>
              <button className="icon-btn" onClick={() => setShowParcelModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="parcel-header">
              <input
                className="form-input"
                placeholder="Customer name"
                value={parcelCustomer.name}
                onChange={(e) => setParcelCustomer({ ...parcelCustomer, name: e.target.value })}
              />
              <input
                className="form-input"
                placeholder="Phone number"
                value={parcelCustomer.phone}
                onChange={(e) => setParcelCustomer({ ...parcelCustomer, phone: e.target.value })}
              />
            </div>
            <div className="parcel-layout">
              <div className="parcel-menu">
                {menu.map((item) => (
                  <button key={item.id} className="parcel-menu-item" onClick={() => addToParcelCart(item)} type="button">
                    <span>{item.name}</span>
                    <span>Rs {item.price}</span>
                  </button>
                ))}
              </div>
              <div className="parcel-cart">
                {parcelCart.length === 0 && <p className="muted">No items added.</p>}
                {parcelCart.map((item) => (
                  <div key={item.id} className="parcel-cart-item">
                    <div>
                      <div className="line-strong">{item.name}</div>
                      <div className="line-muted">Rs {item.price * item.quantity}</div>
                    </div>
                    <div className="qty-control">
                      <button onClick={() => removeFromParcelCart(item.id)} type="button">
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => addToParcelCart(item)} type="button">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="parcel-total">Total: Rs {parcelCart.reduce((sum, item) => sum + item.price * item.quantity, 0)}</div>
                <button className="primary-btn" onClick={handleParcelOrder} type="button">
                  Send To Kitchen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="billing-header">
        <div className="billing-head-row">
          <div>
            <h1>Operations Console</h1>
            <p>Live billing, staff performance, complaints, and table management.</p>
          </div>
          <div className="head-actions">
            <button className={dashboardMode ? 'primary-btn with-icon' : 'secondary-btn with-icon'} onClick={() => setDashboardMode((prev) => !prev)}>
              <ListOrdered size={16} /> {dashboardMode ? 'Dashboard On' : 'Dashboard'}
            </button>
            <button className="secondary-btn with-icon" onClick={() => setShowParcelModal(true)}>
              <Package size={16} /> New Takeaway
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <ListOrdered size={18} />
            <div>
              <div className="stat-value">{todayOrders.length}</div>
              <div className="stat-label">Orders Today</div>
            </div>
          </div>
          <div className="stat-card">
            <DollarSign size={18} />
            <div>
              <div className="stat-value">Rs {paidRevenue.toFixed(0)}</div>
              <div className="stat-label">Collected Revenue</div>
            </div>
          </div>
          <div className="stat-card">
            <ShieldCheck size={18} />
            <div>
              <div className="stat-value">{billableOrders.length}</div>
              <div className="stat-label">Pending Settlement</div>
            </div>
          </div>
          <button className="stat-card complaint-trigger" onClick={() => setTab('complaints')}>
            <AlertCircle size={18} />
            <div>
              <div className="stat-value">{activeComplaints.length}</div>
              <div className="stat-label">Active Complaints</div>
            </div>
          </button>
        </div>
      </header>

      {!dashboardMode && (
        <div className="billing-tabs">
          <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>
            Billing Queue
          </button>
          <button className={tab === 'staff' ? 'active' : ''} onClick={() => setTab('staff')}>
            Staff Tracking
          </button>
          <button className={tab === 'complaints' ? 'active' : ''} onClick={() => setTab('complaints')}>
            Complaints {activeComplaints.length > 0 && <span className="tab-badge">{activeComplaints.length}</span>}
          </button>
          <button className={tab === 'pricing' ? 'active' : ''} onClick={() => setTab('pricing')}>
            Menu Pricing
          </button>
          <button className={tab === 'qrcodes' ? 'active' : ''} onClick={() => setTab('qrcodes')}>
            Table Setup
          </button>
          <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>
            Chef Requests {menuRequests.length > 0 && <span className="tab-badge">{menuRequests.length}</span>}
          </button>
        </div>
      )}

      <main className="billing-content">
        {tab === 'orders' && (
          <section className="orders-tab-layout">
            <div className="section-header">
              <h3>Pending Settlement</h3>
            </div>
            <div className="card-grid">
              {billableOrders.length === 0 && <div className="empty-card">No payments pending.</div>}
              {billableOrders.map((order) => (
                <article key={order.id} className="mini-card">
                  <div className="line-strong">{order.type === 'TAKE_AWAY' ? 'Takeaway' : `Table ${order.tableId}`}</div>
                  <div className="line-muted">{order.customerName}</div>
                  <div className="line-strong">Rs {order.total}</div>
                  <div className="mini-actions">
                    <button className="icon-btn" onClick={() => printBill(order.id)}>
                      <Printer size={16} />
                    </button>
                    <button className="primary-btn" onClick={() => markPaid(order.id)}>
                      Settle
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="section-header with-actions">
              <h3>Today Completed Orders</h3>
              <div className="mini-actions">
                <button className="secondary-btn" onClick={exportCompletedOrdersCsv}>
                  Export Excel (CSV)
                </button>
                <button className="danger-btn" onClick={handleClearOrders} disabled={clearingOrders}>
                  {clearingOrders ? 'Clearing...' : 'Clear Firebase Orders'}
                </button>
              </div>
            </div>
            <div className="card-grid">
              {completedOrdersToday.length === 0 && <div className="empty-card">No completed orders yet today.</div>}
              {completedOrdersToday.map((order) => (
                <article key={order.id} className="mini-card">
                  <div className="line-strong">{order.type === 'TAKE_AWAY' ? 'Takeaway' : `Table ${order.tableId}`}</div>
                  <div className="line-muted">{order.customerName}</div>
                  <div className="line-muted">{new Date(order.createdAt).toLocaleTimeString('en-IN')}</div>
                  <div className="line-strong">Rs {order.total}</div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === 'staff' && (
          <section className="split-layout">
            <aside className="panel">
              <div className="panel-head">
                <UserPlus size={18} />
                <h3>Register Staff</h3>
              </div>
              <form onSubmit={handleAddStaff} className="stack-form">
                <input
                  className="form-input"
                  placeholder="Name"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  required
                />
                <input
                  className="form-input"
                  placeholder="Phone"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  required
                />
                <input
                  className="form-input"
                  placeholder="4-digit PIN"
                  maxLength={4}
                  value={newStaff.pin}
                  onChange={(e) => setNewStaff({ ...newStaff, pin: e.target.value })}
                  required
                />
                <select
                  className="form-input"
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as 'WAITER' | 'CHEF' })}
                >
                  <option value="WAITER">Waiter</option>
                  <option value="CHEF">Chef</option>
                </select>
                <button className="primary-btn" type="submit">
                  Add Staff
                </button>
              </form>
            </aside>

            <div className="card-grid">
              {staffStats.map((member) => (
                <article key={member.id} className="staff-card">
                  <div className="staff-top">
                    <div className="avatar">{member.name.charAt(0)}</div>
                    <div>
                      <div className="line-strong">{member.name}</div>
                      <div className="line-muted">{member.role}</div>
                    </div>
                    <div className={`status-dot ${member.status === 'ONLINE' ? 'online' : member.status === 'BREAK' ? 'break' : ''}`} />
                  </div>
                  <div className="staff-metrics">
                    <div>
                      <span>Orders</span>
                      <strong>{member.deliveryCount}</strong>
                    </div>
                    <div>
                      <span>Revenue</span>
                      <strong>Rs {member.deliveryValue}</strong>
                    </div>
                    <div>
                      <span>Break</span>
                      <strong>{member.breakMinutes}m</strong>
                    </div>
                  </div>
                  <div className="staff-footer">
                    <span className={`staff-status ${member.status.toLowerCase()}`}>{member.status}</span>
                    <button className="danger-link" onClick={() => removeStaff(member.id)}>
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === 'complaints' && (
          <section className="card-grid">
            {activeComplaints.length === 0 && <div className="empty-card">No active complaints.</div>}
            {activeComplaints.map((order) => (
              <article key={order.id} className="complaint-card">
                <div className="complaint-top">
                  <strong>Table {order.tableId}</strong>
                  <span>{Math.floor((Date.now() - (order.complaint?.raisedAt || Date.now())) / 60000)}m ago</span>
                </div>
                <p>{order.complaint?.message}</p>
                <div className="line-muted">
                  Customer: {order.customerName} | Waiter:{' '}
                  {staff.find((member) => member.id === order.assignedTo)?.name || 'Unassigned'}
                </div>
                <button className="primary-btn" onClick={() => resolveComplaint(order.id)}>
                  Resolve
                </button>
              </article>
            ))}
          </section>
        )}

        {tab === 'pricing' && (
          <section>
            <div className="section-header">
              <h3>Menu And Pricing</h3>
              <button className="secondary-btn with-icon" onClick={() => setShowAddModal(true)}>
                <Plus size={16} /> Add Item
              </button>
            </div>
            <div className="card-grid">
              {menu.map((item) => (
                <article key={item.id} className="menu-card">
                  <img src={item.image} alt={item.name} />
                  <div>
                    <div className="line-strong">{item.name}</div>
                    <div className="line-muted">{item.category}</div>
                    <label className="price-edit">
                      <span>Rs</span>
                      <input
                        type="number"
                        defaultValue={item.price}
                        onBlur={(e) => updateMenuItemPrice(item.id, Number(e.target.value))}
                      />
                    </label>
                    <button
                      className={item.available ? 'secondary-btn' : 'primary-btn'}
                      type="button"
                      onClick={() => setMenuItemAvailability(item.id, !item.available)}
                    >
                      {item.available ? 'Disable Item' : 'Enable Item'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === 'qrcodes' && (
          <section className="card-grid">
            {Array.from({ length: TABLE_COUNT }, (_, index) => index + 1).map((tableNo) => (
              <article
                key={tableNo}
                className={`qr-card ${activeQRTable === tableNo ? 'active' : ''}`}
                onClick={() => setActiveQRTable(activeQRTable === tableNo ? null : tableNo)}
              >
                <div className="line-strong">Table {tableNo}</div>
                <div className="qr-wrap">
                  <QRCodeSVG value={`${baseUrl}/table/${tableNo}`} size={130} />
                </div>
                {activeQRTable === tableNo ? (
                  <div className="qr-actions">
                    <button onClick={(e) => { e.stopPropagation(); printQR(tableNo); }} className="secondary-btn with-icon">
                      <Printer size={14} /> Print
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); shareQR(tableNo); }} className="secondary-btn with-icon">
                      <Share2 size={14} /> Share
                    </button>
                  </div>
                ) : (
                  <div className="line-muted">Tap for actions</div>
                )}
              </article>
            ))}
          </section>
        )}

        {tab === 'requests' && (
          <section className="card-grid">
            {menuRequests.length === 0 && <div className="empty-card">No pending requests.</div>}
            {menuRequests.map((request) => (
              <article key={request.id} className="mini-card">
                <div className="line-strong">{getMenuItemName(request.menuItemId)}</div>
                <div className="line-muted">
                  Request: {request.requestedAvailability ? 'Mark Available' : 'Mark Sold Out'}
                </div>
                <div className="mini-actions">
                  <button className="secondary-btn" onClick={() => resolveMenuRequest(request.id, false)}>
                    Reject
                  </button>
                  <button className="primary-btn" onClick={() => resolveMenuRequest(request.id, true)}>
                    Approve
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
