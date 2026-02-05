// Admin API methods for all modules
const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function request<T>(endpoint: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Błąd serwera' }));
    throw new Error(error.error || 'Błąd serwera');
  }

  return response.json();
}

// ============ PROMO CODES ============

export interface PromoCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  min_order_amount: number;
  max_uses: number | null;
  uses_count: number;
  uses_per_user: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  is_archived: boolean;
  applies_to: string;
  excluded_products: string[] | null;
  included_products: string[] | null;
  included_categories: string[] | null;
  for_roles: string[] | null;
  priority: number;
  is_automatic: boolean;
  created_at: string;
}

export const promoApi = {
  getAll: () => request<PromoCode[]>('/admin/promo-codes'),
  get: (id: string) => request<PromoCode>(`/admin/promo-codes/${id}`),
  create: (data: Partial<PromoCode>) => request<PromoCode>('/admin/promo-codes', { method: 'POST', body: data }),
  update: (id: string, data: Partial<PromoCode>) => request<PromoCode>(`/admin/promo-codes/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean }>(`/admin/promo-codes/${id}`, { method: 'DELETE' }),
  duplicate: (id: string) => request<PromoCode>(`/admin/promo-codes/${id}/duplicate`, { method: 'POST' }),
  validate: (code: string, orderTotal: number) => request<{ valid: boolean; discount: number; type: string; message?: string }>(`/promo-codes/validate`, { method: 'POST', body: { code, orderTotal } }),
};

// ============ MESSAGES ============

export interface Message {
  id: string;
  thread_id: string | null;
  order_id: string | null;
  user_id: string | null;
  sender_email: string;
  sender_name: string;
  subject: string;
  content: string;
  is_from_customer: boolean;
  status: 'new' | 'in_progress' | 'closed' | 'spam';
  assigned_to: string | null;
  assigned_email?: string;
  tags: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read_at: string | null;
  created_at: string;
  thread?: Message[];
}

export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
  is_active: boolean;
}

export const messagesApi = {
  getAll: (params?: { status?: string; order_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.order_id) query.set('order_id', params.order_id);
    return request<Message[]>(`/admin/messages?${query.toString()}`);
  },
  get: (id: string) => request<Message>(`/admin/messages/${id}`),
  create: (data: { sender_name: string; sender_email: string; subject: string; content: string }) => 
    request<{ success: boolean; messageId: string }>('/messages', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Message>) => request<{ success: boolean }>(`/admin/messages/${id}`, { method: 'PUT', body: data }),
  reply: (id: string, content: string, subject?: string) => request<{ success: boolean; replyId: string }>(`/admin/messages/${id}/reply`, { method: 'POST', body: { content, subject } }),
  getTemplates: () => request<MessageTemplate[]>('/admin/message-templates'),
  createTemplate: (data: Partial<MessageTemplate>) => request<MessageTemplate>('/admin/message-templates', { method: 'POST', body: data }),
};

// ============ PRODUCTION ============

export interface ProductionItem {
  id: string;
  order_id: string;
  order_item_index: number;
  printer_id: string | null;
  assigned_to: string | null;
  status: 'pending' | 'preparing' | 'printing' | 'post_processing' | 'ready' | 'completed' | 'cancelled';
  priority: number;
  estimated_time_minutes: number | null;
  actual_time_minutes: number | null;
  material_id: string | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  customer_name?: string;
  customer_email?: string;
  items?: unknown[];
  order_date?: string;
  printer_name?: string;
  material_name?: string;
  material_color?: string;
  assigned_email?: string;
}

export const productionApi = {
  getQueue: () => request<ProductionItem[]>('/admin/production/queue'),
  updateItem: (id: string, data: Partial<ProductionItem>) => request<{ success: boolean }>(`/admin/production/queue/${id}`, { method: 'PUT', body: data }),
};

// ============ PRINTERS ============

export interface Printer {
  id: string;
  name: string;
  model: string;
  location_id: string | null;
  status: 'available' | 'busy' | 'maintenance' | 'offline';
  current_job_order_id: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  location_name?: string;
  assigned_email?: string;
}

export const printersApi = {
  getAll: () => request<Printer[]>('/admin/printers'),
  create: (data: Partial<Printer>) => request<Printer>('/admin/printers', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Printer>) => request<{ success: boolean }>(`/admin/printers/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean }>(`/admin/printers/${id}`, { method: 'DELETE' }),
};

// ============ MATERIALS ============

export interface Material {
  id: string;
  name: string;
  type: 'PLA' | 'PETG' | 'ABS' | 'TPU' | 'ASA' | 'Nylon' | 'PC' | 'HIPS' | 'PVA' | 'Wood' | 'Metal' | 'Carbon' | 'Other';
  color: string;
  color_hex: string;
  location_id: string | null;
  quantity_available: number;
  quantity_unit: string;
  min_stock_level: number;
  status: 'available' | 'low_stock' | 'out_of_stock';
  is_active: boolean;
  notes: string | null;
  created_at: string;
  location_name?: string;
}

