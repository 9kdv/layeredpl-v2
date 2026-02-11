import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Save, Building, Bell, Star, Plus, 
  Trash2, Globe, Server, Database,
  Shield, Wrench, FileText, AlertCircle,
  Truck, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { settingsApi, Settings as SettingsType, Review } from '@/lib/adminApi';

const DEFAULT_REVIEWS: Review[] = [
  { id: '1', name: 'Anna K.', text: 'Świetna jakość produktów! Polecam każdemu!', rating: 5, date: '2 dni temu', verified: true },
  { id: '2', name: 'Michał W.', text: 'Bardzo szybka wysyłka i profesjonalna obsługa.', rating: 5, date: '1 tydzień temu', verified: true },
  { id: '3', name: 'Karolina M.', text: 'Uwielbiam design tych produktów. Już zamówiłam kolejne!', rating: 5, date: '2 tygodnie temu', verified: true },
  { id: '4', name: 'Tomasz B.', text: 'Solidna jakość wykonania, materiały wysokiej klasy.', rating: 5, date: '3 tygodnie temu', verified: true },
];

function normalizeBooleans(obj: Record<string, unknown>): Record<string, unknown> {
  const result = { ...obj };
  for (const [key, value] of Object.entries(result)) {
    if (value === 'true') result[key] = true;
    else if (value === 'false') result[key] = false;
  }
  return result;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<SettingsType>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; review?: Review }>({ open: false });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getAll
  });

  useEffect(() => {
    if (settings && !hasChanges) {
      const normalized = normalizeBooleans(settings as Record<string, unknown>);
      setFormData({
        ...normalized,
        reviews: normalized.reviews || DEFAULT_REVIEWS,
        stats_happy_customers: normalized.stats_happy_customers || 150,
        stats_avg_rating: normalized.stats_avg_rating || 4.9,
        stats_total_orders: normalized.stats_total_orders || 500,
        use_real_stats: normalized.use_real_stats || false,
        free_shipping_threshold: normalized.free_shipping_threshold || '200',
        shipping_time: normalized.shipping_time || '24h',
      } as SettingsType);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Ustawienia zapisane');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const clearLogsMutation = useMutation({
    mutationFn: settingsApi.clearLogs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast.success('Logi zostały wyczyszczone');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const resetSettingsMutation = useMutation({
    mutationFn: settingsApi.reset,
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Ustawienia zostały zresetowane');
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

  const reviews = (formData.reviews as Review[]) || DEFAULT_REVIEWS;

  const addReview = (review: Omit<Review, 'id'>) => {
    const newReview = { ...review, id: Date.now().toString() };
    const updatedReviews = [...reviews, newReview];
    handleChange('reviews', updatedReviews);
    setReviewDialog({ open: false });
  };

  const removeReview = (id: string) => {
    const updatedReviews = reviews.filter(r => r.id !== id);
    handleChange('reviews', updatedReviews);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Ładowanie...</div></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ustawienia</h1>
          <p className="text-muted-foreground">Konfiguracja systemu i danych firmy</p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          Zapisz zmiany
        </Button>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="flex-wrap">
          <TabsTrigger value="company" className="gap-2"><Building className="h-4 w-4" />Firma</TabsTrigger>
          <TabsTrigger value="store" className="gap-2"><Truck className="h-4 w-4" />Sklep</TabsTrigger>
          <TabsTrigger value="stats" className="gap-2"><Star className="h-4 w-4" />Statystyki i opinie</TabsTrigger>
          <TabsTrigger value="legal" className="gap-2"><FileText className="h-4 w-4" />Dokumenty prawne</TabsTrigger>
          <TabsTrigger value="production" className="gap-2"><Clock className="h-4 w-4" />Produkcja</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" />Powiadomienia</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2"><Wrench className="h-4 w-4" />Tryb serwisowy</TabsTrigger>
          <TabsTrigger value="technical" className="gap-2"><Server className="h-4 w-4" />Techniczne</TabsTrigger>
        </TabsList>

        {/* Company Tab */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dane firmy</CardTitle>
              <CardDescription>Podstawowe informacje wyświetlane na stronie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Switch
                  checked={formData.is_company === true}
                  onCheckedChange={(checked) => handleChange('is_company', checked)}
                />
                <div>
                  <p className="font-medium">Działalność gospodarcza</p>
                  <p className="text-sm text-muted-foreground">
                    {formData.is_company ? 'Wymagany NIP i pełne dane firmy' : 'Sprzedaż jako osoba prywatna'}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nazwa {formData.is_company ? 'firmy' : '(opcjonalna)'}</Label>
                  <Input value={formData.company_name as string || ''} onChange={(e) => handleChange('company_name', e.target.value)} placeholder="layered.pl" className="mt-1" />
                </div>
                {formData.is_company && (
                  <div>
                    <Label>NIP</Label>
                    <Input value={formData.company_nip as string || ''} onChange={(e) => handleChange('company_nip', e.target.value)} placeholder="1234567890" className="mt-1" />
                  </div>
                )}
              </div>

              <div>
                <Label>Adres</Label>
                <Textarea value={formData.company_address as string || ''} onChange={(e) => handleChange('company_address', e.target.value)} placeholder="ul. Przykładowa 1, 00-001 Warszawa" className="mt-1" rows={2} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Email kontaktowy</Label>
                  <Input type="email" value={formData.company_email as string || ''} onChange={(e) => handleChange('company_email', e.target.value)} placeholder="kontakt@layered.pl" className="mt-1" />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input value={formData.company_phone as string || ''} onChange={(e) => handleChange('company_phone', e.target.value)} placeholder="+48 123 456 789" className="mt-1" />
                </div>
              </div>

              {formData.is_company && (
                <>
                  <Separator />
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>REGON</Label>
                      <Input value={formData.company_regon as string || ''} onChange={(e) => handleChange('company_regon', e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>Numer konta bankowego</Label>
                      <Input value={formData.company_bank_account as string || ''} onChange={(e) => handleChange('company_bank_account', e.target.value)} className="mt-1" />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Tab */}
        <TabsContent value="store" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia sklepu</CardTitle>
              <CardDescription>Konfiguracja dostawy i informacji wyświetlanych na stronie głównej</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Darmowa dostawa od (zł)</Label>
                  <Input
                    type="number"
                    value={formData.free_shipping_threshold as string || '200'}
                    onChange={(e) => handleChange('free_shipping_threshold', e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Wyświetlane na stronie głównej: "Darmowa dostawa od X zł"
                  </p>
                </div>
                <div>
                  <Label>Czas wysyłki</Label>
                  <Input
                    value={formData.shipping_time as string || '24h'}
                    onChange={(e) => handleChange('shipping_time', e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Wyświetlane: "Wysyłka w X"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats & Reviews Tab */}
        <TabsContent value="stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Statystyki na stronie głównej</CardTitle>
              <CardDescription>Liczby wyświetlane w sekcji zaufania</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Użyj prawdziwych danych</p>
                  <p className="text-sm text-muted-foreground">Automatycznie pobieraj statystyki z bazy danych</p>
                </div>
                <Switch
                  checked={formData.use_real_stats === true}
                  onCheckedChange={(checked) => handleChange('use_real_stats', checked)}
                />
              </div>

              {!formData.use_real_stats && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Zadowolonych klientów</Label>
                    <Input type="number" value={formData.stats_happy_customers as number || 150} onChange={(e) => handleChange('stats_happy_customers', parseInt(e.target.value) || 0)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Średnia ocena</Label>
                    <Input type="number" step="0.1" min="1" max="5" value={formData.stats_avg_rating as number || 4.9} onChange={(e) => handleChange('stats_avg_rating', parseFloat(e.target.value) || 0)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Zrealizowanych zamówień</Label>
                    <Input type="number" value={formData.stats_total_orders as number || 500} onChange={(e) => handleChange('stats_total_orders', parseInt(e.target.value) || 0)} className="mt-1" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Opinie klientów</CardTitle>
                  <CardDescription>Opinie wyświetlane na stronie głównej (wszystkie dodane opinie będą widoczne)</CardDescription>
                </div>
                <Button onClick={() => setReviewDialog({ open: true })} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Dodaj opinię
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="flex items-start justify-between p-4 border rounded-lg hover:border-primary/30 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{review.name}</p>
                        <div className="flex gap-0.5">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                          ))}
                        </div>
                        {review.verified && <Badge variant="outline" className="text-xs">Zweryfikowana</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{review.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">{review.date}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeReview(review.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {reviews.length === 0 && <p className="text-center py-8 text-muted-foreground">Brak opinii</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal Documents Tab */}
        <TabsContent value="legal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regulamin</CardTitle>
              <CardDescription>Treść regulaminu sklepu wyświetlana na stronie /regulamin</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.legal_terms as string || ''}
                onChange={(e) => handleChange('legal_terms', e.target.value)}
                placeholder="Wpisz treść regulaminu... (Markdown obsługiwany)"
                rows={12}
              />
              <p className="text-xs text-muted-foreground mt-2">Pozostaw puste, aby wyświetlić domyślny regulamin</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Polityka prywatności</CardTitle>
              <CardDescription>Treść polityki prywatności na stronie /prywatnosc</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.legal_privacy as string || ''}
                onChange={(e) => handleChange('legal_privacy', e.target.value)}
                placeholder="Wpisz treść polityki prywatności... (Markdown obsługiwany)"
                rows={12}
              />
              <p className="text-xs text-muted-foreground mt-2">Pozostaw puste, aby wyświetlić domyślną politykę</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Polityka cookies</CardTitle>
              <CardDescription>Treść polityki cookies na stronie /cookies</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.legal_cookies as string || ''}
                onChange={(e) => handleChange('legal_cookies', e.target.value)}
                placeholder="Wpisz treść polityki cookies... (Markdown obsługiwany)"
                rows={12}
              />
              <p className="text-xs text-muted-foreground mt-2">Pozostaw puste, aby wyświetlić domyślną politykę</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Production Tab */}
        <TabsContent value="production" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia produkcji</CardTitle>
              <CardDescription>Konfiguracja dni roboczych i limitów</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Maksymalna liczba zamówień dziennie</Label>
                <Input type="number" value={formData.max_orders_per_day as string || '50'} onChange={(e) => handleChange('max_orders_per_day', e.target.value)} className="mt-1 max-w-[200px]" />
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
                      <Button key={day} variant={isActive ? 'default' : 'outline'} size="sm" onClick={() => {
                        const newDays = isActive ? workingDays.filter(d => d !== dayNum) : [...workingDays, dayNum].sort();
                        handleChange('working_days', newDays);
                      }}>
                        {day}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              <div>
                <Label>Szacowany czas realizacji (dni)</Label>
                <Input type="number" value={formData.estimated_delivery_days as string || '3'} onChange={(e) => handleChange('estimated_delivery_days', e.target.value)} className="mt-1 max-w-[200px]" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Powiadomienia email</CardTitle>
              <CardDescription>Konfiguracja automatycznych powiadomień</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'notify_new_orders', label: 'Nowe zamówienia', desc: 'Otrzymuj email przy każdym nowym zamówieniu' },
                { key: 'notify_returns', label: 'Reklamacje', desc: 'Otrzymuj email przy nowej reklamacji' },
                { key: 'notify_low_stock', label: 'Niski stan magazynowy', desc: 'Otrzymuj email gdy materiał jest na wyczerpaniu' },
                { key: 'notify_messages', label: 'Nowe wiadomości', desc: 'Otrzymuj email przy nowej wiadomości od klienta' },
              ].map((item, idx) => (
                <div key={item.key}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={formData[item.key] === true}
                      onCheckedChange={(checked) => handleChange(item.key, checked)}
                    />
                  </div>
                  {idx < 3 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Mode Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <Card className={formData.maintenance_mode === true ? 'border-destructive/50' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Tryb serwisowy
              </CardTitle>
              <CardDescription>Tymczasowo wyłącz możliwość składania zamówień i przeglądania sklepu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Aktywuj tryb serwisowy</p>
                  <p className="text-sm text-muted-foreground">Blokuje dostęp do sklepu dla niezalogowanych użytkowników</p>
                </div>
                <Switch
                  checked={formData.maintenance_mode === true}
                  onCheckedChange={(checked) => handleChange('maintenance_mode', checked)}
                />
              </div>

              {formData.maintenance_mode === true && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-sm text-destructive font-medium">⚠️ Tryb serwisowy jest aktywny! Sklep jest niedostępny dla klientów.</p>
                  </div>
                  <div>
                    <Label>Komunikat dla klientów</Label>
                    <Textarea value={formData.maintenance_message as string || ''} onChange={(e) => handleChange('maintenance_message', e.target.value)} placeholder="Strona w trakcie konserwacji. Wrócimy wkrótce!" className="mt-1" rows={3} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Pozwól zalogowanym użytkownikom</p>
                      <p className="text-sm text-muted-foreground">Zalogowani klienci mogą przeglądać swoje zamówienia</p>
                    </div>
                    <Switch
                      checked={formData.maintenance_allow_logged_in === true}
                      onCheckedChange={(checked) => handleChange('maintenance_allow_logged_in', checked)}
                    />
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technical Tab */}
        <TabsContent value="technical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Informacje techniczne
              </CardTitle>
              <CardDescription>Status systemu i konfiguracja</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Baza danych</span>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Połączono</Badge>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">API Backend</span>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Aktywny</Badge>
                </div>
              </div>

              <Separator />

              <div>
                <Label>Email systemowy (do wysyłki powiadomień)</Label>
                <Input type="email" value={formData.system_email as string || ''} onChange={(e) => handleChange('system_email', e.target.value)} placeholder="system@layered.pl" className="mt-1" />
              </div>
              <div>
                <Label>Adres do odpowiedzi (Reply-To)</Label>
                <Input type="email" value={formData.reply_to_email as string || ''} onChange={(e) => handleChange('reply_to_email', e.target.value)} placeholder="kontakt@layered.pl" className="mt-1" />
              </div>
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
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                      Wyczyść
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Wyczyścić logi?</AlertDialogTitle>
                      <AlertDialogDescription>Ta operacja usunie wszystkie logi aktywności. Jest nieodwracalna.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction onClick={() => clearLogsMutation.mutate()} className="bg-destructive hover:bg-destructive/90">
                        Wyczyść logi
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Zresetuj ustawienia</p>
                  <p className="text-sm text-muted-foreground">Przywraca domyślne wartości</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                      Resetuj
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Zresetować ustawienia?</AlertDialogTitle>
                      <AlertDialogDescription>Wszystkie ustawienia wrócą do wartości domyślnych. Jest to nieodwracalne.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction onClick={() => resetSettingsMutation.mutate()} className="bg-destructive hover:bg-destructive/90">
                        Resetuj
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <ReviewDialog open={reviewDialog.open} onClose={() => setReviewDialog({ open: false })} onSave={addReview} />
    </motion.div>
  );
}

function ReviewDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (review: Omit<Review, 'id'>) => void }) {
  const [formData, setFormData] = useState({ name: '', text: '', rating: 5, date: 'Dzisiaj', verified: true });

  const handleSubmit = () => {
    if (!formData.name || !formData.text) { toast.error('Wypełnij wszystkie pola'); return; }
    onSave(formData);
    setFormData({ name: '', text: '', rating: 5, date: 'Dzisiaj', verified: true });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Dodaj opinię</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Imię klienta</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="np. Anna K." className="mt-1" />
          </div>
          <div>
            <Label>Treść opinii</Label>
            <Textarea value={formData.text} onChange={(e) => setFormData({ ...formData, text: e.target.value })} placeholder="Opinia klienta..." className="mt-1" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Ocena</Label>
              <Select value={formData.rating.toString()} onValueChange={(v) => setFormData({ ...formData, rating: parseInt(v) })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map(r => <SelectItem key={r} value={r.toString()}>{r} {r === 1 ? 'gwiazdka' : r < 5 ? 'gwiazdki' : 'gwiazdek'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data</Label>
              <Input value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} placeholder="np. 2 dni temu" className="mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={formData.verified} onCheckedChange={(checked) => setFormData({ ...formData, verified: checked })} />
            <Label>Zweryfikowana opinia</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button onClick={handleSubmit}>Dodaj</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
