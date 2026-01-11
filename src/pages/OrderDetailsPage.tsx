import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2,
  Mail,
  Phone,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { api, Order } from '@/lib/api';

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id && user) {
      loadOrder();
    }
  }, [id, user]);

  const loadOrder = async () => {
    try {
      const data = await api.getOrder(id!);
      setOrder(data);
    } catch (error) {
      setError('Nie udało się załadować zamówienia');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'paid': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing': return <Package className="w-5 h-5 text-blue-500" />;
      case 'shipped': return <Truck className="w-5 h-5 text-purple-500" />;
      case 'delivered': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Oczekujące na płatność',
      paid: 'Opłacone',
      processing: 'W realizacji',
      shipped: 'Wysłane',
      delivered: 'Dostarczone',
      cancelled: 'Anulowane'
    };
    return labels[status] || status;
  };

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen pt-28 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen pt-28 pb-20">
        <div className="section-container max-w-2xl text-center">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Błąd</h1>
          <p className="text-muted-foreground mb-6">{error || 'Zamówienie nie zostało znalezione'}</p>
          <Button asChild className="rounded-xl">
            <Link to="/konto">Wróć do zamówień</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-28 pb-20">
      <div className="section-container max-w-4xl">
        <button
          onClick={() => navigate('/konto')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Wróć do zamówień
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Zamówienie #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-muted-foreground">
              Złożone {new Date(order.created_at).toLocaleDateString('pl-PL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-xl">
            {getStatusIcon(order.status)}
            <span className="font-medium">{getStatusLabel(order.status)}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Shipping Address */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Adres dostawy
            </h3>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{order.shipping_address.name}</p>
              <p className="text-muted-foreground">{order.shipping_address.street}</p>
              <p className="text-muted-foreground">
                {order.shipping_address.postalCode} {order.shipping_address.city}
              </p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              Dane kontaktowe
            </h3>
            <div className="space-y-3 text-sm">
              {order.customer_name && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{order.customer_name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{order.customer_email}</span>
              </div>
              {order.customer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{order.customer_phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produkty ({order.items.length})
            </h3>
          </div>
          <div className="divide-y divide-border">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4">
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-xl bg-muted"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Ilość: {item.quantity}</p>
                </div>
                <p className="font-semibold">{(item.price * item.quantity).toFixed(2)} zł</p>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Podsumowanie</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Produkty</span>
              <span>{order.total.toFixed(2)} zł</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dostawa</span>
              <span>0.00 zł</span>
            </div>
            <div className="flex justify-between pt-4 border-t border-border text-lg font-semibold">
              <span>Razem</span>
              <span>{order.total.toFixed(2)} zł</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
