// Product Customization Types

export type CustomizationOptionType = 'color' | 'material' | 'size' | 'strength' | 'text' | 'file' | 'select';

export interface ColorOption {
  name: string;
  hex: string;
  image?: string;
  priceModifier?: number; // Additional price
}

export interface MaterialOption {
  name: string;
  code: 'pla' | 'petg' | 'abs' | 'tpu' | 'resin';
  priceModifier?: number;
}

export interface SizeOption {
  name: string;
  dimensions: string; // e.g., "20x20mm"
  priceModifier?: number;
}

export interface StrengthOption {
  name: string;
  fillPercentage: number; // 5, 10, 15, etc.
  priceModifier?: number;
}

export interface SelectOption {
  label: string;
  value: string;
  priceModifier?: number;
}

export interface TextConfig {
  maxLength: number;
  allowEmoji: boolean;
  allowProfanity: boolean;
  placeholder?: string;
}

export interface FileConfig {
  allowedFormats: string[]; // ['jpg', 'png', 'heic']
  maxFiles: number;
  maxSizeMB: number;
  showPreview: boolean;
}

// Base customization option
export interface CustomizationOption {
  id: string;
  type: CustomizationOptionType;
  label: string;
  description?: string;
  required: boolean;
  priceType: 'add' | 'multiply' | 'free_limit';
  freeLimit?: number; // Free up to this limit
  
  // Type-specific configs
  colorOptions?: ColorOption[];
  multipleColors?: boolean;
  colorLimit?: number;
  
  materialOptions?: MaterialOption[];
  sizeOptions?: SizeOption[];
  strengthOptions?: StrengthOption[];
  selectOptions?: SelectOption[];
  
  textConfig?: TextConfig;
  fileConfig?: FileConfig;
  
  // Font options for text
  fontOptions?: string[];
  positionOptions?: ('front' | 'back' | 'side')[];
}

// Product with customization options
export interface ProductCustomization {
  options: CustomizationOption[];
  nonRefundable: boolean; // Personalized products can't be returned
  nonRefundableReason?: string;
}

// User's selected customizations for cart
export interface SelectedCustomization {
  optionId: string;
  optionLabel: string;
  type: CustomizationOptionType;
  
  // Selected values based on type
  selectedColors?: ColorOption[];
  selectedMaterial?: MaterialOption;
  selectedSize?: SizeOption;
  selectedStrength?: StrengthOption;
  selectedOption?: SelectOption;
  
  textValue?: string;
  fontSize?: number;
  fontFamily?: string;
  position?: 'front' | 'back' | 'side';
  
  uploadedFiles?: UploadedFile[];
  
  // Price impact
  priceModifier: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  preview?: string;
  size: number;
}

// Extended cart item with customizations
export interface CartItemCustomization {
  customizations: SelectedCustomization[];
  customizationPrice: number; // Total additional price from customizations
  nonRefundable: boolean;
  nonRefundableAccepted?: boolean;
}

// Order statuses
export type OrderStatus = 
  | 'pending'           // Oczekujące
  | 'paid'              // Opłacone
  | 'processing'        // W realizacji
  | 'awaiting_info'     // Wymaga kontaktu (np. złe zdjęcie)
  | 'shipped'           // Wysłane
  | 'delivered'         // Dostarczone
  | 'cancelled'         // Anulowane
  | 'refund_requested'  // Prośba o zwrot
  | 'refunded';         // Zwrócone

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Oczekujące',
  paid: 'Opłacone',
  processing: 'W realizacji',
  awaiting_info: 'Wymaga kontaktu',
  shipped: 'Wysłane',
  delivered: 'Dostarczone',
  cancelled: 'Anulowane',
  refund_requested: 'Prośba o zwrot',
  refunded: 'Zwrócone'
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  paid: 'bg-blue-500/20 text-blue-400',
  processing: 'bg-purple-500/20 text-purple-400',
  awaiting_info: 'bg-orange-500/20 text-orange-400',
  shipped: 'bg-cyan-500/20 text-cyan-400',
  delivered: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
  refund_requested: 'bg-amber-500/20 text-amber-400',
  refunded: 'bg-gray-500/20 text-gray-400'
};
