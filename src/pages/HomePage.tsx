import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronDown, 
  Loader2, 
  ArrowRight, 
  Palette, 
  Leaf, 
  Truck, 
  Shield, 
  Star,
  Clock,
  CreditCard
} from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { api, Product } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      // Try featured products first
      const featured = await api.getFeaturedProducts();
      if (featured.length >= 4) {
        setFeaturedProducts(featured.slice(0, 4));
      } else {
        // If not enough featured, get all products and pick first 4
        const allProducts = await api.getProducts();
        // Combine featured with other products (featured first)
        const combined = [
          ...featured,
          ...allProducts.filter(p => !featured.some(f => f.id === p.id))
        ];
        setFeaturedProducts(combined.slice(0, 4));
      }
    } catch (error) {
      console.error('Error loading featured products:', error);
      // Fallback: try getting all products
      try {
        const allProducts = await api.getProducts();
        setFeaturedProducts(allProducts.slice(0, 4));
      } catch (err) {
        console.error('Error loading products:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main>
      {/* Hero - Fullscreen */}
      <section className="relative h-screen flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <video 
            src="majster.mov" 
            autoPlay 
            className="w-full h-full object-cover" 
            loop 
            playsInline 
            muted
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-background/10" />
        </div>
        
        <div className="relative z-10 text-center px-6 animate-fade-in">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-4">
            Druk 3D dla Twojego domu
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8">
            Produkty z przyszłości
          </h1>
          <Button asChild size="lg" className="h-14 px-10 text-base">
            <Link to="/sklep">
              Zobacz produkty
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>

        <Link 
          to="#products" 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce"
        >
          <ChevronDown className="w-8 h-8 text-muted-foreground" />
        </Link>
      </section>

      {/* Trust Badges */}
      <section className="py-8 border-b border-border bg-card/50">
        <div className="section-container">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-5 h-5 text-primary" />
              <span>Bezpieczne płatności</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Truck className="w-5 h-5 text-primary" />
              <span>Darmowa dostawa od 200 zł</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-5 h-5 text-primary" />
              <span>Wysyłka w 24h</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="w-5 h-5 text-primary" />
              <span>Płatność kartą, BLIK, PayPal</span>
            </div>
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="py-24 bg-card/30">
        <div className="section-container">
          <div className="flex items-center justify-between mb-12">
            <div>
              <p className="text-sm uppercase tracking-wider text-primary mb-2">Oferta</p>
              <h2 className="text-3xl md:text-4xl font-bold">Popularne produkty</h2>
            </div>
            <Link 
              to="/sklep" 
              className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              Zobacz wszystkie
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground mb-4">Brak produktów</p>
              <Button asChild variant="outline">
                <Link to="/sklep">Przejdź do sklepu</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="mt-12 text-center sm:hidden">
            <Button asChild variant="outline">
              <Link to="/sklep">Zobacz wszystkie produkty</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="section-container">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-wider text-primary mb-2">Dlaczego my?</p>
            <h2 className="text-3xl md:text-4xl font-bold">Jakość, na którą zasługujesz</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Palette className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Unikalne projekty</h3>
              <p className="text-muted-foreground">
                Każdy produkt jest starannie zaprojektowany i wydrukowany z najwyższą precyzją.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Ekologiczne materiały</h3>
              <p className="text-muted-foreground">
                Używamy biodegradowalnych filamentów PLA i PETG przyjaznych dla środowiska.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Truck className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Szybka dostawa</h3>
              <p className="text-muted-foreground">
                Wysyłka w ciągu 24h od złożenia zamówienia na terenie całej Polski.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews / Social Proof */}
      <section className="py-24 bg-card/30">
        <div className="section-container">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-wider text-primary mb-2">Opinie</p>
            <h2 className="text-3xl md:text-4xl font-bold">Co mówią nasi klienci</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Anna K.',
                text: 'Świetna jakość produktów! Organizery na biurko są dokładnie takie, jakich szukałam. Polecam!',
                rating: 5
              },
              {
                name: 'Michał W.',
                text: 'Bardzo szybka wysyłka i profesjonalna obsługa. Produkt zgodny z opisem, jestem zadowolony.',
                rating: 5
              },
              {
                name: 'Karolina M.',
                text: 'Uwielbiam design tych produktów. Już zamówiłam kolejne rzeczy. Na pewno wrócę po więcej!',
                rating: 5
              }
            ].map((review, idx) => (
              <div key={idx} className="bg-card border border-border rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">{review.text}</p>
                <p className="font-semibold">{review.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="section-container">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-3xl p-12 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Gotowy na zakupy?</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Przeglądaj naszą kolekcję unikalnych produktów drukowanych w 3D i znajdź coś idealnego dla siebie.
            </p>
            <Button asChild size="lg" className="h-14 px-10 text-base">
              <Link to="/sklep">
                Przejdź do sklepu
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
