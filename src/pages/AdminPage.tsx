import { Link } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, FileText, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const adminLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Package, label: 'Produkty', href: '/admin/produkty' },
  { icon: ShoppingCart, label: 'Zamówienia', href: '/admin/zamowienia' },
  { icon: Users, label: 'Klienci', href: '/admin/klienci' },
  { icon: FileText, label: 'Treści', href: '/admin/tresci' },
  { icon: Settings, label: 'Ustawienia', href: '/admin/ustawienia' },
];

export default function AdminPage() {
  return (
    <main className="pt-20 min-h-screen bg-secondary">
      <div className="section-container section-padding">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">Panel administracyjny</h1>
          <p className="text-muted-foreground">Zarządzaj sklepem Layered</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {adminLinks.map((link) => (
            <Link key={link.href} to={link.href} className="block">
              <div className="p-6 bg-card border border-border rounded-xl card-hover">
                <link.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-display font-semibold text-lg">{link.label}</h3>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-card border border-border rounded-xl">
            <p className="text-muted-foreground text-sm mb-1">Zamówienia dziś</p>
            <p className="font-display text-3xl font-bold">12</p>
          </div>
          <div className="p-6 bg-card border border-border rounded-xl">
            <p className="text-muted-foreground text-sm mb-1">Przychód (miesiąc)</p>
            <p className="font-display text-3xl font-bold">4,280 zł</p>
          </div>
          <div className="p-6 bg-card border border-border rounded-xl">
            <p className="text-muted-foreground text-sm mb-1">Produkty</p>
            <p className="font-display text-3xl font-bold">8</p>
          </div>
        </div>
      </div>
    </main>
  );
}
