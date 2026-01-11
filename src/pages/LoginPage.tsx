import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type View = 'login' | 'register' | 'forgot';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<View>('login');
  
  // Form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/konto');
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.requestPasswordReset(resetEmail);
      toast.success('Jeśli konto istnieje, email z instrukcjami został wysłany');
      setView('login');
      setResetEmail('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd wysyłania emaila');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen pt-28 pb-20 flex flex-col items-center bg-background px-4 text-foreground">
      <div className="w-full max-w-[440px]">
        
        {/* Login View */}
        {view === 'login' && (
          <div className="bg-card border border-border rounded-2xl p-8 md:p-10 shadow-xl">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Witaj</h1>
              <p className="text-muted-foreground">Zaloguj się do swojego konta</p>
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
                  className="pl-12 bg-background h-14 rounded-xl border-border" 
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
                  className="pl-12 bg-background h-14 rounded-xl border-border" 
                />
              </div>

              <div className="text-right">
                <button 
                  type="button"
                  onClick={() => setView('forgot')}
                  className="text-sm text-primary hover:underline"
                >
                  Zapomniałeś hasła?
                </button>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full h-14 font-bold text-base">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Logowanie...
                  </>
                ) : (
                  'Zaloguj się'
                )}
              </Button>
            </form>

            <div className="mt-12 pt-8 border-t border-border flex flex-col gap-4">
              <p className="text-xs text-muted-foreground text-center uppercase tracking-widest font-semibold">Nowy klient?</p>
              <Button 
                variant="secondary" 
                onClick={() => setView('register')} 
                className="w-full h-14 bg-secondary/50 border border-border hover:bg-secondary transition-colors"
              >
                Stwórz nowe konto
              </Button>
            </div>
          </div>
        )}

        {/* Register View */}
        {view === 'register' && (
          <div className="bg-card border border-border rounded-2xl p-8 md:p-10 shadow-xl">
            <button 
              onClick={() => setView('login')} 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Wróć
            </button>

            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Dołącz</h1>
              <p className="text-muted-foreground text-sm">Załóż konto w layered.pl</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
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

              <Button type="submit" disabled={isSubmitting} className="w-full h-12 font-bold text-base">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Przetwarzanie...
                  </>
                ) : (
                  'Zarejestruj się'
                )}
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground mt-6">
              Rejestrując się, akceptujesz nasz regulamin i politykę prywatności.
            </p>
          </div>
        )}

        {/* Forgot Password View */}
        {view === 'forgot' && (
          <div className="bg-card border border-border rounded-2xl p-8 md:p-10 shadow-xl">
            <button 
              onClick={() => setView('login')} 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Wróć
            </button>

            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Reset hasła</h1>
              <p className="text-muted-foreground text-sm">
                Podaj email powiązany z Twoim kontem, a wyślemy Ci link do resetowania hasła.
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="email" 
                  placeholder="Email" 
                  required 
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-12 bg-background h-12 rounded-xl border-border" 
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full h-12 font-bold text-base">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wysyłanie...
                  </>
                ) : (
                  'Wyślij link resetowania'
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
