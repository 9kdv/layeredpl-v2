import { useState, useMemo } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { products, categories } from '@/data/products';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name';

export default function ShopPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Wszystkie');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [showFilters, setShowFilters] = useState(false);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== 'Wszystkie') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // Featured first
        result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return result;
  }, [searchQuery, selectedCategory, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Wszystkie');
    setSortBy('default');
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'Wszystkie' || sortBy !== 'default';

  return (
    <main className="pt-20">
      {/* Header */}
      <section className="section-padding bg-secondary">
        <div className="section-container">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Sklep
            </h1>
            <p className="text-muted-foreground text-lg">
              Przeglądaj naszą kolekcję produktów drukowanych w 3D. 
              Znajdź idealne dodatki do swojego wnętrza lub biura.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 md:top-20 z-40 bg-background border-b border-border">
        <div className="section-container py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj produktów..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-4">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Kategoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortOption)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sortuj" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Domyślnie</SelectItem>
                  <SelectItem value="price-asc">Cena: rosnąco</SelectItem>
                  <SelectItem value="price-desc">Cena: malejąco</SelectItem>
                  <SelectItem value="name">Nazwa A-Z</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground"
                >
                  <X className="w-4 h-4 mr-1" />
                  Wyczyść
                </Button>
              )}
            </div>

            {/* Mobile Filter Toggle */}
            <Button
              variant="outline"
              className="md:hidden"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtry
              {hasActiveFilters && (
                <Badge className="ml-2" variant="secondary">
                  {[searchQuery, selectedCategory !== 'Wszystkie', sortBy !== 'default'].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Mobile Filters Panel */}
          {showFilters && (
            <div className="md:hidden mt-4 pt-4 border-t border-border space-y-4">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortOption)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sortuj" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Domyślnie</SelectItem>
                  <SelectItem value="price-asc">Cena: rosnąco</SelectItem>
                  <SelectItem value="price-desc">Cena: malejąco</SelectItem>
                  <SelectItem value="name">Nazwa A-Z</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full"
                >
                  <X className="w-4 h-4 mr-1" />
                  Wyczyść filtry
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Products Grid */}
      <section className="section-padding">
        <div className="section-container">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-display font-medium text-lg mb-2">
                Nie znaleziono produktów
              </h3>
              <p className="text-muted-foreground mb-6">
                Spróbuj zmienić kryteria wyszukiwania
              </p>
              <Button onClick={clearFilters}>Wyczyść filtry</Button>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-6">
                Znaleziono {filteredProducts.length} produkt
                {filteredProducts.length === 1
                  ? ''
                  : filteredProducts.length < 5
                  ? 'y'
                  : 'ów'}
              </p>
              <div className="product-grid">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
