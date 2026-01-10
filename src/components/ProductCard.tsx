import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Product } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();

  const imageUrl = product.images[0] || '/placeholder.svg';
  const displayImage = imageUrl.startsWith('/uploads')
    ? (import.meta.env.PROD ? imageUrl : `http://localhost:3001${imageUrl}`)
    : imageUrl;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (product.availability !== 'unavailable') {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: displayImage,
      });
    }
  };

  return (
    <Link to={`/produkt/${product.id}`} className="group block">
      <div className="relative aspect-square bg-card overflow-hidden rounded-lg mb-4">
        <img
          src={displayImage}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Quick add button */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
          <Button
            onClick={handleAddToCart}
            disabled={product.availability === 'unavailable'}
            size="sm"
            className="transform translate-y-4 group-hover:translate-y-0 transition-transform"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Dodaj
          </Button>
        </div>

        {/* Availability badge */}
        {product.availability === 'low_stock' && (
          <span className="absolute top-3 left-3 bg-yellow-500/90 text-black text-xs font-medium px-2 py-1 rounded">
            Ostatnie sztuki
          </span>
        )}
        {product.availability === 'unavailable' && (
          <span className="absolute top-3 left-3 bg-red-500/90 text-white text-xs font-medium px-2 py-1 rounded">
            Niedostępny
          </span>
        )}
      </div>
      
      <div className="space-y-1">
        <h3 className="font-medium group-hover:text-primary transition-colors line-clamp-1">
          {product.name}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-1">{product.category}</p>
        <p className="font-semibold text-lg">{product.price.toFixed(2)} zł</p>
      </div>
    </Link>
  );
}
