import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cookies')) {
      setTimeout(() => setShow(true), 1000);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookies', 'accepted');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-fade-in">
      <div className="section-container">
        <div className="bg-card border border-border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 max-w-lg">
          <p className="text-sm text-muted-foreground flex-1">
            Używamy cookies. <Link to="/cookies" className="underline">Więcej</Link>
          </p>
          <Button onClick={accept} size="sm">OK</Button>
        </div>
      </div>
    </div>
  );
}
