// Use /api for production (nginx proxy), localhost for development
const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001';

import { 
  ProductCustomization, 
  SelectedCustomization,
  OrderStatus,
  ORDER_STATUS_LABELS
} from '@/types/customization';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...options.headers,
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body instanceof FormData 
        ? options.body 
        : options.body 
          ? JSON.stringify(options.body) 
          : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Błąd serwera' }));
      throw new Error(error.error || 'Błąd serwera');
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    this.setToken(data.token);
    return data;
  }

  async register(email: string, password: string) {
    const data = await this.request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: { email, password },
    });
    this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request<User>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Products
  async getProducts(category?: string, search?: string) {
    const params = new URLSearchParams();
    if (category && category !== 'all' && category !== 'Wszystkie') params.set('category', category);
    if (search) params.set('search', search);
    const query = params.toString();
    return this.request<Product[]>(`/products${query ? `?${query}` : ''}`);
  }

  async getFeaturedProducts() {
    return this.request<Product[]>('/products?featured=true');
  }

  async getProduct(id: string) {
    return this.request<Product>(`/products/${id}`);
  }

  async createProduct(formData: FormData) {
    return this.request<Product>('/products', {
      method: 'POST',
      body: formData,
    });
  }

  async updateProduct(id: string, formData: FormData) {
    return this.request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: formData,
    });
  }

  async deleteProduct(id: string) {
    return this.request<{ success: boolean }>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Categories
  async getCategories() {
    return this.request<string[]>('/categories');
  }

  // Orders
  async getOrders() {
    return this.request<Order[]>('/orders');
  }

  async getUserOrders() {
    return this.request<Order[]>('/orders/my');
  }

  async getOrder(id: string) {
    return this.request<Order>(`/orders/${id}`);
  }

  async updateOrderStatus(id: string, status: OrderStatus, note?: string) {
    return this.request<{ success: boolean }>(`/orders/${id}/status`, {
      method: 'PUT',
      body: { status, note },
    });
  }

  // User Profile
  async getUserProfile() {
    return this.request<UserProfile>('/user/profile');
  }

  async updateUserProfile(data: Partial<UserProfile>) {
    return this.request<UserProfile>('/user/profile', {
      method: 'PUT',
      body: data,
    });
  }

  // Saved Addresses
  async getSavedAddresses() {
    return this.request<SavedAddress[]>('/user/addresses');
  }

  async addSavedAddress(address: Omit<SavedAddress, 'id' | 'user_id' | 'created_at'>) {
    return this.request<SavedAddress>('/user/addresses', {
      method: 'POST',
      body: address,
    });
  }

  async updateSavedAddress(id: string, address: Partial<SavedAddress>) {
    return this.request<SavedAddress>(`/user/addresses/${id}`, {
      method: 'PUT',
      body: address,
    });
  }

  async deleteSavedAddress(id: string) {
    return this.request<{ success: boolean }>(`/user/addresses/${id}`, {
      method: 'DELETE',
    });
  }

  // Saved Payments (read-only, managed by Stripe)
  async getSavedPayments() {
    return this.request<SavedPayment[]>('/user/payments');
  }

  // Password
  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  }

  async requestPasswordReset(email: string) {
    return this.request<{ success: boolean }>('/auth/request-reset', {
      method: 'POST',
      body: { email },
    });
  }

  // Checkout
  async getStripeConfig() {
    return this.request<{ publishableKey: string }>('/checkout/config');
  }

  async createPaymentIntent(
    items: CartItemApi[], 
    shippingAddress: ShippingAddress, 
    customerEmail: string,
    customerName?: string,
    customerPhone?: string,
    shippingCost?: number,
    saveAddress?: boolean
  ) {
    return this.request<{ clientSecret: string; orderId: string }>('/checkout/create-payment-intent', {
      method: 'POST',
      body: { 
        items, 
        shipping_address: shippingAddress, 
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone,
        shipping_cost: shippingCost || 0,
        save_address: saveAddress
      },
    });
  }

  async verifyPayment(paymentIntentId: string, orderId?: string) {
    return this.request<{ success: boolean; orderId: string; status: string }>('/checkout/verify-payment', {
      method: 'POST',
      body: { 
        payment_intent_id: paymentIntentId,
        order_id: orderId
      },
    });
  }

  async getOrderStatus(paymentIntentId: string) {
    return this.request<{ orderId: string; status: string; email: string }>(`/checkout/order-status?payment_intent=${paymentIntentId}`);
  }

  // File upload for customization
  async uploadCustomizationFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{ url: string; id: string }>('/uploads/customization', {
      method: 'POST',
      body: formData,
    });
  }

  // InPost
  async verifyInPostLocker(code: string) {
    return this.request<{ valid: boolean; address?: string; name?: string }>(`/inpost/verify/${code}`);
  }

  async searchInPostLockers(query: string) {
    return this.request<InPostLocker[]>(`/inpost/search?q=${encodeURIComponent(query)}`);
  }

  // Admin Stats
  async getAdminStats() {
    return this.request<AdminStats>('/admin/stats');
  }

  // Public Stats
  async getPublicStats() {
    return this.request<PublicStats>('/stats/public');
  }
}

// Types
export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SavedAddress {
  id: string;
  user_id: string;
  label?: string;
  street: string;
  city: string;
  postal_code: string;
  phone?: string;
  is_default: boolean;
  created_at?: string;
}

export interface SavedPayment {
  id: string;
  user_id: string;
  stripe_payment_method_id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  long_description?: string;
  price: number;
  category: string;
  availability: 'available' | 'low_stock' | 'unavailable';
  images: string[];
  specifications: { label: string; value: string }[];
  featured?: boolean;
  customization?: ProductCustomization;
  created_at?: string;
  updated_at?: string;
}

// Cart item for API (includes customizations)
export interface CartItemApi {
  id: string;
  cartItemId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  customizations?: SelectedCustomization[];
  customizationPrice?: number;
  nonRefundable?: boolean;
  nonRefundableAccepted?: boolean;
}

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  postalCode: string;
  phone: string;
}

export interface Order {
  id: string;
  user_id?: string;
  items: CartItemApi[];
  total: number;
  status: OrderStatus;
  status_note?: string;
  payment_intent_id?: string;
  shipping_address: ShippingAddress;
  customer_email: string;
  customer_name?: string;
  customer_phone?: string;
  has_non_refundable: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AdminStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  revenue: number;
  pendingOrders: number;
}

export interface PublicStats {
  totalOrders: number;
  totalProducts: number;
  avgRating: number;
  happyCustomers: number;
}

export interface InPostLocker {
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
}

export { ORDER_STATUS_LABELS };
export type { OrderStatus, ProductCustomization, SelectedCustomization };

export const api = new ApiService();