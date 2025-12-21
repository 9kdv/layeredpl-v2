import { useState } from 'react';
import { Lock, Mail, ArrowRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rotation, setRotation] = useState(0);

  const handleFlip = () => setRotation((prev) => prev + 180);
  const isFlipped = (rotation / 180) % 2 !== 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    toast({ title: isFlipped ? 'Konto utworzone!' : 'Zalogowano!' });
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen pt-40 pb-20 flex flex-col items-center bg-background px-4 text-foreground">
      <div className="w-full max-w-[440px] [perspective:1200px]">
        
        <div 
          className="relative w-full transition-transform duration-700 [transform-style:preserve-3d]"
          style={{ transform: `rotateY(${rotation}deg)` }}
        >
          
          {/* STRONA: LOGOWANIE (FRONT) */}
          <div className="w-full bg-card border border-border rounded-[2.5rem] p-8 md:p-10 shadow-xl [backface-visibility:hidden]">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Witaj</h1>
              <p className="text-muted-foreground text-sm">Zaloguj się do layered.pl</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="Email" required className="pl-12 bg-background h-14 rounded-2xl border-border" />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="password" placeholder="Hasło" required className="pl-12 bg-background h-14 rounded-2xl border-border" />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-2xl font-bold text-base mt-2 shadow-sm">
                {isSubmitting ? 'Logowanie...' : 'Zaloguj się'}
              </Button>
            </form>

            <div className="mt-12 pt-8 border-t border-border flex flex-col gap-4">
              <p className="text-xs text-muted-foreground text-center uppercase tracking-widest font-semibold">Nowy klient?</p>
              <Button variant="secondary" onClick={handleFlip} className="w-full h-14 rounded-2xl bg-secondary/50 border border-border hover:bg-secondary transition-colors">
                Stwórz nowe konto
              </Button>
            </div>
          </div>

          {/* STRONA: REJESTRACJA (BACK) */}
          {/* Używamy absolute inset-0 tylko tutaj, bo ta strona dopasuje się do wysokości frontu, 
              ale dodajemy min-h-full żeby uniknąć ucinania */}
          <div className="absolute inset-0 w-full h-full bg-card border border-border rounded-[2.5rem] p-8 md:p-10 shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Dołącz</h1>
              <p className="text-muted-foreground text-sm">Załóż konto w layered.pl</p>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Imię i nazwisko" required className="pl-12 bg-background h-12 rounded-xl border-border" />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder="Email" required className="pl-12 bg-background h-12 rounded-xl border-border" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder="Hasło" required className="pl-12 bg-background h-12 rounded-xl border-border" />
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl font-bold text-base shadow-sm">
                {isSubmitting ? 'Przetwarzanie...' : 'Zarejestruj się'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border flex flex-col gap-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Masz już konto?</p>
              <Button variant="secondary" onClick={handleFlip} className="w-full h-12 rounded-xl bg-secondary/50 border border-border">
                Wróć do logowania
              </Button>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}