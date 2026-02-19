import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001';

export default function PrivacyPage() {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/settings/public`)
      .then(r => r.json())
      .then(data => {
        if (data.legal_privacy) setContent(data.legal_privacy);
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
            <h1 className="font-display text-4xl font-bold mb-8">Polityka prywatności</h1>
            
            {content ? (
              <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap text-muted-foreground">
                {content}
              </div>
            ) : (
              <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
                <section>
                  <h2 className="font-display text-2xl font-semibold mb-4">1. Administrator danych</h2>
                  <p className="text-muted-foreground">
                    Administratorem danych osobowych jest Layered Sp. z o.o. z siedzibą 
                    w Warszawie, ul. Przykładowa 123, 00-000 Warszawa, NIP: 0000000000.
                  </p>
                </section>
                <section>
                  <h2 className="font-display text-2xl font-semibold mb-4">2. Cel przetwarzania danych</h2>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Realizacja zamówień i umów sprzedaży</li>
                    <li>Prowadzenie konta użytkownika</li>
                    <li>Obsługa reklamacji i zwrotów</li>
                    <li>Marketing bezpośredni własnych produktów (za zgodą)</li>
                  </ul>
                </section>
                <section>
                  <h2 className="font-display text-2xl font-semibold mb-4">3. Prawa użytkownika</h2>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Prawo dostępu do danych</li>
                    <li>Prawo do sprostowania danych</li>
                    <li>Prawo do usunięcia danych</li>
                    <li>Prawo do ograniczenia przetwarzania</li>
                    <li>Prawo do przenoszenia danych</li>
                    <li>Prawo do sprzeciwu</li>
                  </ul>
                </section>
                <section>
                  <h2 className="font-display text-2xl font-semibold mb-4">4. Kontakt</h2>
                  <p className="text-muted-foreground">
                    W sprawach związanych z ochroną danych osobowych: prywatnosc@layered.pl
                  </p>
                </section>
              </div>
            )}

            <div className="mt-12 pt-8 border-t border-border">
              <Link to="/kontakt" className="text-primary hover:underline text-sm">
                Masz pytania? Skontaktuj się z nami
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}