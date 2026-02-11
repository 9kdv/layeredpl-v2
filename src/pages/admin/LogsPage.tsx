import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { 
  FileText, Search, Download, User, CalendarIcon, 
  RefreshCw, Activity, LogIn, Edit, ChevronLeft, ChevronRight,
  Trash2, ExternalLink, Package, ShoppingCart, Settings, UserPlus, Lock, Unlock, Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logsApi, settingsApi, ActivityLog } from '@/lib/adminApi';

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  login: { label: 'Logowanie', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: LogIn },
  logout: { label: 'Wylogowanie', color: 'bg-muted text-muted-foreground', icon: LogIn },
  password_change: { label: 'Zmiana hasła', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Key },
  create_user: { label: 'Utworzenie użytkownika', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: UserPlus },
  update_user: { label: 'Aktualizacja użytkownika', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Edit },
  delete_user: { label: 'Usunięcie użytkownika', color: 'bg-destructive/10 text-destructive', icon: Trash2 },
  block_user: { label: 'Blokada użytkownika', color: 'bg-destructive/10 text-destructive', icon: Lock },
  unblock_user: { label: 'Odblokowanie użytkownika', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: Unlock },
  reset_password: { label: 'Reset hasła', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Key },
  order_status_change: { label: 'Zmiana statusu zamówienia', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: ShoppingCart },
  create_product: { label: 'Utworzenie produktu', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Package },
  update_product: { label: 'Aktualizacja produktu', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Package },
  delete_product: { label: 'Usunięcie produktu', color: 'bg-destructive/10 text-destructive', icon: Package },
  settings_update: { label: 'Zmiana ustawień', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Settings },
  update_settings: { label: 'Zmiana ustawień', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Settings },
  reset_settings: { label: 'Reset ustawień', color: 'bg-destructive/10 text-destructive', icon: Settings },
  clear_logs: { label: 'Czyszczenie logów', color: 'bg-destructive/10 text-destructive', icon: Trash2 },
  create_promo: { label: 'Utworzenie promocji', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: Edit },
  update_promo: { label: 'Aktualizacja promocji', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Edit },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Oczekujące', paid: 'Opłacone', processing: 'W realizacji',
  shipped: 'Wysłane', delivered: 'Dostarczone', cancelled: 'Anulowane',
  refund_requested: 'Zwrot żądany', refunded: 'Zwrócone',
};

const ITEMS_PER_PAGE = 20;

function getEntityLink(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case 'order': return `/admin/orders/${entityId}`;
    case 'product': return `/admin/products`;
    case 'user': return `/admin/users`;
    case 'promo_code': return `/admin/promotions`;
    case 'settings': return `/admin/settings`;
    default: return null;
  }
}

function formatDetails(log: ActivityLog): string {
  const details = log.details;
  if (!details) return '';
  
  const d = typeof details === 'string' ? (() => { try { return JSON.parse(details); } catch { return null; } })() : details;
  if (!d) return typeof details === 'string' ? details : '';

  const parts: string[] = [];

  // Order status changes
  if (log.action === 'order_status_change') {
    if (d.old_status && d.new_status) {
      parts.push(`${STATUS_LABELS[d.old_status as string] || d.old_status} → ${STATUS_LABELS[d.new_status as string] || d.new_status}`);
    }
    if (d.note) parts.push(`Notatka: ${d.note}`);
  }
  // Product changes
  else if (log.action === 'update_product' || log.action === 'create_product') {
    if (d.name) parts.push(`Produkt: ${d.name}`);
    if (d.changes) {
      const changes = d.changes as Record<string, unknown>;
      Object.entries(changes).forEach(([key, val]) => {
        const labels: Record<string, string> = { name: 'Nazwa', price: 'Cena', description: 'Opis', category: 'Kategoria', is_visible: 'Widoczność', featured: 'Wyróżniony' };
        parts.push(`${labels[key] || key}: ${val}`);
      });
    }
    if (d.price) parts.push(`Cena: ${d.price} zł`);
  }
  // User changes
  else if (log.action.includes('user')) {
    if (d.email) parts.push(`Email: ${d.email}`);
    if (d.roles) parts.push(`Role: ${(d.roles as string[]).join(', ')}`);
    if (d.reason) parts.push(`Powód: ${d.reason}`);
  }
  // Settings changes
  else if (log.action.includes('settings')) {
    if (d.keys) parts.push(`Zmienione: ${(d.keys as string[]).join(', ')}`);
  }
  // Default
  else {
    const str = JSON.stringify(d);
    if (str.length > 100) return str.slice(0, 100) + '...';
    return str;
  }

  return parts.join(' • ');
}

