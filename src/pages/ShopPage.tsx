import { useState, useEffect } from 'react';
import { Loader2, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { api, Product } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

type SortOption = 'newest' | 'cheapest' | 'expensive';

const sortLabels: Record<SortOption, string> = {
  newest: 'Najnowsze',
  cheapest: 'Cena: rosnąco',
  expensive: 'Cena: malejąco',
};

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Wszystkie');
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [appliedPriceRange, setAppliedPriceRange] = useState({ min: 0, max: Infinity });
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [selectedCategory]);

  const loadProducts = async () => {
    setIsLoading(true);
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

  const applyPriceFilter = () => {
    setAppliedPriceRange({
      min: priceRange.min ? parseFloat(priceRange.min) : 0,
      max: priceRange.max ? parseFloat(priceRange.max) : Infinity,
    });
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    setPriceRange({ min: '', max: '' });
    setAppliedPriceRange({ min: 0, max: Infinity });
    setFiltersOpen(false);
  };

  // Filter and sort products
  const filteredProducts = products
    .filter(p => p.price >= appliedPriceRange.min && p.price <= appliedPriceRange.max)
    .sort((a, b) => {
      switch (sortBy) {
        case 'cheapest':
          return a.price - b.price;
        case 'expensive':
          return b.price - a.price;
        case 'newest':
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });

  const hasActiveFilters = appliedPriceRange.min > 0 || appliedPriceRange.max < Infinity;

  return (
    <main className="pt-20 min-h-screen">
      <section className="py-12">
        <div className="section-container">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <h1 className="text-3xl font-bold">Sklep</h1>
            
            <div className="flex items-center gap-3">
              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    {sortLabels[sortBy]}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border">
                  {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => (
                    <DropdownMenuItem 
                      key={key}
                      onClick={() => setSortBy(key)}
                      className={sortBy === key ? 'bg-primary/10 text-primary' : ''}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Filters Sheet */}
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filtry
                    {hasActiveFilters && (
                      <span className="w-2 h-2 bg-primary rounded-full" />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-card border-border">
                  <SheetHeader>
                    <SheetTitle>Filtry</SheetTitle>
                  </SheetHeader>
                  
                  <div className="mt-6 space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Cena</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="minPrice" className="text-xs">Od</Label>
                          <Input
                            id="minPrice"
                            type="number"
                            placeholder="0"
                            value={priceRange.min}
                            onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="maxPrice" className="text-xs">Do</Label>
                          <Input
                            id="maxPrice"
                            type="number"
                            placeholder="999"
                            value={priceRange.max}
                            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button onClick={applyPriceFilter} className="flex-1">
                        Zastosuj
                      </Button>
                      <Button variant="outline" onClick={clearFilters}>
                        Wyczyść
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSelectedCategory('Wszystkie')}
              className={`px-4 py-2 text-sm font-medium transition-all rounded-full ${
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
                className={`px-4 py-2 text-sm font-medium transition-all rounded-full ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:bg-muted border border-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Active filters indicator */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mb-6 text-sm">
              <span className="text-muted-foreground">Filtry:</span>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full">
                {appliedPriceRange.min > 0 && `od ${appliedPriceRange.min} zł`}
                {appliedPriceRange.min > 0 && appliedPriceRange.max < Infinity && ' - '}
                {appliedPriceRange.max < Infinity && `do ${appliedPriceRange.max} zł`}
              </span>
              <button 
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          )}

          {/* Results count */}
          {!isLoading && (
            <p className="text-sm text-muted-foreground mb-6">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'produkt' : 'produktów'}
            </p>
          )}

          {/* Products Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg mb-4">Brak produktów spełniających kryteria</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Wyczyść filtry
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}