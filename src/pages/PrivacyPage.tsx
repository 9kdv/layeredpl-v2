import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <main className="pt-20">
      <section className="section-padding">
        <div className="section-container">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-4xl font-bold mb-8">Polityka prywatności</h1>
            
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
                <p className="text-muted-foreground mb-4">
                  Dane osobowe przetwarzane są w następujących celach:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Realizacja zamówień i umów sprzedaży</li>
                  <li>Prowadzenie konta użytkownika</li>
                  <li>Obsługa reklamacji i zwrotów</li>
                  <li>Marketing bezpośredni własnych produktów (za zgodą)</li>
                  <li>Analityka i optymalizacja strony</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">3. Podstawa prawna</h2>
                <p className="text-muted-foreground">
                  Przetwarzanie danych odbywa się na podstawie: wykonania umowy (art. 6 ust. 1 lit. b RODO), 
                  zgody (art. 6 ust. 1 lit. a RODO), prawnie uzasadnionego interesu administratora 
                  (art. 6 ust. 1 lit. f RODO) oraz obowiązku prawnego (art. 6 ust. 1 lit. c RODO).
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">4. Odbiorcy danych</h2>
                <p className="text-muted-foreground">
                  Dane mogą być udostępniane: firmom kurierskim, operatorom płatności, 
                  dostawcom usług IT, organom państwowym (na żądanie).
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">5. Okres przechowywania</h2>
                <p className="text-muted-foreground">
                  Dane przechowywane są przez okres niezbędny do realizacji celów przetwarzania, 
                  a następnie przez okres wymagany przepisami prawa (np. dla celów podatkowych - 5 lat).
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">6. Prawa użytkownika</h2>
                <p className="text-muted-foreground mb-4">
                  Przysługują Ci następujące prawa:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Prawo dostępu do danych</li>
                  <li>Prawo do sprostowania danych</li>
                  <li>Prawo do usunięcia danych ("prawo do bycia zapomnianym")</li>
                  <li>Prawo do ograniczenia przetwarzania</li>
                  <li>Prawo do przenoszenia danych</li>
                  <li>Prawo do sprzeciwu</li>
                  <li>Prawo do cofnięcia zgody</li>
                  <li>Prawo wniesienia skargi do organu nadzorczego (UODO)</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">7. Bezpieczeństwo</h2>
                <p className="text-muted-foreground">
                  Stosujemy odpowiednie środki techniczne i organizacyjne zapewniające 
                  bezpieczeństwo danych, w tym szyfrowanie SSL, regularne audyty bezpieczeństwa 
                  oraz ograniczony dostęp do danych.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">8. Kontakt</h2>
                <p className="text-muted-foreground">
                  W sprawach związanych z ochroną danych osobowych można kontaktować się 
                  pod adresem: prywatnosc@layered.pl
                </p>
              </section>
            </div>

            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Ostatnia aktualizacja: 20 grudnia 2024
              </p>
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
