export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';

export interface MenuItem {
  id: string;
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
  tableId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  status: OrderStatus;
  total: number;
  createdAt: number;
  paymentStatus: 'UNPAID' | 'PENDING_COUNTER' | 'PAID';
}

export interface MenuChangeRequest {
  id: string;
  menuItemId: string;
  requestedAvailability: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: number;
}
