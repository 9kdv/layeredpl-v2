import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Loader2, 
  MapPin, 
  CreditCard,
  Check,
  User,
  Truck,
  Package,
  ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
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

// Step definitions
type CheckoutStep = 'contact' | 'delivery' | 'payment';

const steps: { id: CheckoutStep; label: string; icon: React.ReactNode }[] = [
  { id: 'contact', label: 'Dane', icon: <User className="w-4 h-4" /> },
  { id: 'delivery', label: 'Dostawa', icon: <Truck className="w-4 h-4" /> },
  { id: 'payment', label: 'Płatność', icon: <CreditCard className="w-4 h-4" /> },
];

// Payment Form Component
function PaymentForm({ 
  onSuccess,
  isProcessing,
  setIsProcessing,
  orderId
}: { 
  onSuccess: () => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  orderId?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    // Include order_id in return URL for verification
    const returnUrl = orderId 
      ? `${window.location.origin}/zamowienie-sukces?order_id=${orderId}`
      : `${window.location.origin}/zamowienie-sukces`;

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'Wystąpił błąd podczas płatności');
      setIsProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      // Payment succeeded without redirect - verify on backend
      try {
        await api.verifyPayment(paymentIntent.id, orderId);
      } catch (err) {
        console.error('Verification error (payment succeeded):', err);
      }
      onSuccess();
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wide">Wybierz metodę płatności</h3>
        <PaymentElement 
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {errorMessage && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-xl text-sm">
          {errorMessage}
        </div>
      )}

      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full h-12"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Przetwarzanie...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Zapłać
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Płatności obsługiwane przez Stripe. Twoje dane są bezpieczne.
      </p>
    </form>
  );
}

