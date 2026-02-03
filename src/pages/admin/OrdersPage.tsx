import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  Search, 
  Filter, 
  Eye, 
  ChevronDown,
  Package,
  Calendar,
  Mail,
  Phone,
  MapPin,
  FileText,
  Download,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api, Order } from '@/lib/api';
import { ordersApi } from '@/lib/adminApi';
import { toast } from 'sonner';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, OrderStatus } from '@/types/customization';

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001';

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const loadOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Błąd ładowania zamówień');
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrders = () => {
    let result = [...orders];

    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(o => 
        o.id.toLowerCase().includes(term) ||
        o.customer_email?.toLowerCase().includes(term) ||
        o.customer_name?.toLowerCase().includes(term)
      );
    }

    setFilteredOrders(result);
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setIsUpdating(true);
    try {
      await api.updateOrderStatus(orderId, newStatus);
      toast.success('Status zmieniony');
      loadOrders();
      
      // Update selected order if open
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      toast.error('Błąd zmiany statusu');
    } finally {
      setIsUpdating(false);
    }
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setAdminNotes('');
    setTrackingNumber('');
    setIsDetailsOpen(true);
  };

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_BASE}${imagePath}`;
  };

  const handleExport = async (exportFormat: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const blob = await ordersApi.export({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        start_date: startDate?.toISOString().split('T')[0],
        end_date: endDate?.toISOString().split('T')[0],
        format: exportFormat
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zamowienia-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Eksport zakończony');
    } catch (error) {
      toast.error('Błąd eksportu');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
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
        <h1 className="text-2xl font-bold">Zamówienia</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Eksportuj
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport('csv')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Eksportuj CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('json')}>
              <FileText className="h-4 w-4 mr-2" />
              Eksportuj JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj po ID, email, nazwisku..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Wszystkie</p>
            <p className="text-2xl font-bold">{orders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Oczekujące</p>
            <p className="text-2xl font-bold text-yellow-500">
              {orders.filter(o => o.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">W realizacji</p>
            <p className="text-2xl font-bold text-purple-500">
              {orders.filter(o => o.status === 'processing').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Wymagają uwagi</p>
            <p className="text-2xl font-bold text-orange-500">
              {orders.filter(o => o.status === 'awaiting_info').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium">ID</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Klient</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Produkty</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Kwota</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Data</th>
                  <th className="text-right px-4 py-3 text-sm font-medium">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">#{order.id.slice(0, 8).toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-sm">{order.customer_name || '-'}</p>
                        <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{order.items.length} szt.</span>
                        {order.items.some(item => item.customizations?.length) && (
                          <Badge variant="outline" className="text-xs">Personalizacja</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{order.total.toFixed(2)} zł</td>
                    <td className="px-4 py-3">
                      <Select
                        value={order.status}
                        onValueChange={(value) => handleStatusChange(order.id, value as OrderStatus)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <span className={`text-xs px-2 py-0.5 rounded ${ORDER_STATUS_COLORS[order.status as OrderStatus] || 'bg-muted'}`}>
                            {ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('pl-PL')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openOrderDetails(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Brak zamówień spełniających kryteria' 
                        : 'Brak zamówień'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span>Zamówienie #{selectedOrder.id.slice(0, 8).toUpperCase()}</span>
                  <span className={`text-xs px-2 py-1 rounded ${ORDER_STATUS_COLORS[selectedOrder.status as OrderStatus] || 'bg-muted'}`}>
                    {ORDER_STATUS_LABELS[selectedOrder.status as OrderStatus] || selectedOrder.status}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Customer Info */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Dane kontaktowe
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <p><strong>Imię:</strong> {selectedOrder.customer_name || '-'}</p>
                      <p><strong>Email:</strong> {selectedOrder.customer_email}</p>
                      <p><strong>Telefon:</strong> {selectedOrder.customer_phone || '-'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Adres dostawy
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      {selectedOrder.shipping_address ? (
                        <>
                          <p>{selectedOrder.shipping_address.street}</p>
                          <p>{selectedOrder.shipping_address.postalCode} {selectedOrder.shipping_address.city}</p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">Brak adresu</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Produkty ({selectedOrder.items.length})
                  </h3>
                  <div className="bg-muted/50 rounded-lg divide-y divide-border">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="p-4 flex gap-4">
                        {item.image && (
                          <img 
                            src={getImageUrl(item.image)} 
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} x {item.price.toFixed(2)} zł
                            {item.customizationPrice ? ` (+${item.customizationPrice.toFixed(2)} zł personalizacja)` : ''}
                          </p>
                          
                          {/* Customizations */}
                          {item.customizations && item.customizations.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {item.customizations.map((c, cidx) => (
                                <p key={cidx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded inline-block mr-2">
                                  {c.optionLabel}: {
                                    c.selectedColors?.map(col => col.name).join(', ') ||
                                    c.selectedMaterial?.name ||
                                    c.selectedSize?.name ||
                                    c.selectedStrength?.name ||
                                    c.textValue ||
                                    c.uploadedFiles?.map(f => f.name).join(', ') ||
                                    c.selectedOption?.label
                                  }
                                </p>
                              ))}
                            </div>
                          )}
                          
                          {item.nonRefundable && (
                            <Badge variant="destructive" className="mt-2 text-xs">Bez zwrotu</Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {((item.price + (item.customizationPrice || 0)) * item.quantity).toFixed(2)} zł
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between text-lg font-medium">
                    <span>Suma</span>
                    <span>{selectedOrder.total.toFixed(2)} zł</span>
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="space-y-4 border-t border-border pt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Zmień status</Label>
                      <Select
                        value={selectedOrder.status}
                        onValueChange={(value) => handleStatusChange(selectedOrder.id, value as OrderStatus)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Numer śledzenia</Label>
                      <Input 
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="Wpisz numer przesyłki"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Notatki wewnętrzne</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Notatki widoczne tylko dla adminów..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <Mail className="h-4 w-4 mr-2" />
                      Wyślij email
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <FileText className="h-4 w-4 mr-2" />
                      Generuj fakturę
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
