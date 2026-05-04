import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where,
  arrayUnion,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Order, MenuItem, OrderStatus, OrderItem, MenuChangeRequest, StaffMember } from '../types';

const APP_RESTAURANT_ID = import.meta.env.VITE_RESTAURANT_ID || 'smartdine-default';

/* ─── Seed Menu (Used for first-time init) ────────────────────── */
const SEED_MENU: MenuItem[] = [
  {
    id: 'item-001', name: 'Truffle Mushroom Risotto',
    description: 'Arborio rice slow-cooked with wild porcini, finished with black truffle oil and aged Parmigiano.',
    price: 24.50, category: 'Mains',
    image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'item-002', name: 'Pan-Seared Hokkaido Scallops',
    description: 'Diver-harvested scallops, cauliflower silk, crispy guanciale crumble, citrus beurre blanc.',
    price: 21.00, category: 'Starters',
    image: 'https://images.unsplash.com/photo-1599481238505-b8b0537a3f77?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'item-003', name: 'Wagyu Smash Burger',
    description: 'Marble-score 7+ patty, gruyère, house-pickled shallots, black garlic aioli, toasted brioche.',
    price: 28.00, category: 'Mains',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'item-004', name: 'Yuzu Burnt Cheesecake',
    description: 'Basque-style cheesecake infused with yuzu, served with matcha crème anglaise.',
    price: 14.00, category: 'Desserts',
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'item-005', name: 'Charred Caesar Salad',
    description: 'Baby gem lettuce, flame-kissed, house caesar dressing, sourdough croutons, anchovy dust.',
    price: 16.00, category: 'Starters',
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'item-006', name: 'Lobster Linguine',
    description: 'Half Maine lobster, fresh linguine, cherry tomato confit, saffron bisque reduction.',
    price: 34.00, category: 'Mains',
    image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'item-007', name: 'Miso-Glazed Salmon',
    description: 'Norwegian salmon, 48-hour white miso marinade, pickled daikon, shiso, sesame crust.',
    price: 26.00, category: 'Mains',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'item-008', name: 'Dark Chocolate Fondant',
    description: '70% Valrhona single-origin chocolate, molten centre, vanilla bean gelato, salted caramel.',
    price: 16.00, category: 'Desserts',
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'item-009', name: 'Spiced Lamb Rack',
    description: 'New Zealand lamb, harissa crust, pomegranate molasses, whipped feta, herb gremolata.',
    price: 32.00, category: 'Mains',
    image: 'https://images.unsplash.com/photo-1514516345957-556ca7d90a29?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
  {
    id: 'item-010', name: 'Elderflower Spritz',
    description: 'House-made elderflower cordial, prosecco, soda, fresh mint and cucumber.',
    price: 12.00, category: 'Beverages',
    image: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&auto=format&fit=crop&q=80',
    available: true,
  },
];

interface StoreState {
  menu: MenuItem[];
  orders: Order[];
  menuRequests: MenuChangeRequest[];
  addOrder: (customerName: string, customerPhone: string, tableId: string, items: OrderItem[], type?: 'DINE_IN' | 'TAKE_AWAY') => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, staffId?: string) => Promise<void>;
  markPaid: (orderId: string) => Promise<void>;
  requestCounterPayment: (orderId: string) => Promise<void>;
  clearAllOrders: () => Promise<void>;
  updateMenuItemPrice: (menuItemId: string, newPrice: number) => Promise<void>;
  setMenuItemAvailability: (menuItemId: string, available: boolean) => Promise<void>;
  raiseMenuRequest: (menuItemId: string, requestedAvailability: boolean) => Promise<void>;
  resolveMenuRequest: (requestId: string, approved: boolean) => Promise<void>;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void>;
  staff: StaffMember[];
  addStaff: (name: string, phone: string, pin: string, role: 'WAITER' | 'CHEF') => Promise<void>;
  removeStaff: (id: string) => Promise<void>;
  updateStaffActivity: (id: string) => Promise<void>;
  setStaffStatus: (id: string, status: 'ONLINE' | 'BREAK' | 'OFFLINE') => Promise<void>;
  raiseComplaint: (orderId: string, message: string) => Promise<void>;
  resolveComplaint: (orderId: string) => Promise<void>;
}

