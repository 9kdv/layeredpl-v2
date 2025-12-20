import { Link } from 'react-router-dom';
import { ArrowRight, Layers, Sparkles, Shield, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/ProductCard';
import { products } from '@/data/products';
import heroImage from '@/assets/hero-image.jpg';

const features = [
  {
    icon: Layers,
    title: 'Warstwa po warstwie',
    description: 'Każdy produkt powstaje dzięki precyzyjnemu drukowi 3D, zapewniając idealną jakość i powtarzalność.',
  },
  {
    icon: Sparkles,
    title: 'Unikalny design',
    description: 'Projekty tworzone z myślą o nowoczesnych wnętrzach. Funkcjonalność spotyka estetykę.',
  },
  {
    icon: Shield,
    title: 'Materiały premium',
    description: 'Używamy tylko najwyższej jakości filamentów PLA i PETG, bezpiecznych i trwałych.',
  },
  {
    icon: Truck,
    title: 'Szybka wysyłka',
    description: 'Zamówienia realizujemy w 2-3 dni robocze. Wysyłka na terenie całej Polski.',
  },
];

export default function HomePage() {
  const featuredProducts = products.filter((p) => p.featured).slice(0, 4);

  return (
    <main>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Nowoczesne produkty drukowane 3D"
            className="w-full h-full object-cover opacity-30 dark:opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        </div>
        
        <div className="section-container relative z-10">
          <div className="max-w-3xl animate-fade-in-up">
            <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Druk 3D nowej generacji
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight">
              Nowoczesne przedmioty
              <br />
              <span className="text-primary">z drukarki 3D</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl">
              Tworzymy funkcjonalne i estetyczne produkty wykorzystując najnowsze technologie druku 3D. 
              Każdy przedmiot to połączenie designu i praktyczności.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="btn-hero">
                <Link to="/sklep">
                  Zobacz produkty
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="btn-outline-hero">
                <Link to="/o-nas">
                  Dowiedz się więcej
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Layered Section */}
      <section className="section-padding bg-secondary">
        <div className="section-container">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Dlaczego Layered?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Łączymy pasję do technologii z dbałością o każdy detal. 
              Nasze produkty to nie tylko przedmioty – to przemyślane rozwiązania.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 stagger-children">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-card p-6 rounded-xl border border-border card-hover"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section-padding">
        <div className="section-container">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Wyróżnione produkty
              </h2>
              <p className="text-muted-foreground max-w-xl">
                Odkryj nasze najpopularniejsze produkty, wybrane przez klientów.
              </p>
            </div>
            <Link
              to="/sklep"
              className="inline-flex items-center gap-2 text-primary font-medium mt-4 md:mt-0 hover:gap-3 transition-all"
            >
              Zobacz wszystkie
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="product-grid">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Quality Section */}
      <section className="section-padding bg-foreground text-background">
        <div className="section-container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                Jakość w każdym detalu
              </h2>
              <p className="text-background/70 mb-6">
                Każdy produkt Layered przechodzi rygorystyczną kontrolę jakości. 
                Używamy drukarek przemysłowych i najwyższej jakości materiałów, 
                aby zapewnić trwałość i estetykę na lata.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Druk z dokładnością do 0.1mm',
                  'Materiały certyfikowane i bezpieczne',
                  'Ręczne wykończenie każdego produktu',
                  '12-miesięczna gwarancja',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-background/90">{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="secondary" size="lg">
                <Link to="/o-nas">
                  Poznaj nasz proces
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-background/10 flex items-center justify-center">
                <Layers className="w-32 h-32 text-primary" />
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-xl bg-primary/20 -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding">
        <div className="section-container">
          <div className="bg-primary rounded-2xl p-8 md:p-12 lg:p-16 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Gotowy na zakupy?
            </h2>
            <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
              Odkryj pełną kolekcję produktów Layered i znajdź idealne dodatki do swojego wnętrza.
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link to="/sklep">
                Przejdź do sklepu
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
