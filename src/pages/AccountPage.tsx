import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Package, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function AccountPage() {
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
    toast({ title: 'Zalogowano pomyślnie!' });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: 'Konto utworzone!', description: 'Możesz się teraz zalogować.' });
  };

  if (!isLoggedIn) {
    return (
      <main className="pt-20 min-h-screen">
        <section className="section-padding">
          <div className="section-container">
            <div className="max-w-md mx-auto">
              <h1 className="font-display text-3xl font-bold text-center mb-8">Moje konto</h1>
              
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Logowanie</TabsTrigger>
                  <TabsTrigger value="register">Rejestracja</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="jan@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Hasło</Label>
                      <Input id="password" type="password" placeholder="••••••••" required />
                    </div>
                    <Button type="submit" className="w-full">Zaloguj się</Button>
                    <p className="text-center text-sm text-muted-foreground">
                      <Link to="#" className="text-primary hover:underline">Zapomniałeś hasła?</Link>
                    </p>
                  </form>
                </TabsContent>
                
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Imię</Label>
                        <Input id="firstName" placeholder="Jan" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nazwisko</Label>
                        <Input id="lastName" placeholder="Kowalski" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="regEmail">Email</Label>
                      <Input id="regEmail" type="email" placeholder="jan@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="regPassword">Hasło</Label>
                      <Input id="regPassword" type="password" placeholder="••••••••" required />
                    </div>
                    <Button type="submit" className="w-full">Utwórz konto</Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="pt-20 min-h-screen">
      <section className="section-padding">
        <div className="section-container">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="font-display text-3xl font-bold">Moje konto</h1>
              <Button variant="outline" onClick={() => setIsLoggedIn(false)}>
                <LogOut className="w-4 h-4 mr-2" /> Wyloguj
              </Button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-card border border-border rounded-xl">
                <User className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Dane osobowe</h3>
                <p className="text-sm text-muted-foreground">Zarządzaj swoimi danymi</p>
              </div>
              <div className="p-6 bg-card border border-border rounded-xl">
                <Package className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Zamówienia</h3>
                <p className="text-sm text-muted-foreground">Historia zamówień</p>
              </div>
              <div className="p-6 bg-card border border-border rounded-xl">
                <Settings className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Ustawienia</h3>
                <p className="text-sm text-muted-foreground">Preferencje konta</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
