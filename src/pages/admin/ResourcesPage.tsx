import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogFooter,
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

const MATERIAL_TYPES = ['PLA', 'PETG', 'ABS', 'TPU', 'Resin', 'Other'] as const;
const PRINTER_STATUSES = ['available', 'busy', 'maintenance', 'offline'] as const;
const MATERIAL_STATUSES = ['available', 'low_stock', 'out_of_stock'] as const;

export default function ResourcesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('materials');
  const [searchQuery, setSearchQuery] = useState('');

  // Material dialog state
  const [materialDialog, setMaterialDialog] = useState<{ open: boolean; material?: Material }>({ open: false });
  const [materialForm, setMaterialForm] = useState({
    name: '',
    type: 'PLA' as typeof MATERIAL_TYPES[number],
    color: '',
    color_hex: '#000000',
    location_id: '',
    quantity_available: '',
    quantity_unit: 'kg',
    min_stock_level: '',
    status: 'available' as typeof MATERIAL_STATUSES[number],
    notes: ''
  });

  // Printer dialog state
  const [printerDialog, setPrinterDialog] = useState<{ open: boolean; printer?: PrinterType }>({ open: false });
  const [printerForm, setPrinterForm] = useState({
    name: '',
    model: '',
    location_id: '',
    status: 'available' as typeof PRINTER_STATUSES[number],
    notes: ''
  });

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

  // Material mutations
  const createMaterialMutation = useMutation({
    mutationFn: materialsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-materials'] });
      setMaterialDialog({ open: false });
      toast({ title: 'Materiał dodany' });
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  const updateMaterialMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Material>) => materialsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-materials'] });
      setMaterialDialog({ open: false });
      toast({ title: 'Materiał zaktualizowany' });
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: (id: string) => materialsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-materials'] });
      toast({ title: 'Materiał usunięty' });
    }
  });

  // Printer mutations
  const createPrinterMutation = useMutation({
    mutationFn: printersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-printers'] });
      setPrinterDialog({ open: false });
      toast({ title: 'Drukarka dodana' });
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  const updatePrinterMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<PrinterType>) => printersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-printers'] });
      setPrinterDialog({ open: false });
      toast({ title: 'Drukarka zaktualizowana' });
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  const deletePrinterMutation = useMutation({
    mutationFn: printersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-printers'] });
      toast({ title: 'Drukarka usunięta' });
    }
  });

  // Open material dialog
  const openMaterialDialog = (material?: Material) => {
    if (material) {
      setMaterialForm({
        name: material.name,
        type: material.type as typeof MATERIAL_TYPES[number],
        color: material.color || '',
        color_hex: material.color_hex || '#000000',
        location_id: material.location_id || '',
        quantity_available: material.quantity_available?.toString() || '',
        quantity_unit: material.quantity_unit || 'kg',
        min_stock_level: material.min_stock_level?.toString() || '',
        status: material.status as typeof MATERIAL_STATUSES[number],
        notes: material.notes || ''
      });
    } else {
      setMaterialForm({
        name: '',
        type: 'PLA',
        color: '',
        color_hex: '#000000',
        location_id: '',
        quantity_available: '',
        quantity_unit: 'kg',
        min_stock_level: '',
        status: 'available',
        notes: ''
      });
    }
    setMaterialDialog({ open: true, material });
  };

  // Open printer dialog
  const openPrinterDialog = (printer?: PrinterType) => {
    if (printer) {
      setPrinterForm({
        name: printer.name,
        model: printer.model || '',
        location_id: printer.location_id || '',
        status: printer.status as typeof PRINTER_STATUSES[number],
        notes: printer.notes || ''
      });
    } else {
      setPrinterForm({
        name: '',
        model: '',
        location_id: '',
        status: 'available',
        notes: ''
      });
    }
    setPrinterDialog({ open: true, printer });
  };

  // Save material
  const saveMaterial = () => {
    const data = {
      name: materialForm.name,
      type: materialForm.type,
      color: materialForm.color || undefined,
      color_hex: materialForm.color_hex || undefined,
      location_id: materialForm.location_id || undefined,
      quantity_available: parseFloat(materialForm.quantity_available) || 0,
      quantity_unit: materialForm.quantity_unit,
      min_stock_level: parseFloat(materialForm.min_stock_level) || 0,
      status: materialForm.status,
      notes: materialForm.notes || undefined
    };

    if (materialDialog.material) {
      updateMaterialMutation.mutate({ id: materialDialog.material.id, ...data });
    } else {
      createMaterialMutation.mutate(data as any);
    }
  };

  // Save printer
  const savePrinter = () => {
    const data = {
      name: printerForm.name,
      model: printerForm.model || undefined,
      location_id: printerForm.location_id || undefined,
      status: printerForm.status,
      notes: printerForm.notes || undefined
    };

    if (printerDialog.printer) {
      updatePrinterMutation.mutate({ id: printerDialog.printer.id, ...data });
    } else {
      createPrinterMutation.mutate(data as any);
    }
  };

  // Filter data
  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPrinters = printers.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.model && p.model.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getLocationName = (locationId?: string) => {
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Materiały i Drukarki</h1>
          <p className="text-muted-foreground">Zarządzaj zasobami produkcyjnymi</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
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
                <p className="text-2xl font-bold">
                  {materials.filter(m => m.status === 'low_stock').length}
                </p>
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
                <p className="text-2xl font-bold">
                  {printers.filter(p => p.status === 'available').length}
                </p>
                <p className="text-sm text-muted-foreground">Dostępne drukarki</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="materials" className="gap-2">
              <Boxes className="h-4 w-4" />
              Materiały ({materials.length})
            </TabsTrigger>
            <TabsTrigger value="printers" className="gap-2">
              <Printer className="h-4 w-4" />
              Drukarki ({printers.length})
            </TabsTrigger>
          </TabsList>
          
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
            <Button onClick={() => activeTab === 'materials' ? openMaterialDialog() : openPrinterDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {activeTab === 'materials' ? 'Dodaj materiał' : 'Dodaj drukarkę'}
            </Button>
          </div>
        </div>

        <TabsContent value="materials" className="mt-4">
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
                      {material.color_hex && (
                        <div 
                          className="w-8 h-8 rounded-lg border"
                          style={{ backgroundColor: material.color_hex }}
                        />
                      )}
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
                        <p className={`font-medium ${
                          material.status === 'out_of_stock' ? 'text-red-500' :
                          material.status === 'low_stock' ? 'text-yellow-500' : ''
                        }`}>
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
                        {material.status === 'available' ? 'Dostępny' :
                         material.status === 'low_stock' ? 'Niski stan' : 'Brak'}
                      </Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openMaterialDialog(material)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            if (confirm('Usunąć materiał?')) deleteMaterialMutation.mutate(material.id);
                          }}
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
        </TabsContent>

        <TabsContent value="printers" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredPrinters.map((printer) => (
                  <motion.div
                    key={printer.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <Printer className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-medium">{printer.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {printer.model && <span>{printer.model}</span>}
                          <span>•</span>
                          <MapPin className="h-3 w-3" />
                          <span>{getLocationName(printer.location_id)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={
                        printer.status === 'available' ? 'default' :
                        printer.status === 'busy' ? 'secondary' :
                        printer.status === 'maintenance' ? 'outline' : 'destructive'
                      }>
                        {printer.status === 'available' ? 'Dostępna' :
                         printer.status === 'busy' ? 'Drukuje' :
                         printer.status === 'maintenance' ? 'Serwis' : 'Offline'}
                      </Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openPrinterDialog(printer)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            if (confirm('Usunąć drukarkę?')) deletePrinterMutation.mutate(printer.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {filteredPrinters.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground">
                    <Printer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Brak drukarek</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Material Dialog */}
      <Dialog open={materialDialog.open} onOpenChange={(open) => setMaterialDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {materialDialog.material ? 'Edytuj materiał' : 'Nowy materiał'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nazwa *</Label>
                <Input 
                  value={materialForm.name}
                  onChange={(e) => setMaterialForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="np. PLA Czarny"
                />
              </div>
              <div className="space-y-2">
                <Label>Typ *</Label>
                <Select 
                  value={materialForm.type}
                  onValueChange={(value) => setMaterialForm(f => ({ ...f, type: value as any }))}
                >
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>Kolor</Label>
                <Input 
                  value={materialForm.color}
                  onChange={(e) => setMaterialForm(f => ({ ...f, color: e.target.value }))}
                  placeholder="np. Czarny"
                />
              </div>
              <div className="space-y-2">
                <Label>Kolor HEX</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={materialForm.color_hex}
                    onChange={(e) => setMaterialForm(f => ({ ...f, color_hex: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <Input 
                    value={materialForm.color_hex}
                    onChange={(e) => setMaterialForm(f => ({ ...f, color_hex: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lokalizacja</Label>
              <Select 
                value={materialForm.location_id}
                onValueChange={(value) => setMaterialForm(f => ({ ...f, location_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz lokalizację" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nie przypisano</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Ilość</Label>
                <Input 
                  type="number"
                  value={materialForm.quantity_available}
                  onChange={(e) => setMaterialForm(f => ({ ...f, quantity_available: e.target.value }))}
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label>Jednostka</Label>
                <Select 
                  value={materialForm.quantity_unit}
                  onValueChange={(value) => setMaterialForm(f => ({ ...f, quantity_unit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="szt">szt</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Min. stan</Label>
                <Input 
                  type="number"
                  value={materialForm.min_stock_level}
                  onChange={(e) => setMaterialForm(f => ({ ...f, min_stock_level: e.target.value }))}
                  step="0.1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={materialForm.status}
                onValueChange={(value) => setMaterialForm(f => ({ ...f, status: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Dostępny</SelectItem>
                  <SelectItem value="low_stock">Niski stan</SelectItem>
                  <SelectItem value="out_of_stock">Brak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notatki</Label>
              <Textarea 
                value={materialForm.notes}
                onChange={(e) => setMaterialForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaterialDialog({ open: false })}>Anuluj</Button>
            <Button 
              onClick={saveMaterial}
              disabled={!materialForm.name || createMaterialMutation.isPending || updateMaterialMutation.isPending}
            >
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printer Dialog */}
      <Dialog open={printerDialog.open} onOpenChange={(open) => setPrinterDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {printerDialog.printer ? 'Edytuj drukarkę' : 'Nowa drukarka'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nazwa *</Label>
                <Input 
                  value={printerForm.name}
                  onChange={(e) => setPrinterForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="np. Prusa #1"
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input 
                  value={printerForm.model}
                  onChange={(e) => setPrinterForm(f => ({ ...f, model: e.target.value }))}
                  placeholder="np. Prusa MK3S+"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lokalizacja</Label>
              <Select 
                value={printerForm.location_id}
                onValueChange={(value) => setPrinterForm(f => ({ ...f, location_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz lokalizację" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nie przypisano</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={printerForm.status}
                onValueChange={(value) => setPrinterForm(f => ({ ...f, status: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Dostępna</SelectItem>
                  <SelectItem value="busy">Drukuje</SelectItem>
                  <SelectItem value="maintenance">Serwis</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notatki</Label>
              <Textarea 
                value={printerForm.notes}
                onChange={(e) => setPrinterForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrinterDialog({ open: false })}>Anuluj</Button>
            <Button 
              onClick={savePrinter}
              disabled={!printerForm.name || createPrinterMutation.isPending || updatePrinterMutation.isPending}
            >
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
