export interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'seller' | 'admin';
  balance: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

export interface Product {
  id: number;
  sellerId: number;
  categoryId: number;
  title: string;
  description: string | null;
  gameName: string | null;
  price: number;
  originalPrice: number | null;
  stock: number;
  status: 'active' | 'inactive' | 'sold';
  views: number;
}

export interface Order {
  id: number;
  buyerId: number;
  productId: number;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  paymentMethod: string | null;
}

export interface Settings {
  siteName: string;
  siteCommission: number;
  minWithdraw: number;
  maintenanceMode: boolean;
}
