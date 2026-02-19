import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001';

export default function CookiesPage() {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/settings/public`)
      .then(r => r.json())
      .then(data => {
        if (data.legal_cookies) setContent(data.legal_cookies);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <main className="pt-20 min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="pt-20">
      <section className="section-padding">
        <div className="section-container">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-4xl font-bold mb-8">Polityka cookies</h1>
            
            {content ? (
              <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap text-muted-foreground">
                {content}
              </div>
            ) : (
              <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
                <section>
                  <h2 className="font-display text-2xl font-semibold mb-4">1. Czym są pliki cookies?</h2>
                  <p className="text-muted-foreground">
                    Pliki cookies (ciasteczka) to małe pliki tekstowe zapisywane na urządzeniu 
                    użytkownika podczas przeglądania stron internetowych.
                  </p>
                </section>
                <section>
                  <h2 className="font-display text-2xl font-semibold mb-4">2. Rodzaje cookies</h2>
                  <div className="space-y-4">
                    <div className="p-4 bg-secondary rounded-lg">
                      <h3 className="font-semibold mb-2">Cookies niezbędne</h3>
                      <p className="text-sm text-muted-foreground">Wymagane do prawidłowego funkcjonowania strony.</p>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg">
                      <h3 className="font-semibold mb-2">Cookies funkcjonalne</h3>
                      <p className="text-sm text-muted-foreground">Zapamiętywanie preferencji użytkownika.</p>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg">
                      <h3 className="font-semibold mb-2">Cookies analityczne</h3>
                      <p className="text-sm text-muted-foreground">Anonimowe dane statystyczne.</p>
                    </div>
                  </div>
                </section>
                <section>
                  <h2 className="font-display text-2xl font-semibold mb-4">3. Zarządzanie cookies</h2>
                  <p className="text-muted-foreground">
                    Możesz zarządzać plikami cookies przez baner cookies lub ustawienia przeglądarki.
                  </p>
                </section>
                <section>
                  <h2 className="font-display text-2xl font-semibold mb-4">4. Kontakt</h2>
                  <p className="text-muted-foreground">
                    Pytania dotyczące cookies: prywatnosc@layered.pl
                  </p>
                </section>
              </div>
            )}

            <div className="mt-12 pt-8 border-t border-border">
              <Link to="/prywatnosc" className="text-primary hover:underline text-sm">
                Zobacz także: Polityka prywatności
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}