import { X, Plus, Minus, ArrowRight, ShoppingBag, Pencil, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CustomizationEditDialog } from '@/components/CustomizationEditDialog';

export function CartDrawer() {
  const navigate = useNavigate();
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, totalPrice, clearCart } = useCart();
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const handleCheckout = () => {
    setIsOpen(false);
    navigate('/zamowienie');
  };

  const formatCustomizations = (item: typeof items[0]) => {
    if (!item.customizations || item.customizations.length === 0) return null;
    
    return item.customizations.map((c, idx) => (
      <div key={idx} className="text-xs text-muted-foreground">
        <span className="font-medium">{c.optionLabel}:</span>{' '}
        {c.selectedColors?.map(c => c.name).join(', ')}
        {c.selectedMaterial?.name}
        {c.selectedSize?.name}
        {c.selectedStrength?.name}
        {c.selectedOption?.label}
        {c.textValue}
        {c.uploadedFiles?.map(f => f.name).join(', ')}
      </div>
    ));
  };

  const itemTotalPrice = (item: typeof items[0]) => {
    return (item.price + (item.customizationPrice || 0)) * item.quantity;
  };

  return (
    <>
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
                  <div key={item.cartItemId} className="flex gap-4 p-3 bg-card/50 rounded-xl">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-20 h-20 object-cover rounded-lg bg-muted"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-1">{item.name}</h4>
                      
                      {/* Customizations */}
                      <div className="mt-1 space-y-0.5">
                        {formatCustomizations(item)}
                      </div>
                      
                      {/* Non-refundable warning */}
                      {item.nonRefundable && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-amber-400">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Brak zwrotu</span>
                        </div>
                      )}
                      
                      {/* Price breakdown */}
                      <div className="mt-1">
                        <span className="text-primary font-semibold">
                          {itemTotalPrice(item).toFixed(2)} zł
                        </span>
                        {item.customizationPrice && item.customizationPrice > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (+{item.customizationPrice.toFixed(2)} zł)
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <button 
                          onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} 
                          className="w-7 h-7 flex items-center justify-center bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} 
                          className="w-7 h-7 flex items-center justify-center bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        
                        {/* Edit customizations button */}
                        {item.customizations && item.customizations.length > 0 && (
                          <button 
                            onClick={() => setEditingItem(item.cartItemId)}
                            className="ml-auto w-7 h-7 flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => removeItem(item.cartItemId)} 
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors self-start"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Produkty</span>
                  <span>{totalPrice.toFixed(2)} zł</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Koszt dostawy zostanie obliczony przy zamówieniu
                </p>
                <Button onClick={handleCheckout} className="w-full h-12 rounded-xl" size="lg">
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

      {/* Edit Customization Dialog */}
      {editingItem && (
        <CustomizationEditDialog
          cartItemId={editingItem}
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </>
  );
}