export default function LogsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['activity-logs', actionFilter, entityFilter, startDate, endDate],
    queryFn: () => logsApi.getAll({
      action: actionFilter !== 'all' ? actionFilter : undefined,
      entity_type: entityFilter !== 'all' ? entityFilter : undefined,
      start_date: startDate?.toISOString().split('T')[0],
      end_date: endDate?.toISOString().split('T')[0],
      limit: 500,
    }),
  });

  const clearLogsMutation = useMutation({
    mutationFn: settingsApi.clearLogs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast.success('Logi wyczyszczone');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const logs = data?.logs ?? [];

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        log.user_email?.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.entity_type?.toLowerCase().includes(query) ||
        log.entity_id?.toLowerCase().includes(query) ||
        formatDetails(log).toLowerCase().includes(query)
      );
    });
  }, [logs, searchQuery]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, actionFilter, entityFilter, startDate, endDate]);

  const handleExport = async (exportFormat: 'csv' | 'json') => {
    try {
      const blob = await logsApi.export(exportFormat);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logi-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Wyeksportowano logi jako ${exportFormat.toUpperCase()}`);
    } catch { toast.error('Błąd eksportu logów'); }
  };

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueEntities = [...new Set(logs.map(l => l.entity_type).filter(Boolean))] as string[];

  const todayLogs = logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString());
  const loginCount = logs.filter(l => l.action === 'login').length;
  const changeCount = logs.filter(l => l.action.includes('update') || l.action.includes('create')).length;

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Ładowanie...</div></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Logi aktywności</h1>
          <p className="text-muted-foreground mt-1">Historia działań w systemie</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" /><span className="hidden sm:inline">Odśwież</span>
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')} className="gap-2">
            <Download className="h-4 w-4" /><span className="hidden sm:inline">Eksport CSV</span>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" /><span className="hidden sm:inline">Wyczyść</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Wyczyścić wszystkie logi?</AlertDialogTitle>
                <AlertDialogDescription>Ta operacja jest nieodwracalna. Wszystkie logi aktywności zostaną usunięte.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction onClick={() => clearLogsMutation.mutate()} className="bg-destructive hover:bg-destructive/90">Wyczyść</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="sm:col-span-2 lg:col-span-1 space-y-2">
              <Label className="text-sm font-medium">Szukaj</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Email, akcja, szczegóły..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Akcja</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger><SelectValue placeholder="Wszystkie akcje" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie akcje</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>{ACTION_CONFIG[action]?.label || action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Obiekt</Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger><SelectValue placeholder="Wszystkie" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  {uniqueEntities.map(entity => <SelectItem key={entity} value={entity}>{entity}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Od</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {startDate ? format(startDate, 'dd.MM.yyyy') : 'Wybierz'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Do</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {endDate ? format(endDate, 'dd.MM.yyyy') : 'Wybierz'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0"><CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Wszystkie logi</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-lg sm:text-2xl font-bold">{logs.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0"><CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Dzisiaj</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-lg sm:text-2xl font-bold">{todayLogs.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0"><CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Logowania</CardTitle><LogIn className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-lg sm:text-2xl font-bold">{loginCount}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0"><CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Zmiany</CardTitle><Edit className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-lg sm:text-2xl font-bold">{changeCount}</div></CardContent></Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Data</TableHead>
                  <TableHead>Użytkownik</TableHead>
                  <TableHead>Akcja</TableHead>
                  <TableHead className="hidden sm:table-cell">Obiekt</TableHead>
                  <TableHead className="hidden lg:table-cell">Szczegóły</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => {
                  const config = ACTION_CONFIG[log.action] || { label: log.action, color: 'bg-muted text-muted-foreground', icon: FileText };
                  const ActionIcon = config.icon;
                  const entityLink = getEntityLink(log.entity_type, log.entity_id);
                  const detailsText = formatDetails(log);

                  return (
                    <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[150px]">{log.user_email || 'System'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-xs gap-1", config.color)}>
                          <ActionIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {log.entity_type && (
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground">
                              {log.entity_type}
                              {log.entity_id && <span className="ml-1 font-mono">#{log.entity_id.slice(0, 8)}</span>}
                            </span>
                            {entityLink && (
                              <Link to={entityLink} onClick={(e) => e.stopPropagation()} className="text-primary hover:text-primary/80">
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {detailsText && <span className="text-sm text-muted-foreground truncate block max-w-[300px]">{detailsText}</span>}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Brak logów do wyświetlenia</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filteredLogs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Wyświetlono {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} z {filteredLogs.length} logów
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline ml-1">Poprzednia</span>
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(pageNum)}>
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
                  <span className="hidden sm:inline mr-1">Następna</span><ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Szczegóły logu</DialogTitle></DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Data</Label>
                  <p className="text-sm font-medium">{format(new Date(selectedLog.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: pl })}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Użytkownik</Label>
                  <p className="text-sm font-medium">{selectedLog.user_email || 'System'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Akcja</Label>
                  <Badge variant="secondary" className={cn("text-xs", ACTION_CONFIG[selectedLog.action]?.color || 'bg-muted')}>
                    {ACTION_CONFIG[selectedLog.action]?.label || selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Obiekt</Label>
                  <p className="text-sm font-medium">{selectedLog.entity_type || '-'} {selectedLog.entity_id ? `#${selectedLog.entity_id.slice(0, 8)}` : ''}</p>
                </div>
              </div>
              
              {selectedLog.ip_address && (
                <div>
                  <Label className="text-xs text-muted-foreground">Adres IP</Label>
                  <p className="text-sm font-mono">{selectedLog.ip_address}</p>
                </div>
              )}

              {selectedLog.details && (
                <div>
                  <Label className="text-xs text-muted-foreground">Szczegóły</Label>
                  <div className="mt-1 p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="mb-2">{formatDetails(selectedLog)}</p>
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground">Surowe dane JSON</summary>
                      <pre className="mt-2 overflow-auto max-h-40 text-xs">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              )}

              {getEntityLink(selectedLog.entity_type, selectedLog.entity_id) && (
                <Button asChild variant="outline" className="w-full gap-2">
                  <Link to={getEntityLink(selectedLog.entity_type, selectedLog.entity_id)!}>
                    <ExternalLink className="h-4 w-4" />
                    Przejdź do {selectedLog.entity_type === 'order' ? 'zamówienia' : selectedLog.entity_type === 'product' ? 'produktów' : selectedLog.entity_type === 'user' ? 'użytkowników' : 'obiektu'}
                  </Link>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
