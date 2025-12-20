import { X, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, totalPrice, clearCart } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-display flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Koszyk
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-display font-medium text-lg mb-2">Koszyk jest pusty</h3>
            <p className="text-muted-foreground mb-6">
              Dodaj produkty, aby kontynuować zakupy
            </p>
            <Button onClick={() => setIsOpen(false)} asChild>
              <Link to="/sklep">
                Przejdź do sklepu
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 bg-secondary rounded-lg"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-md bg-muted"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{item.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {item.price.toFixed(2)} zł
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <p className="font-semibold">
                      {(item.price * item.quantity).toFixed(2)} zł
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-border pt-4 space-y-4">
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium">Razem:</span>
                <span className="font-display font-semibold">{totalPrice.toFixed(2)} zł</span>
              </div>
              <Button className="w-full" size="lg" asChild>
                <Link to="/zamowienie" onClick={() => setIsOpen(false)}>
                  Przejdź do zamówienia
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={clearCart}
              >
                Wyczyść koszyk
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
