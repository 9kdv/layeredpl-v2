import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function ContactPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    toast({ title: 'Wysłano!' });
    setIsSubmitting(false);
  };

  return (
    <main className="pt-20 min-h-screen">
      <section className="py-16">
        <div className="section-container max-w-xl">
          <h1 className="text-4xl font-bold mb-8">Kontakt</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input placeholder="Imię" required className="bg-card border-border" />
            <Input type="email" placeholder="Email" required className="bg-card border-border" />
            <Textarea placeholder="Wiadomość" rows={6} required className="bg-card border-border" />
            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Wysyłanie...' : 'Wyślij'}
            </Button>
          </form>

          <div className="mt-12 pt-8 border-t border-border text-muted-foreground">
            <p>kontakt@layered.pl</p>
          </div>
        </div>
      </section>
    </main>
  );
}
