import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  RotateCcw, Search, AlertCircle, CheckCircle, Clock,
  Package, DollarSign, User, FileText, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { returnsApi, Return } from '@/lib/adminApi';

const REASON_LABELS: Record<string, string> = {
  defect: 'Wada produktu',
  wrong_item: 'Błędny produkt',
  not_as_described: 'Niezgodny z opisem',
  changed_mind: 'Zmiana decyzji',
  damaged: 'Uszkodzenie',
  other: 'Inne',
};

const DECISION_CONFIG = {
  pending: { label: 'Oczekuje', color: 'bg-muted text-muted-foreground' },
  approved_refund: { label: 'Zwrot', color: 'bg-green-500/10 text-green-500' },
  approved_reprint: { label: 'Ponowna produkcja', color: 'bg-blue-500/10 text-blue-500' },
  partial_refund: { label: 'Częściowy zwrot', color: 'bg-yellow-500/10 text-yellow-500' },
  rejected: { label: 'Odrzucono', color: 'bg-destructive/10 text-destructive' },
};

const STATUS_CONFIG = {
  submitted: { label: 'Zgłoszona', color: 'bg-blue-500/10 text-blue-500', icon: FileText },
  under_review: { label: 'W rozpatrywaniu', color: 'bg-purple-500/10 text-purple-500', icon: Clock },
  awaiting_return: { label: 'Oczekuje na zwrot', color: 'bg-yellow-500/10 text-yellow-500', icon: Package },
  received: { label: 'Otrzymano', color: 'bg-orange-500/10 text-orange-500', icon: CheckCircle },
  resolved: { label: 'Rozwiązana', color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
  closed: { label: 'Zamknięta', color: 'bg-muted text-muted-foreground', icon: CheckCircle },
};

export default function ReturnsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['returns'],
    queryFn: returnsApi.getAll
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Return>) => returnsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      toast.success('Reklamacja zaktualizowana');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const filteredReturns = returns.filter(r => {
    const matchesSearch = r.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         r.order_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = returns.filter(r => r.status === 'submitted' || r.status === 'under_review').length;
  const totalRefunds = returns
    .filter(r => r.decision !== 'pending' && r.decision !== 'rejected')
    .reduce((sum, r) => sum + r.refund_amount, 0);

  const openDetail = async (ret: Return) => {
    try {
      const detailed = await returnsApi.get(ret.id);
      setSelectedReturn(detailed);
      setDetailDialog(true);
    } catch {
      setSelectedReturn(ret);
      setDetailDialog(true);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Ładowanie...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reklamacje i zwroty</h1>
          <p className="text-muted-foreground">Zarządzaj reklamacjami klientów</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {pendingCount} do rozpatrzenia
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Wszystkie</p>
            <p className="text-2xl font-bold">{returns.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Oczekujące</p>
            <p className="text-2xl font-bold text-primary">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Rozwiązane</p>
            <p className="text-2xl font-bold text-green-500">
              {returns.filter(r => r.status === 'resolved' || r.status === 'closed').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Suma zwrotów</p>
            <p className="text-2xl font-bold">{totalRefunds.toFixed(2)} zł</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po email lub ID zamówienia..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zamówienie</TableHead>
                <TableHead>Klient</TableHead>
                <TableHead>Powód</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Decyzja</TableHead>
                <TableHead>Kwota zwrotu</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReturns.map((ret) => {
                const statusConfig = STATUS_CONFIG[ret.status];
                const decisionConfig = DECISION_CONFIG[ret.decision];

                return (
                  <TableRow key={ret.id}>
                    <TableCell>
                      <span className="font-mono text-sm">
                        #{ret.order_id.slice(0, 8).toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{ret.customer_name || '-'}</p>
                        <p className="text-xs text-muted-foreground">{ret.customer_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{REASON_LABELS[ret.reason] || ret.reason}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusConfig?.color}>
                        {statusConfig?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={decisionConfig?.color}>
                        {decisionConfig?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ret.refund_amount > 0 ? (
                        <span className="font-medium">{ret.refund_amount.toFixed(2)} zł</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ret.created_at).toLocaleDateString('pl-PL')}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => openDetail(ret)}>
                        Szczegóły
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredReturns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' ? 'Brak reklamacji spełniających kryteria' : 'Brak reklamacji'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedReturn && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <RotateCcw className="h-5 w-5" />
                  Reklamacja - #{selectedReturn.order_id.slice(0, 8).toUpperCase()}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Customer Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Klient</Label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedReturn.customer_name || selectedReturn.customer_email}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Wartość zamówienia</Label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedReturn.order_total?.toFixed(2) || '-'} zł</span>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Powód reklamacji</Label>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <Badge variant="outline" className="mb-2">
                      {REASON_LABELS[selectedReturn.reason] || selectedReturn.reason}
                    </Badge>
                    {selectedReturn.description && (
                      <p className="text-sm mt-2">{selectedReturn.description}</p>
                    )}
                  </div>
                </div>

                {/* Decision Form */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select 
                      value={selectedReturn.status}
                      onValueChange={(v) => {
                        updateMutation.mutate({ id: selectedReturn.id, status: v as Return['status'] });
                        setSelectedReturn({ ...selectedReturn, status: v as Return['status'] });
                      }}
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
                    <Label>Decyzja</Label>
                    <Select 
                      value={selectedReturn.decision}
                      onValueChange={(v) => {
                        updateMutation.mutate({ id: selectedReturn.id, decision: v as Return['decision'] });
                        setSelectedReturn({ ...selectedReturn, decision: v as Return['decision'] });
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DECISION_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Kwota zwrotu</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      value={selectedReturn.refund_amount || ''}
                      onChange={(e) => setSelectedReturn({ ...selectedReturn, refund_amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                    <Button 
                      variant="outline"
                      onClick={() => updateMutation.mutate({ id: selectedReturn.id, refund_amount: selectedReturn.refund_amount })}
                      disabled={updateMutation.isPending}
                    >
                      Zapisz
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Notatki wewnętrzne</Label>
                  <Textarea
                    value={selectedReturn.internal_notes || ''}
                    onChange={(e) => setSelectedReturn({ ...selectedReturn, internal_notes: e.target.value })}
                    placeholder="Notatki widoczne tylko dla zespołu..."
                    className="mt-1"
                    rows={3}
                  />
                  <Button 
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => updateMutation.mutate({ id: selectedReturn.id, internal_notes: selectedReturn.internal_notes })}
                    disabled={updateMutation.isPending}
                  >
                    Zapisz notatki
                  </Button>
                </div>

                {/* History */}
                {selectedReturn.history && selectedReturn.history.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Historia</Label>
                    <ScrollArea className="h-[150px]">
                      <div className="space-y-2">
                        {selectedReturn.history.map((h) => (
                          <div key={h.id} className="flex items-start gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <span className="text-muted-foreground">
                                {new Date(h.created_at).toLocaleString('pl-PL')}
                              </span>
                              <span className="mx-2">-</span>
                              <span>
                                {h.action}: {h.old_status} → {h.new_status}
                              </span>
                              {h.user_email && (
                                <span className="text-muted-foreground ml-2">({h.user_email})</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailDialog(false)}>Zamknij</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
