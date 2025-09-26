import { NeonDesign, PricingComponents, PowerSupplyTier, PriceBreakdown, ConfigurationState, SignConfiguration } from '../types/configurator';
import { optimizedMondayService } from '../services/optimizedMondayService';
import { discountService, PriceWithFakeDiscount } from '../services/discountService';

// Real pricing system using Monday.com data with smart caching
let cachedPricing: PricingComponents | null = null;
let lastPricingUpdate = 0;
const PRICING_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for pricing cache

// Comprehensive pricing system using real Monday.com data
export const getRealPricing = async (): Promise<PricingComponents> => {
  try {
    // Check if we have fresh cached pricing
    const now = Date.now();
    if (cachedPricing && (now - lastPricingUpdate) < PRICING_CACHE_DURATION) {
      return cachedPricing;
    }

    const prices = await optimizedMondayService.getAllPrices();
    
    const pricing: PricingComponents = {
      acrylglas: 45, // Fixed price for acrylglas per m²
      led: 8, // Fixed price for LED per meter
      controller: prices.get('controller')?.value || 25,
      uvPrint: prices.get('uv_print')?.value || 50,
      packaging: 8, // Fixed packaging cost per m²
      elementCost: 25, // Fixed element cost
    };

    // Cache the pricing
    cachedPricing = pricing;
    lastPricingUpdate = now;
    
    return pricing;
  } catch (error) {
    console.warn('Using fallback pricing due to error:', error);
    const fallback: PricingComponents = {
      acrylglas: 45,
      led: 8,
      controller: 25,
      uvPrint: 50,
      packaging: 8,
      elementCost: 25,
    };
    
    cachedPricing = fallback;
    lastPricingUpdate = Date.now();
    return fallback;
  }
};

// Synchronous version for immediate use (uses cached data)
export const getRealPricingSync = (): PricingComponents => {
  if (cachedPricing) {
    return cachedPricing;
  }
  
  // Initialize pricing asynchronously
  getRealPricing().catch(console.warn);
  
  // Return fallback for immediate use
  return {
    acrylglas: 45,
    led: 8,
    controller: 25,
    uvPrint: 50,
    packaging: 8,
    elementCost: 25,
  };
};

// Power supply tiers
export const POWER_SUPPLY_TIERS: PowerSupplyTier[] = [
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

// Company location for distance calculation
export const COMPANY_LOCATION = {
  postalCode: '67433',
  city: 'Neustadt',
};

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
  originalLedLength: number,
  originalWidth: number,
  newWidth: number
): number {
  const scale = newWidth / originalWidth;
  return Math.round(originalLedLength * scale * 10) / 10;
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
 * Real single sign price calculation using Monday.com data
 */
export async function calculateRealSingleSignPrice(
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
    const pricing = await getRealPricing();
    const prices = await optimizedMondayService.getAllPrices();
    
    // Basic calculations
    const areaM2 = calculateArea(customWidth, customHeight);
    const proportionalLedLength = calculateProportionalLedLength(
      design.ledLength,
      design.originalWidth,
      customWidth
    );
    const powerConsumption = calculatePowerConsumption(proportionalLedLength);

    // Base costs using real pricing
    const acrylglas = areaM2 * pricing.acrylglas;
    const uvPrint = hasUvPrint ? areaM2 * pricing.uvPrint : 0;
    const led = proportionalLedLength * pricing.led;
    const elements = design.elements * pricing.elementCost;
    const packaging = areaM2 * pricing.packaging;
    const controller = getPowerSupplyPrice(powerConsumption);
    
    // Additional costs
    const hangingSystem = hasHangingSystem ? (prices.get('hanging_system')?.value || 35) : 0;
    
    // Base subtotal
    const baseSubtotal = acrylglas + uvPrint + led + elements + packaging + controller;
    
    // Labor cost calculation (using cached prices)
    const timePerM2 = prices.get('zeit_pro_m²')?.value || 0.9;
    const timePerElement = prices.get('zeit_pro_element')?.value || 0.08;
    const hourlyWage = 35; // Fixed hourly wage
    const laborCost = (areaM2 * timePerM2 + design.elements * timePerElement) * hourlyWage;

    // Calculate surcharges using Monday.com rates
    const waterproofSurcharge = isWaterproof ? baseSubtotal * ((prices.get('wasserdichtigkeit')?.value || 25) / 100) : 0;
    const twoPartSurcharge = isTwoPart ? baseSubtotal * ((prices.get('mehrteilig')?.value || 15) / 100) : 0;
    const expressProductionSurcharge = expressProduction ? baseSubtotal * 0.30 : 0; // 30% for express
    const adminCosts = baseSubtotal * ((prices.get('verwaltungskosten')?.value || 30) / 100);

    const total = baseSubtotal + laborCost + hangingSystem + waterproofSurcharge + 
                  twoPartSurcharge + expressProductionSurcharge + adminCosts;

    return Math.round(total * 100) / 100;
  } catch (error) {
    console.warn('Error calculating real price:', error);
    // Fallback to basic calculation
    return calculateBasicPrice(design, customWidth, customHeight, isWaterproof, isTwoPart, hasUvPrint, hasHangingSystem);
  }
}

/**
 * Synchronous version using cached pricing
 */
