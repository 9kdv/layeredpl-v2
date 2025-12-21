import { Link } from 'react-router-dom';
import { Instagram, Facebook, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="py-16 border-t border-border bg-card/30">
      <div className="section-container">
        <div className="flex flex-col gap-12">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="favicon.svg" alt="layered.pl" className="w-8 h-8" />
              <span className="text-xl font-bold tracking-tighter uppercase">layered.pl</span>
            </div>

            {/* Links - ujednolicone kolory i styl */}
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Link to="/sklep" className="hover:text-primary transition-colors">Sklep</Link>
              <Link to="/kontakt" className="hover:text-primary transition-colors">Kontakt</Link>
              <Link to="/regulamin" className="hover:text-primary transition-colors">Regulamin</Link>
              <Link to="/prywatnosc" className="hover:text-primary transition-colors">Prywatność</Link>
            </div>

            {/* Socials */}
            <div className="flex gap-3">
              <a href="#" className="p-2.5 bg-secondary/50 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="p-2.5 bg-secondary/50 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="mailto:kontakt@layered.pl" className="p-2.5 bg-secondary/50 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 font-bold">
            <p>© {new Date().getFullYear()} LAYERED.PL</p>
            <p>Wszystkie prawa zastrzeżone</p>
          </div>
          
        </div>
      </div>
    </footer>
  );
}