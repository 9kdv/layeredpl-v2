import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, Tag, Percent, Truck, DollarSign, 
  MoreHorizontal, Edit2, Trash2, Copy, Check, X, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { toast } from 'sonner';
import { promoApi, PromoCode } from '@/lib/adminApi';

const PROMO_TYPES = {
  percentage: { label: 'Procentowy', icon: Percent },
  fixed: { label: 'Kwotowy', icon: DollarSign },
  free_shipping: { label: 'Darmowa dostawa', icon: Truck },
};

export default function PromotionsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [promoDialog, setPromoDialog] = useState<{ open: boolean; promo?: PromoCode }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; code: string }>({ open: false, id: '', code: '' });

  const { data: promoCodes = [], isLoading } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: promoApi.getAll
  });

  const createMutation = useMutation({
    mutationFn: promoApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      setPromoDialog({ open: false });
      toast.success('Kod promocyjny utworzony');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<PromoCode>) => promoApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      setPromoDialog({ open: false });
      toast.success('Kod promocyjny zaktualizowany');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: promoApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      setDeleteDialog({ open: false, id: '', code: '' });
      toast.success('Kod promocyjny usunięty');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => promoApi.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success('Status zmieniony');
    }
  });

  const filteredPromoCodes = promoCodes.filter(p =>
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = promoCodes.filter(p => p.is_active).length;
  const totalUses = promoCodes.reduce((sum, p) => sum + p.uses_count, 0);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Ładowanie...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promocje i kody rabatowe</h1>
          <p className="text-muted-foreground">Zarządzaj kodami rabatowymi i promocjami</p>
        </div>
        <Button onClick={() => setPromoDialog({ open: true })} className="gap-2">
          <Plus className="h-4 w-4" />
          Dodaj kod
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Wszystkie kody</p>
            <p className="text-2xl font-bold">{promoCodes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Aktywne</p>
            <p className="text-2xl font-bold text-primary">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Łączne użycia</p>
            <p className="text-2xl font-bold">{totalUses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Wygasłe</p>
            <p className="text-2xl font-bold text-muted-foreground">
              {promoCodes.filter(p => p.valid_until && new Date(p.valid_until) < new Date()).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj po kodzie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Wartość</TableHead>
                <TableHead>Użycia</TableHead>
                <TableHead>Ważność</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPromoCodes.map((promo) => {
                const TypeIcon = PROMO_TYPES[promo.type]?.icon || Tag;
                const isExpired = promo.valid_until && new Date(promo.valid_until) < new Date();
                const isMaxedOut = promo.max_uses && promo.uses_count >= promo.max_uses;

                return (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-medium">{promo.code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{PROMO_TYPES[promo.type]?.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {promo.type === 'percentage' ? `${promo.value}%` : 
                       promo.type === 'fixed' ? `${promo.value} zł` : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={promo.max_uses ? '' : 'text-muted-foreground'}>
                        {promo.uses_count}{promo.max_uses ? ` / ${promo.max_uses}` : ' / ∞'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {promo.valid_until ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className={isExpired ? 'text-destructive' : ''}>
                            {new Date(promo.valid_until).toLocaleDateString('pl-PL')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Bez limitu</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isExpired ? (
                        <Badge variant="secondary">Wygasły</Badge>
                      ) : isMaxedOut ? (
                        <Badge variant="secondary">Wykorzystany</Badge>
                      ) : (
                        <Switch
                          checked={promo.is_active}
                          onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: promo.id, is_active: checked })}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPromoDialog({ open: true, promo })}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edytuj
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(promo.code)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Kopiuj kod
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeleteDialog({ open: true, id: promo.id, code: promo.code })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Usuń
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredPromoCodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {searchQuery ? 'Brak kodów spełniających kryteria' : 'Brak kodów promocyjnych'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <PromoCodeDialog 
        open={promoDialog.open}
        promo={promoDialog.promo}
        onClose={() => setPromoDialog({ open: false })}
        onSave={(data) => {
          if (promoDialog.promo) {
            updateMutation.mutate({ id: promoDialog.promo.id, ...data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: '', code: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń kod promocyjny</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć kod "{deleteDialog.code}"? Ta operacja jest nieodwracalna.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, id: '', code: '' })}>Anuluj</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteDialog.id)} disabled={deleteMutation.isPending}>
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PromoCodeDialog({ 
  open, 
  promo, 
  onClose, 
  onSave, 
  isLoading 
}: { 
  open: boolean; 
  promo?: PromoCode; 
  onClose: () => void; 
  onSave: (data: Partial<PromoCode>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<PromoCode>>({
    code: '',
    type: 'percentage',
    value: 10,
    min_order_amount: 0,
    max_uses: null,
    uses_per_user: 1,
    valid_from: null,
    valid_until: null,
    is_active: true,
    applies_to: 'all',
    is_automatic: false,
    priority: 0,
  });

  // Reset form when dialog opens
  useState(() => {
    if (open) {
      if (promo) {
        setFormData({
          code: promo.code,
          type: promo.type,
          value: promo.value,
          min_order_amount: promo.min_order_amount,
          max_uses: promo.max_uses,
          uses_per_user: promo.uses_per_user,
          valid_from: promo.valid_from,
          valid_until: promo.valid_until,
          is_active: promo.is_active,
          applies_to: promo.applies_to,
          is_automatic: promo.is_automatic,
          priority: promo.priority,
        });
      } else {
        setFormData({
          code: '',
          type: 'percentage',
          value: 10,
          min_order_amount: 0,
          max_uses: null,
          uses_per_user: 1,
          valid_from: null,
          valid_until: null,
          is_active: true,
          applies_to: 'all',
          is_automatic: false,
          priority: 0,
        });
      }
    }
  });

  const handleSubmit = () => {
    if (!formData.code) {
      toast.error('Kod jest wymagany');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{promo ? 'Edytuj kod' : 'Nowy kod promocyjny'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-4">
            <div>
              <Label>Kod</Label>
              <Input
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="np. LATO2024"
                className="font-mono mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Typ</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as PromoCode['type'] })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Procentowy (%)</SelectItem>
                    <SelectItem value="fixed">Kwotowy (zł)</SelectItem>
                    <SelectItem value="free_shipping">Darmowa dostawa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Wartość</Label>
                <Input
                  type="number"
                  value={formData.value || ''}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  disabled={formData.type === 'free_shipping'}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min. wartość zamówienia</Label>
                <Input
                  type="number"
                  value={formData.min_order_amount || ''}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Max użyć (puste = bez limitu)</Label>
                <Input
                  type="number"
                  value={formData.max_uses || ''}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="∞"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ważny od</Label>
                <Input
                  type="date"
                  value={formData.valid_from?.split('T')[0] || ''}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value || null })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Ważny do</Label>
                <Input
                  type="date"
                  value={formData.valid_until?.split('T')[0] || ''}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value || null })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Aktywny</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_automatic}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_automatic: checked })}
                />
                <Label>Automatyczny</Label>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {promo ? 'Zapisz' : 'Utwórz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
