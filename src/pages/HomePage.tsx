import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronDown, Loader2, ArrowRight, Palette, Leaf, Truck, Shield, Star,
  Clock, CreditCard, Users, Package, Zap, Heart, Quote, TrendingUp, Award, CheckCircle
} from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { api, Product, PublicStats } from '@/lib/api';
import { Button } from '@/components/ui/button';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

const stagger = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true }
};

interface PublicSettings {
  reviews?: { id: string; name: string; text: string; rating: number; date: string; verified: boolean }[];
  free_shipping_threshold?: string;
  shipping_time?: string;
}

const DEFAULT_REVIEWS = [
  { name: 'Anna K.', text: 'Świetna jakość produktów! Organizery na biurko są dokładnie takie, jakich szukałam. Polecam każdemu!', rating: 5, date: '2 dni temu', verified: true },
  { name: 'Michał W.', text: 'Bardzo szybka wysyłka i profesjonalna obsługa. Produkt zgodny z opisem, jestem zadowolony z zakupu.', rating: 5, date: '1 tydzień temu', verified: true },
  { name: 'Karolina M.', text: 'Uwielbiam design tych produktów. Już zamówiłam kolejne rzeczy. Na pewno wrócę po więcej!', rating: 5, date: '2 tygodnie temu', verified: true },
  { name: 'Tomasz B.', text: 'Solidna jakość wykonania, materiały wysokiej klasy. Widać, że robione z pasją do detali.', rating: 5, date: '3 tygodnie temu', verified: true }
];

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [publicSettings, setPublicSettings] = useState<PublicSettings>({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [featured, allProducts, publicStats, settings] = await Promise.all([
        api.getFeaturedProducts().catch(() => []),
        api.getProducts().catch(() => []),
        api.getPublicStats().catch(() => null),
        fetch(`${import.meta.env.PROD ? '/api' : 'http://localhost:3001'}/settings/public`).then(r => r.json()).catch(() => ({})),
      ]);

      if (featured.length >= 4) {
        setFeaturedProducts(featured.slice(0, 4));
      } else {
        const combined = [...featured, ...allProducts.filter(p => !featured.some(f => f.id === p.id))];
        setFeaturedProducts(combined.slice(0, 4));
      }

      setStats(publicStats);
      setPublicSettings(settings);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const reviews = publicSettings.reviews?.length ? publicSettings.reviews : DEFAULT_REVIEWS;
  const freeShippingThreshold = publicSettings.free_shipping_threshold || '200';
  const shippingTime = publicSettings.shipping_time || '24h';

  return (
    <main className="overflow-hidden">
      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <video src="majster.mov" autoPlay className="w-full h-full object-cover" loop playsInline muted />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/20" />
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative z-10 text-center px-6">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-4">
            Druk 3D dla Twojego domu
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8">
            Produkty z przyszłości
          </motion.h1>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }}>
            <Button asChild size="lg" className="h-14 px-10 text-base group">
              <Link to="/sklep">
                Zobacz produkty
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
          <Link to="#products" className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
            <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <ChevronDown className="w-8 h-8 text-muted-foreground" />
            </motion.div>
          </Link>
        </motion.div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 border-b border-border bg-card/50">
        <div className="section-container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-sm">
            {[
              { icon: Shield, label: 'Bezpieczne płatności' },
              { icon: Truck, label: `Darmowa dostawa od ${freeShippingThreshold} zł` },
              { icon: Clock, label: `Wysyłka w ${shippingTime}` },
              { icon: CreditCard, label: 'BLIK, karta, PayPal' },
            ].map((item, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="flex items-center gap-2 text-muted-foreground">
                <item.icon className="w-5 h-5 text-primary" />
                <span>{item.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gradient-to-b from-card/30 to-background">
        <div className="section-container">
          <motion.div {...stagger} initial="initial" whileInView="whileInView" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Package, value: stats?.totalProducts || 24, label: 'Produktów', suffix: '+' },
              { icon: Users, value: stats?.happyCustomers || 150, label: 'Zadowolonych klientów', suffix: '+' },
              { icon: Star, value: stats?.avgRating || 4.9, label: 'Średnia ocena', suffix: '/5' },
              { icon: Truck, value: stats?.totalOrders || 500, label: 'Zrealizowanych zamówień', suffix: '+' },
            ].map((stat, idx) => (
              <motion.div key={idx} variants={fadeInUp} className="bg-card border border-border rounded-2xl p-6 text-center hover:border-primary/30 transition-colors group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <p className="text-3xl font-bold mb-1">
                  {typeof stat.value === 'number' && stat.value % 1 !== 0 ? stat.value.toFixed(1) : stat.value}
                  <span className="text-primary">{stat.suffix}</span>
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="py-24 bg-card/30">
        <div className="section-container">
          <motion.div {...fadeInUp} className="flex items-center justify-between mb-12">
            <div>
              <p className="text-sm uppercase tracking-wider text-primary mb-2">Oferta</p>
              <h2 className="text-3xl md:text-4xl font-bold">Popularne produkty</h2>
            </div>
            <Link to="/sklep" className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
              Zobacz wszystkie
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : featuredProducts.length === 0 ? (
            <motion.div {...fadeInUp} className="text-center py-20">
              <p className="text-muted-foreground mb-4">Brak produktów</p>
              <Button asChild variant="outline"><Link to="/sklep">Przejdź do sklepu</Link></Button>
            </motion.div>
          ) : (
            <motion.div variants={stagger} initial="initial" whileInView="whileInView" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map((product) => (
                <motion.div key={product.id} variants={fadeInUp}><ProductCard product={product} /></motion.div>
              ))}
            </motion.div>
          )}

          <motion.div {...fadeInUp} className="mt-12 text-center sm:hidden">
            <Button asChild variant="outline"><Link to="/sklep">Zobacz wszystkie produkty</Link></Button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="section-container">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <p className="text-sm uppercase tracking-wider text-primary mb-2">Dlaczego my?</p>
            <h2 className="text-3xl md:text-4xl font-bold">Jakość, na którą zasługujesz</h2>
          </motion.div>
          <motion.div variants={stagger} initial="initial" whileInView="whileInView" viewport={{ once: true }} className="grid md:grid-cols-3 gap-12">
            {[
              { icon: Palette, title: 'Unikalne projekty', description: 'Każdy produkt jest starannie zaprojektowany i wydrukowany z najwyższą precyzją.' },
              { icon: Leaf, title: 'Ekologiczne materiały', description: 'Używamy biodegradowalnych filamentów PLA i PETG przyjaznych dla środowiska.' },
              { icon: Zap, title: 'Szybka realizacja', description: `Wysyłka w ciągu ${shippingTime} od złożenia zamówienia na terenie całej Polski.` }
            ].map((feature, idx) => (
              <motion.div key={idx} variants={fadeInUp} className="text-center group">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-24 bg-card/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
        <div className="section-container relative z-10">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <div className="flex items-center justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-6 h-6 fill-primary text-primary" />)}
            </div>
            <p className="text-sm uppercase tracking-wider text-primary mb-2">Opinie klientów</p>
            <h2 className="text-3xl md:text-4xl font-bold">Co mówią o nas</h2>
            <p className="text-muted-foreground mt-4">Ponad {stats?.happyCustomers || 150}+ zadowolonych klientów</p>
          </motion.div>

          <motion.div variants={stagger} initial="initial" whileInView="whileInView" viewport={{ once: true }}
            className={`grid gap-6 ${reviews.length <= 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : reviews.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}
          >
            {reviews.map((review, idx) => (
              <motion.div key={idx} variants={fadeInUp} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors relative group">
                <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10 group-hover:text-primary/20 transition-colors" />
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: review.rating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-4">{review.text}</p>
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <p className="font-medium text-sm">{review.name}</p>
                    <p className="text-xs text-muted-foreground">{review.date}</p>
                  </div>
                  {review.verified && (
                    <div className="flex items-center gap-1 text-xs text-green-500">
                      <CheckCircle className="w-3 h-3" /><span>Zweryfikowano</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why Trust Us */}
      <section className="py-24">
        <div className="section-container">
          <motion.div {...fadeInUp} className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-sm uppercase tracking-wider text-primary mb-2">Zaufanie</p>
                <h2 className="text-3xl font-bold mb-6">Dlaczego warto nam zaufać?</h2>
                <div className="space-y-4">
                  {[
                    { icon: Award, text: 'Ponad 2 lata doświadczenia w druku 3D' },
                    { icon: Heart, text: 'Każdy produkt tworzony z pasją i dbałością o detale' },
                    { icon: Shield, text: 'Bezpieczne płatności przez Stripe' },
                    { icon: TrendingUp, text: 'Stale rosnąca baza zadowolonych klientów' },
                  ].map((item, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-muted-foreground">{item.text}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl p-8 text-center">
                <div className="text-6xl font-bold mb-2">{stats?.avgRating?.toFixed(1) || '4.9'}<span className="text-primary">/5</span></div>
                <div className="flex justify-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-5 h-5 fill-primary text-primary" />)}
                </div>
                <p className="text-muted-foreground">Średnia ocena od klientów</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="section-container">
          <motion.div {...fadeInUp} className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.1),transparent_50%)]" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Gotowy na zakupy?</h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                Przeglądaj naszą kolekcję unikalnych produktów drukowanych w 3D i znajdź coś idealnego dla siebie.
              </p>
              <Button asChild size="lg" className="h-14 px-10 text-base group">
                <Link to="/sklep">
                  Przejdź do sklepu
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
