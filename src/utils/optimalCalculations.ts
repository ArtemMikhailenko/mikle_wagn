import { NeonDesign, SignConfiguration } from '../types/configurator';
import { finalPricingService } from '../services/finalPricingService';

// Power supply tiers
export const POWER_SUPPLY_TIERS = [
  { minWatt: 0, maxWatt: 30, price: 8 },
  { minWatt: 31, maxWatt: 60, price: 15 },
  { minWatt: 61, maxWatt: 100, price: 25 },
  { minWatt: 101, maxWatt: 150, price: 35 },
  { minWatt: 151, maxWatt: 200, price: 50 },
  { minWatt: 201, maxWatt: 300, price: 75 },
  { minWatt: 301, maxWatt: 500, price: 120 },
  { minWatt: 501, maxWatt: 750, price: 160 },
  { minWatt: 751, maxWatt: 1000, price: 200 },
];

/**
 * Calculate proportional height based on original design ratio
 */
export function calculateProportionalHeight(
  originalWidth: number,
  originalHeight: number,
  newWidth: number
): number {
  const ratio = originalHeight / originalWidth;
  return Math.round(newWidth * ratio);
}

/**
 * Calculate proportional LED length based on size scaling
 */
export function calculateProportionalLedLength(
  originalWidth: number,
  originalHeight: number,
  originalLedLength: number,
  newWidth: number,
  newHeight: number
): number {
  // Calculate scaling factor based on perimeter
  const originalPerimeter = 2 * (originalWidth + originalHeight);
  const newPerimeter = 2 * (newWidth + newHeight);
  const scalingFactor = newPerimeter / originalPerimeter;
  
  return Math.round(originalLedLength * scalingFactor * 10) / 10;
}

/**
 * Calculate power consumption based on LED length
 */
export function calculatePowerConsumption(ledLength: number): number {
  // Power consumption: 12W per meter of LED
  return Math.round(ledLength * 12);
}

/**
 * Get power supply price based on wattage
 */
export function getPowerSupplyPrice(wattage: number): number {
  const tier = POWER_SUPPLY_TIERS.find(
    (tier) => wattage >= tier.minWatt && wattage <= tier.maxWatt
  );
  return tier ? tier.price : POWER_SUPPLY_TIERS[POWER_SUPPLY_TIERS.length - 1].price;
}

/**
 * Calculate area in square meters
 */
export function calculateArea(width: number, height: number): number {
  return (width * height) / 10000; // Convert cm² to m²
}

/**
 * Optimal single sign price calculation using Supabase cached prices
 */
export async function calculateOptimalSignPrice(
  design: NeonDesign | null,
  customWidth: number,
  customHeight: number,
  isWaterproof: boolean = false,
  isTwoPart: boolean = false,
  hasUvPrint: boolean = false,
  hasHangingSystem: boolean = false,
  expressProduction: boolean = false
): Promise<number> {
  if (!design) return 0;

  try {
    const pricing = await finalPricingService.getPricingComponents();
    
    // Basic calculations
    const areaM2 = calculateArea(customWidth, customHeight);
    const proportionalLedLength = calculateProportionalLedLength(
      design.originalWidth,
      design.originalHeight,
      design.ledLength,
      customWidth,
      customHeight
    );
    const powerConsumption = calculatePowerConsumption(proportionalLedLength);

    // Base costs using cached pricing
    const acrylglas = areaM2 * pricing.acrylglas;
    const uvPrint = hasUvPrint ? areaM2 * pricing.uvPrint : 0;
    const led = proportionalLedLength * pricing.led;
    const elements = design.elements * pricing.elementCost;
    const packaging = areaM2 * pricing.packaging;
    const controller = getPowerSupplyPrice(powerConsumption);
    
    // Additional costs
    const hangingSystem = hasHangingSystem ? pricing.hangingSystem : 0;
    
    // Base subtotal
    const baseSubtotal = acrylglas + uvPrint + led + elements + packaging + controller;
    
    // Labor cost calculation (using cached prices)
    const timePerM2 = 0.9; // Default value
    const timePerElement = 0.08; // Default value
    const hourlyWage = 35; // Default value
    const laborCost = (areaM2 * timePerM2 + design.elements * timePerElement) * hourlyWage;

    // Calculate surcharges using cached rates
    const waterproofSurcharge = isWaterproof ? baseSubtotal * pricing.waterproofSurcharge : 0;
    const twoPartSurcharge = isTwoPart ? baseSubtotal * pricing.multiPartSurcharge : 0;
    const expressProductionSurcharge = expressProduction ? baseSubtotal * 0.30 : 0; // 30% for express
    const adminCosts = baseSubtotal * pricing.adminCosts;

    const total = baseSubtotal + laborCost + hangingSystem + waterproofSurcharge + 
                  twoPartSurcharge + expressProductionSurcharge + adminCosts;

    return Math.round(total * 100) / 100;
  } catch (error) {
    console.warn('Error calculating optimal price:', error);
    // Fallback to basic calculation
    return calculateBasicPrice(design, customWidth, customHeight, isWaterproof, isTwoPart, hasUvPrint, hasHangingSystem);
  }
}

/**
 * Synchronous version using cached pricing (for immediate display)
 */
