import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, ShoppingBag, User, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navLinks = [
  { href: '/', label: 'Strona główna' },
  { href: '/sklep', label: 'Sklep' },
  { href: '/kontakt', label: 'Kontakt' },
  { href: '/o-nas', label: 'O nas' },
];

export function Navbar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { totalItems, setIsOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <nav className="section-container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-lg">L</span>
            </div>
            <span className="font-display font-semibold text-xl">Layered</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors link-underline ${
                  isActive(link.href)
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </Button>

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground"
              onClick={() => setIsOpen(true)}
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Button>

            {/* Account */}
            <Link to="/konto">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <User className="w-5 h-5" />
              </Button>
            </Link>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col gap-6 mt-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`text-lg font-medium transition-colors ${
                        isActive(link.href)
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <hr className="border-border" />
                  <Link
                    to="/konto"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-lg font-medium text-muted-foreground hover:text-foreground"
                  >
                    Moje konto
                  </Link>
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-lg font-medium text-muted-foreground hover:text-foreground"
                  >
                    Panel admina
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}
