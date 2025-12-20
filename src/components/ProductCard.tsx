import { Link } from 'react-router-dom';
import { Product } from '@/data/products';
import { useCart } from '@/contexts/CartContext';

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

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.availability !== 'unavailable') {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: productImages[product.id] || product.images[0],
      });
    }
  };

  return (
    <Link to={`/produkt/${product.id}`} className="group block">
      <div className="aspect-square bg-card overflow-hidden mb-4">
        <img
          src={productImages[product.id] || product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground">{product.category}</p>
        </div>
        <p className="font-medium">{product.price} zł</p>
      </div>
    </Link>
  );
}
