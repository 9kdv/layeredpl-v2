import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { api, Product } from '@/lib/api';

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (id) {
      loadProduct(id);
    }
  }, [id]);

  const loadProduct = async (productId: string) => {
    try {
      const data = await api.getProduct(productId);
      setProduct(data);
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product || product.availability === 'unavailable') return;
    
    const imageUrl = product.images[0] || '/placeholder.svg';
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: imageUrl.startsWith('/uploads') 
        ? (import.meta.env.PROD ? imageUrl : `http://localhost:3001${imageUrl}`)
        : imageUrl,
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
          {/* Image Gallery */}
          <div className="relative">
            <div className="aspect-square bg-card overflow-hidden rounded-lg">
              <img
                src={displayImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
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
                        className={`w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
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
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center">
            <p className="text-sm text-primary uppercase tracking-wider mb-2 font-medium">
              {product.category}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{product.name}</h1>
            <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
              {product.long_description || product.description}
            </p>
            
            <p className="text-4xl font-bold mb-8">{product.price.toFixed(2)} zł</p>

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

            <Button
              onClick={handleAddToCart}
              disabled={product.availability === 'unavailable' || added}
              size="lg"
              className="w-full md:w-auto h-14 text-base px-12"
            >
              {added ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Dodano do koszyka
                </>
              ) : product.availability === 'unavailable' ? (
                'Niedostępny'
              ) : (
                'Dodaj do koszyka'
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
          </div>
        </div>
      </div>
    </main>
  );
}