const StoreContext = createContext<StoreState | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const restaurantId = APP_RESTAURANT_ID;
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuRequests, setMenuRequests] = useState<MenuChangeRequest[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  /* 1. Sync Menu */
  useEffect(() => {
    const menuQuery = query(collection(db, 'menu'), where('restaurantId', '==', restaurantId));
    const unsub = onSnapshot(
      menuQuery,
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
        if (data.length === 0) {
          SEED_MENU.forEach(item => {
            setDoc(doc(db, 'menu', `${restaurantId}-${item.id}`), { ...item, id: `${restaurantId}-${item.id}`, restaurantId });
          });
        } else {
          setMenu(data);
        }
      },
      (err) => console.error("Firestore Menu Error:", err)
    );
    return unsub;
  }, [restaurantId]);

  /* 2. Sync Orders */
  useEffect(() => {
    const q = query(collection(db, 'orders'), where('restaurantId', '==', restaurantId));
    const unsub = onSnapshot(
      q, 
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        // Sort manually in memory to avoid index requirements
        setOrders(data.sort((a, b) => b.createdAt - a.createdAt));
      },
      (err) => {
        console.error("Firestore Orders Error:", err);
        if (err.message.includes('requires an index')) {
          alert("Firebase requires an Index to sort orders. Please check the browser console for the creation link.");
        } else if (err.message.includes('insufficient permissions')) {
          alert("Firestore permissions denied. Please update your Rules in the Firebase Console.");
        }
      }
    );
    return unsub;
  }, [restaurantId]);
  
  /* 4. Sync Staff */
  useEffect(() => {
    const staffQuery = query(collection(db, 'waiters'), where('restaurantId', '==', restaurantId));
    const unsub = onSnapshot(staffQuery, (snap) => {
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)));
    });
    return unsub;
  }, [restaurantId]);

  /* 3. Sync Menu Requests */
  useEffect(() => {
    const requestQuery = query(collection(db, 'menuRequests'), where('restaurantId', '==', restaurantId));
    const unsub = onSnapshot(
      requestQuery,
      (snap) => {
        setMenuRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuChangeRequest)));
      },
      (err) => console.error("Firestore Requests Error:", err)
    );
    return unsub;
  }, [restaurantId]);

  const addOrder = async (customerName: string, customerPhone: string, tableId: string, items: OrderItem[], type: 'DINE_IN' | 'TAKE_AWAY' = 'DINE_IN') => {
    // 1. Equal Distribution Logic (Only for Dine-in)
    let assignedTo = '';
    if (type === 'DINE_IN') {
      const onlineWaiters = staff.filter(s => s.role === 'WAITER' && s.status === 'ONLINE');
      if (onlineWaiters.length > 0) {
        const activeStats = onlineWaiters.map(w => {
          const activeCount = orders.filter(o => o.assignedTo === w.id && ['PENDING', 'PREPARING', 'READY'].includes(o.status)).length;
          return { id: w.id, count: activeCount };
        });
        assignedTo = activeStats.sort((a, b) => a.count - b.count)[0].id;
      }
    }

    const order = {
      restaurantId,
      tableId,
      customerName,
      customerPhone,
      items,
      status: 'PENDING',
      total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      createdAt: Date.now(),
      paymentStatus: 'UNPAID',
      type,
      assignedTo,
      statusHistory: [{ status: 'PENDING', at: Date.now(), by: 'SYSTEM' }],
      paymentHistory: [{ paymentStatus: 'UNPAID', at: Date.now(), by: 'SYSTEM' }],
    };
    await addDoc(collection(db, 'orders'), order);
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, staffId?: string) => {
    const existing = orders.find(o => o.id === orderId);
    if (!existing || existing.status === status) return;
    const updateData: any = {
      status,
      statusHistory: arrayUnion({ status, at: Date.now(), by: staffId || 'SYSTEM' }),
    };
    if (status === 'DELIVERED' && staffId) {
      updateData.deliveredBy = staffId;
      updateData.deliveredAt = Date.now();
    }
    await updateDoc(doc(db, 'orders', orderId), updateData);
  };

  const markPaid = async (orderId: string) => {
    const existing = orders.find(o => o.id === orderId);
    if (!existing || existing.paymentStatus === 'PAID') return;
    await updateDoc(doc(db, 'orders', orderId), {
      paymentStatus: 'PAID',
      paymentHistory: arrayUnion({ paymentStatus: 'PAID', at: Date.now(), by: 'STAFF' }),
    });
  };

  const requestCounterPayment = async (orderId: string) => {
    const existing = orders.find(o => o.id === orderId);
    if (!existing || existing.paymentStatus === 'PAID' || existing.paymentStatus === 'PENDING_COUNTER') return;
    await updateDoc(doc(db, 'orders', orderId), {
      paymentStatus: 'PENDING_COUNTER',
      paymentHistory: arrayUnion({ paymentStatus: 'PENDING_COUNTER', at: Date.now(), by: 'STAFF' }),
    });
  };

  const raiseMenuRequest = async (menuItemId: string, requestedAvailability: boolean) => {
    const duplicate = menuRequests.find(
      (request) =>
        request.menuItemId === menuItemId &&
        request.requestedAvailability === requestedAvailability &&
        request.status === 'PENDING'
    );
    if (duplicate) return;

    const req = {
      restaurantId,
      menuItemId,
      requestedAvailability,
      status: 'PENDING',
      timestamp: Date.now(),
    };
    await addDoc(collection(db, 'menuRequests'), req);
  };

  const resolveMenuRequest = async (requestId: string, approved: boolean) => {
    const req = menuRequests.find(r => r.id === requestId);
    if (!req || req.restaurantId !== restaurantId) return;

    if (approved) {
      await updateDoc(doc(db, 'menu', req.menuItemId), { available: req.requestedAvailability });
    }
    await deleteDoc(doc(db, 'menuRequests', requestId));
  };

  const clearAllOrders = async () => {
    const promises = orders.map(order => deleteDoc(doc(db, 'orders', order.id)));
    await Promise.all(promises);
  };

  const updateMenuItemPrice = async (menuItemId: string, newPrice: number) => {
    await updateDoc(doc(db, 'menu', menuItemId), { price: newPrice });
  };

  const setMenuItemAvailability = async (menuItemId: string, available: boolean) => {
    await updateDoc(doc(db, 'menu', menuItemId), { available });
  };

  const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
    const id = `${restaurantId}-item-${Math.random().toString(36).substring(2, 8)}`;
    await setDoc(doc(db, 'menu', id), { ...item, id, restaurantId, available: true });
  };

  const addStaff = async (name: string, phone: string, pin: string, role: 'WAITER' | 'CHEF') => {
    const id = `${restaurantId}-staff-${Math.random().toString(36).substring(2, 8)}`;
    await setDoc(doc(db, 'waiters', id), { 
      id, restaurantId, name, phone, pin, role, 
      status: 'OFFLINE',
      breakSessions: [],
      joinedAt: Date.now(), 
      lastActive: Date.now() 
    });
  };

  const removeStaff = async (id: string) => {
    await deleteDoc(doc(db, 'waiters', id));
  };

  const updateStaffActivity = async (id: string) => {
    await updateDoc(doc(db, 'waiters', id), { lastActive: Date.now() });
  };

  const setStaffStatus = async (id: string, newStatus: 'ONLINE' | 'BREAK' | 'OFFLINE') => {
    const member = staff.find(s => s.id === id);
    if (!member) return;

    const update: any = { status: newStatus };
    const sessions = [...(member.breakSessions || [])];

    if (newStatus === 'BREAK') {
      sessions.push({ start: Date.now() });
      update.breakSessions = sessions;
    } else if (member.status === 'BREAK' && (newStatus === 'ONLINE' || newStatus === 'OFFLINE')) {
      // End last break
      if (sessions.length > 0) {
        const last = sessions[sessions.length - 1];
        if (!last.end) {
          last.end = Date.now();
          update.breakSessions = sessions;
        }
      }
    }
    await updateDoc(doc(db, 'waiters', id), update);
  };

  const raiseComplaint = async (orderId: string, message: string) => {
    await updateDoc(doc(db, 'orders', orderId), {
      complaint: { raisedAt: Date.now(), message, resolved: false }
    });
  };

  const resolveComplaint = async (orderId: string) => {
    await updateDoc(doc(db, 'orders', orderId), { 'complaint.resolved': true });
  };

  return (
    <StoreContext.Provider value={{
      menu, orders, menuRequests, staff,
      addOrder, updateOrderStatus, markPaid, requestCounterPayment,
      raiseMenuRequest, resolveMenuRequest, clearAllOrders, updateMenuItemPrice, setMenuItemAvailability, addMenuItem,
      addStaff, removeStaff, updateStaffActivity, setStaffStatus, raiseComplaint, resolveComplaint
    }}>
      {children}
    </StoreContext.Provider>
  );
}
