import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rotation, setRotation] = useState(0);
  
  // Form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const handleFlip = () => setRotation((prev) => prev + 180);
  const isFlipped = (rotation / 180) % 2 !== 0;

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await login(loginEmail, loginPassword);
      toast.success('Zalogowano pomyślnie');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd logowania');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerPassword.length < 6) {
      toast.error('Hasło musi mieć co najmniej 6 znaków');
      return;
    }

    setIsSubmitting(true);

    try {
      await register(registerEmail, registerPassword);
      toast.success('Konto utworzone pomyślnie');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd rejestracji');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen pt-28 pb-20 flex flex-col items-center bg-background px-4 text-foreground">
      <div className="w-full max-w-[440px] [perspective:1200px]">
        
        <div 
          className="relative w-full transition-transform duration-700 [transform-style:preserve-3d]"
          style={{ transform: `rotateY(${rotation}deg)` }}
        >
          
          {/* STRONA: LOGOWANIE (FRONT) */}
          <div className="w-full bg-card border border-border rounded-[2.5rem] p-8 md:p-10 shadow-xl [backface-visibility:hidden]">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Witaj</h1>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="email" 
                  placeholder="Email" 
                  required 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="pl-12 bg-background h-14 rounded-2xl border-border" 
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="password" 
                  placeholder="Hasło" 
                  required 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="pl-12 bg-background h-14 rounded-2xl border-border" 
                />
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
          <div className="absolute inset-0 w-full h-full bg-card border border-border rounded-[2.5rem] p-8 md:p-10 shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Dołącz</h1>
              <p className="text-muted-foreground text-sm">Załóż konto w layered.pl</p>
            </div>

            <form onSubmit={handleRegister} className="flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Imię i nazwisko" 
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="pl-12 bg-background h-12 rounded-xl border-border" 
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="email" 
                    placeholder="Email" 
                    required 
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="pl-12 bg-background h-12 rounded-xl border-border" 
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="password" 
                    placeholder="Hasło (min. 6 znaków)" 
                    required 
                    minLength={6}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="pl-12 bg-background h-12 rounded-xl border-border" 
                  />
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
