import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  Plus, 
  Pencil, 
  Trash2, 
  LogOut,
  X,
  Upload,
  Clock,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { useAuth } from '@/contexts/AuthContext';
import { api, Product, Order, AdminStats, ProductCustomization } from '@/lib/api';
import { toast } from 'sonner';
import { CustomizationEditor } from '@/components/admin/CustomizationEditor';

type Tab = 'dashboard' | 'products' | 'orders';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCustomizationEditor, setShowCustomizationEditor] = useState(false);

  // Product form state
  const [productForm, setProductForm] = useState<{
    name: string;
    description: string;
    price: string;
    category: string;
    availability: 'available' | 'low_stock' | 'unavailable';
    featured: boolean;
    customization: ProductCustomization | null;
  }>({
    name: '',
    description: '',
    price: '',
    category: '',
    availability: 'available',
    featured: false,
    customization: null,
  });
  const [productImages, setProductImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const statsData = await api.getAdminStats();
        setStats(statsData);
      } else if (activeTab === 'products') {
        const productsData = await api.getProducts();
        setProducts(productsData);
      } else if (activeTab === 'orders') {
        const ordersData = await api.getOrders();
        setOrders(ordersData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const openProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        category: product.category,
        availability: product.availability,
        featured: product.featured || false,
        customization: product.customization || null,
      });
      setExistingImages(product.images);
      setShowCustomizationEditor(!!product.customization);
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: '',
        category: '',
        availability: 'available',
        featured: false,
        customization: null,
      });
      setExistingImages([]);
      setShowCustomizationEditor(false);
    }
    setProductImages([]);
    setIsProductDialogOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', productForm.name);
    formData.append('description', productForm.description);
    formData.append('price', productForm.price);
    formData.append('category', productForm.category);
    formData.append('availability', productForm.availability);
    formData.append('featured', productForm.featured.toString());
    
    if (productForm.customization) {
      formData.append('customization', JSON.stringify(productForm.customization));
    }
    
    if (editingProduct) {
      formData.append('existingImages', JSON.stringify(existingImages));
    }

    productImages.forEach(file => {
      formData.append('images', file);
    });

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
        toast.success('Produkt zaktualizowany');
      } else {
        await api.createProduct(formData);
        toast.success('Produkt dodany');
      }
      setIsProductDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd zapisywania produktu');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten produkt?')) return;

    try {
      await api.deleteProduct(id);
      toast.success('Produkt usunięty');
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd usuwania produktu');
    }
  };

  const handleOrderStatusChange = async (orderId: string, status: string) => {
    try {
      await api.updateOrderStatus(orderId, status as import('@/types/customization').OrderStatus);
      toast.success('Status zamówienia zmieniony');
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd zmiany statusu');
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const statusLabels: Record<string, string> = {
    pending: 'Oczekujące',
    paid: 'Opłacone',
    processing: 'W realizacji',
    shipped: 'Wysłane',
    delivered: 'Dostarczone',
    cancelled: 'Anulowane',
  };

  const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001';

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_BASE}${imagePath}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/favicon.svg" alt="layered.pl" className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tighter uppercase">layered.pl</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-xl">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-border">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'products', label: 'Produkty', icon: Package },
            { id: 'orders', label: 'Zamówienia', icon: ShoppingCart },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as Tab)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {activeTab === 'dashboard' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card border border-border p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Produkty</span>
              </div>
              <p className="text-3xl font-bold">{stats.totalProducts}</p>
            </div>
            <div className="bg-card border border-border p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Zamówienia</span>
              </div>
              <p className="text-3xl font-bold">{stats.totalOrders}</p>
            </div>
            <div className="bg-card border border-border p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Użytkownicy</span>
              </div>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
            </div>
            <div className="bg-card border border-border p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Przychód</span>
              </div>
              <p className="text-3xl font-bold">{stats.revenue.toFixed(2)} zł</p>
            </div>
            <div className="bg-card border border-border p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Oczekujące</span>
              </div>
              <p className="text-3xl font-bold">{stats.pendingOrders}</p>
            </div>
          </div>
        )}

        {/* Products */}
        {activeTab === 'products' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-medium">Produkty ({products.length})</h2>
              <Button onClick={() => openProductDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Dodaj produkt
              </Button>
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium">Zdjęcie</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Nazwa</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Kategoria</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Cena</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Status</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        {product.images[0] ? (
                          <img 
                            src={getImageUrl(product.images[0])} 
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded-xl"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{product.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                      <td className="px-4 py-3">{product.price} zł</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          product.availability === 'available' 
                            ? 'bg-green-500/20 text-green-400'
                            : product.availability === 'low_stock'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {product.availability === 'available' ? 'Dostępny' : 
                           product.availability === 'low_stock' ? 'Mało' : 'Niedostępny'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openProductDialog(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Brak produktów. Dodaj pierwszy produkt.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders */}
        {activeTab === 'orders' && (
          <div>
            <h2 className="text-xl font-medium mb-6">Zamówienia ({orders.length})</h2>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium">ID</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Email</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Produkty</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Kwota</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t border-border">
                      <td className="px-4 py-3 font-mono text-sm">{order.id.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm">{order.customer_email || '-'}</td>
                      <td className="px-4 py-3 text-sm">{order.items.length} szt.</td>
                      <td className="px-4 py-3">{order.total.toFixed(2)} zł</td>
                      <td className="px-4 py-3">
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleOrderStatusChange(order.id, value)}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('pl-PL')}
                      </td>
                    </tr>
                  ))
                  }
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Brak zamówień.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edytuj produkt' : 'Dodaj produkt'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleProductSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nazwa *</Label>
              <Input
                id="name"
                value={productForm.name}
                onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Cena (zł) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productForm.price}
                  onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Kategoria</Label>
                <Input
                  id="category"
                  value={productForm.category}
                  onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="np. Organizery"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="availability">Dostępność</Label>
                <Select
                  value={productForm.availability}
                  onValueChange={(value: 'available' | 'low_stock' | 'unavailable') => 
                    setProductForm(prev => ({ ...prev, availability: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Dostępny</SelectItem>
                    <SelectItem value="low_stock">Mała ilość</SelectItem>
                    <SelectItem value="unavailable">Niedostępny</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between pt-6">
                <Label htmlFor="featured">Wyróżniony</Label>
                <Switch
                  id="featured"
                  checked={productForm.featured}
                  onCheckedChange={(checked) => setProductForm(prev => ({ ...prev, featured: checked }))}
                />
              </div>
            </div>

            {/* Customization toggle */}
            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowCustomizationEditor(!showCustomizationEditor)}
                className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Settings className="w-4 h-4 text-primary" />
                <span className="flex-1 font-medium">Personalizacja produktu</span>
                {productForm.customization && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                    {productForm.customization.options.length} opcji
                  </span>
                )}
                {showCustomizationEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showCustomizationEditor && (
                <div className="mt-4">
                  <CustomizationEditor
                    value={productForm.customization}
                    onChange={(customization) => setProductForm(prev => ({ ...prev, customization }))}
                  />
                </div>
              )}
            </div>

            {/* Existing images */}
            {existingImages.length > 0 && (
              <div>
                <Label>Obecne zdjęcia</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {existingImages.map((img, index) => (
                    <div key={index} className="relative">
                      <img src={img} alt="" className="w-16 h-16 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="images">Dodaj zdjęcia</Label>
              <div className="mt-2">
                <label className="flex items-center justify-center gap-2 p-4 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground">
                    {productImages.length > 0 
                      ? `Wybrano ${productImages.length} plików`
                      : 'Kliknij aby dodać zdjęcia'
                    }
                  </span>
                  <input
                    id="images"
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setProductImages(Array.from(e.target.files || []))}
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)} className="flex-1">
                Anuluj
              </Button>
              <Button type="submit" className="flex-1">
                {editingProduct ? 'Zapisz zmiany' : 'Dodaj produkt'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
