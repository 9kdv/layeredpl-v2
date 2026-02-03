import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { messagesApi } from '@/lib/adminApi';

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Wypełnij wszystkie wymagane pola');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await messagesApi.create({
        sender_name: formData.name,
        sender_email: formData.email,
        subject: formData.subject || 'Wiadomość z formularza kontaktowego',
        content: formData.message
      });
      
      toast.success('Wiadomość wysłana! Odpowiemy najszybciej jak to możliwe.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      toast.error('Błąd wysyłania wiadomości. Spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="pt-20 min-h-screen">
      <section className="py-16">
        <div className="section-container max-w-xl">
          <h1 className="text-4xl font-bold mb-4">Kontakt</h1>
          <p className="text-muted-foreground mb-8">
            Masz pytania? Napisz do nas, a odpowiemy najszybciej jak to możliwe.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Imię i nazwisko *</Label>
              <Input 
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jan Kowalski" 
                required 
                className="mt-1 bg-card border-border" 
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input 
                id="email"
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jan@example.com" 
                required 
                className="mt-1 bg-card border-border" 
              />
            </div>
            
            <div>
              <Label htmlFor="subject">Temat</Label>
              <Input 
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Pytanie o produkt" 
                className="mt-1 bg-card border-border" 
              />
            </div>
            
            <div>
              <Label htmlFor="message">Wiadomość *</Label>
              <Textarea 
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Twoja wiadomość..." 
                rows={6} 
                required 
                className="mt-1 bg-card border-border" 
              />
            </div>
            
            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wysyłanie...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Wyślij wiadomość
                </>
              )}
            </Button>
          </form>

          <div className="mt-12 pt-8 border-t border-border text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Inne sposoby kontaktu:</p>
            <p>kontakt@layered.pl</p>
          </div>
        </div>
      </section>
    </main>
  );
}
