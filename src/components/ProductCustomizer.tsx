import { useState, useRef } from 'react';
import { Upload, X, Check, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CustomizationOption,
  SelectedCustomization,
  ColorOption,
  MaterialOption,
  SizeOption,
  StrengthOption,
  SelectOption,
  UploadedFile,
  ProductCustomization
} from '@/types/customization';

interface ProductCustomizerProps {
  customization: ProductCustomization;
  onCustomizationChange: (customizations: SelectedCustomization[], totalPrice: number, isValid: boolean, nonRefundableAccepted: boolean) => void;
}

export function ProductCustomizer({ customization, onCustomizationChange }: ProductCustomizerProps) {
  const [selections, setSelections] = useState<Record<string, SelectedCustomization>>({});
  const [nonRefundableAccepted, setNonRefundableAccepted] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const calculatePriceModifier = (option: CustomizationOption, selection: Partial<SelectedCustomization>): number => {
    let modifier = 0;
    
    if (selection.selectedColors) {
      modifier += selection.selectedColors.reduce((sum, c) => sum + (c.priceModifier || 0), 0);
    }
    if (selection.selectedMaterial?.priceModifier) {
      modifier += selection.selectedMaterial.priceModifier;
    }
    if (selection.selectedSize?.priceModifier) {
      modifier += selection.selectedSize.priceModifier;
    }
    if (selection.selectedStrength?.priceModifier) {
      modifier += selection.selectedStrength.priceModifier;
    }
    if (selection.selectedOption?.priceModifier) {
      modifier += selection.selectedOption.priceModifier;
    }
    
    return modifier;
  };

  const updateSelection = (optionId: string, option: CustomizationOption, update: Partial<SelectedCustomization>) => {
    const newSelection: SelectedCustomization = {
      ...selections[optionId],
      optionId,
      optionLabel: option.label,
      type: option.type,
      ...update,
      priceModifier: 0
    };
    newSelection.priceModifier = calculatePriceModifier(option, newSelection);
    
    const newSelections = { ...selections, [optionId]: newSelection };
    setSelections(newSelections);
    
    const allSelections = Object.values(newSelections);
    const totalPrice = allSelections.reduce((sum, s) => sum + s.priceModifier, 0);
    const isValid = validateSelections(newSelections);
    
    onCustomizationChange(allSelections, totalPrice, isValid, nonRefundableAccepted);
  };

  const validateSelections = (sels: Record<string, SelectedCustomization>): boolean => {
    for (const option of customization.options) {
      if (option.required) {
        const sel = sels[option.id];
        if (!sel) return false;
        
        switch (option.type) {
          case 'color':
            if (!sel.selectedColors || sel.selectedColors.length === 0) return false;
            break;
          case 'material':
            if (!sel.selectedMaterial) return false;
            break;
          case 'size':
            if (!sel.selectedSize) return false;
            break;
          case 'strength':
            if (!sel.selectedStrength) return false;
            break;
          case 'text':
            if (!sel.textValue || sel.textValue.trim() === '') return false;
            break;
          case 'file':
            if (!sel.uploadedFiles || sel.uploadedFiles.length === 0) return false;
            break;
          case 'select':
            if (!sel.selectedOption) return false;
            break;
        }
      }
    }
    
    if (customization.nonRefundable && !nonRefundableAccepted) {
      return false;
    }
    
    return true;
  };

  const handleNonRefundableChange = (checked: boolean) => {
    setNonRefundableAccepted(checked);
    const allSelections = Object.values(selections);
    const totalPrice = allSelections.reduce((sum, s) => sum + s.priceModifier, 0);
    const isValid = validateSelections(selections) && (customization.nonRefundable ? checked : true);
    onCustomizationChange(allSelections, totalPrice, isValid, checked);
  };

  const handleColorSelect = (option: CustomizationOption, color: ColorOption) => {
    const current = selections[option.id]?.selectedColors || [];
    let newColors: ColorOption[];
    
    if (option.multipleColors) {
      const exists = current.find(c => c.name === color.name);
      if (exists) {
        newColors = current.filter(c => c.name !== color.name);
      } else {
        if (option.colorLimit && current.length >= option.colorLimit) {
          return; // Limit reached
        }
        newColors = [...current, color];
      }
    } else {
      newColors = [color];
    }
    
    updateSelection(option.id, option, { selectedColors: newColors });
  };

  const handleFileUpload = (option: CustomizationOption, files: FileList | null) => {
    if (!files) return;
    
    const config = option.fileConfig;
    const current = selections[option.id]?.uploadedFiles || [];
    const newFiles: UploadedFile[] = [];
    
    Array.from(files).forEach(file => {
      if (config) {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (!config.allowedFormats.includes(ext)) return;
        if (file.size > config.maxSizeMB * 1024 * 1024) return;
        if (current.length + newFiles.length >= config.maxFiles) return;
      }
      
      const uploadedFile: UploadedFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        url: URL.createObjectURL(file),
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        size: file.size
      };
      newFiles.push(uploadedFile);
    });
    
    updateSelection(option.id, option, { 
      uploadedFiles: [...current, ...newFiles] 
    });
  };

  const removeFile = (option: CustomizationOption, fileId: string) => {
    const current = selections[option.id]?.uploadedFiles || [];
    updateSelection(option.id, option, { 
      uploadedFiles: current.filter(f => f.id !== fileId) 
    });
  };

  const renderColorOption = (option: CustomizationOption) => {
    const selected = selections[option.id]?.selectedColors || [];
    
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {option.colorOptions?.map((color) => {
            const isSelected = selected.some(c => c.name === color.name);
            return (
              <button
                key={color.name}
                onClick={() => handleColorSelect(option, color)}
                className={`relative group flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                  isSelected 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {color.image ? (
                  <img src={color.image} alt={color.name} className="w-6 h-6 rounded-full" />
                ) : (
                  <span 
                    className="w-6 h-6 rounded-full border border-white/20"
                    style={{ backgroundColor: color.hex }}
                  />
                )}
                <span className="text-sm">{color.name}</span>
                {color.priceModifier && color.priceModifier > 0 && (
                  <span className="text-xs text-primary">+{color.priceModifier} zł</span>
                )}
                {isSelected && (
                  <Check className="w-4 h-4 text-primary absolute -top-1 -right-1 bg-background rounded-full" />
                )}
              </button>
            );
          })}
        </div>
        {option.multipleColors && option.colorLimit && (
          <p className="text-xs text-muted-foreground">
            Wybrano {selected.length} z {option.colorLimit}
          </p>
        )}
      </div>
    );
  };

  const renderMaterialOption = (option: CustomizationOption) => {
    const selected = selections[option.id]?.selectedMaterial;
    
    return (
      <div className="flex flex-wrap gap-2">
        {option.materialOptions?.map((material) => (
          <button
            key={material.code}
            onClick={() => updateSelection(option.id, option, { selectedMaterial: material })}
            className={`px-4 py-2 rounded-xl border-2 transition-all text-sm uppercase tracking-wide ${
              selected?.code === material.code 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            {material.name}
            {material.priceModifier && material.priceModifier > 0 && (
              <span className="text-primary ml-1">+{material.priceModifier} zł</span>
            )}
          </button>
        ))}
      </div>
    );
  };

  const renderSizeOption = (option: CustomizationOption) => {
    const selected = selections[option.id]?.selectedSize;
    
    return (
      <div className="flex flex-wrap gap-2">
        {option.sizeOptions?.map((size) => (
          <button
            key={size.name}
            onClick={() => updateSelection(option.id, option, { selectedSize: size })}
            className={`px-4 py-3 rounded-xl border-2 transition-all ${
              selected?.name === size.name 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <span className="font-medium">{size.name}</span>
            <span className="text-xs text-muted-foreground block">{size.dimensions}</span>
            {size.priceModifier && size.priceModifier > 0 && (
              <span className="text-xs text-primary">+{size.priceModifier} zł</span>
            )}
          </button>
        ))}
      </div>
    );
  };

  const renderStrengthOption = (option: CustomizationOption) => {
    const selected = selections[option.id]?.selectedStrength;
    
    return (
      <div className="flex flex-wrap gap-2">
        {option.strengthOptions?.map((strength) => (
          <button
            key={strength.name}
            onClick={() => updateSelection(option.id, option, { selectedStrength: strength })}
            className={`px-4 py-3 rounded-xl border-2 transition-all ${
              selected?.name === strength.name 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <span className="font-medium">{strength.name}</span>
            <span className="text-xs text-muted-foreground block">{strength.fillPercentage}% wypełnienia</span>
            {strength.priceModifier && strength.priceModifier > 0 && (
              <span className="text-xs text-primary">+{strength.priceModifier} zł</span>
            )}
          </button>
        ))}
      </div>
    );
  };

  const renderTextOption = (option: CustomizationOption) => {
    const config = option.textConfig;
    const value = selections[option.id]?.textValue || '';
    
    return (
      <div className="space-y-3">
        <div className="relative">
          <Input
            value={value}
            onChange={(e) => updateSelection(option.id, option, { textValue: e.target.value })}
            placeholder={config?.placeholder || 'Wpisz tekst...'}
            maxLength={config?.maxLength}
            className="rounded-xl pr-16"
          />
          {config?.maxLength && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {value.length}/{config.maxLength}
            </span>
          )}
        </div>
        
        {option.fontOptions && option.fontOptions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {option.fontOptions.map((font) => (
              <button
                key={font}
                onClick={() => updateSelection(option.id, option, { ...selections[option.id], fontFamily: font })}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                  selections[option.id]?.fontFamily === font 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
                style={{ fontFamily: font }}
              >
                {font}
              </button>
            ))}
          </div>
        )}
        
        {option.positionOptions && option.positionOptions.length > 0 && (
          <div className="flex gap-2">
            {option.positionOptions.map((pos) => (
              <button
                key={pos}
                onClick={() => updateSelection(option.id, option, { ...selections[option.id], position: pos })}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                  selections[option.id]?.position === pos 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {pos === 'front' ? 'Przód' : pos === 'back' ? 'Tył' : 'Bok'}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderFileOption = (option: CustomizationOption) => {
    const config = option.fileConfig;
    const files = selections[option.id]?.uploadedFiles || [];
    
    return (
      <div className="space-y-3">
        <div 
          onClick={() => fileInputRefs.current[option.id]?.click()}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Kliknij aby dodać plik
          </p>
          {config && (
            <p className="text-xs text-muted-foreground mt-1">
              {config.allowedFormats.join(', ').toUpperCase()} • max {config.maxSizeMB}MB
              {config.maxFiles > 1 && ` • do ${config.maxFiles} plików`}
            </p>
          )}
        </div>
        
        <input
          ref={(el) => { fileInputRefs.current[option.id] = el; }}
          type="file"
          accept={config?.allowedFormats.map(f => `.${f}`).join(',')}
          multiple={config?.maxFiles ? config.maxFiles > 1 : false}
          onChange={(e) => handleFileUpload(option, e.target.files)}
          className="hidden"
        />
        
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-2"
            >
              {files.map((file) => (
                <div 
                  key={file.id}
                  className="relative group bg-muted rounded-xl p-2 flex items-center gap-2"
                >
                  {file.preview ? (
                    <img 
                      src={file.preview} 
                      alt={file.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-card rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <button
                    onClick={() => removeFile(option, file.id)}
                    className="p-1 hover:bg-destructive/20 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderSelectOption = (option: CustomizationOption) => {
    const selected = selections[option.id]?.selectedOption;
    
    return (
      <div className="flex flex-wrap gap-2">
        {option.selectOptions?.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateSelection(option.id, option, { selectedOption: opt })}
            className={`px-4 py-2 rounded-xl border-2 transition-all ${
              selected?.value === opt.value 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            {opt.label}
            {opt.priceModifier && opt.priceModifier > 0 && (
              <span className="text-primary ml-1 text-sm">+{opt.priceModifier} zł</span>
            )}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {customization.options.map((option) => (
        <motion.div 
          key={option.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Label className="text-base font-medium">{option.label}</Label>
            {option.required && (
              <span className="text-xs text-destructive">*</span>
            )}
            {option.description && (
              <span className="text-xs text-muted-foreground">({option.description})</span>
            )}
          </div>
          
          {option.type === 'color' && renderColorOption(option)}
          {option.type === 'material' && renderMaterialOption(option)}
          {option.type === 'size' && renderSizeOption(option)}
          {option.type === 'strength' && renderStrengthOption(option)}
          {option.type === 'text' && renderTextOption(option)}
          {option.type === 'file' && renderFileOption(option)}
          {option.type === 'select' && renderSelectOption(option)}
        </motion.div>
      ))}
      
      {/* Non-refundable warning */}
      {customization.nonRefundable && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-3 flex-1">
              <div>
                <h4 className="font-medium text-amber-400">Produkt personalizowany</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {customization.nonRefundableReason || 
                    'Produkty personalizowane nie podlegają zwrotowi zgodnie z prawem konsumenckim.'}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id="non-refundable"
                  checked={nonRefundableAccepted}
                  onCheckedChange={handleNonRefundableChange}
                />
                <label 
                  htmlFor="non-refundable" 
                  className="text-sm cursor-pointer"
                >
                  Akceptuję, że ten produkt nie podlega zwrotowi
                </label>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