export const materialsApi = {
  getAll: () => request<Material[]>('/admin/materials'),
  create: (data: Partial<Material>) => request<Material>('/admin/materials', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Material>) => request<{ success: boolean }>(`/admin/materials/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean }>(`/admin/materials/${id}`, { method: 'DELETE' }),
};

// ============ LOCATIONS ============

export interface Location {
  id: string;
  name: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at: string;
}

export const locationsApi = {
  getAll: () => request<Location[]>('/admin/locations'),
  create: (data: Partial<Location>) => request<Location>('/admin/locations', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Location>) => request<{ success: boolean }>(`/admin/locations/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean }>(`/admin/locations/${id}`, { method: 'DELETE' }),
};

// ============ RETURNS ============

export interface Return {
  id: string;
  order_id: string;
  user_id: string | null;
  reason: 'defect' | 'wrong_item' | 'not_as_described' | 'changed_mind' | 'damaged' | 'other';
  description: string;
  decision: 'pending' | 'approved_refund' | 'approved_reprint' | 'partial_refund' | 'rejected';
  refund_amount: number;
  status: 'submitted' | 'under_review' | 'awaiting_return' | 'received' | 'resolved' | 'closed';
  assigned_to: string | null;
  internal_notes: string | null;
  customer_notes: string | null;
  images: string[];
  created_at: string;
  customer_name?: string;
  customer_email?: string;
  order_total?: number;
  assigned_email?: string;
  items?: unknown[];
  history?: ReturnHistory[];
}

export interface ReturnHistory {
  id: string;
  return_id: string;
  user_id: string | null;
  action: string;
  old_status: string | null;
  new_status: string | null;
  note: string | null;
  created_at: string;
  user_email?: string;
}

export const returnsApi = {
  getAll: () => request<Return[]>('/admin/returns'),
  get: (id: string) => request<Return>(`/admin/returns/${id}`),
  update: (id: string, data: Partial<Return>) => request<{ success: boolean }>(`/admin/returns/${id}`, { method: 'PUT', body: data }),
};

// ============ SETTINGS ============

export interface Settings {
  [key: string]: string | number | boolean | unknown[];
}

export interface Review {
  id: string;
  name: string;
  text: string;
  rating: number;
  date: string;
  verified: boolean;
}

export const settingsApi = {
  getAll: () => request<Settings>('/admin/settings'),
  update: (data: Partial<Settings>) => request<{ success: boolean }>('/admin/settings', { method: 'PUT', body: data }),
  getPublic: () => request<Settings>('/settings/public'),
};

// ============ REPORTS ============

export interface SalesReport {
  period: string;
  orders: number;
  revenue: number;
  avg_order: number;
  total_discounts: number;
}

export const reportsApi = {
  getSales: (params?: { start_date?: string; end_date?: string; group_by?: string }) => {
    const query = new URLSearchParams();
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.group_by) query.set('group_by', params.group_by);
    return request<SalesReport[]>(`/admin/reports/sales?${query.toString()}`);
  },
  getProducts: () => request<{ id: string; name: string; price: number; total_sold: number; revenue: number }[]>('/admin/reports/products'),
};

// ============ NOTIFICATIONS ============

export interface Notification {
  id: string;
  user_id: string;
  type: 'system' | 'order' | 'message' | 'production' | 'alert';
  title: string;
  content: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  getAll: () => request<Notification[]>('/admin/notifications'),
  markAsRead: (id: string) => request<{ success: boolean }>(`/admin/notifications/${id}/read`, { method: 'PUT' }),
  markAllAsRead: () => request<{ success: boolean }>('/admin/notifications/read-all', { method: 'PUT' }),
};

// ============ ACTIVITY LOGS ============

export interface ActivityLog {
  id: string;
  user_id: string | null;
  user_email?: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export const logsApi = {
  getAll: (params?: { user_id?: string; action?: string; entity_type?: string; start_date?: string; end_date?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.user_id) query.set('user_id', params.user_id);
    if (params?.action) query.set('action', params.action);
    if (params?.entity_type) query.set('entity_type', params.entity_type);
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.limit) query.set('limit', params.limit.toString());
    return request<ActivityLog[]>(`/admin/logs?${query.toString()}`);
  },
  export: (format: 'csv' | 'json') => {
    const token = getToken();
    return fetch(`${API_BASE}/admin/logs/export?format=${format}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.blob());
  }
};

// ============ ORDERS EXPORT ============

export const ordersApi = {
  getAll: (params?: { status?: string; start_date?: string; end_date?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    return request<unknown[]>(`/orders?${query.toString()}`);
  },
  export: async (params?: { status?: string; start_date?: string; end_date?: string; format?: 'csv' | 'json' }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    query.set('format', params?.format || 'csv');
    
    const token = getToken();
    const response = await fetch(`${API_BASE}/admin/orders/export?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.blob();
  }
};
