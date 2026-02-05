import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format as formatDate, isWithinInterval, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  TrendingUp, Download, CalendarIcon, 
  DollarSign, ShoppingCart, Package, Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { cn } from '@/lib/utils';

// ===== API IMPORTS - UNCOMMENT FOR PRODUCTION =====
// import { reportsApi, SalesReport } from '@/lib/adminApi';
// import { api } from '@/lib/api';

// ===== TYPES =====
interface SalesReport {
  period: string;
  orders: number;
  revenue: number;
  avg_order: number;
  total_discounts: number;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  created_at: string;
  items: OrderItem[];
}

// ===== MOCK DATA FOR PREVIEW =====
const USE_MOCK_DATA = true; // Set to false when API is connected

const generateMockSalesData = (): SalesReport[] => {
  const data: SalesReport[] = [];
  const startDate = new Date('2025-01-01');
  
  for (let i = 0; i < 60; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    const orders = Math.floor(Math.random() * 20) + 5;
    const revenue = orders * (Math.random() * 80 + 60);
    
    data.push({
      period: formatDate(date, 'yyyy-MM-dd'),
      orders,
      revenue: Math.round(revenue * 100) / 100,
      avg_order: Math.round((revenue / orders) * 100) / 100,
      total_discounts: Math.round(revenue * 0.05 * 100) / 100,
    });
  }
  return data;
};

const generateMockOrders = (): Order[] => {
  const products = ['Produkt A', 'Produkt B', 'Produkt C', 'Produkt D', 'Produkt E'];
  const orders: Order[] = [];
  
  for (let i = 1; i <= 50; i++) {
    const date = new Date('2025-01-01');
    date.setDate(date.getDate() + Math.floor(Math.random() * 60));
    
    const items: OrderItem[] = [];
    const numItems = Math.floor(Math.random() * 3) + 1;
    
    for (let j = 0; j < numItems; j++) {
      items.push({
        name: products[Math.floor(Math.random() * products.length)],
        quantity: Math.floor(Math.random() * 5) + 1,
        price: Math.floor(Math.random() * 100) + 20,
      });
    }
    
    orders.push({ id: i, created_at: date.toISOString(), items });
  }
  return orders;
};

const MOCK_SALES_DATA = generateMockSalesData();
const MOCK_ORDERS = generateMockOrders();

