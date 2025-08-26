export interface NeonDesign {
  id: string;
  name: string;
  originalWidth: number; // in cm
  originalHeight: number; // in cm
  elements: number;
  ledLength: number; // in meters
  mockupUrl: string; // fallback image
  description: string;
  // SVG support
  svgContent?: string; // actual SVG content from CRM
  svgUrl?: string; // URL to SVG file
  hasCustomSvg?: boolean; // flag to indicate if SVG is available
  // Client link support
  expiresAt?: string; // expiration date for client links
  createdAt?: string; // creation date
}

export interface PricingComponents {
  acrylglas: number; // €/m²
  led: number; // €/m
  controller: number; // €/piece
  uvPrint: number; // €/m²
  packaging: number; // €/m²
  elementCost: number; // €/piece
}

export interface PowerSupplyTier {
  minWatt: number;
  maxWatt: number;
  price: number;
}

export interface ShippingOption {
  type: 'dhl' | 'spedition' | 'personal' | 'pickup';
  name: string;
  price: number;
  description: string;
  conditions?: string;
}

export interface ConfigurationState {
  selectedDesign: NeonDesign;
  customWidth: number; // in cm
  calculatedHeight: number; // in cm
  isWaterproof: boolean;
  isTwoPart?: boolean;
  hasUvPrint?: boolean;
  hasHangingSystem?: boolean;
  includesInstallation: boolean;
  expressProduction?: boolean;
  customerPostalCode: string;
  selectedShipping: ShippingOption | null;
  // Multi-sign functionality
  signs: SignConfiguration[];
  onConfigChange?: (updates: Partial<ConfigurationState>) => void;
  onShippingChange?: (shipping: ShippingOption | null) => void;
  onSignToggle?: (signId: string, enabled: boolean) => void;
  onRemoveSign?: (signId: string) => void;
}

export interface SignConfiguration {
  id: string;
  design: NeonDesign;
  width: number;
  height: number;
  isEnabled: boolean; // Toggle for price calculation
  isWaterproof: boolean;
  isTwoPart?: boolean;
  hasUvPrint?: boolean;
  hasHangingSystem?: boolean;
  expressProduction?: boolean;
  uploadedSvgContent?: string | null; // SVG загруженный для конкретного дизайна
}

export interface PriceBreakdown {
  acrylglas: number;
  uvPrint: number;
  led: number;
  elements: number;
  assembly: number;
  packaging: number;
  controller: number;
  powerSupply: number;
  laborCost: number;
  hangingSystem: number;
  waterproofSurcharge: number;
  twoPartSurcharge: number;
  adminCosts: number;
  installation: number;
  shipping: number;
  expressProduction: number;
  subtotal: number;
  tax: number;
  total: number;
  powerConsumption: number; // in watts
}