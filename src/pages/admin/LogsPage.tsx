import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  FileText, Search, Download, User, Calendar, 
  Filter, RefreshCw, ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { logsApi, ActivityLog } from '@/lib/adminApi';
import { cn } from '@/lib/utils';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  login: { label: 'Logowanie', color: 'bg-green-500/10 text-green-500' },
  logout: { label: 'Wylogowanie', color: 'bg-muted text-muted-foreground' },
  password_change: { label: 'Zmiana hasła', color: 'bg-yellow-500/10 text-yellow-500' },
  create_user: { label: 'Utworzenie użytkownika', color: 'bg-blue-500/10 text-blue-500' },
  update_user: { label: 'Aktualizacja użytkownika', color: 'bg-blue-500/10 text-blue-500' },
  delete_user: { label: 'Usunięcie użytkownika', color: 'bg-destructive/10 text-destructive' },
  block_user: { label: 'Blokada użytkownika', color: 'bg-destructive/10 text-destructive' },
  unblock_user: { label: 'Odblokowanie użytkownika', color: 'bg-green-500/10 text-green-500' },
  reset_password: { label: 'Reset hasła', color: 'bg-yellow-500/10 text-yellow-500' },
  order_status_change: { label: 'Zmiana statusu zamówienia', color: 'bg-purple-500/10 text-purple-500' },
  create_product: { label: 'Utworzenie produktu', color: 'bg-blue-500/10 text-blue-500' },
  update_product: { label: 'Aktualizacja produktu', color: 'bg-blue-500/10 text-blue-500' },
  delete_product: { label: 'Usunięcie produktu', color: 'bg-destructive/10 text-destructive' },
  settings_update: { label: 'Zmiana ustawień', color: 'bg-yellow-500/10 text-yellow-500' },
  create_promo: { label: 'Utworzenie promocji', color: 'bg-green-500/10 text-green-500' },
  update_promo: { label: 'Aktualizacja promocji', color: 'bg-blue-500/10 text-blue-500' },
};

export default function LogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['activity-logs', actionFilter, entityFilter, startDate, endDate],
    queryFn: () => logsApi.getAll({
      action: actionFilter !== 'all' ? actionFilter : undefined,
      entity_type: entityFilter !== 'all' ? entityFilter : undefined,
      start_date: startDate?.toISOString().split('T')[0],
      end_date: endDate?.toISOString().split('T')[0],
      limit: 200
    })
  });

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.user_email?.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.entity_type?.toLowerCase().includes(query) ||
      log.entity_id?.toLowerCase().includes(query)
    );
  });

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const blob = await logsApi.export(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logi-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Wyeksportowano logi jako ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Błąd eksportu logów');
    }
  };

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueEntities = [...new Set(logs.map(l => l.entity_type).filter(Boolean))];

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
          <h1 className="text-2xl font-bold">Logi aktywności</h1>
          <p className="text-muted-foreground">Historia działań w systemie</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Odśwież
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')} className="gap-2">
            <Download className="h-4 w-4" />
            Eksport CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po użytkowniku, akcji..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Akcja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie akcje</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {ACTION_LABELS[action]?.label || action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Obiekt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                {uniqueEntities.map(entity => (
                  <SelectItem key={entity} value={entity!}>{entity}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {startDate ? format(startDate, 'dd.MM.yyyy') : 'Od'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {endDate ? format(endDate, 'dd.MM.yyyy') : 'Do'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Wszystkie logi</p>
            <p className="text-2xl font-bold">{logs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Dzisiaj</p>
            <p className="text-2xl font-bold">
              {logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Logowania</p>
            <p className="text-2xl font-bold text-green-500">
              {logs.filter(l => l.action === 'login').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Zmiany</p>
            <p className="text-2xl font-bold text-blue-500">
              {logs.filter(l => l.action.includes('update') || l.action.includes('create')).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Użytkownik</TableHead>
                <TableHead>Akcja</TableHead>
                <TableHead>Obiekt</TableHead>
                <TableHead>Szczegóły</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log, idx) => {
                const actionConfig = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-muted text-muted-foreground' };
                
                return (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.01 }}
                    className="border-b hover:bg-muted/50"
                  >
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{log.user_email || 'System'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={actionConfig.color}>
                        {actionConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.entity_type && (
                        <span className="text-muted-foreground">
                          {log.entity_type}
                          {log.entity_id && <span className="text-xs ml-1">#{log.entity_id.slice(0, 8)}</span>}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {log.details && JSON.stringify(log.details).slice(0, 50)}
                      {log.ip_address && <span className="text-xs ml-2">IP: {log.ip_address}</span>}
                    </TableCell>
                  </motion.tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Brak logów do wyświetlenia
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