// InPost Locker Input Component
function InPostLockerInput({ 
  value, 
  onChange, 
  error,
  isVerifying,
  setIsVerifying
}: { 
  value: string; 
  onChange: (v: string, verified: boolean, address?: string) => void;
  error?: string;
  isVerifying: boolean;
  setIsVerifying: (v: boolean) => void;
}) {
  const [lockerCode, setLockerCode] = useState(value);
  const [isValid, setIsValid] = useState(false);
  const [lockerAddress, setLockerAddress] = useState('');

  const verifyLocker = useCallback(async () => {
    if (!lockerCode.trim()) return;
    
    setIsVerifying(true);
    try {
      const result = await api.verifyInPostLocker(lockerCode.toUpperCase());
      if (result.valid) {
        setIsValid(true);
        setLockerAddress(result.address || '');
        onChange(lockerCode.toUpperCase(), true, result.address);
        toast.success('Paczkomat zweryfikowany');
      } else {
        setIsValid(false);
        setLockerAddress('');
        onChange(lockerCode.toUpperCase(), false);
        toast.error('Nie znaleziono paczkomatu o podanym kodzie');
      }
    } catch (err) {
      setIsValid(false);
      toast.error('Błąd weryfikacji paczkomatu');
    } finally {
      setIsVerifying(false);
    }
  }, [lockerCode, onChange, setIsVerifying]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={lockerCode}
            onChange={(e) => {
              setLockerCode(e.target.value.toUpperCase());
              setIsValid(false);
            }}
            placeholder="np. KRA010"
            className={`uppercase ${error ? 'border-destructive' : isValid ? 'border-green-500' : ''}`}
          />
        </div>
        <Button 
          type="button"
          variant="outline"
          onClick={verifyLocker}
          disabled={isVerifying || !lockerCode.trim()}
        >
          {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sprawdź'}
        </Button>
      </div>
      {isValid && lockerAddress && (
        <div className="flex items-start gap-2 text-sm text-green-500 bg-green-500/10 p-3 rounded-lg">
          <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{lockerAddress}</span>
        </div>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Wpisz kod paczkomatu (np. KRA010) i kliknij "Sprawdź" aby zweryfikować
      </p>
    </div>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('contact');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifyingLocker, setIsVerifyingLocker] = useState(false);

  // Form states
  const [useAccountData, setUseAccountData] = useState(true);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: user?.email || '',
    phone: '',
  });
  
  const [deliveryMethod, setDeliveryMethod] = useState<'address' | 'inpost'>('address');
  const [addressForm, setAddressForm] = useState({
    street: '',
    city: '',
    postalCode: '',
  });
  const [inpostLocker, setInpostLocker] = useState({
    code: '',
    verified: false,
    address: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate shipping cost
  const shippingCost = deliveryMethod === 'inpost' ? 12.99 : (totalPrice >= 200 ? 0 : 15.99);
  const finalTotal = totalPrice + shippingCost;

  useEffect(() => {
    if (items.length === 0) {
      navigate('/sklep');
    }
  }, [items, navigate]);

  useEffect(() => {
    getStripe().then(setStripeInstance);
  }, []);

  useEffect(() => {
    if (user && useAccountData) {
      setContactForm(prev => ({
        ...prev,
        email: user.email,
      }));
    }
  }, [user, useAccountData]);

  const validateContact = () => {
    const newErrors: Record<string, string> = {};

    if (!contactForm.name.trim()) newErrors.name = 'Imię i nazwisko jest wymagane';
    if (!contactForm.email.trim()) newErrors.email = 'Email jest wymagany';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) newErrors.email = 'Nieprawidłowy email';
    if (!contactForm.phone.trim()) newErrors.phone = 'Telefon jest wymagany';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDelivery = () => {
    const newErrors: Record<string, string> = {};

    if (deliveryMethod === 'address') {
      if (!addressForm.street.trim()) newErrors.street = 'Adres jest wymagany';
      if (!addressForm.city.trim()) newErrors.city = 'Miasto jest wymagane';
      if (!addressForm.postalCode.trim()) newErrors.postalCode = 'Kod pocztowy jest wymagany';
      else if (!/^\d{2}-\d{3}$/.test(addressForm.postalCode)) newErrors.postalCode = 'Format: 00-000';
    } else {
      if (!inpostLocker.code.trim()) newErrors.locker = 'Wybierz paczkomat';
      else if (!inpostLocker.verified) newErrors.locker = 'Zweryfikuj paczkomat przed kontynuacją';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContactSubmit = () => {
    if (!validateContact()) return;
    setCurrentStep('delivery');
  };

  const handleDeliverySubmit = async () => {
    if (!validateDelivery()) return;
    
    setIsLoading(true);

    try {
      const shippingAddress: ShippingAddress = deliveryMethod === 'address' 
        ? {
            name: contactForm.name,
            street: addressForm.street,
            city: addressForm.city,
            postalCode: addressForm.postalCode,
            phone: contactForm.phone,
          }
        : {
            name: contactForm.name,
            street: `Paczkomat InPost: ${inpostLocker.code}`,
            city: inpostLocker.address || 'InPost',
            postalCode: '',
            phone: contactForm.phone,
          };

      const result = await api.createPaymentIntent(
        items,
        shippingAddress,
        contactForm.email,
        contactForm.name,
        contactForm.phone,
        shippingCost
      );

      setClientSecret(result.clientSecret);
      setOrderId(result.orderId);
      setCurrentStep('payment');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd podczas tworzenia płatności');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    clearCart();
    navigate('/zamowienie-sukces');
  };

  const goBack = () => {
    if (currentStep === 'delivery') setCurrentStep('contact');
    else if (currentStep === 'payment') setCurrentStep('delivery');
    else navigate(-1);
  };

  const getStepIndex = (step: CheckoutStep) => steps.findIndex(s => s.id === step);

  return (
    <main className="pt-20 min-h-screen pb-12 bg-background">
      <div className="section-container max-w-4xl">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 mt-8 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Wróć
        </button>

        <h1 className="text-2xl font-bold mb-8">Zamówienie</h1>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-10">
          {steps.map((step, idx) => {
            const isCurrent = step.id === currentStep;
            const isPast = getStepIndex(currentStep) > idx;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  isCurrent 
                    ? 'bg-primary text-primary-foreground' 
                    : isPast 
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {isPast ? <Check className="w-4 h-4" /> : step.icon}
                  <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                  <span className="text-sm font-medium sm:hidden">{idx + 1}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isPast ? 'bg-primary/50' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-3 space-y-6">
            {/* Step 1: Contact */}
            {currentStep === 'contact' && (
              <div className="space-y-6">
                {user && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useAccountData}
                        onChange={(e) => setUseAccountData(e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                      />
                      <span className="text-sm">Użyj danych z konta ({user.email})</span>
                    </label>
                  </div>
                )}

                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Dane kontaktowe</h3>
                  
                  <div>
                    <Label htmlFor="name">Imię i nazwisko</Label>
                    <Input
                      id="name"
                      value={contactForm.name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
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
                        value={contactForm.email}
                        onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                        disabled={user && useAccountData}
                        className={errors.email ? 'border-destructive' : ''}
                      />
                      {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+48 XXX XXX XXX"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                        className={errors.phone ? 'border-destructive' : ''}
                      />
                      {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone}</p>}
                    </div>
                  </div>
                </div>

                <Button onClick={handleContactSubmit} className="w-full h-12" size="lg">
                  Dalej: Wybierz dostawę
                </Button>
              </div>
            )}

            {/* Step 2: Delivery */}
            {currentStep === 'delivery' && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Sposób dostawy</h3>
                  
                  <RadioGroup 
                    value={deliveryMethod} 
                    onValueChange={(v) => setDeliveryMethod(v as 'address' | 'inpost')}
                    className="space-y-3"
                  >
                    <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                      deliveryMethod === 'address' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                    }`}>
                      <RadioGroupItem value="address" id="address" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Truck className="w-5 h-5 text-primary" />
                          <span className="font-medium">Dostawa kurierem</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {totalPrice >= 200 ? 'Darmowa dostawa' : '15.99 zł'} • 1-3 dni robocze
                        </p>
                      </div>
                    </label>

                    <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                      deliveryMethod === 'inpost' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                    }`}>
                      <RadioGroupItem value="inpost" id="inpost" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-primary" />
                          <span className="font-medium">Paczkomat InPost</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">12.99 zł • 1-2 dni robocze</p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                {deliveryMethod === 'address' && (
                  <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Adres dostawy
                    </h3>

                    <div>
                      <Label htmlFor="street">Ulica i numer</Label>
                      <Input
                        id="street"
                        value={addressForm.street}
                        onChange={(e) => setAddressForm(prev => ({ ...prev, street: e.target.value }))}
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
                          value={addressForm.postalCode}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, postalCode: e.target.value }))}
                          className={errors.postalCode ? 'border-destructive' : ''}
                        />
                        {errors.postalCode && <p className="text-destructive text-sm mt-1">{errors.postalCode}</p>}
                      </div>
                      <div>
                        <Label htmlFor="city">Miasto</Label>
                        <Input
                          id="city"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                          className={errors.city ? 'border-destructive' : ''}
                        />
                        {errors.city && <p className="text-destructive text-sm mt-1">{errors.city}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {deliveryMethod === 'inpost' && (
                  <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Wybierz paczkomat
                    </h3>

                    <InPostLockerInput
                      value={inpostLocker.code}
                      onChange={(code, verified, address) => setInpostLocker({ code, verified, address: address || '' })}
                      error={errors.locker}
                      isVerifying={isVerifyingLocker}
                      setIsVerifying={setIsVerifyingLocker}
                    />
                  </div>
                )}

                <Button 
                  onClick={handleDeliverySubmit} 
                  disabled={isLoading}
                  className="w-full h-12" 
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Przygotowanie...
                    </>
                  ) : (
                    'Dalej: Płatność'
                  )}
                </Button>
              </div>
            )}

            {/* Step 3: Payment */}
            {currentStep === 'payment' && clientSecret && stripeInstance && (
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
                      borderRadius: '12px',
                    },
                  },
                  locale: 'pl',
                }}
              >
                <PaymentForm
                  onSuccess={handlePaymentSuccess}
                  isProcessing={isProcessing}
                  setIsProcessing={setIsProcessing}
                  orderId={orderId || undefined}
                />
              </Elements>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
              <h3 className="font-medium mb-4 flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
                <ShoppingBag className="w-4 h-4" />
                Podsumowanie
              </h3>

              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.cartItemId} className="flex gap-3">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-14 h-14 object-cover rounded-lg bg-muted"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                      {/* Customizations summary */}
                      {item.customizations && item.customizations.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.customizations.map((c, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground truncate">
                              {c.optionLabel}: {
                                c.selectedColors?.map(col => col.name).join(', ') ||
                                c.selectedMaterial?.name ||
                                c.selectedSize?.name ||
                                c.textValue ||
                                c.uploadedFiles?.map(f => f.name).join(', ') ||
                                c.selectedOption?.label
                              }
                            </p>
                          ))}
                        </div>
                      )}
                      {item.nonRefundable && (
                        <p className="text-xs text-amber-400 mt-0.5">Brak zwrotu</p>
                      )}
                    </div>
                    <p className="font-medium text-sm">
                      {((item.price + (item.customizationPrice || 0)) * item.quantity).toFixed(2)} zł
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Produkty</span>
                  <span>{totalPrice.toFixed(2)} zł</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dostawa</span>
                  <span>{shippingCost === 0 ? 'Gratis' : `${shippingCost.toFixed(2)} zł`}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-2 border-t border-border">
                  <span>Razem</span>
                  <span>{finalTotal.toFixed(2)} zł</span>
                </div>
              </div>

              {currentStep !== 'contact' && (
                <div className="mt-6 pt-4 border-t border-border text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Odbiorca</span>
                    <span className="text-right">{contactForm.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="text-right truncate max-w-[150px]">{contactForm.email}</span>
                  </div>
                  {currentStep === 'payment' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dostawa</span>
                      <span className="text-right">
                        {deliveryMethod === 'inpost' ? `InPost: ${inpostLocker.code}` : addressForm.city}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}