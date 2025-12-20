import { useState, useEffect } from 'react';
import { X, Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('layered-cookie-consent');
    if (!consent) {
      // Small delay for animation
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('layered-cookie-consent', 'accepted');
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem('layered-cookie-consent', 'rejected');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-in-up">
      <div className="section-container">
        <div className="bg-card border border-border rounded-xl p-6 shadow-strong flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Cookie className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-display font-medium mb-1">Używamy plików cookies</h4>
              <p className="text-sm text-muted-foreground">
                Ta strona używa plików cookies, aby zapewnić najlepsze doświadczenie. 
                Korzystając ze strony, zgadzasz się na ich użycie.{' '}
                <Link to="/cookies" className="text-primary hover:underline">
                  Dowiedz się więcej
                </Link>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={handleReject} className="flex-1 md:flex-none">
              Odrzuć
            </Button>
            <Button onClick={handleAccept} className="flex-1 md:flex-none">
              Akceptuję
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
