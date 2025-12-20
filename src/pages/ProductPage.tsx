import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Truck, Shield, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { products } from '@/data/products';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/ProductCard';

import productOrganizer from '@/assets/product-organizer.jpg';
import productLamp from '@/assets/product-lamp.jpg';
import productStand from '@/assets/product-stand.jpg';
import productPlanter from '@/assets/product-planter.jpg';

const productImages: Record<string, string> = {
  '1': productOrganizer,
  '2': productLamp,
  '3': productStand,
  '4': productPlanter,
};

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <main className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold mb-4">Produkt nie znaleziony</h1>
          <Button asChild>
            <Link to="/sklep">Wróć do sklepu</Link>
          </Button>
        </div>
      </main>
    );
  }

  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const availabilityLabel = {
    available: 'Dostępny',
    unavailable: 'Niedostępny',
    preorder: 'Przedsprzedaż',
  };

  const availabilityClass = {
    available: 'badge-available',
    unavailable: 'badge-unavailable',
    preorder: 'badge-preorder',
  };

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: productImages[product.id] || product.images[0],
    });
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  return (
    <main className="pt-20">
      {/* Breadcrumb */}
      <section className="border-b border-border">
        <div className="section-container py-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Wróć
          </button>
        </div>
      </section>

      {/* Product Detail */}
      <section className="section-padding">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Images */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-secondary rounded-xl overflow-hidden">
                <img
                  src={productImages[product.id] || product.images[currentImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
              {product.images.length > 1 && (
                <div className="flex gap-2">
                  {product.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        index === currentImageIndex
                          ? 'border-primary'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <img
                        src={productImages[product.id] || product.images[index]}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <div className="mb-6">
                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
                  {product.category}
                </p>
                <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
                  {product.name}
                </h1>
                <Badge className={availabilityClass[product.availability]}>
                  {availabilityLabel[product.availability]}
                </Badge>
              </div>

              <p className="text-muted-foreground mb-6">{product.longDescription}</p>

              <div className="flex items-baseline gap-4 mb-8">
                <span className="font-display text-4xl font-bold">
                  {product.price.toFixed(2)} zł
                </span>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={product.availability === 'unavailable'}
                size="lg"
                className="w-full mb-6"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                {product.availability === 'unavailable'
                  ? 'Niedostępny'
                  : product.availability === 'preorder'
                  ? 'Zamów w przedsprzedaży'
                  : 'Dodaj do koszyka'}
              </Button>

              {/* Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="flex items-center gap-3 p-4 bg-secondary rounded-lg">
                  <Truck className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Szybka wysyłka</p>
                    <p className="text-xs text-muted-foreground">2-3 dni robocze</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-secondary rounded-lg">
                  <Shield className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Gwarancja</p>
                    <p className="text-xs text-muted-foreground">12 miesięcy</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-secondary rounded-lg">
                  <RotateCcw className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Zwroty</p>
                    <p className="text-xs text-muted-foreground">14 dni</p>
                  </div>
                </div>
              </div>

              {/* Specifications */}
              <div>
                <h3 className="font-display font-semibold text-lg mb-4">Specyfikacja</h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  {product.specifications.map((spec, index) => (
                    <div
                      key={spec.label}
                      className={`flex justify-between p-4 ${
                        index !== product.specifications.length - 1
                          ? 'border-b border-border'
                          : ''
                      }`}
                    >
                      <span className="text-muted-foreground">{spec.label}</span>
                      <span className="font-medium">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="section-padding bg-secondary">
          <div className="section-container">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-8">
              Podobne produkty
            </h2>
            <div className="product-grid">
              {relatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
