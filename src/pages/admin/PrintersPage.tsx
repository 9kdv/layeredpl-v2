import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Printer, Plus, Search, CheckCircle, AlertCircle, 
  Settings, Power, Edit2, Trash2, MapPin, User
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { printersApi, Printer as PrinterType, locationsApi, Location } from '@/lib/adminApi';
import { api } from '@/lib/api';

const STATUS_CONFIG = {
  available: { label: 'Dostępna', color: 'bg-green-500/10 text-green-500 border-green-500/30', icon: CheckCircle },
  busy: { label: 'Zajęta', color: 'bg-purple-500/10 text-purple-500 border-purple-500/30', icon: Printer },
  maintenance: { label: 'Serwis', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30', icon: Settings },
  offline: { label: 'Offline', color: 'bg-muted text-muted-foreground border-muted', icon: Power },
};

export default function PrintersPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [printerDialog, setPrinterDialog] = useState<{ open: boolean; printer?: PrinterType }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });

  const { data: printers = [], isLoading } = useQuery({
    queryKey: ['printers'],
    queryFn: printersApi.getAll
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.getAll
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.getAdminUsers().catch(() => [])
  });

  const createMutation = useMutation({
    mutationFn: printersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      setPrinterDialog({ open: false });
      toast.success('Drukarka dodana');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<PrinterType>) => printersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      setPrinterDialog({ open: false });
      toast.success('Drukarka zaktualizowana');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: printersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      setDeleteDialog({ open: false, id: '', name: '' });
      toast.success('Drukarka usunięta');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const filteredPrinters = printers.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableCount = printers.filter(p => p.status === 'available').length;
  const busyCount = printers.filter(p => p.status === 'busy').length;

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
          <h1 className="text-2xl font-bold">Drukarki</h1>
          <p className="text-muted-foreground">Zarządzaj drukarkami 3D</p>
        </div>
        <Button onClick={() => setPrinterDialog({ open: true })} className="gap-2">
          <Plus className="h-4 w-4" />
          Dodaj drukarkę
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Wszystkie', value: printers.length },
          { label: 'Dostępne', value: availableCount, color: 'text-green-500' },
          { label: 'Zajęte', value: busyCount, color: 'text-purple-500' },
          { label: 'W serwisie', value: printers.filter(p => p.status === 'maintenance').length, color: 'text-yellow-500' }
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
                <p className={`text-2xl font-bold ${stat.color || ''}`}>{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj po nazwie lub modelu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Printers Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPrinters.map((printer, idx) => {
          const statusConfig = STATUS_CONFIG[printer.status];
          const StatusIcon = statusConfig.icon;

          return (
            <motion.div
              key={printer.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className={`border hover:shadow-lg transition-all ${statusConfig.color.split(' ')[2] || ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${statusConfig.color}`}>
                        <Printer className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{printer.name}</CardTitle>
                        {printer.model && (
                          <p className="text-sm text-muted-foreground">{printer.model}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={statusConfig.color}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    {printer.location_name && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {printer.location_name}
                      </div>
                    )}
                    {printer.assigned_email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        {printer.assigned_email}
                      </div>
                    )}
                    {printer.notes && (
                      <p className="text-muted-foreground bg-muted/50 p-2 rounded">
                        {printer.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setPrinterDialog({ open: true, printer })}
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
      <PrinterDialog
        open={printerDialog.open}
        printer={printerDialog.printer}
        locations={locations}
        users={users}
        onClose={() => setPrinterDialog({ open: false })}
        onSave={(data) => {
          if (printerDialog.printer) {
            updateMutation.mutate({ id: printerDialog.printer.id, ...data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

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
    </motion.div>
  );
}

function PrinterDialog({
  open,
  printer,
  locations,
  users,
  onClose,
  onSave,
  isLoading
}: {
  open: boolean;
  printer?: PrinterType;
  locations: Location[];
  users: { id: string; email: string }[];
  onClose: () => void;
  onSave: (data: Partial<PrinterType>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<PrinterType>>({
    name: '',
    model: '',
    location_id: null,
    status: 'available',
    assigned_to: null,
    notes: '',
  });

  useEffect(() => {
    if (open && printer) {
      setFormData({
        name: printer.name,
        model: printer.model,
        location_id: printer.location_id,
        status: printer.status,
        assigned_to: printer.assigned_to,
        notes: printer.notes,
      });
    } else if (open) {
      setFormData({
        name: '',
        model: '',
        location_id: null,
        status: 'available',
        assigned_to: null,
        notes: '',
      });
    }
  }, [open, printer]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{printer ? 'Edytuj drukarkę' : 'Nowa drukarka'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nazwa</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="np. Prusa MK3S+"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Model</Label>
              <Input
                value={formData.model || ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="np. i3 MK3S+"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as PrinterType['status'] })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lokalizacja</Label>
              <Select 
                value={formData.location_id || 'none'} 
                onValueChange={(v) => setFormData({ ...formData, location_id: v === 'none' ? null : v })}
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
            <Label>Przypisana do</Label>
            <Select 
              value={formData.assigned_to || 'none'} 
              onValueChange={(v) => setFormData({ ...formData, assigned_to: v === 'none' ? null : v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Wybierz osobę" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nieprzypisana</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            {printer ? 'Zapisz' : 'Dodaj'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
