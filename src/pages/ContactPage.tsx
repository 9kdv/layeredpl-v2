import { useState } from 'react';
import { Send, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'Jak długo trwa realizacja zamówienia?',
    answer: 'Standardowy czas realizacji to 2-3 dni robocze. W przypadku produktów na zamówienie czas może się wydłużyć do 5-7 dni.',
  },
  {
    question: 'Czy oferujecie personalizację produktów?',
    answer: 'Tak! Wiele naszych produktów można spersonalizować - od koloru po grawerunki. Skontaktuj się z nami, aby omówić szczegóły.',
  },
  {
    question: 'Jakie materiały wykorzystujecie?',
    answer: 'Używamy głównie PLA i PETG - materiałów bezpiecznych, trwałych i przyjaznych środowisku. Wybór materiału zależy od specyfiki produktu.',
  },
  {
    question: 'Czy mogę zwrócić produkt?',
    answer: 'Oczywiście! Masz 14 dni na zwrot produktu bez podania przyczyny. Produkt musi być nieużywany i w oryginalnym opakowaniu.',
  },
  {
    question: 'Czy wysyłacie za granicę?',
    answer: 'Obecnie wysyłamy tylko na terenie Polski. Pracujemy nad rozszerzeniem wysyłki na inne kraje UE.',
  },
];

export default function ContactPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: 'Wiadomość wysłana!',
      description: 'Odpowiemy najszybciej jak to możliwe.',
    });

    setFormData({ name: '', email: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <main className="pt-20">
      {/* Header */}
      <section className="section-padding bg-secondary">
        <div className="section-container">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Kontakt
            </h1>
            <p className="text-muted-foreground text-lg">
              Masz pytania? Chętnie pomożemy! Skontaktuj się z nami 
              przez formularz lub bezpośrednio.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="section-padding">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="font-display text-2xl font-bold mb-6">
                Napisz do nas
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Imię i nazwisko</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Jan Kowalski"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="jan@example.com"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Temat</Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="W czym możemy pomóc?"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Wiadomość</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Twoja wiadomość..."
                    rows={6}
                    required
                  />
                </div>
                <Button type="submit" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? (
                    'Wysyłanie...'
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Wyślij wiadomość
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="font-display text-2xl font-bold mb-6">
                Dane kontaktowe
              </h2>
              <div className="space-y-6 mb-12">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Email</h3>
                    <a
                      href="mailto:kontakt@layered.pl"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      kontakt@layered.pl
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Telefon</h3>
                    <a
                      href="tel:+48123456789"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      +48 123 456 789
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Adres</h3>
                    <p className="text-muted-foreground">
                      ul. Przykładowa 123
                      <br />
                      00-000 Warszawa
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Godziny pracy</h3>
                    <p className="text-muted-foreground">
                      Pon - Pt: 9:00 - 17:00
                      <br />
                      Sob - Nd: Zamknięte
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="section-padding bg-secondary">
        <div className="section-container">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl font-bold mb-8 text-center">
              Często zadawane pytania
            </h2>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`faq-${index}`}
                  className="bg-card border border-border rounded-lg px-6"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <span className="text-left font-medium">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </main>
  );
}
