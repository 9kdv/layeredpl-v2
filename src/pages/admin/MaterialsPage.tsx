import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Boxes, Plus, Search, AlertTriangle, CheckCircle, 
  XCircle, Edit2, MapPin, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { materialsApi, Material, locationsApi, Location } from '@/lib/adminApi';

const MATERIAL_TYPES = ['PLA', 'PETG', 'ABS', 'TPU', 'Resin', 'Other'];

const STATUS_CONFIG = {
  available: { label: 'Dostępny', color: 'text-green-500', icon: CheckCircle },
  low_stock: { label: 'Niski stan', color: 'text-yellow-500', icon: AlertTriangle },
  out_of_stock: { label: 'Brak', color: 'text-destructive', icon: XCircle },
};

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

export default function MaterialsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [materialDialog, setMaterialDialog] = useState<{ open: boolean; material?: Material }>({ open: false });
  const [locationDialog, setLocationDialog] = useState(false);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: materialsApi.getAll
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.getAll
  });

  const createMaterialMutation = useMutation({
    mutationFn: materialsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setMaterialDialog({ open: false });
      toast.success('Materiał dodany');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const updateMaterialMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Material>) => materialsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setMaterialDialog({ open: false });
      toast.success('Materiał zaktualizowany');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const createLocationMutation = useMutation({
    mutationFn: locationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setLocationDialog(false);
      toast.success('Lokalizacja dodana');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.color?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const lowStockCount = materials.filter(m => m.status === 'low_stock').length;
  const outOfStockCount = materials.filter(m => m.status === 'out_of_stock').length;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Ładowanie...</div></div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Materiały</h1>
          <p className="text-muted-foreground">Zarządzaj materiałami do druku 3D</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocationDialog(true)} className="gap-2">
            <MapPin className="h-4 w-4" />
            Lokalizacje
          </Button>
          <Button onClick={() => setMaterialDialog({ open: true })} className="gap-2">
            <Plus className="h-4 w-4" />
            Dodaj materiał
          </Button>
        </div>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {(lowStockCount > 0 || outOfStockCount > 0) && (
          <motion.div {...fadeIn} className="grid gap-4 md:grid-cols-2">
            {outOfStockCount > 0 && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="p-3 bg-destructive/10 rounded-xl">
                    <XCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium">Brak materiałów</p>
                    <p className="text-sm text-muted-foreground">{outOfStockCount} materiałów wymaga uzupełnienia</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {lowStockCount > 0 && (
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="p-3 bg-yellow-500/10 rounded-xl">
                    <AlertTriangle className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="font-medium">Niski stan magazynowy</p>
                    <p className="text-sm text-muted-foreground">{lowStockCount} materiałów ma niski stan</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Wszystkie materiały', value: materials.length },
          ...MATERIAL_TYPES.slice(0, 3).map(type => ({
            label: type,
            value: materials.filter(m => m.type === type).length
          }))
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po nazwie lub kolorze..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
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
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Materiał</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Kolor</TableHead>
                <TableHead>Lokalizacja</TableHead>
                <TableHead>Stan magazynowy</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((material, idx) => {
                const statusConfig = STATUS_CONFIG[material.status];
                const StatusIcon = statusConfig.icon;
                const stockPercent = material.min_stock_level > 0 
                  ? Math.min(100, (material.quantity_available / (material.min_stock_level * 2)) * 100)
                  : 100;

                return (
                  <motion.tr
                    key={material.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg border"
                          style={{ backgroundColor: material.color_hex || '#888' }}
                        />
                        <span className="font-medium">{material.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{material.type}</Badge>
                    </TableCell>
                    <TableCell>{material.color || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {material.location_name || 'Nieprzypisane'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{material.quantity_available} {material.quantity_unit}</span>
                          {material.min_stock_level > 0 && (
                            <span className="text-muted-foreground">min: {material.min_stock_level}</span>
                          )}
                        </div>
                        <Progress value={stockPercent} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${statusConfig.color}`}>
                        <StatusIcon className="h-4 w-4" />
                        <span className="text-sm">{statusConfig.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setMaterialDialog({ open: true, material })}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                );
              })}
              {filteredMaterials.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {searchQuery || typeFilter !== 'all' ? 'Brak materiałów spełniających kryteria' : 'Brak materiałów'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Material Dialog */}
      <MaterialDialog
        open={materialDialog.open}
        material={materialDialog.material}
        locations={locations}
        onClose={() => setMaterialDialog({ open: false })}
        onSave={(data) => {
          if (materialDialog.material) {
            updateMaterialMutation.mutate({ id: materialDialog.material.id, ...data });
          } else {
            createMaterialMutation.mutate(data);
          }
        }}
        isLoading={createMaterialMutation.isPending || updateMaterialMutation.isPending}
      />

      {/* Location Dialog */}
      <LocationDialog
        open={locationDialog}
        locations={locations}
        onClose={() => setLocationDialog(false)}
        onCreate={(data) => createLocationMutation.mutate(data)}
        isLoading={createLocationMutation.isPending}
      />
    </motion.div>
  );
}

function MaterialDialog({
  open,
  material,
  locations,
  onClose,
  onSave,
  isLoading
}: {
  open: boolean;
  material?: Material;
  locations: Location[];
  onClose: () => void;
  onSave: (data: Partial<Material>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<Material>>({
    name: '',
    type: 'PLA',
    color: '',
    color_hex: '#808080',
    location_id: null,
    quantity_available: 0,
    quantity_unit: 'kg',
    min_stock_level: 0,
    notes: '',
  });

  useEffect(() => {
    if (open && material) {
      setFormData({
        name: material.name,
        type: material.type,
        color: material.color,
        color_hex: material.color_hex,
        location_id: material.location_id,
        quantity_available: material.quantity_available,
        quantity_unit: material.quantity_unit,
        min_stock_level: material.min_stock_level,
        notes: material.notes,
      });
    } else if (open) {
      setFormData({
        name: '',
        type: 'PLA',
        color: '',
        color_hex: '#808080',
        location_id: null,
        quantity_available: 0,
        quantity_unit: 'kg',
        min_stock_level: 0,
        notes: '',
      });
    }
  }, [open, material]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{material ? 'Edytuj materiał' : 'Nowy materiał'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nazwa</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="np. PLA Premium"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Typ</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as Material['type'] })}>
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
                value={formData.color || ''}
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
                  value={formData.color_hex || '#808080'}
                  onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                  className="w-14 h-10 p-1"
                />
                <Input
                  value={formData.color_hex || ''}
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
              onValueChange={(v) => setFormData({ ...formData, location_id: v === 'none' ? null : v })}
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
                value={formData.quantity_available || ''}
                onChange={(e) => setFormData({ ...formData, quantity_available: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Jednostka</Label>
              <Select value={formData.quantity_unit || 'kg'} onValueChange={(v) => setFormData({ ...formData, quantity_unit: v })}>
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
                value={formData.min_stock_level || ''}
                onChange={(e) => setFormData({ ...formData, min_stock_level: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Notatki</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Dodatkowe informacje..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button onClick={() => onSave(formData)} disabled={isLoading || !formData.name}>
            {material ? 'Zapisz' : 'Dodaj'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LocationDialog({
  open,
  locations,
  onClose,
  onCreate,
  isLoading
}: {
  open: boolean;
  locations: Location[];
  onClose: () => void;
  onCreate: (data: Partial<Location>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({ name: '', description: '', address: '' });
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => locationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Lokalizacja usunięta');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Lokalizacje</DialogTitle>
          <DialogDescription>Zarządzaj lokalizacjami magazynów</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {locations.length > 0 && (
            <div className="space-y-2">
              {locations.map(loc => (
                <div key={loc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{loc.name}</p>
                    {loc.address && <p className="text-sm text-muted-foreground">{loc.address}</p>}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => deleteMutation.mutate(loc.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {showForm ? (
            <div className="space-y-3 p-4 border rounded-lg">
              <div>
                <Label>Nazwa</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="np. Magazyn główny"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Adres</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="np. ul. Przykładowa 1"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Opis</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Opcjonalny opis..."
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                  Anuluj
                </Button>
                <Button 
                  onClick={() => {
                    onCreate(formData);
                    setFormData({ name: '', description: '', address: '' });
                    setShowForm(false);
                  }} 
                  disabled={isLoading || !formData.name}
                  className="flex-1"
                >
                  Dodaj
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowForm(true)} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Dodaj lokalizację
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
