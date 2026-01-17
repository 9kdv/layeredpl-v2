import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { api, Product } from '@/lib/api';
import { ProductCustomizer } from '@/components/ProductCustomizer';
import { SelectedCustomization, ProductCustomization } from '@/types/customization';

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [added, setAdded] = useState(false);
  
  // Customization state
  const [customizations, setCustomizations] = useState<SelectedCustomization[]>([]);
  const [customizationPrice, setCustomizationPrice] = useState(0);
  const [customizationValid, setCustomizationValid] = useState(true);
  const [nonRefundableAccepted, setNonRefundableAccepted] = useState(false);

  useEffect(() => {
    if (id) {
      loadProduct(id);
    }
  }, [id]);

  const loadProduct = async (productId: string) => {
    try {
      const data = await api.getProduct(productId);
      setProduct(data);
      
      // If no customization options, it's valid by default
      if (!data.customization || data.customization.options.length === 0) {
        setCustomizationValid(true);
      } else {
        // Check if any option is required
        const hasRequired = data.customization.options.some(o => o.required);
        setCustomizationValid(!hasRequired);
      }
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomizationChange = (
    newCustomizations: SelectedCustomization[], 
    totalPrice: number, 
    isValid: boolean,
    accepted: boolean
  ) => {
    setCustomizations(newCustomizations);
    setCustomizationPrice(totalPrice);
    setCustomizationValid(isValid);
    setNonRefundableAccepted(accepted);
  };

  const handleAddToCart = () => {
    if (!product || product.availability === 'unavailable') return;
    if (product.customization && !customizationValid) return;
    
    const imageUrl = product.images[0] || '/placeholder.svg';
    const finalImage = imageUrl.startsWith('/uploads') 
      ? (import.meta.env.PROD ? imageUrl : `http://localhost:3001${imageUrl}`)
      : imageUrl;
    
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: finalImage,
      customizations: customizations.length > 0 ? customizations : undefined,
      customizationPrice: customizationPrice > 0 ? customizationPrice : undefined,
      nonRefundable: product.customization?.nonRefundable,
      nonRefundableAccepted: nonRefundableAccepted
    });
    
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const nextImage = () => {
    if (product && product.images.length > 1) {
      setCurrentImage((prev) => (prev + 1) % product.images.length);
    }
  };

  const prevImage = () => {
    if (product && product.images.length > 1) {
      setCurrentImage((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  const totalPrice = product ? product.price + customizationPrice : 0;

  if (isLoading) {
    return (
      <main className="pt-20 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Nie znaleziono produktu</h1>
          <Link to="/sklep" className="text-primary hover:underline">Wróć do sklepu</Link>
        </div>
      </main>
    );
  }

  const imageUrl = product.images[currentImage] || '/placeholder.svg';
  const displayImage = imageUrl.startsWith('/uploads')
    ? (import.meta.env.PROD ? imageUrl : `http://localhost:3001${imageUrl}`)
    : imageUrl;

  const hasCustomization = product.customization && product.customization.options.length > 0;
  const canAddToCart = product.availability !== 'unavailable' && customizationValid;

  return (
    <main className="pt-20 min-h-screen">
      <div className="section-container py-8">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Wróć
        </motion.button>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <div className="aspect-square bg-card overflow-hidden rounded-2xl">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  src={displayImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>
            </div>

            {product.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="flex gap-2 mt-4">
                  {product.images.map((img, idx) => {
                    const thumbUrl = img.startsWith('/uploads')
                      ? (import.meta.env.PROD ? img : `http://localhost:3001${img}`)
                      : img;
                    return (
                      <button
                        key={idx}
                        onClick={() => setCurrentImage(idx)}
                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                          currentImage === idx ? 'border-primary' : 'border-transparent'
                        }`}
                      >
                        <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>

          {/* Info */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col"
          >
            <p className="text-sm text-primary uppercase tracking-wider mb-2 font-medium">
              {product.category}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{product.name}</h1>
            <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
              {product.long_description || product.description}
            </p>
            
            {/* Price */}
            <div className="mb-6">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold">{totalPrice.toFixed(2)} zł</span>
                {customizationPrice > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({product.price.toFixed(2)} + {customizationPrice.toFixed(2)} zł personalizacja)
                  </span>
                )}
              </div>
            </div>

            {/* Availability */}
            <div className="mb-6">
              {product.availability === 'available' && (
                <span className="inline-flex items-center gap-2 text-green-400 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  Dostępny
                </span>
              )}
              {product.availability === 'low_stock' && (
                <span className="inline-flex items-center gap-2 text-yellow-400 text-sm">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  Ostatnie sztuki
                </span>
              )}
              {product.availability === 'unavailable' && (
                <span className="inline-flex items-center gap-2 text-red-400 text-sm">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Niedostępny
                </span>
              )}
            </div>

            {/* Customization Options */}
            {hasCustomization && (
              <div className="mb-8 p-6 bg-card/50 rounded-2xl border border-border">
                <h3 className="text-lg font-semibold mb-4">Personalizacja</h3>
                <ProductCustomizer 
                  customization={product.customization!}
                  onCustomizationChange={handleCustomizationChange}
                />
              </div>
            )}

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              disabled={!canAddToCart || added}
              size="lg"
              className="w-full md:w-auto h-14 text-base px-12 rounded-xl"
            >
              {added ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Dodano do koszyka
                </>
              ) : !canAddToCart && hasCustomization ? (
                'Uzupełnij wymagane opcje'
              ) : product.availability === 'unavailable' ? (
                'Niedostępny'
              ) : (
                `Dodaj do koszyka • ${totalPrice.toFixed(2)} zł`
              )}
            </Button>

            {/* Specs */}
            {product.specifications && product.specifications.length > 0 && (
              <div className="mt-12 pt-8 border-t border-border">
                <h3 className="font-semibold mb-4 text-lg">Specyfikacja</h3>
                <div className="space-y-3">
                  {product.specifications.map((spec, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-2 border-b border-border/50">
                      <span className="text-muted-foreground">{spec.label}</span>
                      <span className="font-medium">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </main>
  );
}
