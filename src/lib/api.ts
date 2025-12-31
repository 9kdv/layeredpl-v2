const API_BASE = '/api';

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
    if (category && category !== 'all') params.set('category', category);
    if (search) params.set('search', search);
    const query = params.toString();
    return this.request<Product[]>(`/products${query ? `?${query}` : ''}`);
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

  async getOrder(id: string) {
    return this.request<Order>(`/orders/${id}`);
  }

  async updateOrderStatus(id: string, status: string) {
    return this.request<{ success: boolean }>(`/orders/${id}/status`, {
      method: 'PUT',
      body: { status },
    });
  }

  // Checkout
  async getStripeConfig() {
    return this.request<{ publishableKey: string }>('/checkout/config');
  }

  async createPaymentIntent(items: CartItem[], shippingAddress?: ShippingAddress, customerEmail?: string) {
    return this.request<{ clientSecret: string; orderId: string }>('/checkout/create-payment-intent', {
      method: 'POST',
      body: { items, shipping_address: shippingAddress, customer_email: customerEmail },
    });
  }

  // Admin Stats
  async getAdminStats() {
    return this.request<AdminStats>('/admin/stats');
  }
}

// Types
export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  availability: 'available' | 'low_stock' | 'unavailable';
  images: string[];
  specifications: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
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
  items: CartItem[];
  total: number;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_intent_id?: string;
  shipping_address: ShippingAddress;
  customer_email: string;
  created_at: string;
}

export interface AdminStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  revenue: number;
  pendingOrders: number;
}

export const api = new ApiService();
