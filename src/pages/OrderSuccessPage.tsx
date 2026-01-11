import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, Truck, MapPin, ArrowRight, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [orderId] = useState(() => searchParams.get('order_id') || 'UNKNOWN');
  
  useEffect(() => {
    clearCart();
  }, [clearCart]);

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
              <p className="font-mono font-semibold text-lg">#{orderId.slice(0, 8).toUpperCase()}</p>
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
