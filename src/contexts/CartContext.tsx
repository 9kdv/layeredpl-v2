import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SelectedCustomization } from '@/types/customization';

export interface CartItem {
  id: string;
  cartItemId: string; // Unique ID for this cart entry (allows same product with different customizations)
  name: string;
  price: number; // Base price
  image: string;
  quantity: number;
  customizations?: SelectedCustomization[];
  customizationPrice?: number; // Additional price from customizations
  nonRefundable?: boolean;
  nonRefundableAccepted?: boolean;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity' | 'cartItemId'>) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateCustomizations: (cartItemId: string, customizations: SelectedCustomization[], customizationPrice: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function generateCartItemId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('layered-cart');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration: ensure all items have cartItemId
      return parsed.map((item: CartItem) => ({
        ...item,
        cartItemId: item.cartItemId || generateCartItemId()
      }));
    }
    return [];
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('layered-cart', JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, 'quantity' | 'cartItemId'>) => {
    const cartItemId = generateCartItemId();
    
    setItems((prev) => {
      // If no customizations, check for existing item with same product ID and no customizations
      if (!item.customizations || item.customizations.length === 0) {
        const existing = prev.find((i) => 
          i.id === item.id && 
          (!i.customizations || i.customizations.length === 0)
        );
        if (existing) {
          return prev.map((i) =>
            i.cartItemId === existing.cartItemId 
              ? { ...i, quantity: i.quantity + 1 } 
              : i
          );
        }
      }
      
      // Add as new item (customized items are always separate)
      return [...prev, { ...item, cartItemId, quantity: 1 }];
    });
    setIsOpen(true);
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartItemId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity } : i))
    );
  };

  const updateCustomizations = (
    cartItemId: string, 
    customizations: SelectedCustomization[], 
    customizationPrice: number
  ) => {
    setItems((prev) =>
      prev.map((i) => 
        i.cartItemId === cartItemId 
          ? { ...i, customizations, customizationPrice } 
          : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const itemTotal = (item.price + (item.customizationPrice || 0)) * item.quantity;
    return sum + itemTotal;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateCustomizations,
        clearCart,
        totalItems,
        totalPrice,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
