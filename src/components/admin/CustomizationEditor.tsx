import { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Palette, 
  Box, 
  Ruler, 
  Shield, 
  Type, 
  Upload,
  List,
  ChevronDown,
  ChevronUp,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CustomizationOption,
  CustomizationOptionType,
  ProductCustomization,
  ColorOption,
  MaterialOption,
  SizeOption,
  StrengthOption,
  SelectOption,
} from '@/types/customization';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomizationEditorProps {
  value: ProductCustomization | null;
  onChange: (customization: ProductCustomization | null) => void;
}

const OPTION_TYPES: { value: CustomizationOptionType; label: string; icon: React.ReactNode }[] = [
  { value: 'color', label: 'Kolory', icon: <Palette className="w-4 h-4" /> },
  { value: 'material', label: 'Materiały', icon: <Box className="w-4 h-4" /> },
  { value: 'size', label: 'Rozmiary', icon: <Ruler className="w-4 h-4" /> },
  { value: 'strength', label: 'Wytrzymałość', icon: <Shield className="w-4 h-4" /> },
  { value: 'text', label: 'Tekst/Grawer', icon: <Type className="w-4 h-4" /> },
  { value: 'file', label: 'Plik/Zdjęcie', icon: <Upload className="w-4 h-4" /> },
  { value: 'select', label: 'Wybór opcji', icon: <List className="w-4 h-4" /> },
];

const MATERIAL_CODES = ['pla', 'petg', 'abs', 'tpu', 'resin'] as const;

