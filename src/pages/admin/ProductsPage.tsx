import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  Upload,
  X,
  Package,
  Eye,
  Copy,
  ChevronDown,
  ChevronUp,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { api, Product, ProductCustomization } from '@/lib/api';
import { toast } from 'sonner';
import { CustomizationEditor } from '@/components/admin/CustomizationEditor';

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    long_description: '',
    price: '',
    category: '',
    availability: 'available' as 'available' | 'low_stock' | 'unavailable',
    featured: false,
  });
  const [customization, setCustomization] = useState<ProductCustomization | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [showCustomization, setShowCustomization] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, categoryFilter]);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        api.getProducts(),
        api.getCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Błąd ładowania produktów');
    } finally {
      setIsLoading(false);
    }
  };

  const filterProducts = () => {
    let result = [...products];

    if (categoryFilter !== 'all') {
      result = result.filter(p => p.category === categoryFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }

    setFilteredProducts(result);
  };

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_BASE}${imagePath}`;
  };

  const openDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        long_description: product.long_description || '',
        price: product.price.toString(),
        category: product.category,
        availability: product.availability,
        featured: product.featured || false,
      });
      setExistingImages(product.images || []);
      setCustomization(product.customization || null);
      setShowCustomization(!!product.customization);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        long_description: '',
        price: '',
        category: '',
        availability: 'available',
        featured: false,
      });
      setExistingImages([]);
      setCustomization(null);
      setShowCustomization(false);
    }
    setNewImages([]);
    setHasUnsavedChanges(false);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      setIsDialogOpen(false);
    }
  };

  const handleFormChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleCustomizationChange = (c: ProductCustomization | null) => {
    setCustomization(c);
    setHasUnsavedChanges(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewImages(prev => [...prev, ...Array.from(e.target.files!)]);
      setHasUnsavedChanges(true);
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const formDataObj = new FormData();
    formDataObj.append('name', formData.name);
    formDataObj.append('description', formData.description);
    formDataObj.append('long_description', formData.long_description);
    formDataObj.append('price', formData.price);
    formDataObj.append('category', formData.category);
    formDataObj.append('availability', formData.availability);
    formDataObj.append('featured', formData.featured.toString());
    
    if (customization) {
      formDataObj.append('customization', JSON.stringify(customization));
    }
    
    if (editingProduct) {
      formDataObj.append('existingImages', JSON.stringify(existingImages));
    }

    newImages.forEach(file => {
      formDataObj.append('images', file);
    });

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formDataObj);
        toast.success('Produkt zaktualizowany');
      } else {
        await api.createProduct(formDataObj);
        toast.success('Produkt dodany');
      }
      setHasUnsavedChanges(false);
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd zapisywania produktu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten produkt?')) return;

    try {
      await api.deleteProduct(id);
      toast.success('Produkt usunięty');
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd usuwania produktu');
    }
  };

  const duplicateProduct = (product: Product) => {
    setEditingProduct(null);
    setFormData({
      name: `${product.name} (kopia)`,
      description: product.description || '',
      long_description: product.long_description || '',
      price: product.price.toString(),
      category: product.category,
      availability: product.availability,
      featured: false,
    });
    setExistingImages([]);
    setCustomization(product.customization || null);
    setShowCustomization(!!product.customization);
    setNewImages([]);
    setHasUnsavedChanges(true);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produkty</h1>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj produkt
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj produktów..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden group">
            <div className="aspect-square relative bg-muted">
              {product.images && product.images[0] ? (
                <img 
                  src={getImageUrl(product.images[0])} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="icon" variant="secondary" onClick={() => openDialog(product)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="secondary" onClick={() => duplicateProduct(product)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="destructive" onClick={() => handleDelete(product.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="absolute top-2 left-2 flex gap-1">
                {!!product.featured && (
                  <Badge variant="outline" className="bg-primary/80">Wyróżniony</Badge>
                )}
                {product.customization && (
                  <Badge variant="outline" className="bg-background/80">Personalizacja</Badge>
                )}
              </div>
            </div>
            
            <CardContent className="p-4">
              <h3 className="font-medium truncate">{product.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{product.category}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold">{product.price} zł</span>
                <Badge variant={
                  product.availability === 'available' ? 'default' :
                  product.availability === 'low_stock' ? 'secondary' : 'destructive'
                }>
                  {product.availability === 'available' ? 'Dostępny' : 
                   product.availability === 'low_stock' ? 'Mało' : 'Niedostępny'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {searchTerm || categoryFilter !== 'all' 
              ? 'Brak produktów spełniających kryteria' 
              : 'Brak produktów. Dodaj pierwszy produkt.'}
          </div>
        )}
      </div>

      {/* Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleDialogClose();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => {
          if (hasUnsavedChanges) {
            e.preventDefault();
            setShowUnsavedWarning(true);
          }
        }}>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edytuj produkt' : 'Dodaj nowy produkt'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Ogólne</TabsTrigger>
                <TabsTrigger value="images">Zdjęcia</TabsTrigger>
                <TabsTrigger value="customization">Personalizacja</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nazwa produktu *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Cena (zł) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => handleFormChange('price', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategoria</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleFormChange('category', e.target.value)}
                      placeholder="np. Organizery, Dekoracje"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="availability">Dostępność</Label>
                    <Select
                      value={formData.availability}
                      onValueChange={(value: 'available' | 'low_stock' | 'unavailable') => 
                        handleFormChange('availability', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Dostępny</SelectItem>
                        <SelectItem value="low_stock">Mało w magazynie</SelectItem>
                        <SelectItem value="unavailable">Niedostępny</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Krótki opis</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="long_description">Pełny opis</Label>
                  <Textarea
                    id="long_description"
                    value={formData.long_description}
                    onChange={(e) => handleFormChange('long_description', e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    id="featured"
                    checked={formData.featured}
                    onCheckedChange={(checked) => handleFormChange('featured', checked)}
                  />
                  <Label htmlFor="featured">Wyróżniony produkt (pokazuj na stronie głównej)</Label>
                </div>
              </TabsContent>

              <TabsContent value="images" className="space-y-4 mt-4">
                {existingImages.length > 0 && (
                  <div className="space-y-2">
                    <Label>Obecne zdjęcia</Label>
                    <div className="grid grid-cols-4 gap-4">
                      {existingImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                          <img 
                            src={getImageUrl(img)} 
                            alt={`Zdjęcie ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(idx)}
                            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {newImages.length > 0 && (
                  <div className="space-y-2">
                    <Label>Nowe zdjęcia</Label>
                    <div className="grid grid-cols-4 gap-4">
                      {newImages.map((file, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt={`Nowe zdjęcie ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeNewImage(idx)}
                            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Kliknij aby dodać zdjęcia</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG do 10MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </TabsContent>

              <TabsContent value="customization" className="space-y-4 mt-4">
                <div className="flex items-center gap-3 mb-4">
                  <Switch
                    id="hasCustomization"
                    checked={showCustomization}
                    onCheckedChange={(checked) => {
                      setShowCustomization(checked);
                      if (!checked) setCustomization(null);
                      setHasUnsavedChanges(true);
                    }}
                  />
                  <Label htmlFor="hasCustomization">Produkt z personalizacją</Label>
                </div>

                {showCustomization && (
                  <CustomizationEditor
                    value={customization}
                    onChange={handleCustomizationChange}
                  />
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  editingProduct ? 'Zapisz zmiany' : 'Dodaj produkt'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes warning */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Niezapisane zmiany</AlertDialogTitle>
            <AlertDialogDescription>
              Masz niezapisane zmiany w produkcie. Czy na pewno chcesz zamknąć bez zapisywania?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Wróć do edycji</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowUnsavedWarning(false);
              setHasUnsavedChanges(false);
              setIsDialogOpen(false);
            }} className="bg-destructive hover:bg-destructive/90">
              Zamknij bez zapisywania
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