export function calculateRealSingleSignPriceSync(
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

  const pricing = getRealPricingSync();
  
  // Basic calculations
  const areaM2 = calculateArea(customWidth, customHeight);
  const proportionalLedLength = calculateProportionalLedLength(
    design.ledLength,
    design.originalWidth,
    customWidth
  );
  const powerConsumption = calculatePowerConsumption(proportionalLedLength);

  // Base costs
  const acrylglas = areaM2 * pricing.acrylglas;
  const uvPrint = hasUvPrint ? areaM2 * pricing.uvPrint : 0;
  const led = proportionalLedLength * pricing.led;
  const elements = design.elements * pricing.elementCost;
  const packaging = areaM2 * pricing.packaging;
  const controller = getPowerSupplyPrice(powerConsumption);
  
  // Additional costs (using fallback values)
  const hangingSystem = hasHangingSystem ? 35 : 0;
  
  // Base subtotal
  const baseSubtotal = acrylglas + uvPrint + led + elements + packaging + controller;
  
  // Labor cost (using fallback values)
  const laborCost = (areaM2 * 0.9 + design.elements * 0.08) * 35;

  // Surcharges (using fallback percentages)
  const waterproofSurcharge = isWaterproof ? baseSubtotal * 0.25 : 0;
  const twoPartSurcharge = isTwoPart ? baseSubtotal * 0.15 : 0;
  const expressProductionSurcharge = expressProduction ? baseSubtotal * 0.30 : 0;
  const adminCosts = baseSubtotal * 0.30;

  const total = baseSubtotal + laborCost + hangingSystem + waterproofSurcharge + 
                twoPartSurcharge + expressProductionSurcharge + adminCosts;

  return Math.round(total * 100) / 100;
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

// ===========================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С ФИКТИВНЫМИ СКИДКАМИ
// ===========================================

/**
 * Расчет цены с применением фиктивных скидок (асинхронная версия)
 */
export async function calculatePriceWithFakeDiscount(
  design: NeonDesign | null,
  customWidth: number,
  customHeight: number,
  isWaterproof: boolean = false,
  isTwoPart: boolean = false,
  hasUvPrint: boolean = false,
  hasHangingSystem: boolean = false,
  expressProduction: boolean = false
): Promise<PriceWithFakeDiscount> {
  // Рассчитываем реальную цену (та что мы хотим получить в итоге)
  const realPrice = await calculateRealSingleSignPrice(
    design, 
    customWidth, 
    customHeight, 
    isWaterproof, 
    isTwoPart, 
    hasUvPrint, 
    hasHangingSystem, 
    expressProduction
  );

  // Применяем фиктивную скидку через сервис скидок
  return discountService.calculateFakeDiscountPrice(realPrice);
}

/**
 * Расчет цены с применением фиктивных скидок (синхронная версия)
 */
export function calculatePriceWithFakeDiscountSync(
  design: NeonDesign | null,
  customWidth: number,
  customHeight: number,
  isWaterproof: boolean = false,
  isTwoPart: boolean = false,
  hasUvPrint: boolean = false,
  hasHangingSystem: boolean = false,
  expressProduction: boolean = false
): PriceWithFakeDiscount {
  // Рассчитываем реальную цену (та что мы хотим получить в итоге)
  const realPrice = calculateRealSingleSignPriceSync(
    design, 
    customWidth, 
    customHeight, 
    isWaterproof, 
    isTwoPart, 
    hasUvPrint, 
    hasHangingSystem, 
    expressProduction
  );

  // Применяем фиктивную скидку через сервис скидок
  return discountService.calculateFakeDiscountPrice(realPrice);
}

/**
 * Получает информацию о текущей скидке и оставшемся времени
 */
export function getCurrentDiscountInfo() {
  return {
    discount: discountService.getCurrentFakeDiscount(),
    timer: discountService.getDiscountTimer(),
    isActive: discountService.isFakeDiscountActive(),
  };
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

/**
 * Real shipping info calculation using Monday.com data
 */
export async function getRealShippingInfo(longestSideCm: number): Promise<{ 
  method: string; 
  price: number; 
  category: string;
  maxSize: string;
}> {
  try {
    const prices = await optimizedMondayService.getAllPrices();
    
    if (longestSideCm <= 20) {
      return {
        method: 'DHL Paket S',
        price: prices.get('dhl_klein_20cm')?.value || 7.49,
        category: 'dhl_small',
        maxSize: 'bis 20cm'
      };
    } else if (longestSideCm <= 60) {
      return {
        method: 'DHL Paket M',
        price: prices.get('dhl_mittel_60cm')?.value || 12.99,
        category: 'dhl_medium',
        maxSize: 'bis 60cm'
      };
    } else if (longestSideCm <= 100) {
      return {
        method: 'DHL Paket L',
        price: prices.get('dhl_gross_100cm')?.value || 19.99,
        category: 'dhl_large',
        maxSize: 'bis 100cm'
      };
    } else if (longestSideCm <= 120) {
      return {
        method: 'Spedition',
        price: prices.get('spedition_120cm')?.value || 45.00,
        category: 'freight_small',
        maxSize: 'bis 120cm'
      };
    } else {
      return {
        method: 'Gütertransport',
        price: prices.get('gutertransport_240cm')?.value || 89.00,
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

// Initialize pricing on module load
getRealPricing().catch(console.warn);
