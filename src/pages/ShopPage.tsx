import { useState, useMemo } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { products, categories } from '@/data/products';

export default function ShopPage() {
  const [selectedCategory, setSelectedCategory] = useState('Wszystkie');

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Wszystkie') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <main className="pt-20 min-h-screen">
      <section className="py-16">
        <div className="section-container">
          <h1 className="text-4xl md:text-5xl font-bold mb-12">Sklep</h1>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-12">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-sm transition-colors ${
                  selectedCategory === cat
                    ? 'bg-foreground text-background'
                    : 'bg-card text-foreground hover:bg-muted'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
