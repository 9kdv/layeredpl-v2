// Admin types for roles, permissions, users

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  priority: number;
  is_system: boolean;
  permissions?: Permission[];
  created_at?: string;
}

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category: string;
  created_at?: string;
}

export interface Group {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  memberCount?: number;
  created_at?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_active: boolean;
  is_blocked: boolean;
  must_change_password?: boolean;
  last_login_at?: string;
  created_at: string;
  roles: Role[];
  groups: Group[];
  orderCount?: number;
  recentActivity?: ActivityLog[];
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Permission categories for grouping in UI
export const PERMISSION_CATEGORIES: Record<string, string> = {
  orders: 'Zamówienia',
  products: 'Produkty',
  users: 'Użytkownicy',
  finance: 'Finanse',
  production: 'Produkcja',
  settings: 'Ustawienia',
  system: 'System'
};

// Action labels for activity logs
export const ACTION_LABELS: Record<string, string> = {
  login: 'Logowanie',
  logout: 'Wylogowanie',
  password_change: 'Zmiana hasła',
  create_user: 'Utworzenie użytkownika',
  update_user: 'Aktualizacja użytkownika',
  delete_user: 'Usunięcie użytkownika',
  block_user: 'Blokada użytkownika',
  unblock_user: 'Odblokowanie użytkownika',
  reset_password: 'Reset hasła',
  create_role: 'Utworzenie roli',
  update_role: 'Aktualizacja roli',
  delete_role: 'Usunięcie roli',
  create_group: 'Utworzenie grupy',
  order_status_change: 'Zmiana statusu zamówienia',
  create_product: 'Utworzenie produktu',
  update_product: 'Aktualizacja produktu',
  delete_product: 'Usunięcie produktu'
};