export default function ReportsPage() {
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [groupBy, setGroupBy] = useState('day');

  // ===== REAL API QUERIES - ACTIVE WHEN USE_MOCK_DATA = false =====
  const { data: apiSalesData = [], isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', startDate, endDate, groupBy],
    queryFn: async () => {
      if (USE_MOCK_DATA) return [];
      // Uncomment when API is connected:
      // return reportsApi.getSales({
      //   start_date: formatDate(startDate, 'yyyy-MM-dd'),
      //   end_date: formatDate(endDate, 'yyyy-MM-dd'),
      //   group_by: groupBy
      // });
      return [];
    },
    enabled: !USE_MOCK_DATA,
  });

  const { data: apiOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['all-orders'],
    queryFn: async () => {
      if (USE_MOCK_DATA) return [];
      // Uncomment when API is connected:
      // return api.getOrders();
      return [];
    },
    enabled: !USE_MOCK_DATA,
  });

  // ===== FILTERED MOCK DATA =====
  const filteredMockSales = useMemo(() => {
    if (!USE_MOCK_DATA) return [];
    
    return MOCK_SALES_DATA.filter(item => {
      const itemDate = parseISO(item.period);
      return isWithinInterval(itemDate, { start: startDate, end: endDate });
    });
  }, [startDate, endDate]);

  // Group mock data by week/month if needed
  const groupedMockSales = useMemo(() => {
    if (!USE_MOCK_DATA) return [];
    
    if (groupBy === 'day') return filteredMockSales;
    
    const grouped: Record<string, SalesReport> = {};
    
    filteredMockSales.forEach(item => {
      const date = parseISO(item.period);
      let key: string;
      
      if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = formatDate(weekStart, 'yyyy-MM-dd');
      } else {
        key = formatDate(date, 'yyyy-MM');
      }
      
      if (!grouped[key]) {
        grouped[key] = { period: key, orders: 0, revenue: 0, avg_order: 0, total_discounts: 0 };
      }
      grouped[key].orders += item.orders;
      grouped[key].revenue += item.revenue;
      grouped[key].total_discounts += item.total_discounts;
    });
    
    Object.values(grouped).forEach(item => {
      item.avg_order = item.orders > 0 ? item.revenue / item.orders : 0;
    });
    
    return Object.values(grouped).sort((a, b) => b.period.localeCompare(a.period));
  }, [filteredMockSales, groupBy]);

  // ===== USE MOCK OR API DATA =====
  const salesData = USE_MOCK_DATA ? groupedMockSales : apiSalesData;
  const orders = USE_MOCK_DATA ? MOCK_ORDERS : apiOrders;
  const isLoading = USE_MOCK_DATA ? false : (salesLoading || ordersLoading);

  // ===== CALCULATE STATS =====
  const totalRevenue = salesData.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = salesData.reduce((sum, d) => sum + d.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalDiscounts = salesData.reduce((sum, d) => sum + d.total_discounts, 0);

  // Chart data (reversed for chronological order)
  const chartData = [...salesData].reverse().map(d => ({
    ...d,
    name: d.period,
  }));

  // Product statistics from orders
  interface ProductStat { name: string; quantity: number; revenue: number }
  
  const productStats = orders.reduce<Record<string, ProductStat>>((acc, order) => {
    order.items?.forEach((item: OrderItem) => {
      if (!acc[item.name]) {
        acc[item.name] = { name: item.name, quantity: 0, revenue: 0 };
      }
      acc[item.name].quantity += item.quantity;
      acc[item.name].revenue += item.price * item.quantity;
    });
    return acc;
  }, {});

  const topProducts = Object.values(productStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const handleExport = (exportFormat: 'csv' | 'pdf') => {
    if (exportFormat === 'csv') {
      const headers = ['Okres', 'Zamówienia', 'Przychód', 'Średnia wartość', 'Udzielone rabaty'];
      const rows = salesData.map(d => [
        d.period, 
        d.orders, 
        d.revenue.toFixed(2), 
        d.avg_order.toFixed(2), 
        d.total_discounts.toFixed(2)
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `raport-sprzedazy-${formatDate(startDate, 'yyyy-MM-dd')}-${formatDate(endDate, 'yyyy-MM-dd')}.csv`;
      a.click();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Raporty i statystyki</h1>
          <p className="text-muted-foreground mt-1">Analiza sprzedaży i produktów</p>
        </div>
        <Button variant="outline" onClick={() => handleExport('csv')} className="gap-2 w-full sm:w-auto">
          <Download className="h-4 w-4" />
          Eksportuj CSV
        </Button>
      </div>

      {/* Date Range Filters */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6 sm:items-end">
            <div className="flex-1 min-w-[180px] space-y-2">
              <Label className="text-sm font-medium">Od</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {startDate ? formatDate(startDate, "d MMM yyyy", { locale: pl }) : <span>Wybierz datę</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                    disabled={(date) => date > endDate || date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 min-w-[180px] space-y-2">
              <Label className="text-sm font-medium">Do</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {endDate ? formatDate(endDate, "d MMM yyyy", { locale: pl }) : <span>Wybierz datę</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                    disabled={(date) => date < startDate || date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 min-w-[150px] space-y-2">
              <Label className="text-sm font-medium">Grupuj wg</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Dzień</SelectItem>
                  <SelectItem value="week">Tydzień</SelectItem>
                  <SelectItem value="month">Miesiąc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Przychód</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{totalRevenue.toFixed(2)} zł</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Zamówienia</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Średnia wartość</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{avgOrderValue.toFixed(2)} zł</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Udzielone rabaty</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-destructive">{totalDiscounts.toFixed(2)} zł</div>
            <p className="text-xs text-muted-foreground mt-1">Suma zniżek dla klientów</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base sm:text-lg">Przychód w czasie</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 pr-4">
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      if (groupBy === 'month') return value;
                      return formatDate(parseISO(value), 'd.MM', { locale: pl });
                    }}
                  />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(2)} zł`, 'Przychód']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base sm:text-lg">Liczba zamówień</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 pr-4">
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      if (groupBy === 'month') return value;
                      return formatDate(parseISO(value), 'd.MM', { locale: pl });
                    }}
                  />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Zamówienia']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar 
                    dataKey="orders" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg">Najpopularniejsze produkty</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Poz.</TableHead>
                  <TableHead>Produkt</TableHead>
                  <TableHead className="text-right">Szt.</TableHead>
                  <TableHead className="text-right">Przychód</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((product, index) => (
                  <TableRow key={product.name}>
                    <TableCell>
                      <span className={cn(
                        "font-bold",
                        index < 3 ? "text-primary" : "text-muted-foreground"
                      )}>
                        #{index + 1}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">{product.quantity}</TableCell>
                    <TableCell className="text-right font-medium">{product.revenue.toFixed(2)} zł</TableCell>
                  </TableRow>
                ))}
                {topProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      Brak danych o produktach
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg">Szczegóły sprzedaży</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Okres</TableHead>
                  <TableHead className="text-right">Zam.</TableHead>
                  <TableHead className="text-right">Przychód</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Średnia</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Rabaty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.map((row) => (
                  <TableRow key={row.period}>
                    <TableCell className="font-medium whitespace-nowrap">{row.period}</TableCell>
                    <TableCell className="text-right">{row.orders}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{row.revenue.toFixed(2)} zł</TableCell>
                    <TableCell className="text-right hidden sm:table-cell whitespace-nowrap">{row.avg_order.toFixed(2)} zł</TableCell>
                    <TableCell className="text-right hidden sm:table-cell whitespace-nowrap text-destructive">{row.total_discounts.toFixed(2)} zł</TableCell>
                  </TableRow>
                ))}
                {salesData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      Brak danych dla wybranego okresu
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
