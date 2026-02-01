import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, Truck, MapPin, ArrowRight, ShoppingBag, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { api } from '@/lib/api';

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const handleOrderCreation = async () => {
      const paymentIntentId = searchParams.get('payment_intent_id') || searchParams.get('payment_intent');
      const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
      const orderIdParam = searchParams.get('order_id');
      const redirectStatus = searchParams.get('redirect_status');

      // If we have an order_id, order was already created
      if (orderIdParam && !paymentIntentId) {
        setOrderId(orderIdParam);
        setIsVerifying(false);
        clearCart();
        return;
      }

      // If we have a payment_intent, we need to create the order
      if (paymentIntentId) {
        try {
          // Extract payment intent ID from client secret if needed
          const piId = paymentIntentClientSecret 
            ? paymentIntentClientSecret.split('_secret')[0]
            : paymentIntentId;

          // First check if order already exists
          try {
            const verifyResult = await api.verifyPayment(piId);
            if (verifyResult.success && verifyResult.orderId) {
              setOrderId(verifyResult.orderId);
              clearCart();
              setIsVerifying(false);
              return;
            }
          } catch (verifyErr: any) {
            // If order doesn't exist but payment is verified, we need to create order
            // This happens after redirect from Stripe
            if (verifyErr?.message?.includes('needsOrderCreation') || verifyErr?.message?.includes('nie zostało utworzone')) {
              // Payment verified but order needs creation
              // Unfortunately we don't have the cart data after redirect
              // Show success message and ask user to contact support if issues
              setError('Płatność przeszła pomyślnie, ale wystąpił problem z utworzeniem zamówienia. Skontaktuj się z nami pod kontakt@layered.pl podając numer płatności.');
              setIsVerifying(false);
              return;
            }
          }

          // Try to get order status as fallback
          if (redirectStatus === 'succeeded') {
            try {
              const statusResult = await api.getOrderStatus(piId);
              if (statusResult.orderId) {
                setOrderId(statusResult.orderId);
                clearCart();
                setIsVerifying(false);
                return;
              }
            } catch (statusErr) {
              // Order doesn't exist yet
            }
          }

          setError('Nie znaleziono zamówienia. Jeśli płatność została pobrana, skontaktuj się z obsługą.');
        } catch (err) {
          console.error('Order verification error:', err);
          setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas weryfikacji płatności');
        }
      } else {
        setError('Brak informacji o płatności');
      }

      setIsVerifying(false);
    };

    handleOrderCreation();
  }, [searchParams, clearCart]);

  if (isVerifying) {
    return (
      <main className="min-h-screen pt-28 pb-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Weryfikuję płatność...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen pt-28 pb-20">
        <div className="section-container max-w-2xl">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Wystąpił problem</h1>
            <p className="text-muted-foreground text-lg mb-6">{error}</p>
            <p className="text-sm text-muted-foreground mb-8">
              Jeśli płatność została pobrana, skontaktuj się z nami - sprawdzimy status Twojego zamówienia.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline" size="lg" className="rounded-xl">
                <Link to="/kontakt">Kontakt</Link>
              </Button>
              <Button asChild size="lg" className="rounded-xl">
                <Link to="/sklep">Wróć do sklepu</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-28 pb-20">
      <div className="section-container max-w-2xl">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Dziękujemy za zamówienie!</h1>
          <p className="text-muted-foreground text-lg">
            Twoje zamówienie zostało przyjęte i jest przetwarzane.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-8">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-border">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Numer zamówienia</p>
              <p className="font-mono font-semibold text-lg">#{orderId?.slice(0, 8).toUpperCase() || 'UNKNOWN'}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl">
              <Package className="w-6 h-6 text-primary" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Zamówienie przyjęte</p>
                <p className="text-sm text-muted-foreground">Otrzymaliśmy Twoje zamówienie i potwierdzenie płatności.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Przygotowanie zamówienia</p>
                <p className="text-sm text-muted-foreground">Twoje produkty są przygotowywane do wysyłki.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Wysyłka</p>
                <p className="text-sm text-muted-foreground">Otrzymasz email z numerem śledzenia przesyłki.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Dostawa</p>
                <p className="text-sm text-muted-foreground">Przesyłka dotrze pod wskazany adres.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 border border-border rounded-2xl p-6 mb-8">
          <p className="text-sm text-center text-muted-foreground">
            Potwierdzenie zamówienia zostało wysłane na Twój adres email. 
            Jeśli masz pytania, skontaktuj się z nami przez stronę kontaktową.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline" size="lg" className="rounded-xl">
            <Link to="/kontakt">
              Kontakt
            </Link>
          </Button>
          <Button asChild size="lg" className="rounded-xl">
            <Link to="/sklep">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Kontynuuj zakupy
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
