import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, TrendingUp, Download, Calendar, 
  DollarSign, ShoppingCart, Package, ArrowUp, ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { reportsApi, SalesReport } from '@/lib/adminApi';
import { api } from '@/lib/api';

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [groupBy, setGroupBy] = useState('day');

  const { data: salesData = [], isLoading } = useQuery({
    queryKey: ['sales-report', dateRange, groupBy],
    queryFn: () => reportsApi.getSales({
      start_date: dateRange.start,
      end_date: dateRange.end,
      group_by: groupBy
    })
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['all-orders'],
    queryFn: api.getOrders
  });

  // Calculate summary stats
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
  const productStats = orders.reduce((acc, order) => {
    order.items?.forEach((item: { name: string; quantity: number; price: number }) => {
      if (!acc[item.name]) {
        acc[item.name] = { name: item.name, quantity: 0, revenue: 0 };
      }
      acc[item.name].quantity += item.quantity;
      acc[item.name].revenue += item.price * item.quantity;
    });
    return acc;
  }, {} as Record<string, { name: string; quantity: number; revenue: number }>);

  const topProducts = Object.values(productStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const handleExport = (format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      const headers = ['Okres', 'Zamówienia', 'Przychód', 'Średnia wartość', 'Rabaty'];
      const rows = salesData.map(d => [d.period, d.orders, d.revenue.toFixed(2), d.avg_order.toFixed(2), d.total_discounts.toFixed(2)]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `raport-sprzedazy-${dateRange.start}-${dateRange.end}.csv`;
      a.click();
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Ładowanie...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Raporty i statystyki</h1>
          <p className="text-muted-foreground">Analiza sprzedaży i produktów</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')} className="gap-2">
            <Download className="h-4 w-4" />
            Eksportuj CSV
          </Button>
        </div>
      </div>

      {/* Date Range Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>Od</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Do</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Grupuj wg</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-[150px] mt-1">
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Przychód</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toFixed(2)} zł</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Zamówienia</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Średnia wartość</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOrderValue.toFixed(2)} zł</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rabaty</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDiscounts.toFixed(2)} zł</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Przychód w czasie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(2)} zł`, 'Przychód']}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
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
          <CardHeader>
            <CardTitle>Liczba zamówień</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Zamówienia']}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
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
        <CardHeader>
          <CardTitle>Najpopularniejsze produkty</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pozycja</TableHead>
                <TableHead>Produkt</TableHead>
                <TableHead className="text-right">Sprzedanych szt.</TableHead>
                <TableHead className="text-right">Przychód</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.map((product, index) => (
                <TableRow key={product.name}>
                  <TableCell>
                    <span className={`font-bold ${index < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
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
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Szczegóły sprzedaży</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Okres</TableHead>
                <TableHead className="text-right">Zamówienia</TableHead>
                <TableHead className="text-right">Przychód</TableHead>
                <TableHead className="text-right">Średnia wartość</TableHead>
                <TableHead className="text-right">Rabaty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesData.map((row) => (
                <TableRow key={row.period}>
                  <TableCell className="font-medium">{row.period}</TableCell>
                  <TableCell className="text-right">{row.orders}</TableCell>
                  <TableCell className="text-right">{row.revenue.toFixed(2)} zł</TableCell>
                  <TableCell className="text-right">{row.avg_order.toFixed(2)} zł</TableCell>
                  <TableCell className="text-right">{row.total_discounts.toFixed(2)} zł</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
