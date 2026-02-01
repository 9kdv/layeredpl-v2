import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings, Save, Building, Mail, Phone, MapPin, 
  Calendar, Clock, AlertCircle, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { settingsApi, Settings as SettingsType } from '@/lib/adminApi';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<SettingsType>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getAll
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setHasChanges(false);
      toast.success('Ustawienia zapisane');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const handleChange = (key: string, value: string | number | boolean | unknown[]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Ładowanie...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ustawienia</h1>
          <p className="text-muted-foreground">Konfiguracja systemu i danych firmy</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || updateMutation.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Zapisz zmiany
        </Button>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company" className="gap-2">
            <Building className="h-4 w-4" />
            Firma
          </TabsTrigger>
          <TabsTrigger value="production" className="gap-2">
            <Clock className="h-4 w-4" />
            Produkcja
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Powiadomienia
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Settings className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dane firmy</CardTitle>
              <CardDescription>Podstawowe informacje o Twojej firmie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nazwa firmy</Label>
                  <Input
                    value={formData.company_name as string || ''}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    placeholder="layered.pl"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>NIP</Label>
                  <Input
                    value={formData.company_nip as string || ''}
                    onChange={(e) => handleChange('company_nip', e.target.value)}
                    placeholder="1234567890"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Adres</Label>
                <Textarea
                  value={formData.company_address as string || ''}
                  onChange={(e) => handleChange('company_address', e.target.value)}
                  placeholder="ul. Przykładowa 1, 00-001 Warszawa"
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Email kontaktowy</Label>
                  <Input
                    type="email"
                    value={formData.company_email as string || ''}
                    onChange={(e) => handleChange('company_email', e.target.value)}
                    placeholder="kontakt@layered.pl"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input
                    value={formData.company_phone as string || ''}
                    onChange={(e) => handleChange('company_phone', e.target.value)}
                    placeholder="+48 123 456 789"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia produkcji</CardTitle>
              <CardDescription>Konfiguracja dni roboczych i limitów</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Maksymalna liczba zamówień dziennie</Label>
                <Input
                  type="number"
                  value={formData.max_orders_per_day as string || '50'}
                  onChange={(e) => handleChange('max_orders_per_day', e.target.value)}
                  className="mt-1 max-w-[200px]"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Po przekroczeniu limitu, nowe zamówienia będą planowane na kolejny dzień
                </p>
              </div>

              <Separator />

              <div>
                <Label>Dni robocze</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'].map((day, index) => {
                    const workingDays = (formData.working_days as number[]) || [1, 2, 3, 4, 5];
                    const dayNum = index + 1;
                    const isActive = workingDays.includes(dayNum);
                    
                    return (
                      <Button
                        key={day}
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          const newDays = isActive 
                            ? workingDays.filter(d => d !== dayNum)
                            : [...workingDays, dayNum].sort();
                          handleChange('working_days', newDays);
                        }}
                      >
                        {day}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Powiadomienia email</CardTitle>
              <CardDescription>Konfiguracja automatycznych powiadomień</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Powiadomienia o nowych zamówieniach</p>
                  <p className="text-sm text-muted-foreground">Otrzymuj email przy każdym nowym zamówieniu</p>
                </div>
                <Switch
                  checked={(formData.notify_new_orders as boolean) !== false}
                  onCheckedChange={(checked) => handleChange('notify_new_orders', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Powiadomienia o reklamacjach</p>
                  <p className="text-sm text-muted-foreground">Otrzymuj email przy nowej reklamacji</p>
                </div>
                <Switch
                  checked={(formData.notify_returns as boolean) !== false}
                  onCheckedChange={(checked) => handleChange('notify_returns', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Powiadomienia o niskim stanie magazynowym</p>
                  <p className="text-sm text-muted-foreground">Otrzymuj email gdy materiał jest na wyczerpaniu</p>
                </div>
                <Switch
                  checked={(formData.notify_low_stock as boolean) !== false}
                  onCheckedChange={(checked) => handleChange('notify_low_stock', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tryb serwisowy</CardTitle>
              <CardDescription>Tymczasowo wyłącz możliwość składania zamówień</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Aktywuj tryb serwisowy</p>
                  <p className="text-sm text-muted-foreground">Blokuje składanie nowych zamówień</p>
                </div>
                <Switch
                  checked={formData.maintenance_mode === 'true'}
                  onCheckedChange={(checked) => handleChange('maintenance_mode', checked ? 'true' : 'false')}
                />
              </div>

              {formData.maintenance_mode === 'true' && (
                <div>
                  <Label>Komunikat dla klientów</Label>
                  <Textarea
                    value={formData.maintenance_message as string || ''}
                    onChange={(e) => handleChange('maintenance_message', e.target.value)}
                    placeholder="Strona w trakcie konserwacji. Wrócimy wkrótce!"
                    className="mt-1"
                    rows={3}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Strefa niebezpieczna
              </CardTitle>
              <CardDescription>Te akcje są nieodwracalne</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Wyczyść wszystkie logi</p>
                  <p className="text-sm text-muted-foreground">Usuwa historię aktywności</p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Wyczyść
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Zresetuj ustawienia</p>
                  <p className="text-sm text-muted-foreground">Przywraca domyślne wartości</p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Resetuj
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
