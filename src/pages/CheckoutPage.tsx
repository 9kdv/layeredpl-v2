import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowLeft, Loader2, CheckCircle, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';
import { api, ShippingAddress } from '@/lib/api';
import { toast } from 'sonner';

let stripePromise: Promise<any> | null = null;

const getStripe = async () => {
  if (!stripePromise) {
    const config = await api.getStripeConfig();
    stripePromise = loadStripe(config.publishableKey);
  }
  return stripePromise;
};

function CheckoutForm({ 
  shippingAddress, 
  customerEmail,
  customerName,
  customerPhone,
  onSuccess 
}: { 
  shippingAddress: ShippingAddress;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/zamowienie-sukces`,
        receipt_email: customerEmail,
        shipping: {
          name: customerName,
          phone: customerPhone,
          address: {
            line1: shippingAddress.street,
            city: shippingAddress.city,
            postal_code: shippingAddress.postalCode,
            country: 'PL',
          },
        },
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'Wystąpił błąd podczas płatności');
      setIsProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Metoda płatności</h3>
        <PaymentElement 
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {errorMessage && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
          {errorMessage}
        </div>
      )}

      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full h-12 text-base"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Przetwarzanie...
          </>
        ) : (
          'Zapłać i zamów'
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Płatności obsługiwane przez Stripe. Twoje dane są bezpieczne.
      </p>
    </form>
  );
}

function OrderSuccess() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, []);

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-4">Dziękujemy za zamówienie!</h1>
        <p className="text-muted-foreground mb-8">
          Twoje zamówienie zostało przyjęte. Otrzymasz email z potwierdzeniem.
        </p>
        <Button asChild>
          <Link to="/sklep">Kontynuuj zakupy</Link>
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const [step, setStep] = useState<'shipping' | 'payment' | 'success'>('shipping');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [shippingForm, setShippingForm] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (items.length === 0 && step !== 'success') {
      navigate('/sklep');
    }
  }, [items, step, navigate]);

  useEffect(() => {
    getStripe().then(setStripeInstance);
  }, []);

  const validateShipping = () => {
    const newErrors: Record<string, string> = {};

    if (!shippingForm.name.trim()) newErrors.name = 'Imię i nazwisko jest wymagane';
    if (!shippingForm.email.trim()) newErrors.email = 'Email jest wymagany';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingForm.email)) newErrors.email = 'Nieprawidłowy email';
    if (!shippingForm.phone.trim()) newErrors.phone = 'Telefon jest wymagany';
    if (!shippingForm.street.trim()) newErrors.street = 'Adres jest wymagany';
    if (!shippingForm.city.trim()) newErrors.city = 'Miasto jest wymagane';
    if (!shippingForm.postalCode.trim()) newErrors.postalCode = 'Kod pocztowy jest wymagany';
    else if (!/^\d{2}-\d{3}$/.test(shippingForm.postalCode)) newErrors.postalCode = 'Format: 00-000';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateShipping()) return;

    setIsLoading(true);

    try {
      const result = await api.createPaymentIntent(
        items,
        {
          name: shippingForm.name,
          street: shippingForm.street,
          city: shippingForm.city,
          postalCode: shippingForm.postalCode,
          phone: shippingForm.phone,
        },
        shippingForm.email,
        shippingForm.name,
        shippingForm.phone
      );

      setClientSecret(result.clientSecret);
      setStep('payment');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd podczas tworzenia płatności');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setStep('success');
    clearCart();
  };

  if (step === 'success') {
    return <OrderSuccess />;
  }

  return (
    <main className="pt-20 min-h-screen pb-12">
      <div className="section-container max-w-4xl">
        <button
          onClick={() => step === 'payment' ? setStep('shipping') : navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 mt-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 'payment' ? 'Wróć do danych' : 'Wróć'}
        </button>

        <h1 className="text-3xl font-bold mb-8">Zamówienie</h1>

        {/* Progress */}
        <div className="flex items-center gap-4 mb-12">
          <div className={`flex items-center gap-2 ${step === 'shipping' ? 'text-primary' : 'text-muted-foreground'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'shipping' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</span>
            <span className="hidden sm:inline">Dane dostawy</span>
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className={`flex items-center gap-2 ${step === 'payment' ? 'text-primary' : 'text-muted-foreground'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'payment' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</span>
            <span className="hidden sm:inline">Płatność</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-12">
          {/* Form */}
          <div className="lg:col-span-3">
            {step === 'shipping' && (
              <form onSubmit={handleShippingSubmit} className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                  <h3 className="font-semibold mb-2">Dane kontaktowe</h3>
                  
                  <div>
                    <Label htmlFor="name">Imię i nazwisko</Label>
                    <Input
                      id="name"
                      value={shippingForm.name}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, name: e.target.value }))}
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={shippingForm.email}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, email: e.target.value }))}
                        className={errors.email ? 'border-destructive' : ''}
                      />
                      {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={shippingForm.phone}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, phone: e.target.value }))}
                        className={errors.phone ? 'border-destructive' : ''}
                      />
                      {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone}</p>}
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                  <h3 className="font-semibold mb-2">Adres dostawy</h3>

                  <div>
                    <Label htmlFor="street">Ulica i numer</Label>
                    <Input
                      id="street"
                      value={shippingForm.street}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, street: e.target.value }))}
                      className={errors.street ? 'border-destructive' : ''}
                    />
                    {errors.street && <p className="text-destructive text-sm mt-1">{errors.street}</p>}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="postalCode">Kod pocztowy</Label>
                      <Input
                        id="postalCode"
                        placeholder="00-000"
                        value={shippingForm.postalCode}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, postalCode: e.target.value }))}
                        className={errors.postalCode ? 'border-destructive' : ''}
                      />
                      {errors.postalCode && <p className="text-destructive text-sm mt-1">{errors.postalCode}</p>}
                    </div>
                    <div>
                      <Label htmlFor="city">Miasto</Label>
                      <Input
                        id="city"
                        value={shippingForm.city}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, city: e.target.value }))}
                        className={errors.city ? 'border-destructive' : ''}
                      />
                      {errors.city && <p className="text-destructive text-sm mt-1">{errors.city}</p>}
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full h-12 text-base" size="lg">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Przygotowanie...
                    </>
                  ) : (
                    'Przejdź do płatności'
                  )}
                </Button>
              </form>
            )}

            {step === 'payment' && clientSecret && stripeInstance && (
              <Elements 
                stripe={stripeInstance} 
                options={{ 
                  clientSecret,
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorPrimary: '#a855f7',
                      colorBackground: '#0a0a0a',
                      colorText: '#ffffff',
                      colorDanger: '#ef4444',
                      fontFamily: 'Poppins, system-ui, sans-serif',
                      borderRadius: '4px',
                    },
                  },
                  locale: 'pl',
                }}
              >
                <CheckoutForm
                  shippingAddress={{
                    name: shippingForm.name,
                    street: shippingForm.street,
                    city: shippingForm.city,
                    postalCode: shippingForm.postalCode,
                    phone: shippingForm.phone,
                  }}
                  customerEmail={shippingForm.email}
                  customerName={shippingForm.name}
                  customerPhone={shippingForm.phone}
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Podsumowanie ({items.length})
              </h3>

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-16 h-16 object-cover rounded bg-muted"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                    </div>
                    <p className="font-medium text-sm">{(item.price * item.quantity).toFixed(2)} zł</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Produkty</span>
                  <span>{totalPrice.toFixed(2)} zł</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dostawa</span>
                  <span>0.00 zł</span>
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t border-border">
                  <span>Razem</span>
                  <span>{totalPrice.toFixed(2)} zł</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
