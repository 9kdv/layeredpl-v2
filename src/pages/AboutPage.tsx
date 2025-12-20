import { Link } from 'react-router-dom';
import { ArrowRight, Layers, Users, Heart, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

const values = [
  {
    icon: Layers,
    title: 'Jakość',
    description: 'Każdy produkt przechodzi rygorystyczną kontrolę jakości przed wysyłką.',
  },
  {
    icon: Lightbulb,
    title: 'Innowacja',
    description: 'Stale eksperymentujemy z nowymi technologiami i materiałami.',
  },
  {
    icon: Heart,
    title: 'Pasja',
    description: 'Druk 3D to nasza pasja, którą dzielimy się przez nasze produkty.',
  },
  {
    icon: Users,
    title: 'Społeczność',
    description: 'Budujemy społeczność entuzjastów nowoczesnego designu.',
  },
];

export default function AboutPage() {
  return (
    <main className="pt-20">
      {/* Header */}
      <section className="section-padding bg-secondary">
        <div className="section-container">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
              O nas
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl">
              Layered to marka stworzona z pasji do technologii i designu. 
              Wierzymy, że druk 3D to przyszłość produkcji - bardziej zrównoważona, 
              personalizowana i dostępna dla każdego.
            </p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="section-padding">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-primary font-medium mb-4 block">Nasza historia</span>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                Od hobby do profesjonalnego studia
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Layered powstało w 2023 roku jako projekt pasjonatów druku 3D. 
                  Zaczęliśmy od jednej drukarki w garażu, projektując produkty 
                  najpierw dla siebie, a potem dla znajomych.
                </p>
                <p>
                  Szybko okazało się, że jest ogromne zapotrzebowanie na 
                  funkcjonalne, dobrze zaprojektowane przedmioty, które nie 
                  wyglądają jak typowe produkty z drukarki 3D.
                </p>
                <p>
                  Dziś dysponujemy profesjonalnym studiem z kilkoma drukarkami 
                  przemysłowymi i zespołem projektantów, ale nasza filozofia 
                  pozostaje ta sama - tworzymy rzeczy, które sami chcielibyśmy mieć.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl bg-secondary flex items-center justify-center">
                <Layers className="w-24 h-24 text-primary/50" />
              </div>
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-xl bg-primary/20 -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-secondary">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Nasze wartości
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Wszystko co robimy, robimy zgodnie z naszymi wartościami.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-card p-6 rounded-xl border border-border text-center"
              >
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">
                  {value.title}
                </h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section-padding">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Nasz proces
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Od pomysłu do gotowego produktu - każdy etap wymaga uwagi i precyzji.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Projektowanie', desc: 'Tworzenie modelu 3D z dbałością o funkcjonalność i estetykę.' },
              { step: '02', title: 'Prototypowanie', desc: 'Testowanie i dopracowywanie projektu przed produkcją.' },
              { step: '03', title: 'Produkcja', desc: 'Druk na profesjonalnych maszynach z najlepszych materiałów.' },
              { step: '04', title: 'Wykończenie', desc: 'Ręczna kontrola jakości i przygotowanie do wysyłki.' },
            ].map((item, index) => (
              <div key={item.step} className="relative">
                <span className="font-display text-6xl font-bold text-muted/50">
                  {item.step}
                </span>
                <h3 className="font-display font-semibold text-lg mt-2 mb-2">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 right-0 w-1/2 h-px bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary">
        <div className="section-container text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Masz pytania?
          </h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
            Chętnie odpowiemy na wszystkie pytania dotyczące naszych produktów, 
            procesu produkcji lub współpracy.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link to="/kontakt">
              Skontaktuj się
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
