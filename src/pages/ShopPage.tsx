import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { api, Product } from '@/lib/api';

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Wszystkie');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [selectedCategory]);

  const loadProducts = async () => {
    try {
      const data = await api.getProducts(
        selectedCategory !== 'Wszystkie' ? selectedCategory : undefined
      );
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  return (
    <main className="pt-20 min-h-screen">
      <section className="py-16">
        <div className="section-container">
          <h1 className="text-4xl md:text-5xl font-bold mb-12">Sklep</h1>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-12">
            <button
              onClick={() => setSelectedCategory('Wszystkie')}
              className={`px-5 py-2.5 text-sm font-medium transition-all rounded-full ${
                selectedCategory === 'Wszystkie'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground hover:bg-muted border border-border'
              }`}
            >
              Wszystkie
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 text-sm font-medium transition-all rounded-full ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:bg-muted border border-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">Brak produktów w tej kategorii</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
