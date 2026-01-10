import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Loader2, ArrowRight } from 'lucide-react';
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
      const data = await api.getFeaturedProducts();
      setFeaturedProducts(data.slice(0, 4));
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
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="font-semibold mb-2">Unikalne projekty</h3>
              <p className="text-muted-foreground text-sm">
                Każdy produkt jest starannie zaprojektowany i wydrukowany z najwyższą precyzją.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">♻️</span>
              </div>
              <h3 className="font-semibold mb-2">Ekologiczne materiały</h3>
              <p className="text-muted-foreground text-sm">
                Używamy biodegradowalnych filamentów PLA i PETG przyjaznych dla środowiska.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📦</span>
              </div>
              <h3 className="font-semibold mb-2">Szybka dostawa</h3>
              <p className="text-muted-foreground text-sm">
                Wysyłka w ciągu 24h od złożenia zamówienia na terenie całej Polski.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
