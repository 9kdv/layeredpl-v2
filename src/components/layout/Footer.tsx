import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="section-container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="text-xl font-bold">LAYERED</Link>
          
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <Link to="/sklep" className="hover:text-foreground transition-colors">Sklep</Link>
            <Link to="/kontakt" className="hover:text-foreground transition-colors">Kontakt</Link>
            <Link to="/regulamin" className="hover:text-foreground transition-colors">Regulamin</Link>
            <Link to="/prywatnosc" className="hover:text-foreground transition-colors">Prywatność</Link>
          </div>
          
          <p className="text-sm text-muted-foreground">© 2024</p>
        </div>
      </div>
    </footer>
  );
}
