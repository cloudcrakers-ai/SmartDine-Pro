import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Order, MenuItem, OrderStatus, OrderItem, MenuChangeRequest } from '../types';

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
  addOrder: (customerName: string, customerPhone: string, tableId: string, items: OrderItem[]) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  markPaid: (orderId: string) => Promise<void>;
  requestCounterPayment: (orderId: string) => Promise<void>;
  raiseMenuRequest: (menuItemId: string, requestedAvailability: boolean) => Promise<void>;
  resolveMenuRequest: (requestId: string, approved: boolean) => Promise<void>;
  clearAllOrders: () => Promise<void>;
  updateMenuItemPrice: (menuItemId: string, newPrice: number) => Promise<void>;
}

const StoreContext = createContext<StoreState | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuRequests, setMenuRequests] = useState<MenuChangeRequest[]>([]);

  /* 1. Sync Menu */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'menu'), 
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
        if (data.length === 0) {
          SEED_MENU.forEach(item => {
            setDoc(doc(db, 'menu', item.id), item);
          });
        } else {
          setMenu(data);
        }
      },
      (err) => console.error("Firestore Menu Error:", err)
    );
    return unsub;
  }, []);

  /* 2. Sync Orders */
  useEffect(() => {
    const q = query(collection(db, 'orders'));
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
  }, []);

  /* 3. Sync Menu Requests */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'menuRequests'), 
      (snap) => {
        setMenuRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuChangeRequest)));
      },
      (err) => console.error("Firestore Requests Error:", err)
    );
    return unsub;
  }, []);

  const addOrder = async (customerName: string, customerPhone: string, tableId: string, items: OrderItem[]) => {
    const order = {
      tableId,
      customerName,
      customerPhone,
      items,
      status: 'PENDING',
      total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      createdAt: Date.now(),
      paymentStatus: 'UNPAID',
    };
    await addDoc(collection(db, 'orders'), order);
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await updateDoc(doc(db, 'orders', orderId), { status });
  };

  const markPaid = async (orderId: string) => {
    await updateDoc(doc(db, 'orders', orderId), { paymentStatus: 'PAID' });
  };

  const requestCounterPayment = async (orderId: string) => {
    await updateDoc(doc(db, 'orders', orderId), { paymentStatus: 'PENDING_COUNTER' });
  };

  const raiseMenuRequest = async (menuItemId: string, requestedAvailability: boolean) => {
    const req = {
      menuItemId,
      requestedAvailability,
      status: 'PENDING',
      timestamp: Date.now(),
    };
    await addDoc(collection(db, 'menuRequests'), req);
  };

  const resolveMenuRequest = async (requestId: string, approved: boolean) => {
    const req = menuRequests.find(r => r.id === requestId);
    if (!req) return;

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

  return (
    <StoreContext.Provider value={{
      menu, orders, menuRequests,
      addOrder, updateOrderStatus, markPaid, requestCounterPayment,
      raiseMenuRequest, resolveMenuRequest, clearAllOrders, updateMenuItemPrice
    }}>
      {children}
    </StoreContext.Provider>
  );
}
