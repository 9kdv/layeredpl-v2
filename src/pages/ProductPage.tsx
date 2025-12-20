import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { products } from '@/data/products';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';

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
  const [currentImage, setCurrentImage] = useState(0);

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <main className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Nie znaleziono</h1>
          <Link to="/sklep" className="text-primary">Wróć do sklepu</Link>
        </div>
      </main>
    );
  }

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: productImages[product.id] || product.images[0],
    });
  };

  return (
    <main className="pt-20 min-h-screen">
      <div className="section-container py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Wróć
        </button>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="aspect-square bg-card overflow-hidden">
            <img
              src={productImages[product.id] || product.images[currentImage]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center">
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
              {product.category}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{product.name}</h1>
            <p className="text-muted-foreground mb-8">{product.longDescription}</p>
            
            <p className="text-3xl font-bold mb-8">{product.price} zł</p>

            <Button
              onClick={handleAddToCart}
              disabled={product.availability === 'unavailable'}
              size="lg"
              className="w-full md:w-auto"
            >
              {product.availability === 'unavailable' ? 'Niedostępny' : 'Dodaj do koszyka'}
            </Button>

            {/* Specs */}
            <div className="mt-12 pt-8 border-t border-border">
              <h3 className="font-semibold mb-4">Specyfikacja</h3>
              <div className="space-y-2">
                {product.specifications.map((spec) => (
                  <div key={spec.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{spec.label}</span>
                    <span>{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