export function CustomizationEditor({ value, onChange }: CustomizationEditorProps) {
  const [expandedOption, setExpandedOption] = useState<string | null>(null);

  const customization = value || { options: [], nonRefundable: false };

  const updateCustomization = (updates: Partial<ProductCustomization>) => {
    onChange({ ...customization, ...updates });
  };

  const addOption = (type: CustomizationOptionType) => {
    const newOption: CustomizationOption = {
      id: `opt_${Date.now()}`,
      type,
      label: OPTION_TYPES.find(t => t.value === type)?.label || 'Opcja',
      required: false,
      priceType: 'add',
    };

    switch (type) {
      case 'color':
        newOption.colorOptions = [];
        newOption.multipleColors = false;
        newOption.colorLimit = 1;
        break;
      case 'material':
        newOption.materialOptions = [];
        break;
      case 'size':
        newOption.sizeOptions = [];
        break;
      case 'strength':
        newOption.strengthOptions = [];
        break;
      case 'text':
        newOption.textConfig = {
          maxLength: 50,
          allowEmoji: false,
          allowProfanity: false,
          placeholder: 'Wpisz tekst...',
        };
        newOption.fontOptions = [];
        newOption.positionOptions = [];
        break;
      case 'file':
        newOption.fileConfig = {
          allowedFormats: ['jpg', 'png'],
          maxFiles: 1,
          maxSizeMB: 5,
          showPreview: true,
        };
        break;
      case 'select':
        newOption.selectOptions = [];
        break;
    }

    updateCustomization({ options: [...customization.options, newOption] });
    setExpandedOption(newOption.id);
  };

  const updateOption = (optionId: string, updates: Partial<CustomizationOption>) => {
    updateCustomization({
      options: customization.options.map(opt =>
        opt.id === optionId ? { ...opt, ...updates } : opt
      ),
    });
  };

  const removeOption = (optionId: string) => {
    updateCustomization({
      options: customization.options.filter(opt => opt.id !== optionId),
    });
  };

  const duplicateOption = (option: CustomizationOption) => {
    const newOption = {
      ...JSON.parse(JSON.stringify(option)),
      id: `opt_${Date.now()}`,
      label: `${option.label} (kopia)`,
    };
    updateCustomization({ options: [...customization.options, newOption] });
    setExpandedOption(newOption.id);
  };

  const moveOption = (index: number, direction: 'up' | 'down') => {
    const newOptions = [...customization.options];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOptions.length) return;
    [newOptions[index], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[index]];
    updateCustomization({ options: newOptions });
  };

  // Color options editor
  const renderColorEditor = (option: CustomizationOption) => {
    const colors = option.colorOptions || [];
    
    const addColor = () => {
      const newColor: ColorOption = { name: 'Nowy kolor', hex: '#000000' };
      updateOption(option.id, { colorOptions: [...colors, newColor] });
    };

    const updateColor = (index: number, updates: Partial<ColorOption>) => {
      const newColors = [...colors];
      newColors[index] = { ...newColors[index], ...updates };
      updateOption(option.id, { colorOptions: newColors });
    };

    const removeColor = (index: number) => {
      updateOption(option.id, { colorOptions: colors.filter((_, i) => i !== index) });
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={option.multipleColors || false}
              onCheckedChange={(checked) => updateOption(option.id, { multipleColors: !!checked })}
            />
            <span className="text-sm">Wielokrotny wybór</span>
          </label>
          {option.multipleColors && (
            <div className="flex items-center gap-2">
              <Label className="text-sm">Limit:</Label>
              <Input
                type="number"
                value={option.colorLimit || 1}
                onChange={(e) => updateOption(option.id, { colorLimit: parseInt(e.target.value) || 1 })}
                className="w-20 h-8"
                min={1}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          {colors.map((color, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <input
                type="color"
                value={color.hex}
                onChange={(e) => updateColor(index, { hex: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <Input
                value={color.name}
                onChange={(e) => updateColor(index, { name: e.target.value })}
                placeholder="Nazwa koloru"
                className="flex-1 h-8"
              />
              <Input
                type="number"
                value={color.priceModifier || 0}
                onChange={(e) => updateColor(index, { priceModifier: parseFloat(e.target.value) || 0 })}
                placeholder="+zł"
                className="w-20 h-8"
              />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeColor(index)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        
        <Button type="button" variant="outline" size="sm" onClick={addColor}>
          <Plus className="w-4 h-4 mr-2" />
          Dodaj kolor
        </Button>
      </div>
    );
  };

  // Material options editor
  const renderMaterialEditor = (option: CustomizationOption) => {
    const materials = option.materialOptions || [];
    
    const addMaterial = () => {
      const newMaterial: MaterialOption = { name: 'Nowy materiał', code: 'pla' };
      updateOption(option.id, { materialOptions: [...materials, newMaterial] });
    };

    const updateMaterial = (index: number, updates: Partial<MaterialOption>) => {
      const newMaterials = [...materials];
      newMaterials[index] = { ...newMaterials[index], ...updates };
      updateOption(option.id, { materialOptions: newMaterials });
    };

    const removeMaterial = (index: number) => {
      updateOption(option.id, { materialOptions: materials.filter((_, i) => i !== index) });
    };

    return (
      <div className="space-y-2">
        {materials.map((material, index) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Input
              value={material.name}
              onChange={(e) => updateMaterial(index, { name: e.target.value })}
              placeholder="Nazwa"
              className="flex-1 h-8"
            />
            <Select
              value={material.code}
              onValueChange={(value) => updateMaterial(index, { code: value as any })}
            >
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_CODES.map(code => (
                  <SelectItem key={code} value={code}>{code.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={material.priceModifier || 0}
              onChange={(e) => updateMaterial(index, { priceModifier: parseFloat(e.target.value) || 0 })}
              placeholder="+zł"
              className="w-20 h-8"
            />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeMaterial(index)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
          <Plus className="w-4 h-4 mr-2" />
          Dodaj materiał
        </Button>
      </div>
    );
  };

  // Size options editor
  const renderSizeEditor = (option: CustomizationOption) => {
    const sizes = option.sizeOptions || [];
    
    const addSize = () => {
      const newSize: SizeOption = { name: 'Nowy rozmiar', dimensions: '0x0mm' };
      updateOption(option.id, { sizeOptions: [...sizes, newSize] });
    };

    const updateSize = (index: number, updates: Partial<SizeOption>) => {
      const newSizes = [...sizes];
      newSizes[index] = { ...newSizes[index], ...updates };
      updateOption(option.id, { sizeOptions: newSizes });
    };

    const removeSize = (index: number) => {
      updateOption(option.id, { sizeOptions: sizes.filter((_, i) => i !== index) });
    };

    return (
      <div className="space-y-2">
        {sizes.map((size, index) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Input
              value={size.name}
              onChange={(e) => updateSize(index, { name: e.target.value })}
              placeholder="Nazwa (np. Mały)"
              className="flex-1 h-8"
            />
            <Input
              value={size.dimensions}
              onChange={(e) => updateSize(index, { dimensions: e.target.value })}
              placeholder="Wymiary (np. 20x20mm)"
              className="w-32 h-8"
            />
            <Input
              type="number"
              value={size.priceModifier || 0}
              onChange={(e) => updateSize(index, { priceModifier: parseFloat(e.target.value) || 0 })}
              placeholder="+zł"
              className="w-20 h-8"
            />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSize(index)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addSize}>
          <Plus className="w-4 h-4 mr-2" />
          Dodaj rozmiar
        </Button>
      </div>
    );
  };

  // Strength options editor
  const renderStrengthEditor = (option: CustomizationOption) => {
    const strengths = option.strengthOptions || [];
    
    const addStrength = () => {
      const newStrength: StrengthOption = { name: 'Nowa wytrzymałość', fillPercentage: 15 };
      updateOption(option.id, { strengthOptions: [...strengths, newStrength] });
    };

    const updateStrength = (index: number, updates: Partial<StrengthOption>) => {
      const newStrengths = [...strengths];
      newStrengths[index] = { ...newStrengths[index], ...updates };
      updateOption(option.id, { strengthOptions: newStrengths });
    };

    const removeStrength = (index: number) => {
      updateOption(option.id, { strengthOptions: strengths.filter((_, i) => i !== index) });
    };

    return (
      <div className="space-y-2">
        {strengths.map((strength, index) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Input
              value={strength.name}
              onChange={(e) => updateStrength(index, { name: e.target.value })}
              placeholder="Nazwa (np. Standardowa)"
              className="flex-1 h-8"
            />
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={strength.fillPercentage}
                onChange={(e) => updateStrength(index, { fillPercentage: parseInt(e.target.value) || 0 })}
                className="w-16 h-8"
                min={5}
                max={100}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <Input
              type="number"
              value={strength.priceModifier || 0}
              onChange={(e) => updateStrength(index, { priceModifier: parseFloat(e.target.value) || 0 })}
              placeholder="+zł"
              className="w-20 h-8"
            />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeStrength(index)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addStrength}>
          <Plus className="w-4 h-4 mr-2" />
          Dodaj wytrzymałość
        </Button>
      </div>
    );
  };

  // Text config editor
  const renderTextEditor = (option: CustomizationOption) => {
    const config = option.textConfig || { maxLength: 50, allowEmoji: false, allowProfanity: false };
    const fonts = option.fontOptions || [];
    const positions = option.positionOptions || [];

    const updateConfig = (updates: Partial<typeof config>) => {
      updateOption(option.id, { textConfig: { ...config, ...updates } });
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Max znaków</Label>
            <Input
              type="number"
              value={config.maxLength}
              onChange={(e) => updateConfig({ maxLength: parseInt(e.target.value) || 50 })}
              min={1}
              max={500}
            />
          </div>
          <div>
            <Label className="text-sm">Placeholder</Label>
            <Input
              value={config.placeholder || ''}
              onChange={(e) => updateConfig({ placeholder: e.target.value })}
              placeholder="Wpisz tekst..."
            />
          </div>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={config.allowEmoji}
              onCheckedChange={(checked) => updateConfig({ allowEmoji: !!checked })}
            />
            <span className="text-sm">Pozwól na emoji</span>
          </label>
        </div>

        <div>
          <Label className="text-sm mb-2 block">Czcionki (opcjonalne)</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {fonts.map((font, index) => (
              <span key={index} className="px-2 py-1 bg-muted rounded text-sm flex items-center gap-1">
                {font}
                <button type="button" onClick={() => updateOption(option.id, { fontOptions: fonts.filter((_, i) => i !== index) })}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Nazwa czcionki"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.currentTarget.value) {
                    updateOption(option.id, { fontOptions: [...fonts, e.currentTarget.value] });
                    e.currentTarget.value = '';
                  }
                }
              }}
            />
          </div>
        </div>

        <div>
          <Label className="text-sm mb-2 block">Pozycje</Label>
          <div className="flex gap-2">
            {(['front', 'back', 'side'] as const).map(pos => (
              <label key={pos} className="flex items-center gap-2">
                <Checkbox
                  checked={positions.includes(pos)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateOption(option.id, { positionOptions: [...positions, pos] });
                    } else {
                      updateOption(option.id, { positionOptions: positions.filter(p => p !== pos) });
                    }
                  }}
                />
                <span className="text-sm">{pos === 'front' ? 'Przód' : pos === 'back' ? 'Tył' : 'Bok'}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // File config editor
  const renderFileEditor = (option: CustomizationOption) => {
    const config = option.fileConfig || { allowedFormats: ['jpg', 'png'], maxFiles: 1, maxSizeMB: 5, showPreview: true };

    const updateConfig = (updates: Partial<typeof config>) => {
      updateOption(option.id, { fileConfig: { ...config, ...updates } });
    };

    const toggleFormat = (format: string) => {
      const formats = config.allowedFormats;
      if (formats.includes(format)) {
        updateConfig({ allowedFormats: formats.filter(f => f !== format) });
      } else {
        updateConfig({ allowedFormats: [...formats, format] });
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <Label className="text-sm mb-2 block">Dozwolone formaty</Label>
          <div className="flex flex-wrap gap-2">
            {['jpg', 'png', 'heic', 'webp', 'gif', 'pdf'].map(format => (
              <label key={format} className="flex items-center gap-1.5">
                <Checkbox
                  checked={config.allowedFormats.includes(format)}
                  onCheckedChange={() => toggleFormat(format)}
                />
                <span className="text-sm uppercase">{format}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Max plików</Label>
            <Input
              type="number"
              value={config.maxFiles}
              onChange={(e) => updateConfig({ maxFiles: parseInt(e.target.value) || 1 })}
              min={1}
              max={10}
            />
          </div>
          <div>
            <Label className="text-sm">Max rozmiar (MB)</Label>
            <Input
              type="number"
              value={config.maxSizeMB}
              onChange={(e) => updateConfig({ maxSizeMB: parseInt(e.target.value) || 5 })}
              min={1}
              max={50}
            />
          </div>
        </div>

        <label className="flex items-center gap-2">
          <Checkbox
            checked={config.showPreview}
            onCheckedChange={(checked) => updateConfig({ showPreview: !!checked })}
          />
          <span className="text-sm">Pokaż podgląd</span>
        </label>
      </div>
    );
  };

  // Select options editor
  const renderSelectEditor = (option: CustomizationOption) => {
    const options = option.selectOptions || [];
    
    const addSelectOption = () => {
      const newOpt: SelectOption = { label: 'Nowa opcja', value: `opt_${Date.now()}` };
      updateOption(option.id, { selectOptions: [...options, newOpt] });
    };

    const updateSelectOption = (index: number, updates: Partial<SelectOption>) => {
      const newOptions = [...options];
      newOptions[index] = { ...newOptions[index], ...updates };
      updateOption(option.id, { selectOptions: newOptions });
    };

    const removeSelectOption = (index: number) => {
      updateOption(option.id, { selectOptions: options.filter((_, i) => i !== index) });
    };

    return (
      <div className="space-y-2">
        {options.map((opt, index) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Input
              value={opt.label}
              onChange={(e) => updateSelectOption(index, { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              placeholder="Etykieta opcji"
              className="flex-1 h-8"
            />
            <Input
              type="number"
              value={opt.priceModifier || 0}
              onChange={(e) => updateSelectOption(index, { priceModifier: parseFloat(e.target.value) || 0 })}
              placeholder="+zł"
              className="w-20 h-8"
            />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSelectOption(index)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addSelectOption}>
          <Plus className="w-4 h-4 mr-2" />
          Dodaj opcję
        </Button>
      </div>
    );
  };

  const renderOptionEditor = (option: CustomizationOption) => {
    switch (option.type) {
      case 'color': return renderColorEditor(option);
      case 'material': return renderMaterialEditor(option);
      case 'size': return renderSizeEditor(option);
      case 'strength': return renderStrengthEditor(option);
      case 'text': return renderTextEditor(option);
      case 'file': return renderFileEditor(option);
      case 'select': return renderSelectEditor(option);
      default: return null;
    }
  };

  const getOptionIcon = (type: CustomizationOptionType) => {
    return OPTION_TYPES.find(t => t.value === type)?.icon;
  };

  return (
    <div className="space-y-4">
      {/* Global settings */}
      <div className="p-4 bg-card border border-border rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Personalizacja produktu</h4>
            <p className="text-sm text-muted-foreground">
              {customization.options.length === 0 
                ? 'Dodaj opcje personalizacji dla tego produktu'
                : `${customization.options.length} opcji personalizacji`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-border">
          <label className="flex items-center gap-2">
            <Switch
              checked={customization.nonRefundable}
              onCheckedChange={(checked) => updateCustomization({ nonRefundable: checked })}
            />
            <span className="text-sm">Bez możliwości zwrotu</span>
          </label>
        </div>

        {customization.nonRefundable && (
          <div>
            <Label className="text-sm">Powód braku zwrotów</Label>
            <Input
              value={customization.nonRefundableReason || ''}
              onChange={(e) => updateCustomization({ nonRefundableReason: e.target.value })}
              placeholder="np. Produkt personalizowany na zamówienie"
            />
          </div>
        )}
      </div>

      {/* Options list */}
      <AnimatePresence>
        {customization.options.map((option, index) => (
          <motion.div
            key={option.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-border rounded-xl overflow-hidden bg-card"
          >
            <div 
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
              onClick={() => setExpandedOption(expandedOption === option.id ? null : option.id)}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                {getOptionIcon(option.type)}
              </div>
              <div className="flex-1">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({OPTION_TYPES.find(t => t.value === option.type)?.label})
                </span>
                {option.required && <span className="text-xs text-destructive ml-2">*wymagane</span>}
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveOption(index, 'up'); }}>
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveOption(index, 'down'); }}>
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); duplicateOption(option); }}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); removeOption(option.id); }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>

            {expandedOption === option.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-border p-4 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Nazwa opcji</Label>
                    <Input
                      value={option.label}
                      onChange={(e) => updateOption(option.id, { label: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Typ ceny</Label>
                    <Select
                      value={option.priceType}
                      onValueChange={(value) => updateOption(option.id, { priceType: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Dodaj do ceny</SelectItem>
                        <SelectItem value="multiply">Mnożnik ceny</SelectItem>
                        <SelectItem value="free_limit">Darmowe do limitu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Opis (opcjonalny)</Label>
                  <Input
                    value={option.description || ''}
                    onChange={(e) => updateOption(option.id, { description: e.target.value })}
                    placeholder="Dodatkowe informacje dla klienta..."
                  />
                </div>

                <label className="flex items-center gap-2">
                  <Switch
                    checked={option.required}
                    onCheckedChange={(checked) => updateOption(option.id, { required: checked })}
                  />
                  <span className="text-sm">Wymagane pole</span>
                </label>

                <div className="pt-4 border-t border-border">
                  <Label className="text-sm mb-3 block font-medium">Konfiguracja opcji</Label>
                  {renderOptionEditor(option)}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add option buttons */}
      <div className="pt-4 border-t border-border">
        <Label className="text-sm mb-3 block">Dodaj opcję personalizacji</Label>
        <div className="flex flex-wrap gap-2">
          {OPTION_TYPES.map(({ value, label, icon }) => (
            <Button
              type="button"
              key={value}
              variant="outline"
              size="sm"
              onClick={() => addOption(value)}
              className="gap-2"
            >
              {icon}
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Clear all */}
      {customization.options.length > 0 && (
        <div className="pt-4 border-t border-border">
          <Button 
            type="button"
            variant="destructive" 
            size="sm"
            onClick={() => onChange(null)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Usuń personalizację
          </Button>
        </div>
      )}
    </div>
  );
}