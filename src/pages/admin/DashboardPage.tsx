import { useState, useEffect } from 'react';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  Clock,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Mail,
  DollarSign,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, AdminStats, Order } from '@/lib/api';
import { Link } from 'react-router-dom';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, OrderStatus } from '@/types/customization';

interface DashboardStats extends AdminStats {
  todayRevenue?: number;
  weekRevenue?: number;
  monthRevenue?: number;
  avgOrderValue?: number;
  processingOrders?: number;
  awaitingInfoOrders?: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, ordersData] = await Promise.all([
        api.getAdminStats(),
        api.getOrders()
      ]);

      // Calculate additional stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const paidStatuses = ['paid', 'processing', 'shipped', 'delivered'];
      
      const todayRevenue = ordersData
        .filter(o => new Date(o.created_at) >= todayStart && paidStatuses.includes(o.status))
        .reduce((sum, o) => sum + o.total, 0);
      
      const weekRevenue = ordersData
        .filter(o => new Date(o.created_at) >= weekStart && paidStatuses.includes(o.status))
        .reduce((sum, o) => sum + o.total, 0);

      const monthRevenue = ordersData
        .filter(o => new Date(o.created_at) >= monthStart && paidStatuses.includes(o.status))
        .reduce((sum, o) => sum + o.total, 0);

      const paidOrders = ordersData.filter(o => paidStatuses.includes(o.status));
      const avgOrderValue = paidOrders.length > 0 
        ? paidOrders.reduce((sum, o) => sum + o.total, 0) / paidOrders.length 
        : 0;

      const processingOrders = ordersData.filter(o => o.status === 'processing').length;
      const awaitingInfoOrders = ordersData.filter(o => o.status === 'awaiting_info').length;

      setStats({
        ...statsData,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        avgOrderValue,
        processingOrders,
        awaitingInfoOrders
      });

      setRecentOrders(ordersData.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString('pl-PL', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Alerts */}
      {(stats.pendingOrders > 0 || stats.awaitingInfoOrders) && (
        <div className="grid gap-4 md:grid-cols-2">
          {stats.pendingOrders > 0 && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-3 bg-yellow-500/10 rounded-xl">
                  <Clock className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Oczekujące zamówienia</p>
                  <p className="text-sm text-muted-foreground">{stats.pendingOrders} zamówień wymaga uwagi</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/orders?status=pending">Zobacz</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          
          {stats.awaitingInfoOrders && stats.awaitingInfoOrders > 0 && (
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-3 bg-orange-500/10 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Wymagają kontaktu z klientem</p>
                  <p className="text-sm text-muted-foreground">{stats.awaitingInfoOrders} zamówień czeka</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/orders?status=awaiting_info">Zobacz</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Przychód dziś</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayRevenue?.toFixed(2)} zł</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tydzień: {stats.weekRevenue?.toFixed(2)} zł
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Przychód miesięczny</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthRevenue?.toFixed(2)} zł</div>
            <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
              <ArrowUp className="h-3 w-3" />
              <span>Całkowity: {stats.revenue?.toFixed(2)} zł</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Liczba zamówień</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              W realizacji: {stats.processingOrders || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Średnia wartość</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgOrderValue?.toFixed(2)} zł</div>
            <p className="text-xs text-muted-foreground mt-1">
              Produkty: {stats.totalProducts}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Produkty</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Użytkownicy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wiadomości</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              Nowe: 0
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Ostatnie zamówienia</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/orders">Zobacz wszystkie</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-mono text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{order.total.toFixed(2)} zł</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${ORDER_STATUS_COLORS[order.status as OrderStatus] || 'bg-muted'}`}>
                        {ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Brak zamówień</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Szybkie akcje</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button asChild variant="outline" className="justify-start h-auto py-4">
              <Link to="/admin/products" className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Dodaj produkt</p>
                  <p className="text-xs text-muted-foreground">Utwórz nowy produkt w sklepie</p>
                </div>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="justify-start h-auto py-4">
              <Link to="/admin/orders?status=processing" className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Zamówienia w realizacji</p>
                  <p className="text-xs text-muted-foreground">Zarządzaj zamówieniami w produkcji</p>
                </div>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="justify-start h-auto py-4">
              <Link to="/admin/production" className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Kolejka produkcji</p>
                  <p className="text-xs text-muted-foreground">Zobacz co jest do druku</p>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
