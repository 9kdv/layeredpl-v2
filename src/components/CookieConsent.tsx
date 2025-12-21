import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cookies')) {
      setTimeout(() => setShow(true), 1500);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookies', 'accepted');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-sm z-[100] animate-in slide-in-from-bottom-10 fade-in duration-700">
      <div className="relative group">
        {/* Subtelna poświata w tle */}
        <div className="absolute -inset-0.5 bg-primary/20 rounded-2xl blur opacity-50 group-hover:opacity-75 transition duration-500"></div>
        
        {/* Panel */}
        <div className="relative bg-card/90 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-primary/20 rounded-full shrink-0">
              <Cookie className="w-6 h-6 text-primary" />
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Strona używa ciasteczek wyłącznie do poprawnego działania. 
                Bez nich zakupy nie byłyby możliwe.
                <Link to="/cookies" className="ml-1 text-foreground underline hover:text-primary transition-colors">Więcej</Link>
              </p>
            </div>
          </div>

          <Button 
            onClick={accept} 
            size="sm" 
            className="w-full h-11 rounded-xl font-bold tracking-tight shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-[0.98]"
          >
            ROZUMIEM
          </Button>
        </div>
      </div>
    </div>
  );
}