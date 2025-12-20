import { Link } from 'react-router-dom';

export default function CookiesPage() {
  return (
    <main className="pt-20">
      <section className="section-padding">
        <div className="section-container">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-4xl font-bold mb-8">Polityka cookies</h1>
            
            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">1. Czym są pliki cookies?</h2>
                <p className="text-muted-foreground">
                  Pliki cookies (ciasteczka) to małe pliki tekstowe zapisywane na urządzeniu 
                  użytkownika podczas przeglądania stron internetowych. Służą do zapamiętywania 
                  preferencji, zapewnienia prawidłowego działania strony oraz analizy ruchu.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">2. Rodzaje cookies</h2>
                <p className="text-muted-foreground mb-4">
                  Na naszej stronie używamy następujących rodzajów cookies:
                </p>
                
                <div className="space-y-4">
                  <div className="p-4 bg-secondary rounded-lg">
                    <h3 className="font-semibold mb-2">Cookies niezbędne</h3>
                    <p className="text-sm text-muted-foreground">
                      Wymagane do prawidłowego funkcjonowania strony. Obejmują sesję użytkownika, 
                      koszyk zakupowy, preferencje dotyczące zgody na cookies.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-secondary rounded-lg">
                    <h3 className="font-semibold mb-2">Cookies funkcjonalne</h3>
                    <p className="text-sm text-muted-foreground">
                      Służą do zapamiętywania preferencji użytkownika, takich jak wybór języka, 
                      tryb jasny/ciemny, ostatnio przeglądane produkty.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-secondary rounded-lg">
                    <h3 className="font-semibold mb-2">Cookies analityczne</h3>
                    <p className="text-sm text-muted-foreground">
                      Pomagają nam zrozumieć, jak użytkownicy korzystają ze strony. 
                      Zbierają anonimowe dane statystyczne.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-secondary rounded-lg">
                    <h3 className="font-semibold mb-2">Cookies marketingowe</h3>
                    <p className="text-sm text-muted-foreground">
                      Używane do personalizacji reklam i śledzenia skuteczności kampanii 
                      marketingowych. Wymagają osobnej zgody.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">3. Zarządzanie cookies</h2>
                <p className="text-muted-foreground mb-4">
                  Możesz zarządzać plikami cookies na kilka sposobów:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Przez baner cookies wyświetlany przy pierwszej wizycie</li>
                  <li>Przez ustawienia przeglądarki internetowej</li>
                  <li>Przez narzędzia do blokowania reklam</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Pamiętaj, że zablokowanie niektórych cookies może wpłynąć na działanie strony.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">4. Cookies podmiotów trzecich</h2>
                <p className="text-muted-foreground">
                  Nasza strona może zawierać cookies od podmiotów trzecich, takich jak 
                  Google Analytics, Facebook Pixel czy systemy płatności. Te podmioty 
                  mają własne polityki prywatności.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">5. Okres przechowywania</h2>
                <p className="text-muted-foreground">
                  Czas przechowywania cookies zależy od ich rodzaju:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
                  <li>Cookies sesyjne - usuwane po zamknięciu przeglądarki</li>
                  <li>Cookies trwałe - przechowywane do 12 miesięcy</li>
                  <li>Cookies analityczne - do 24 miesięcy</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">6. Podstawa prawna</h2>
                <p className="text-muted-foreground">
                  Wykorzystanie cookies odbywa się zgodnie z art. 173 ustawy Prawo telekomunikacyjne 
                  oraz przepisami RODO. Cookies niezbędne są przetwarzane na podstawie prawnie 
                  uzasadnionego interesu, pozostałe - na podstawie zgody.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold mb-4">7. Kontakt</h2>
                <p className="text-muted-foreground">
                  Pytania dotyczące cookies można kierować na adres: prywatnosc@layered.pl
                </p>
              </section>
            </div>

            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Ostatnia aktualizacja: 20 grudnia 2024
              </p>
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
