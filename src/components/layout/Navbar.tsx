import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

export function Navbar() {
  const { totalItems, setIsOpen } = useCart();

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className="section-container">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            LAYERED
          </Link>

          <button
            onClick={() => setIsOpen(true)}
            className="relative p-2 hover:opacity-70 transition-opacity"
          >
            <ShoppingBag className="w-6 h-6" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </nav>
    </header>
  );
}