export function calculateOptimalSignPriceSync(
  design: NeonDesign | null,
  customWidth: number,
  customHeight: number,
  isWaterproof: boolean = false,
  isTwoPart: boolean = false,
  hasUvPrint: boolean = false,
  hasHangingSystem: boolean = false,
  expressProduction: boolean = false
): number {
  if (!design) return 0;

  // Use the status to get cached pricing components if available
  const status = finalPricingService.getStatus();
  if (!status.isConnected) {
    return calculateBasicPrice(design, customWidth, customHeight, isWaterproof, isTwoPart, hasUvPrint, hasHangingSystem);
  }

  // Basic calculations with fallback values
  const areaM2 = calculateArea(customWidth, customHeight);
  const proportionalLedLength = calculateProportionalLedLength(
    design.originalWidth,
    design.originalHeight,
    design.ledLength,
    customWidth,
    customHeight
  );
  const powerConsumption = calculatePowerConsumption(proportionalLedLength);

  // Base costs (using reasonable defaults)
  const acrylglas = areaM2 * 45;
  const uvPrint = hasUvPrint ? areaM2 * 50 : 0;
  const led = proportionalLedLength * 8;
  const elements = design.elements * 25;
  const packaging = areaM2 * 8;
  const controller = getPowerSupplyPrice(powerConsumption);
  
  // Additional costs
  const hangingSystem = hasHangingSystem ? 35 : 0;
  
  // Base subtotal
  const baseSubtotal = acrylglas + uvPrint + led + elements + packaging + controller;
  
  // Labor cost
  const laborCost = (areaM2 * 0.9 + design.elements * 0.08) * 35;

  // Surcharges
  const waterproofSurcharge = isWaterproof ? baseSubtotal * 0.25 : 0;
  const twoPartSurcharge = isTwoPart ? baseSubtotal * 0.15 : 0;
  const expressProductionSurcharge = expressProduction ? baseSubtotal * 0.30 : 0;
  const adminCosts = baseSubtotal * 0.30;

  const total = baseSubtotal + laborCost + hangingSystem + waterproofSurcharge + 
                twoPartSurcharge + expressProductionSurcharge + adminCosts;

  return Math.round(total * 100) / 100;
}

/**
 * Get shipping info using cached prices
 */
export async function getOptimalShippingInfo(longestSideCm: number): Promise<{ 
  method: string; 
  price: number; 
  category: string;
  maxSize: string;
}> {
  try {
    const shippingPrices = await finalPricingService.getShippingPrices();
    
    if (longestSideCm <= 20) {
      return {
        method: 'DHL Paket S',
        price: shippingPrices.dhl_klein,
        category: 'dhl_small',
        maxSize: 'bis 20cm'
      };
    } else if (longestSideCm <= 60) {
      return {
        method: 'DHL Paket M',
        price: shippingPrices.dhl_mittel,
        category: 'dhl_medium',
        maxSize: 'bis 60cm'
      };
    } else if (longestSideCm <= 100) {
      return {
        method: 'DHL Paket L',
        price: shippingPrices.dhl_gross,
        category: 'dhl_large',
        maxSize: 'bis 100cm'
      };
    } else if (longestSideCm <= 120) {
      return {
        method: 'Spedition',
        price: shippingPrices.spedition,
        category: 'freight_small',
        maxSize: 'bis 120cm'
      };
    } else {
      return {
        method: 'Gütertransport',
        price: shippingPrices.gutertransport,
        category: 'freight_large',
        maxSize: 'bis 240cm'
      };
    }
  } catch (error) {
    console.warn('Error getting shipping info:', error);
    // Fallback shipping info
    if (longestSideCm <= 20) return { method: 'DHL Paket S', price: 7.49, category: 'dhl_small', maxSize: 'bis 20cm' };
    if (longestSideCm <= 60) return { method: 'DHL Paket M', price: 12.99, category: 'dhl_medium', maxSize: 'bis 60cm' };
    if (longestSideCm <= 100) return { method: 'DHL Paket L', price: 19.99, category: 'dhl_large', maxSize: 'bis 100cm' };
    if (longestSideCm <= 120) return { method: 'Spedition', price: 45.00, category: 'freight_small', maxSize: 'bis 120cm' };
    return { method: 'Gütertransport', price: 89.00, category: 'freight_large', maxSize: 'bis 240cm' };
  }
}

/**
 * Basic fallback price calculation
 */
function calculateBasicPrice(
  design: NeonDesign,
  customWidth: number,
  customHeight: number,
  isWaterproof: boolean,
  isTwoPart: boolean,
  hasUvPrint: boolean,
  hasHangingSystem: boolean
): number {
  const areaM2 = calculateArea(customWidth, customHeight);
  const basePrice = areaM2 * 200; // Basic price per m²
  
  let total = basePrice;
  if (isWaterproof) total *= 1.25;
  if (isTwoPart) total *= 1.15;
  if (hasUvPrint) total += areaM2 * 50;
  if (hasHangingSystem) total += 35;
  
  return Math.round(total * 100) / 100;
}

/**
 * Get largest sign dimensions from an array of signs
 */
export function getLargestSignDimensions(signs: SignConfiguration[]): { width: number; height: number } {
  if (!signs || signs.length === 0) {
    return { width: 0, height: 0 };
  }

  return signs.reduce(
    (largest, sign) => ({
      width: Math.max(largest.width, sign.width),
      height: Math.max(largest.height, sign.height),
    }),
    { width: 0, height: 0 }
  );
}

// Initialize pricing service
finalPricingService.initialize().catch(console.warn);
