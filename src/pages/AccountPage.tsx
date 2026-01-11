import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  Package, 
  Settings, 
  LogOut, 
  ChevronRight,
  Loader2,
  Eye,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { api, Order } from '@/lib/api';
import { toast } from 'sonner';

type Tab = 'orders' | 'settings';

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && activeTab === 'orders') {
      loadOrders();
    }
  }, [user, activeTab]);

  const loadOrders = async () => {
    try {
      const data = await api.getUserOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Wylogowano pomyślnie');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Nowe hasło musi mieć co najmniej 6 znaków');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Hasła nie są identyczne');
      return;
    }

    setIsChangingPassword(true);

    try {
      await api.changePassword(currentPassword, newPassword);
      toast.success('Hasło zostało zmienione');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd zmiany hasła');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing': return <Package className="w-4 h-4 text-blue-500" />;
      case 'shipped': return <Truck className="w-4 h-4 text-purple-500" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Oczekujące',
      paid: 'Opłacone',
      processing: 'W realizacji',
      shipped: 'Wysłane',
      delivered: 'Dostarczone',
      cancelled: 'Anulowane'
    };
    return labels[status] || status;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen pt-28 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen pt-28 pb-20">
      <div className="section-container max-w-5xl">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="md:w-64 flex-shrink-0">
            <div className="bg-card border border-border rounded-2xl p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{user.email}</p>
                  <p className="text-sm text-muted-foreground">Klient</p>
                </div>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'orders' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Package className="w-4 h-4" />
                    Zamówienia
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'settings' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Settings className="w-4 h-4" />
                    Ustawienia
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Wyloguj się
                </button>
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'orders' && (
              <div>
                <h1 className="text-2xl font-bold mb-6">Moje zamówienia</h1>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="bg-card border border-border rounded-2xl p-12 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">Brak zamówień</h3>
                    <p className="text-muted-foreground mb-6">Nie masz jeszcze żadnych zamówień.</p>
                    <Button asChild className="rounded-xl">
                      <Link to="/sklep">Przejdź do sklepu</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="bg-card border border-border rounded-2xl p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Zamówienie</p>
                            <p className="font-mono font-semibold">#{order.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                            {getStatusIcon(order.status)}
                            <span className="text-sm font-medium">{getStatusLabel(order.status)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 mb-4">
                          {order.items.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-12 h-12 object-cover rounded-lg bg-muted"
                              />
                              <div>
                                <p className="text-sm font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                              </div>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              +{order.items.length - 3} więcej
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
                          <div className="flex gap-6 text-sm">
                            <div>
                              <span className="text-muted-foreground">Data:</span>{' '}
                              <span className="font-medium">{new Date(order.created_at).toLocaleDateString('pl-PL')}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Suma:</span>{' '}
                              <span className="font-semibold">{order.total.toFixed(2)} zł</span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="rounded-lg" asChild>
                            <Link to={`/zamowienie/${order.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Szczegóły
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h1 className="text-2xl font-bold mb-6">Ustawienia konta</h1>

                <div className="bg-card border border-border rounded-2xl p-6 mb-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Dane konta
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{user.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Data rejestracji</Label>
                      <p className="font-medium">
                        {user.created_at 
                          ? new Date(user.created_at).toLocaleDateString('pl-PL') 
                          : 'Brak danych'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Zmiana hasła
                  </h3>
                  <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <div>
                      <Label htmlFor="currentPassword">Obecne hasło</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="newPassword">Nowe hasło</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="rounded-xl"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isChangingPassword} 
                      className="rounded-xl"
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Zmienianie...
                        </>
                      ) : (
                        'Zmień hasło'
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
