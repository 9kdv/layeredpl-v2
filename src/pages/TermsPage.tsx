import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001';

export default function TermsPage() {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/settings/public`)
      .then(r => r.json())
      .then(data => {
        if (data.legal_terms) setContent(data.legal_terms);
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
            <h1 className="font-display text-4xl font-bold mb-8">Regulamin</h1>
            
            {content ? (
              <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap text-muted-foreground">
                {content}
              </div>
            ) : (
              <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
                <section>
                  <h2 className="font-display text-2xl font-semibold mb-4">1. Postanowienia ogólne</h2>
                  <p className="text-muted-foreground">
                    Niniejszy regulamin określa zasady korzystania ze sklepu internetowego 
                    Layered dostępnego pod adresem layered.pl. Sklep prowadzony jest przez 
                    Layered Sp. z o.o. z siedzibą w Warszawie.
                  </p>
                </section>
                <section>
                  <h2 className="font-display text-2xl font-semibold mb-4">2. Definicje</h2>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li><strong>Sklep</strong> - sklep internetowy Layered</li>
                    <li><strong>Klient</strong> - osoba fizyczna, prawna lub jednostka organizacyjna</li>
                    <li><strong>Produkt</strong> - rzecz oferowana w Sklepie</li>
                    <li><strong>Zamówienie</strong> - oświadczenie woli Klienta zmierzające do zawarcia umowy</li>
                  </ul>
                </section>
                <section>
                  <h2 className="font-display text-2xl font-semibold mb-4">3. Składanie zamówień</h2>
                  <p className="text-muted-foreground mb-4">
                    Zamówienia można składać przez stronę internetową sklepu 24 godziny na dobę, 
                    7 dni w tygodniu. Realizacja zamówień odbywa się w dni robocze.
                  </p>
                </section>
                <section>
                  <h2 className="font-display text-2xl font-semibold mb-4">4. Płatności</h2>
                  <p className="text-muted-foreground">
                    Sklep akceptuje następujące formy płatności: przelew bankowy, 
                    płatności online (Przelewy24, BLIK), karty płatnicze.
                  </p>
                </section>
                <section>
                  <h2 className="font-display text-2xl font-semibold mb-4">5. Dostawa</h2>
                  <p className="text-muted-foreground">
                    Dostawa realizowana jest na terenie Polski. Czas dostawy wynosi 2-3 dni 
                    robocze od momentu zaksięgowania płatności.
                  </p>
                </section>
                <section>
                  <h2 className="font-display text-2xl font-semibold mb-4">6. Prawo odstąpienia</h2>
                  <p className="text-muted-foreground">
                    Klient będący konsumentem ma prawo odstąpić od umowy w terminie 14 dni 
                    bez podania przyczyny.
                  </p>
                </section>
                <section>
                  <h2 className="font-display text-2xl font-semibold mb-4">7. Reklamacje</h2>
                  <p className="text-muted-foreground">
                    Reklamacje można składać drogą elektroniczną na adres kontakt@layered.pl. 
                    Reklamacja zostanie rozpatrzona w terminie 14 dni.
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