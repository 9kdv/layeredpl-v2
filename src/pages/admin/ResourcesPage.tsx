import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Printer, 
  Boxes, 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Wrench,
  MapPin,
  ArrowRight,
  Power,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  materialsApi, 
  printersApi, 
  locationsApi,
  Material, 
  Printer as PrinterType,
  Location 
} from '@/lib/adminApi';

// Updated material types - no Resin
const MATERIAL_TYPES = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'Nylon', 'PC', 'HIPS', 'PVA', 'Wood', 'Metal', 'Carbon'] as const;
const PRINTER_STATUSES = ['available', 'busy', 'maintenance', 'offline'] as const;
const MATERIAL_STATUSES = ['available', 'low_stock', 'out_of_stock'] as const;

const PRINTER_STATUS_CONFIG = {
  available: { label: 'Dostępna', color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
  busy: { label: 'Pracuje', color: 'bg-purple-500/10 text-purple-500', icon: Printer },
  maintenance: { label: 'Serwis', color: 'bg-yellow-500/10 text-yellow-500', icon: Settings },
  offline: { label: 'Offline', color: 'bg-muted text-muted-foreground', icon: Power },
};

const MATERIAL_STATUS_CONFIG = {
  available: { label: 'Dostępny', color: 'text-green-500' },
  low_stock: { label: 'Niski stan', color: 'text-yellow-500' },
  out_of_stock: { label: 'Brak', color: 'text-destructive' },
};

export default function ResourcesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Queries
  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ['admin-materials'],
    queryFn: materialsApi.getAll
  });

  const { data: printers = [], isLoading: printersLoading } = useQuery({
    queryKey: ['admin-printers'],
    queryFn: printersApi.getAll
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: locationsApi.getAll
  });

  const getLocationName = (locationId?: string | null) => {
    if (!locationId) return 'Nie przypisano';
    const location = locations.find(l => l.id === locationId);
    return location?.name || 'Nieznana';
  };

  if (materialsLoading || printersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Stats
  const lowStockMaterials = materials.filter(m => m.status === 'low_stock').length;
  const outOfStockMaterials = materials.filter(m => m.status === 'out_of_stock').length;
  const availablePrinters = printers.filter(p => p.status === 'available').length;
  const busyPrinters = printers.filter(p => p.status === 'busy').length;
  const offlinePrinters = printers.filter(p => p.status === 'offline' || p.status === 'maintenance').length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Materiały i Drukarki</h1>
          <p className="text-muted-foreground">Przegląd zasobów produkcyjnych</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Przegląd</TabsTrigger>
          <TabsTrigger value="materials" className="gap-2">
            <Boxes className="h-4 w-4" />
            Materiały ({materials.length})
          </TabsTrigger>
          <TabsTrigger value="printers" className="gap-2">
            <Printer className="h-4 w-4" />
            Drukarki ({printers.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Boxes className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{materials.length}</p>
                    <p className="text-sm text-muted-foreground">Materiały</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Printer className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{printers.length}</p>
                    <p className="text-sm text-muted-foreground">Drukarki</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{lowStockMaterials}</p>
                    <p className="text-sm text-muted-foreground">Niski stan</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{availablePrinters}</p>
                    <p className="text-sm text-muted-foreground">Dostępne drukarki</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Material Types Summary */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="h-5 w-5" />
                  Materiały wg typu
                </CardTitle>
                <CardDescription>Podział materiałów według rodzaju</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MATERIAL_TYPES.slice(0, 6).map(type => {
                    const count = materials.filter(m => m.type === type).length;
                    if (count === 0) return null;
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <span className="font-medium">{type}</span>
                        <Badge variant="secondary">{count} szt.</Badge>
                      </div>
                    );
                  })}
                  {materials.length === 0 && (
                    <p className="text-muted-foreground text-sm">Brak materiałów</p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4 gap-2"
                  onClick={() => setActiveTab('materials')}
                >
                  Zobacz wszystkie materiały
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Status drukarek
                </CardTitle>
                <CardDescription>Aktualny stan maszyn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>Dostępne</span>
                    </div>
                    <Badge variant="default">{availablePrinters}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span>Pracują</span>
                    </div>
                    <Badge variant="secondary">{busyPrinters}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-destructive" />
                      <span>Offline / Serwis</span>
                    </div>
                    <Badge variant="destructive">{offlinePrinters}</Badge>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4 gap-2"
                  onClick={() => setActiveTab('printers')}
                >
                  Zobacz wszystkie drukarki
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {(outOfStockMaterials > 0 || offlinePrinters > 0) && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Wymagają uwagi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {outOfStockMaterials > 0 && (
                  <p className="text-sm">• {outOfStockMaterials} materiał(ów) bez stanu magazynowego</p>
                )}
                {offlinePrinters > 0 && (
                  <p className="text-sm">• {offlinePrinters} drukarka(i) offline lub w serwisie</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials">
          <MaterialsSection 
            materials={materials} 
            locations={locations} 
            queryClient={queryClient}
            toast={toast}
          />
        </TabsContent>

        {/* Printers Tab */}
        <TabsContent value="printers">
          <PrintersSection 
            printers={printers} 
            locations={locations} 
            queryClient={queryClient}
            toast={toast}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// Materials Section Component
function MaterialsSection({ 
  materials, 
  locations, 
  queryClient, 
  toast 
}: { 
  materials: Material[]; 
  locations: Location[]; 
  queryClient: any;
  toast: any;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [materialDialog, setMaterialDialog] = useState<{ open: boolean; material?: Material }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });

  const [formData, setFormData] = useState({
    name: '',
    type: 'PLA' as typeof MATERIAL_TYPES[number],
    color: '',
    color_hex: '#808080',
    location_id: '',
    quantity_available: '0',
    quantity_unit: 'kg',
    min_stock_level: '0',
    status: 'available' as typeof MATERIAL_STATUSES[number],
    notes: ''
  });

  const createMutation = useMutation({
    mutationFn: materialsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-materials'] });
      setMaterialDialog({ open: false });
      toast({ title: 'Materiał dodany' });
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Material>) => materialsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-materials'] });
      setMaterialDialog({ open: false });
      toast({ title: 'Materiał zaktualizowany' });
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  const deleteMutation = useMutation({
    mutationFn: materialsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-materials'] });
      setDeleteDialog({ open: false, id: '', name: '' });
      toast({ title: 'Materiał usunięty' });
    }
  });

  const openDialog = (material?: Material) => {
    if (material) {
      setFormData({
        name: material.name || '',
        type: (material.type as typeof MATERIAL_TYPES[number]) || 'PLA',
        color: material.color || '',
        color_hex: material.color_hex || '#808080',
        location_id: material.location_id || '',
        quantity_available: String(material.quantity_available || 0),
        quantity_unit: material.quantity_unit || 'kg',
        min_stock_level: String(material.min_stock_level || 0),
        status: (material.status as typeof MATERIAL_STATUSES[number]) || 'available',
        notes: material.notes || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'PLA',
        color: '',
        color_hex: '#808080',
        location_id: '',
        quantity_available: '0',
        quantity_unit: 'kg',
        min_stock_level: '0',
        status: 'available',
        notes: ''
      });
    }
    setMaterialDialog({ open: true, material });
  };

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      type: formData.type,
      color: formData.color || undefined,
      color_hex: formData.color_hex || undefined,
      location_id: formData.location_id || undefined,
      quantity_available: parseFloat(formData.quantity_available) || 0,
      quantity_unit: formData.quantity_unit,
      min_stock_level: parseFloat(formData.min_stock_level) || 0,
      status: formData.status,
      notes: formData.notes || undefined,
      is_active: true
    };

    if (materialDialog.material) {
      updateMutation.mutate({ id: materialDialog.material.id, ...data });
    } else {
      createMutation.mutate(data as any);
    }
  };

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.color?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getLocationName = (locationId?: string | null) => {
    if (!locationId) return 'Nie przypisano';
    const location = locations.find(l => l.id === locationId);
    return location?.name || 'Nieznana';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie typy</SelectItem>
              {MATERIAL_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Dodaj materiał
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredMaterials.map((material) => (
              <motion.div
                key={material.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-lg border"
                    style={{ backgroundColor: material.color_hex || '#888' }}
                  />
                  <div>
                    <p className="font-medium">{material.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">{material.type}</Badge>
                      <span>•</span>
                      <MapPin className="h-3 w-3" />
                      <span>{getLocationName(material.location_id)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={`font-medium ${MATERIAL_STATUS_CONFIG[material.status]?.color || ''}`}>
                      {material.quantity_available} {material.quantity_unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Min: {material.min_stock_level} {material.quantity_unit}
                    </p>
                  </div>
                  <Badge variant={
                    material.status === 'available' ? 'default' :
                    material.status === 'low_stock' ? 'secondary' : 'destructive'
                  }>
                    {MATERIAL_STATUS_CONFIG[material.status]?.label || material.status}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(material)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setDeleteDialog({ open: true, id: material.id, name: material.name })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredMaterials.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <Boxes className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Brak materiałów</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Material Dialog */}
      <Dialog open={materialDialog.open} onOpenChange={(open) => !open && setMaterialDialog({ open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{materialDialog.material ? 'Edytuj materiał' : 'Nowy materiał'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nazwa</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="np. PLA Premium"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Typ</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as typeof MATERIAL_TYPES[number] })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kolor (nazwa)</Label>
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="np. Czarny"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Kolor (hex)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={formData.color_hex}
                    onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                    className="w-14 h-10 p-1"
                  />
                  <Input
                    value={formData.color_hex}
                    onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                    placeholder="#808080"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Lokalizacja</Label>
              <Select 
                value={formData.location_id || 'none'} 
                onValueChange={(v) => setFormData({ ...formData, location_id: v === 'none' ? '' : v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Wybierz lokalizację" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nieprzypisane</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Ilość dostępna</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.quantity_available}
                  onChange={(e) => setFormData({ ...formData, quantity_available: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Jednostka</Label>
                <Select value={formData.quantity_unit} onValueChange={(v) => setFormData({ ...formData, quantity_unit: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="szt">szt</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Min. stan</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as typeof MATERIAL_STATUSES[number] })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MATERIAL_STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notatki</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Opcjonalne notatki..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaterialDialog({ open: false })}>Anuluj</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
            >
              {materialDialog.material ? 'Zapisz' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: '', name: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń materiał</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć materiał "{deleteDialog.name}"? Ta operacja jest nieodwracalna.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, id: '', name: '' })}>Anuluj</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteDialog.id)} disabled={deleteMutation.isPending}>
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Printers Section Component
function PrintersSection({ 
  printers, 
  locations, 
  queryClient, 
  toast 
}: { 
  printers: PrinterType[]; 
  locations: Location[]; 
  queryClient: any;
  toast: any;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [printerDialog, setPrinterDialog] = useState<{ open: boolean; printer?: PrinterType }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });

  const [formData, setFormData] = useState({
    name: '',
    model: '',
    location_id: '',
    status: 'available' as typeof PRINTER_STATUSES[number],
    notes: ''
  });

  const createMutation = useMutation({
    mutationFn: printersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-printers'] });
      setPrinterDialog({ open: false });
      toast({ title: 'Drukarka dodana' });
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<PrinterType>) => printersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-printers'] });
      setPrinterDialog({ open: false });
      toast({ title: 'Drukarka zaktualizowana' });
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  const deleteMutation = useMutation({
    mutationFn: printersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-printers'] });
      setDeleteDialog({ open: false, id: '', name: '' });
      toast({ title: 'Drukarka usunięta' });
    }
  });

  const openDialog = (printer?: PrinterType) => {
    if (printer) {
      setFormData({
        name: printer.name || '',
        model: printer.model || '',
        location_id: printer.location_id || '',
        status: (printer.status as typeof PRINTER_STATUSES[number]) || 'available',
        notes: printer.notes || ''
      });
    } else {
      setFormData({
        name: '',
        model: '',
        location_id: '',
        status: 'available',
        notes: ''
      });
    }
    setPrinterDialog({ open: true, printer });
  };

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      model: formData.model || undefined,
      location_id: formData.location_id || undefined,
      status: formData.status,
      notes: formData.notes || undefined
    };

    if (printerDialog.printer) {
      updateMutation.mutate({ id: printerDialog.printer.id, ...data });
    } else {
      createMutation.mutate(data as any);
    }
  };

  const filteredPrinters = printers.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLocationName = (locationId?: string | null) => {
    if (!locationId) return 'Nie przypisano';
    const location = locations.find(l => l.id === locationId);
    return location?.name || 'Nieznana';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po nazwie lub modelu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-[300px]"
          />
        </div>
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Dodaj drukarkę
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPrinters.map((printer) => {
          const statusConfig = PRINTER_STATUS_CONFIG[printer.status];
          const StatusIcon = statusConfig?.icon || Printer;

          return (
            <motion.div
              key={printer.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="hover:shadow-lg transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${statusConfig?.color || 'bg-muted'}`}>
                        <Printer className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{printer.name}</CardTitle>
                        {printer.model && (
                          <p className="text-sm text-muted-foreground">{printer.model}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={statusConfig?.color || ''}>
                      {statusConfig?.label || printer.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    {printer.location_id && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {getLocationName(printer.location_id)}
                      </div>
                    )}
                    {printer.notes && (
                      <p className="text-muted-foreground bg-muted/50 p-2 rounded text-xs">
                        {printer.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openDialog(printer)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edytuj
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setDeleteDialog({ open: true, id: printer.id, name: printer.name })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {filteredPrinters.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Printer className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'Brak drukarek spełniających kryteria' : 'Brak drukarek'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Printer Dialog */}
      <Dialog open={printerDialog.open} onOpenChange={(open) => !open && setPrinterDialog({ open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{printerDialog.printer ? 'Edytuj drukarkę' : 'Nowa drukarka'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nazwa</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="np. Prusa MK3S+"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Model</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="np. i3 MK3S+"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as typeof PRINTER_STATUSES[number] })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRINTER_STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lokalizacja</Label>
                <Select 
                  value={formData.location_id || 'none'} 
                  onValueChange={(v) => setFormData({ ...formData, location_id: v === 'none' ? '' : v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Wybierz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nieprzypisana</SelectItem>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notatki</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Dodatkowe informacje..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrinterDialog({ open: false })}>Anuluj</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
            >
              {printerDialog.printer ? 'Zapisz' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: '', name: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń drukarkę</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć drukarkę "{deleteDialog.name}"? Ta operacja jest nieodwracalna.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, id: '', name: '' })}>Anuluj</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteDialog.id)} disabled={deleteMutation.isPending}>
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
