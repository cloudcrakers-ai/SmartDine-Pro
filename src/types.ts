export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PENDING_COUNTER' | 'PAID';

export interface StatusHistoryEntry {
  status: OrderStatus;
  at: number;
  by?: string;
}

export interface PaymentHistoryEntry {
  paymentStatus: PaymentStatus;
  at: number;
  by?: string;
}

export interface StaffMember {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  pin: string;
  role: 'WAITER' | 'CHEF';
  status: 'ONLINE' | 'BREAK' | 'OFFLINE';
  breakSessions: { start: number; end?: number }[];
  joinedAt: number;
  lastActive: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  available: boolean;
  requestPending?: boolean; // When chef requests availability change
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  restaurantId: string;
  tableId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  status: OrderStatus;
  total: number;
  createdAt: number;
  paymentStatus: PaymentStatus;
  type: 'DINE_IN' | 'TAKE_AWAY';
  statusHistory?: StatusHistoryEntry[];
  paymentHistory?: PaymentHistoryEntry[];
  assignedTo?: string; // Auto-assigned Waiter ID
  deliveredBy?: string; // Final Waiter ID
  deliveredAt?: number;
  complaint?: {
    raisedAt: number;
    message: string;
    resolved: boolean;
  };
}

export interface MenuChangeRequest {
  id: string;
  restaurantId: string;
  menuItemId: string;
  requestedAvailability: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: number;
}
