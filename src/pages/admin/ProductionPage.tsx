import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Printer, Clock, User, Package, AlertCircle, 
  CheckCircle, Play, Pause, Settings, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { productionApi, ProductionItem, printersApi, Printer as PrinterType, materialsApi, Material } from '@/lib/adminApi';
import { api } from '@/lib/api';

const STATUS_CONFIG = {
  pending: { label: 'Oczekuje', color: 'bg-muted text-muted-foreground', icon: Clock },
  preparing: { label: 'Przygotowanie', color: 'bg-blue-500/10 text-blue-500', icon: Settings },
  printing: { label: 'Drukowanie', color: 'bg-purple-500/10 text-purple-500', icon: Printer },
  post_processing: { label: 'Obróbka', color: 'bg-orange-500/10 text-orange-500', icon: Settings },
  ready: { label: 'Gotowe', color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
  completed: { label: 'Ukończone', color: 'bg-muted text-muted-foreground', icon: CheckCircle },
  cancelled: { label: 'Anulowane', color: 'bg-destructive/10 text-destructive', icon: AlertCircle },
};

const STATUS_ORDER = ['pending', 'preparing', 'printing', 'post_processing', 'ready'];

export default function ProductionPage() {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<ProductionItem | null>(null);
  const [editDialog, setEditDialog] = useState(false);

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['production-queue'],
    queryFn: productionApi.getQueue
  });

  const { data: printers = [] } = useQuery({
    queryKey: ['printers'],
    queryFn: printersApi.getAll
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: materialsApi.getAll
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: api.getAdminUsers
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<ProductionItem>) => productionApi.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-queue'] });
      setEditDialog(false);
      toast.success('Pozycja zaktualizowana');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const handleStatusChange = (item: ProductionItem, newStatus: string) => {
    updateMutation.mutate({ id: item.id, status: newStatus as ProductionItem['status'] });
  };

  const getNextStatus = (currentStatus: string) => {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < STATUS_ORDER.length - 1) {
      return STATUS_ORDER[currentIndex + 1];
    }
    return null;
  };

  // Group by status for Kanban-like view
  const groupedQueue = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = queue.filter(item => item.status === status);
    return acc;
  }, {} as Record<string, ProductionItem[]>);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Ładowanie...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kolejka produkcji</h1>
          <p className="text-muted-foreground">Zarządzaj zamówieniami do realizacji</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Package className="h-3 w-3" />
          {queue.length} pozycji w kolejce
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        {STATUS_ORDER.map((status) => {
          const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          const count = groupedQueue[status]?.length || 0;
          const StatusIcon = config.icon;
          return (
            <Card key={status}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <StatusIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{config.label}</p>
                  <p className="text-xl font-bold">{count}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="grid gap-4 md:grid-cols-5">
        {STATUS_ORDER.map((status) => {
          const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          const items = groupedQueue[status] || [];
          return (
            <div key={status} className="space-y-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.color}`}>
                <config.icon className="h-4 w-4" />
                <span className="font-medium">{config.label}</span>
                <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2 pr-2">
                  {items.map((item) => (
                    <Card 
                      key={item.id} 
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => { setSelectedItem(item); setEditDialog(true); }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm font-medium">
                              #{item.order_id.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.customer_name || item.customer_email}
                            </p>
                          </div>
                          {item.priority > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              Priorytet
                            </Badge>
                          )}
                        </div>
                        
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {item.printer_name && (
                            <div className="flex items-center gap-1">
                              <Printer className="h-3 w-3" />
                              {item.printer_name}
                            </div>
                          )}
                          {item.material_name && (
                            <div className="flex items-center gap-1">
                              <div 
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: item.material_color || '#888' }}
                              />
                              {item.material_name}
                            </div>
                          )}
                          {item.assigned_email && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {item.assigned_email.split('@')[0]}
                            </div>
                          )}
                        </div>

                        {getNextStatus(item.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2 gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = getNextStatus(item.status);
                              if (next) handleStatusChange(item, next);
                            }}
                          >
                            <ChevronRight className="h-3 w-3" />
                            {STATUS_CONFIG[getNextStatus(item.status) as keyof typeof STATUS_CONFIG]?.label}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {items.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Brak pozycji
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edytuj pozycję - #{selectedItem?.order_id.slice(0, 8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Status</Label>
                <Select 
                  value={selectedItem.status} 
                  onValueChange={(v) => setSelectedItem({ ...selectedItem, status: v as ProductionItem['status'] })}
                >
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
                <Label>Drukarka</Label>
                <Select 
                  value={selectedItem.printer_id || ''} 
                  onValueChange={(v) => setSelectedItem({ ...selectedItem, printer_id: v || null })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Wybierz drukarkę" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Brak</SelectItem>
                    {printers.filter(p => p.status === 'available').map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Materiał</Label>
                <Select 
                  value={selectedItem.material_id || ''} 
                  onValueChange={(v) => setSelectedItem({ ...selectedItem, material_id: v || null })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Wybierz materiał" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Brak</SelectItem>
                    {materials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full border"
                            style={{ backgroundColor: m.color_hex || '#888' }}
                          />
                          {m.name} ({m.type})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Przypisz do</Label>
                <Select 
                  value={selectedItem.assigned_to || ''} 
                  onValueChange={(v) => setSelectedItem({ ...selectedItem, assigned_to: v || null })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Wybierz osobę" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nieprzypisane</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notatki</Label>
                <Textarea
                  value={selectedItem.notes || ''}
                  onChange={(e) => setSelectedItem({ ...selectedItem, notes: e.target.value })}
                  placeholder="Notatki produkcyjne..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Anuluj</Button>
            <Button 
              onClick={() => {
                if (selectedItem) {
                  updateMutation.mutate({
                    id: selectedItem.id,
                    status: selectedItem.status,
                    printer_id: selectedItem.printer_id,
                    material_id: selectedItem.material_id,
                    assigned_to: selectedItem.assigned_to,
                    notes: selectedItem.notes,
                  });
                }
              }}
              disabled={updateMutation.isPending}
            >
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
