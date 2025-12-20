import { Link } from 'react-router-dom';
import { Instagram, Facebook, Mail } from 'lucide-react';

const footerLinks = {
  sklep: [
    { label: 'Wszystkie produkty', href: '/sklep' },
    { label: 'Organizery', href: '/sklep?kategoria=organizery' },
    { label: 'Dekoracje', href: '/sklep?kategoria=dekoracje' },
    { label: 'Akcesoria', href: '/sklep?kategoria=akcesoria' },
  ],
  informacje: [
    { label: 'O nas', href: '/o-nas' },
    { label: 'Kontakt', href: '/kontakt' },
    { label: 'FAQ', href: '/kontakt#faq' },
    { label: 'Wysyłka i zwroty', href: '/wysylka' },
  ],
  prawo: [
    { label: 'Regulamin', href: '/regulamin' },
    { label: 'Polityka prywatności', href: '/prywatnosc' },
    { label: 'Polityka cookies', href: '/cookies' },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary border-t border-border">
      <div className="section-container section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-lg">L</span>
              </div>
              <span className="font-display font-semibold text-xl">Layered</span>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Tworzymy nowoczesne, funkcjonalne przedmioty drukowane w 3D. 
              Każdy produkt to połączenie designu i praktyczności.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="mailto:kontakt@layered.pl"
                className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Sklep */}
          <div>
            <h4 className="font-display font-semibold mb-4">Sklep</h4>
            <ul className="space-y-3">
              {footerLinks.sklep.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Informacje */}
          <div>
            <h4 className="font-display font-semibold mb-4">Informacje</h4>
            <ul className="space-y-3">
              {footerLinks.informacje.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Prawo */}
          <div>
            <h4 className="font-display font-semibold mb-4">Prawo</h4>
            <ul className="space-y-3">
              {footerLinks.prawo.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Layered. Wszystkie prawa zastrzeżone.
          </p>
          <p className="text-sm text-muted-foreground">
            Wykonane z ❤️ w Polsce
          </p>
        </div>
      </div>
    </footer>
  );
}
