import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Lock,
  MapPin,
  CreditCard,
  Phone,
  Mail,
  Save,
  Plus,
  Trash2,
  Shield,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { api, Order, UserProfile, SavedAddress, SavedPayment } from '@/lib/api';
import { toast } from 'sonner';

type Tab = 'orders' | 'profile' | 'addresses' | 'payments' | 'settings';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [savedPayments, setSavedPayments] = useState<SavedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });

  // Address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: '',
    street: '',
    city: '',
    postal_code: '',
    phone: '',
    is_default: false,
  });

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
    if (user) {
      loadData();
    }
  }, [user, activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'orders') {
        const data = await api.getUserOrders();
        setOrders(data);
      } else if (activeTab === 'profile' || activeTab === 'addresses' || activeTab === 'payments') {
        const [profileData, addressesData, paymentsData] = await Promise.all([
          api.getUserProfile().catch(() => null),
          api.getSavedAddresses().catch(() => []),
          api.getSavedPayments().catch(() => []),
        ]);
        if (profileData) {
          setProfile(profileData);
          setProfileForm({
            first_name: profileData.first_name || '',
            last_name: profileData.last_name || '',
            phone: profileData.phone || '',
          });
        }
        setSavedAddresses(addressesData);
        setSavedPayments(paymentsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Wylogowano pomyślnie');
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await api.updateUserProfile(profileForm);
      toast.success('Profil został zapisany');
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd zapisu profilu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!addressForm.street || !addressForm.city || !addressForm.postal_code) {
      toast.error('Wypełnij wszystkie wymagane pola');
      return;
    }

    setIsSaving(true);
    try {
      await api.addSavedAddress(addressForm);
      toast.success('Adres został dodany');
      setShowAddressForm(false);
      setAddressForm({ label: '', street: '', city: '', postal_code: '', phone: '', is_default: false });
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd dodawania adresu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await api.deleteSavedAddress(id);
      toast.success('Adres został usunięty');
      loadData();
    } catch (error) {
      toast.error('Błąd usuwania adresu');
    }
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
      case 'shipped': return <Truck className="w-4 h-4 text-primary" />;
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

  const filterOrders = (status: 'pending' | 'in_progress' | 'completed') => {
    switch (status) {
      case 'pending':
        return orders.filter(o => ['pending', 'paid'].includes(o.status));
      case 'in_progress':
        return orders.filter(o => ['processing', 'shipped'].includes(o.status));
      case 'completed':
        return orders.filter(o => ['delivered', 'cancelled'].includes(o.status));
      default:
        return orders;
    }
  };

  const tabs = [
    { id: 'orders' as Tab, label: 'Zamówienia', icon: Package },
    { id: 'profile' as Tab, label: 'Moje dane', icon: User },
    { id: 'addresses' as Tab, label: 'Adresy', icon: MapPin },
    { id: 'payments' as Tab, label: 'Płatności', icon: CreditCard },
    { id: 'settings' as Tab, label: 'Ustawienia', icon: Settings },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen pt-28 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen pt-28 pb-20 bg-background">
      <div className="section-container max-w-6xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row gap-8"
        >
          {/* Sidebar */}
          <aside className="lg:w-72 flex-shrink-0">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card border border-border rounded-2xl p-6 sticky top-24"
            >
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{profile?.first_name || user.email.split('@')[0]}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>

              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${
                      activeTab === tab.id 
                        ? 'bg-primary text-primary-foreground font-medium' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </motion.button>
                ))}

                <div className="pt-4 mt-4 border-t border-border">
                  <motion.button
                    onClick={handleLogout}
                    whileHover={{ x: 4 }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Wyloguj się
                  </motion.button>
                </div>
              </nav>
            </motion.div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <motion.div key="orders" {...fadeInUp} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Moje zamówienia</h1>
                    <span className="text-sm text-muted-foreground">{orders.length} zamówień</span>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : orders.length === 0 ? (
                    <motion.div 
                      {...fadeInUp}
                      className="bg-card border border-border rounded-2xl p-12 text-center"
                    >
                      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium mb-2">Brak zamówień</h3>
                      <p className="text-muted-foreground text-sm mb-6">Nie masz jeszcze żadnych zamówień.</p>
                      <Button asChild>
                        <Link to="/sklep">Przejdź do sklepu</Link>
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
                      {orders.map((order, idx) => (
                        <motion.div 
                          key={order.id} 
                          variants={fadeInUp}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Zamówienie</p>
                              <p className="font-mono font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                              {getStatusIcon(order.status)}
                              <span className="text-xs font-medium">{getStatusLabel(order.status)}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3 mb-4">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-3 bg-muted/50 rounded-xl p-2 pr-4">
                                <img 
                                  src={item.image?.startsWith('http') ? item.image : `${import.meta.env.PROD ? '' : 'http://localhost:3001'}${item.image}`} 
                                  alt={item.name}
                                  className="w-10 h-10 object-cover rounded-lg bg-muted"
                                />
                                <div>
                                  <p className="text-sm font-medium">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                                </div>
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <div className="flex items-center px-4 text-sm text-muted-foreground">
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
                                <span className="font-medium text-primary">{order.total.toFixed(2)} zł</span>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" asChild className="rounded-xl">
                              <Link to={`/zamowienie/${order.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                Szczegóły
                              </Link>
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <motion.div key="profile" {...fadeInUp} className="space-y-6">
                  <h1 className="text-2xl font-bold">Moje dane</h1>

                  <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground uppercase tracking-wide">
                      <User className="w-4 h-4 text-primary" />
                      Dane osobowe
                    </div>

                    {isLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-4 max-w-md">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Imię</Label>
                            <Input
                              value={profileForm.first_name}
                              onChange={(e) => setProfileForm(p => ({ ...p, first_name: e.target.value }))}
                              placeholder="Jan"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Nazwisko</Label>
                            <Input
                              value={profileForm.last_name}
                              onChange={(e) => setProfileForm(p => ({ ...p, last_name: e.target.value }))}
                              placeholder="Kowalski"
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Email</Label>
                          <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-muted rounded-xl">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{user.email}</span>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Telefon</Label>
                          <Input
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                            placeholder="+48 XXX XXX XXX"
                            className="mt-1"
                          />
                        </div>

                        <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full">
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Zapisz zmiany
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Addresses Tab */}
              {activeTab === 'addresses' && (
                <motion.div key="addresses" {...fadeInUp} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Zapisane adresy</h1>
                    <Button onClick={() => setShowAddressForm(true)} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Dodaj adres
                    </Button>
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <>
                      {showAddressForm && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-card border border-primary/30 rounded-2xl p-6 space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium">Nowy adres</h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowAddressForm(false)}>
                              Anuluj
                            </Button>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                              <Label className="text-xs text-muted-foreground">Nazwa (np. "Dom", "Praca")</Label>
                              <Input
                                value={addressForm.label}
                                onChange={(e) => setAddressForm(a => ({ ...a, label: e.target.value }))}
                                placeholder="Dom"
                                className="mt-1"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label className="text-xs text-muted-foreground">Ulica i numer</Label>
                              <Input
                                value={addressForm.street}
                                onChange={(e) => setAddressForm(a => ({ ...a, street: e.target.value }))}
                                placeholder="ul. Przykładowa 15/4"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Miasto</Label>
                              <Input
                                value={addressForm.city}
                                onChange={(e) => setAddressForm(a => ({ ...a, city: e.target.value }))}
                                placeholder="Kraków"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Kod pocztowy</Label>
                              <Input
                                value={addressForm.postal_code}
                                onChange={(e) => setAddressForm(a => ({ ...a, postal_code: e.target.value }))}
                                placeholder="00-000"
                                className="mt-1"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label className="text-xs text-muted-foreground">Telefon (opcjonalnie)</Label>
                              <Input
                                value={addressForm.phone}
                                onChange={(e) => setAddressForm(a => ({ ...a, phone: e.target.value }))}
                                placeholder="+48 XXX XXX XXX"
                                className="mt-1"
                              />
                            </div>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={addressForm.is_default}
                              onChange={(e) => setAddressForm(a => ({ ...a, is_default: e.target.checked }))}
                              className="w-4 h-4 rounded border-border"
                            />
                            <span className="text-sm">Ustaw jako domyślny</span>
                          </label>

                          <Button onClick={handleSaveAddress} disabled={isSaving} className="w-full">
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Zapisz adres
                          </Button>
                        </motion.div>
                      )}

                      {savedAddresses.length === 0 && !showAddressForm ? (
                        <div className="bg-card border border-border rounded-2xl p-12 text-center">
                          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <MapPin className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <h3 className="font-medium mb-2">Brak zapisanych adresów</h3>
                          <p className="text-muted-foreground text-sm mb-6">Dodaj adres, aby przyspieszyć składanie zamówień.</p>
                          <Button onClick={() => setShowAddressForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Dodaj pierwszy adres
                          </Button>
                        </div>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-4">
                          {savedAddresses.map((address) => (
                            <motion.div
                              key={address.id}
                              variants={fadeInUp}
                              className="bg-card border border-border rounded-2xl p-5 relative group hover:border-primary/30 transition-colors"
                            >
                              {address.is_default && (
                                <span className="absolute top-4 right-4 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                  Domyślny
                                </span>
                              )}
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                  <Home className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium">{address.label || 'Adres'}</p>
                                  <p className="text-sm text-muted-foreground mt-1">{address.street}</p>
                                  <p className="text-sm text-muted-foreground">{address.postal_code} {address.city}</p>
                                  {address.phone && (
                                    <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                                      <Phone className="w-3 h-3" /> {address.phone}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteAddress(address.id)}
                                className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-500 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <motion.div key="payments" {...fadeInUp} className="space-y-6">
                  <h1 className="text-2xl font-bold">Metody płatności</h1>

                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Shield className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium mb-1">Bezpieczne płatności</h3>
                        <p className="text-sm text-muted-foreground">
                          Twoje dane płatnicze są bezpiecznie przetwarzane przez Stripe. 
                          Nie przechowujemy pełnych numerów kart - tylko ostatnie 4 cyfry do identyfikacji.
                        </p>
                      </div>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : savedPayments.length === 0 ? (
                    <div className="bg-card border border-border rounded-2xl p-12 text-center">
                      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium mb-2">Brak zapisanych metod płatności</h3>
                      <p className="text-muted-foreground text-sm">
                        Metody płatności zostaną zapisane podczas składania zamówienia.
                      </p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {savedPayments.map((payment) => (
                        <motion.div
                          key={payment.id}
                          variants={fadeInUp}
                          className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-8 bg-gradient-to-r from-muted to-muted/50 rounded-lg flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">•••• {payment.last4}</p>
                              <p className="text-xs text-muted-foreground">{payment.brand} • Wygasa {payment.exp_month}/{payment.exp_year}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <motion.div key="settings" {...fadeInUp} className="space-y-6">
                  <h1 className="text-2xl font-bold">Ustawienia konta</h1>

                  <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6 text-sm text-muted-foreground uppercase tracking-wide">
                      <Lock className="w-4 h-4 text-primary" />
                      Zmiana hasła
                    </div>
                    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                      <div>
                        <Label className="text-xs text-muted-foreground">Obecne hasło</Label>
                        <Input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Nowe hasło</Label>
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={6}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Potwierdź nowe hasło</Label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="mt-1"
                        />
                      </div>
                      <Button type="submit" disabled={isChangingPassword} className="w-full">
                        {isChangingPassword ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Lock className="w-4 h-4 mr-2" />
                        )}
                        Zmień hasło
                      </Button>
                    </form>
                  </div>

                  <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                      <User className="w-4 h-4 text-primary" />
                      Informacje o koncie
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Email</span>
                        <span>{user.email}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Typ konta</span>
                        <span className="capitalize">{user.role === 'admin' ? 'Administrator' : 'Klient'}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Data rejestracji</span>
                        <span>
                          {user.created_at 
                            ? new Date(user.created_at).toLocaleDateString('pl-PL') 
                            : 'Brak danych'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </main>
  );
}