import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { products } from '@/data/products';
import heroDark from '@/assets/hero-dark.jpg';

export default function HomePage() {
  const featuredProducts = products.filter((p) => p.featured).slice(0, 4);

  return (
    <main>
      {/* Hero - Fullscreen */}
      <section className="relative h-screen flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img
            src={heroDark}
            alt="Layered"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>
        
        <div className="relative z-10 text-center animate-fade-in">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-4">
            SPRAWDŹ PRODUKTY
          </h1>
        </div>

        <Link 
          to="#products" 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce"
        >
          <ChevronDown className="w-8 h-8 text-muted-foreground" />
        </Link>
      </section>

      {/* Products */}
      <section id="products" className="py-24">
        <div className="section-container">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-2xl font-bold">Nowe produkty</h2>
            <Link to="/sklep" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ZOBACZ WSZYSTKIE
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
