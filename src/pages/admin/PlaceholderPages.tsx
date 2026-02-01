// Placeholder pages for admin panel

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Construction className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">{title}</p>
          <p className="text-muted-foreground text-center mt-2 max-w-md">
            {description}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function PromotionsPage() {
  return (
    <PlaceholderPage 
      title="Promocje i kody rabatowe" 
      description="Zarządzaj kodami rabatowymi, promocjami automatycznymi i limitami użyć."
    />
  );
}

export function MessagesPage() {
  return (
    <PlaceholderPage 
      title="Wiadomości" 
      description="Inbox z wiadomościami od klientów, szablony odpowiedzi i historia korespondencji."
    />
  );
}

export function ProductionPage() {
  return (
    <PlaceholderPage 
      title="Kolejka produkcji" 
      description="Lista zamówień do realizacji, sortowanie po priorytecie i statusy produkcyjne."
    />
  );
}

export function MaterialsPage() {
  return (
    <PlaceholderPage 
      title="Materiały" 
      description="Zarządzanie dostępnością materiałów (PLA, PETG, ABS) i kolorów."
    />
  );
}

export function PrintersPage() {
  return (
    <PlaceholderPage 
      title="Drukarki" 
      description="Lista drukarek 3D, ich statusy i przypisania do zamówień."
    />
  );
}

export function UsersPage() {
  return (
    <PlaceholderPage 
      title="Użytkownicy i role" 
      description="Zarządzanie użytkownikami, rolami (admin, producent, obsługa) i uprawnieniami."
    />
  );
}

export function ReportsPage() {
  return (
    <PlaceholderPage 
      title="Raporty i statystyki" 
      description="Szczegółowe raporty sprzedaży, analiza produktów i eksport danych."
    />
  );
}

export function ReturnsPage() {
  return (
    <PlaceholderPage 
      title="Reklamacje i zwroty" 
      description="Obsługa reklamacji, zwrotów i decyzji dotyczących ponownej produkcji."
    />
  );
}

export function SettingsPage() {
  return (
    <PlaceholderPage 
      title="Ustawienia" 
      description="Dane firmy, szablony email, informacje prawne i konfiguracja systemu."
    />
  );
}
