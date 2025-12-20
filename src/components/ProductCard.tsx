import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { Product } from '@/data/products';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();

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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.availability !== 'unavailable') {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0],
      });
    }
  };

  return (
    <Link to={`/produkt/${product.id}`} className="group">
      <div className="card-hover bg-card rounded-xl overflow-hidden border border-border">
        {/* Image */}
        <div className="relative aspect-square bg-secondary overflow-hidden">
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Quick Add Button */}
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
            <Button
              onClick={handleAddToCart}
              disabled={product.availability === 'unavailable'}
              className="translate-y-4 group-hover:translate-y-0 transition-transform"
              size="sm"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Dodaj do koszyka
            </Button>
          </div>
          {/* Availability Badge */}
          <Badge
            className={`absolute top-3 right-3 ${availabilityClass[product.availability]}`}
          >
            {availabilityLabel[product.availability]}
          </Badge>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            {product.category}
          </p>
          <h3 className="font-display font-medium text-lg mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {product.description}
          </p>
          <p className="font-display font-semibold text-lg">
            {product.price.toFixed(2)} zł
          </p>
        </div>
      </div>
    </Link>
  );
}
