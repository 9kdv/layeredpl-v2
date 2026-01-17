import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectedCustomization } from '@/types/customization';

interface CustomizationEditDialogProps {
  cartItemId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomizationEditDialog({ cartItemId, isOpen, onClose }: CustomizationEditDialogProps) {
  const { items, updateCustomizations } = useCart();
  const item = items.find(i => i.cartItemId === cartItemId);
  
  const [customizations, setCustomizations] = useState<SelectedCustomization[]>(
    item?.customizations || []
  );

  useEffect(() => {
    if (item?.customizations) {
      setCustomizations(item.customizations);
    }
  }, [item]);

  if (!item) return null;

  const handleTextChange = (optionId: string, value: string) => {
    setCustomizations(prev => 
      prev.map(c => 
        c.optionId === optionId ? { ...c, textValue: value } : c
      )
    );
  };

  const handleSave = () => {
    const totalModifier = customizations.reduce((sum, c) => sum + c.priceModifier, 0);
    updateCustomizations(cartItemId, customizations, totalModifier);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edytuj personalizację</span>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <img 
              src={item.image} 
              alt={item.name}
              className="w-16 h-16 object-cover rounded-lg"
            />
            <div>
              <h4 className="font-medium">{item.name}</h4>
              <p className="text-sm text-muted-foreground">
                {item.price.toFixed(2)} zł + personalizacja
              </p>
            </div>
          </div>

          {customizations.map((c, idx) => (
            <div key={idx} className="space-y-2">
              <Label className="text-sm font-medium">{c.optionLabel}</Label>
              
              {c.type === 'text' && (
                <Input
                  value={c.textValue || ''}
                  onChange={(e) => handleTextChange(c.optionId, e.target.value)}
                  placeholder="Wpisz tekst..."
                  className="rounded-xl"
                />
              )}
              
              {c.type === 'color' && c.selectedColors && (
                <div className="flex flex-wrap gap-2">
                  {c.selectedColors.map((color, cIdx) => (
                    <div 
                      key={cIdx}
                      className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm"
                    >
                      <span 
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: color.hex }}
                      />
                      {color.name}
                    </div>
                  ))}
                </div>
              )}
              
              {c.type === 'material' && c.selectedMaterial && (
                <div className="px-3 py-1.5 bg-muted rounded-xl text-sm inline-block">
                  {c.selectedMaterial.name}
                </div>
              )}
              
              {c.type === 'size' && c.selectedSize && (
                <div className="px-3 py-1.5 bg-muted rounded-xl text-sm inline-block">
                  {c.selectedSize.name} ({c.selectedSize.dimensions})
                </div>
              )}
              
              {c.type === 'file' && c.uploadedFiles && (
                <div className="space-y-2">
                  {c.uploadedFiles.map((file, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2 text-sm">
                      {file.preview && (
                        <img 
                          src={file.preview} 
                          alt={file.name}
                          className="w-10 h-10 object-cover rounded-lg"
                        />
                      )}
                      <span className="truncate">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {c.priceModifier > 0 && (
                <p className="text-xs text-primary">
                  +{c.priceModifier.toFixed(2)} zł
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Anuluj
          </Button>
          <Button onClick={handleSave} className="rounded-xl">
            Zapisz zmiany
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
