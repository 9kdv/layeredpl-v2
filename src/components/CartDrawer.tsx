import { X, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function CartDrawer() {
  const navigate = useNavigate();
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, totalPrice, clearCart } = useCart();

  const handleCheckout = () => {
    setIsOpen(false);
    navigate('/zamowienie');
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col bg-background border-border">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Koszyk ({items.length})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium mb-2">Koszyk jest pusty</p>
            <p className="text-muted-foreground mb-6 text-sm">Dodaj produkty, aby kontynuować zakupy</p>
            <Button onClick={() => setIsOpen(false)} asChild variant="outline">
              <Link to="/sklep">Przejdź do sklepu</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 p-3 bg-card/50 rounded-lg">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-20 h-20 object-cover rounded-md bg-muted"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
                    <p className="text-primary font-semibold mt-1">{item.price.toFixed(2)} zł</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                        className="w-7 h-7 flex items-center justify-center bg-muted hover:bg-muted/80 rounded transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                        className="w-7 h-7 flex items-center justify-center bg-muted hover:bg-muted/80 rounded transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeItem(item.id)} 
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors self-start"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Produkty</span>
                  <span>{totalPrice.toFixed(2)} zł</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dostawa</span>
                  <span>0.00 zł</span>
                </div>
              </div>
              <div className="flex justify-between text-lg font-semibold pt-2 border-t border-border">
                <span>Razem</span>
                <span>{totalPrice.toFixed(2)} zł</span>
              </div>
              <Button onClick={handleCheckout} className="w-full h-12" size="lg">
                Przejdź do zamówienia
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <button 
                onClick={clearCart}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Wyczyść koszyk
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
