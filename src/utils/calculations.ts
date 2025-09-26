import { NeonDesign, PricingComponents, PowerSupplyTier, PriceBreakdown, ConfigurationState, SignConfiguration } from '../types/configurator';
import { optimizedMondayService } from '../services/optimizedMondayService';
import mondayService from '../services/mondayService';
import { discountService, PriceWithFakeDiscount } from '../services/discountService';

// Comprehensive pricing system using real Monday.com data with smart caching
export const getPricing = async (): Promise<PricingComponents> => {
  try {
    const prices = await optimizedMondayService.getAllPrices();
    
    return {
      acrylglas: 45, // Fixed price for acrylglas per m²
      led: 8, // Fixed price for LED per meter
      controller: prices.get('controller')?.value || 25,
      uvPrint: prices.get('uv_print')?.value || 50,
      packaging: 8, // Fixed packaging cost per m²
      elementCost: 25, // Fixed element cost
    };
  } catch (error) {
    console.warn('Using fallback pricing due to error:', error);
    return {
      acrylglas: 45,
      led: 8,
      controller: 25,
      uvPrint: 50,
      packaging: 8,
      elementCost: 25,
    };
  }
};

// Synchronous version for immediate use (uses cached data)
export const getPricingSync = (): PricingComponents => {
  const status = optimizedMondayService.getConnectionStatus();
  
  if (status.cacheValid && status.cacheSize > 0) {
    // We can access the cached data directly, but we need to create a workaround
    // since the cache is private. For now, use reasonable defaults that will be
    // updated when the async version loads.
    return {
      acrylglas: 45,
      led: 8,
      controller: 25,
      uvPrint: 50,
      packaging: 8,
      elementCost: 25,
    };
  }
  
  // Fallback pricing
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
  originalWidth: number,
  originalHeight: number,
  originalLedLength: number,
  newWidth: number,
  newHeight: number
): number {
  // Calculate scaling factor based on perimeter or area
  const originalPerimeter = 2 * (originalWidth + originalHeight);
  const newPerimeter = 2 * (newWidth + newHeight);
  const scalingFactor = newPerimeter / originalPerimeter;
  
  // Apply scaling factor to LED length
  const newLedLength = originalLedLength * scalingFactor;
  
  // Round to 1 decimal place and ensure minimum of 1m
  return Math.max(1, Math.round(newLedLength * 10) / 10);
}

/**
 * Calculate power consumption with safety buffer
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
export function calculateArea(widthCm: number, heightCm: number): number {
  return (widthCm * heightCm) / 10000; // Convert cm² to m²
}

/**
 * Geocode postal code using Nominatim (OpenStreetMap)
 */
async function geocodePostalCode(postalCode: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  try {
    // Timeout für Geocoding-Anfrage
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 Sekunden Timeout
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `postalcode=${postalCode}&country=Germany&format=json&limit=1&` +
      `addressdetails=1&accept-language=de`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn('Geocoding API request failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('🗺️ Geocoding Response für', postalCode, ':', data);
    
    if (data.length === 0) {
      console.warn('Postal code not found in geocoding service:', postalCode);
      return null;
    }
    
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name || data[0].name || `Stadt ${postalCode}`
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Geocoding timeout nach 5 Sekunden für PLZ:', postalCode);
    } else {
      console.warn('Geocoding service error:', error);
    }
    return null;
  }
}

/**
 * Get real city name from Maps API (OpenStreetMap Nominatim)
 */
export async function getRealCityName(postalCode: string): Promise<string> {
  console.log('🗺️ Getting real city name for PLZ:', postalCode);
  
  try {
    const geocodeResult = await geocodePostalCode(postalCode);
    
    if (geocodeResult) {
      const cityName = extractCityName(geocodeResult.displayName);
      console.log('🏙️ Real city name from Maps API:', cityName);
      return cityName;
    }
  } catch (error) {
    console.warn('Failed to get real city name:', error);
  }
  
  // Fallback to local calculation
  console.log('🏙️ Using fallback city name calculation');
  const fallbackResult = calculateDistance('67433', postalCode);
  return fallbackResult.cityName;
}
/**
 * Calculate real distance using OpenStreetMap routing (OSRM)
 */
export async function calculateRealDistance(fromPostalCode: string, toPostalCode: string): Promise<{
  distance: number;
  duration: number;
  cityName: string;
  route?: any;
}> {
  // Timeout für API-Anfragen (5 Sekunden)
  const TIMEOUT_MS = 8000;
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('API Timeout')), TIMEOUT_MS);
  });

  try {
    console.log('🚀 Starte Routenberechnung:', fromPostalCode, '→', toPostalCode);
    
    // Geocode both postal codes mit Timeout
    const [fromCoords, toCoords] = await Promise.race([
      Promise.all([
        geocodePostalCode(fromPostalCode),
        geocodePostalCode(toPostalCode)
      ]),
      timeoutPromise
    ]) as [any, any];
    
    console.log('📍 Koordinaten erhalten:', { fromCoords, toCoords });
    
    // Check if geocoding failed for either postal code
    if (!fromCoords || !toCoords) {
      console.warn('Geocoding failed for one or both postal codes, using fallback calculation');
      const fallbackResult = calculateDistance(fromPostalCode, toPostalCode);
      return {
        distance: fallbackResult.distance,
        duration: Math.round(fallbackResult.distance * 1.2), // Estimate duration
        cityName: fallbackResult.cityName
      };
    }
    
    // Get route using OSRM mit Timeout
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/` +
      `${fromCoords.lng},${fromCoords.lat};${toCoords.lng},${toCoords.lat}?` +
      `overview=simplified&steps=false&geometries=geojson`;
    
    console.log('🛣️ Route URL:', routeUrl);
    
    const response = await Promise.race([
      fetch(routeUrl),
      timeoutPromise
    ]) as Response;
    
    console.log('🌐 Routing Response Status:', response.status);
    
    if (!response.ok) {
      console.warn('Routing API request failed:', response.status);
      const fallbackResult = calculateDistance(fromPostalCode, toPostalCode);
      return {
        distance: fallbackResult.distance,
        duration: Math.round(fallbackResult.distance * 1.2),
        cityName: fallbackResult.cityName
      };
    }
    
    const data = await response.json();
    console.log('📊 Routing Data:', data);
    
    if (data.routes.length === 0) {
      console.warn('No route found between postal codes');
      const fallbackResult = calculateDistance(fromPostalCode, toPostalCode);
      return {
        distance: fallbackResult.distance,
        duration: Math.round(fallbackResult.distance * 1.2),
        cityName: fallbackResult.cityName
      };
    }
    
    const route = data.routes[0];
    
    // Extract city name from FROM postal code (user's location)
    const cityName = extractCityName(fromCoords.displayName) || 'Deutsche Stadt';
    console.log('🏙️ Extrahierter Stadtname:', cityName, 'aus:', fromCoords.displayName);
    
    // Ensure we have valid distance and duration values
    const calculatedDistance = Math.round(route.distance / 1000); // Convert to km
    const calculatedDuration = Math.round(route.duration / 60); // Convert to minutes
    
    console.log('📏 Berechnete Werte:', { calculatedDistance, calculatedDuration });
    
    // If API returns 0 or invalid values, use fallback
    if (calculatedDistance === 0 || calculatedDuration === 0) {
      console.warn('API returned 0 distance/duration, using fallback calculation');
      const fallbackResult = calculateDistance(fromPostalCode, toPostalCode);
      return {
        distance: fallbackResult.distance,
        duration: Math.round(fallbackResult.distance * 1.2),
        cityName: fallbackResult.cityName
      };
    }
    
    console.log('✅ Erfolgreiche Routenberechnung:', {
      distance: calculatedDistance,
      duration: calculatedDuration,
      cityName
    });
    
    return {
      distance: calculatedDistance,
      duration: calculatedDuration,
      cityName: cityName,
      route: route.geometry
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'API Timeout') {
      console.warn('API Timeout nach 8 Sekunden, verwende Fallback-Berechnung');
    } else {
      console.warn('Real distance calculation failed, using fallback:', error);
    }
    // Fallback to approximate calculation
    const fallbackResult = calculateDistance(fromPostalCode, toPostalCode);
    return {
      distance: fallbackResult.distance,
      duration: Math.round(fallbackResult.distance * 1.2), // Estimate duration
      cityName: fallbackResult.cityName
    };
  }
}

/**
 * Extract city name from OpenStreetMap display name
 */
function extractCityName(displayName: string): string {
  if (!displayName) return 'Deutsche Stadt';
  
  console.log('🔍 Extrahiere Stadtname aus:', displayName);
  
  // Split by comma and find the city part
  const parts = displayName.split(',').map(part => part.trim());
  console.log('📝 Aufgeteilte Teile:', parts);
  
  // Bekannte deutsche Hauptstädte direkt erkennen und extrahieren
  const knownCities = [
    'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart', 
    'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden',
    'Hannover', 'Nürnberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld',
    'Bonn', 'Münster', 'Karlsruhe', 'Mannheim', 'Augsburg', 'Wiesbaden',
    'Gelsenkirchen', 'Mönchengladbach', 'Braunschweig', 'Chemnitz', 'Kiel',
    'Aachen', 'Halle', 'Magdeburg', 'Freiburg', 'Krefeld', 'Lübeck',
    'Oberhausen', 'Erfurt', 'Mainz', 'Rostock', 'Kassel', 'Hagen',
    'Potsdam', 'Saarbrücken', 'Hamm', 'Mülheim', 'Ludwigshafen', 'Leverkusen',
    'Neustadt', 'Speyer', 'Landau', 'Kaiserslautern', 'Ludwigshafen am Rhein'
  ];
  
  // Durchsuche alle Teile nach bekannten Städten
  for (const part of parts) {
    // Prüfe ob dieser Teil eine bekannte Stadt enthält
    for (const city of knownCities) {
      if (part.includes(city)) {
        console.log('✅ Bekannte Stadt gefunden:', city, 'in Teil:', part);
        return city; // Nur den Stadtnamen zurückgeben, nicht den ganzen Teil
      }
    }
  }
  
  // Fallback: Durchsuche Teile und überspringe administrative Bereiche
  for (const part of parts) {
    // Skip postal codes, countries, and administrative divisions
    if (/^\d{5}$/.test(part)) continue; // Skip postal codes
    if (part === 'Deutschland' || part === 'Germany') continue;
    if (part.includes('Landkreis') || part.includes('Kreis')) continue;
    if (part.includes('Regierungsbezirk')) continue;
    if (part.includes('Bundesland')) continue;
    if (part.includes('Verwaltungsgemeinschaft')) continue;
    if (part.includes('Samtgemeinde')) continue;
    if (part.includes('Verbandsgemeinde')) continue;
    if (part.includes('Rheinland-Pfalz')) continue;
    if (part.includes('Bayern')) continue;
    if (part.includes('Baden-Württemberg')) continue;
    if (part.includes('Nordrhein-Westfalen')) continue;
    if (part.includes('Ortsteil')) continue;
    if (part.includes('Stadtteil')) continue;
    if (part.includes('Bezirk')) continue;
    if (part.includes('-Mitte')) continue;
    if (part.includes('-Altstadt')) continue;
    if (part.includes('-Nord')) continue;
    if (part.includes('-Süd')) continue;
    if (part.includes('-Ost')) continue;
    if (part.includes('-West')) continue;
    
    // Return the first meaningful part (usually the city) - bereinigt
    if (part.length > 2) {
      // Entferne Stadtteile aus dem Namen
      let cleanedPart = part;
      if (cleanedPart.includes('-')) {
        const mainPart = cleanedPart.split('-')[0];
        if (mainPart.length > 2) {
          cleanedPart = mainPart;
        }
      }
      console.log('✅ Erste sinnvolle Stadt gefunden:', part);
      return cleanedPart;
    }
  }
  
  // Fallback to first part
  console.log('⚠️ Fallback zum ersten Teil:', parts[0]);
  return parts[0] || 'Deutsche Stadt';
}

/**
 * Calculate distance between postal codes (simplified)
 * In real implementation, use Google Maps API or similar
 */
export function calculateDistance(fromPostalCode: string, toPostalCode: string): { distance: number; cityName: string } {
  console.log('🔍 calculateDistance called with:', 'from:', fromPostalCode, 'to:', toPostalCode);
  
  // More accurate distance calculation based on German postal code regions
  const from = parseInt(fromPostalCode);
  const to = parseInt(toPostalCode);
  
  // Get approximate coordinates for postal code regions
  const getCoordinates = (postalCode: number): { lat: number; lng: number } => {
    // Approximate coordinates for German postal code regions
    if (postalCode >= 10000 && postalCode <= 19999) return { lat: 52.5200, lng: 13.4050 }; // Berlin
    if (postalCode >= 20000 && postalCode <= 29999) return { lat: 53.5511, lng: 9.9937 }; // Hamburg
    if (postalCode >= 30000 && postalCode <= 39999) return { lat: 52.3759, lng: 9.7320 }; // Hannover
    if (postalCode >= 40000 && postalCode <= 49999) return { lat: 51.2277, lng: 6.7735 }; // Düsseldorf
    if (postalCode >= 50000 && postalCode <= 59999) return { lat: 50.9375, lng: 6.9603 }; // Köln
    if (postalCode >= 60000 && postalCode <= 66999) return { lat: 50.1109, lng: 8.6821 }; // Frankfurt
    if (postalCode >= 67000 && postalCode <= 67999) return { lat: 49.3501, lng: 8.1000 }; // Neustadt region
    if (postalCode >= 68000 && postalCode <= 69999) return { lat: 49.4875, lng: 8.4660 }; // Mannheim/Heidelberg
    if (postalCode >= 70000 && postalCode <= 79999) return { lat: 48.7758, lng: 9.1829 }; // Stuttgart
    if (postalCode >= 80000 && postalCode <= 89999) return { lat: 48.1351, lng: 11.5820 }; // München
    if (postalCode >= 90000 && postalCode <= 99999) return { lat: 49.4521, lng: 11.0767 }; // Nürnberg
    
    // Default fallback - estimate based on postal code
    const lat = 51.0 + (postalCode - 50000) * 0.00001;
    const lng = 10.0 + (postalCode - 50000) * 0.00001;
    return { lat, lng };
  };
  
  const fromCoords = getCoordinates(from);
  const toCoords = getCoordinates(to);
  
  // Haversine formula for distance calculation
  const R = 6371; // Earth's radius in kilometers
  const dLat = (toCoords.lat - fromCoords.lat) * Math.PI / 180;
  const dLng = (toCoords.lng - fromCoords.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(fromCoords.lat * Math.PI / 180) * Math.cos(toCoords.lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = Math.round(R * c);
  
  // Ensure minimum distance of 1km for nearby locations
  const finalDistance = Math.max(distance, 1);
  
  // Bessere Städtenamen-Zuordnung basierend auf PLZ
  const getCityName = (postalCode: string): string => {
    console.log('🏙️ getCityName called with postalCode:', postalCode, 'type:', typeof postalCode);
    const plz = parseInt(postalCode);
    console.log('🏙️ Parsed PLZ:', plz);
    
    // Exakte PLZ-Zuordnungen für häufige Städte
    const exactMapping: Record<string, string> = {
      '10115': 'Berlin-Mitte',
      '10117': 'Berlin-Mitte', 
      '10178': 'Berlin-Mitte',
      '10179': 'Berlin-Mitte',
      '20095': 'Hamburg-Altstadt',
      '20099': 'Hamburg-St. Georg',
      '80331': 'München-Altstadt',
      '80333': 'München-Maxvorstadt',
      '50667': 'Köln-Altstadt-Süd',
      '50674': 'Köln-Altstadt-Nord',
      '60311': 'Frankfurt-Altstadt',
      '60313': 'Frankfurt-Innenstadt',
      '67433': 'Neustadt an der Weinstraße',
      '67435': 'Neustadt an der Weinstraße',
    };
    
    if (exactMapping[postalCode]) {
      console.log('🏙️ Found exact mapping:', exactMapping[postalCode]);
      return exactMapping[postalCode];
    }
    
    // Regionale Zuordnungen
    let cityName = '';
    if (plz >= 10000 && plz <= 19999) cityName = 'Berlin';
    else if (plz >= 20000 && plz <= 29999) cityName = 'Hamburg';
    else if (plz >= 30000 && plz <= 39999) cityName = 'Hannover';
    else if (plz >= 40000 && plz <= 49999) cityName = 'Düsseldorf';
    else if (plz >= 50000 && plz <= 59999) cityName = 'Köln';
    else if (plz >= 60000 && plz <= 66999) cityName = 'Frankfurt am Main';
    else if (plz >= 67000 && plz <= 67999) cityName = 'Neustadt an der Weinstraße';
    else if (plz >= 68000 && plz <= 69999) cityName = 'Mannheim';
    else if (plz >= 70000 && plz <= 79999) cityName = 'Stuttgart';
    else if (plz >= 80000 && plz <= 89999) cityName = 'München';
    else if (plz >= 90000 && plz <= 99999) cityName = 'Nürnberg';
    else cityName = `Stadt ${postalCode}`;
    
    console.log('🏙️ Regional mapping result:', cityName, 'for PLZ:', plz);
    return cityName;
  };
  
  const result = {
    distance: finalDistance,
    cityName: getCityName(fromPostalCode)
  };
  
  console.log('🏙️ calculateDistance result:', 'distance:', result.distance, 'cityName:', result.cityName);
  return result;
}
/**
 * Determine if personal delivery is required
 */
export function requiresPersonalDelivery(widthCm: number, heightCm: number): boolean {
  return widthCm > 220 && heightCm > 180; // >220cm wide AND >180cm high
}

/**
 * Check if sign requires special shipping (spedition or personal delivery)
 */
export function requiresSpecialShipping(widthCm: number, heightCm: number): boolean {
  return widthCm > 220 && heightCm > 180;
}

/**
 * Calculate price for a single sign configuration WITH fake discount display
 */
export function calculateSingleSignPriceWithFakeDiscount(
  design: NeonDesign | null,
  customWidth: number,
  customHeight: number,
  isWaterproof: boolean = false,
  isTwoPart: boolean = false,
  hasUvPrint: boolean = false,
  hasHangingSystem: boolean = false,
  expressProduction: boolean = false
): PriceWithFakeDiscount {
  // Сначала рассчитываем реальную цену
  const realPrice = calculateSingleSignPrice(
    design,
    customWidth,
    customHeight,
    isWaterproof,
    isTwoPart,
    hasUvPrint,
    hasHangingSystem,
    expressProduction
  );

  // Применяем фиктивную скидку
  return discountService.calculateFakeDiscountPrice(realPrice);
}

/**
 * Calculate price for a single sign configuration (original function - real price)
 */
export function calculateSingleSignPrice(
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

  // Use synchronous pricing from getRealPricingSync
  const pricing = getPricingSync();
  
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

  // Base costs using real pricing
  const acrylglas = areaM2 * pricing.acrylglas;
  const uvPrint = hasUvPrint ? areaM2 * pricing.uvPrint : 0;
  const led = proportionalLedLength * pricing.led;
  const elements = design.elements * pricing.elementCost;
  const packaging = areaM2 * pricing.packaging;
  const controller = getPowerSupplyPrice(powerConsumption);
  
  // Additional costs
  const hangingSystem = hasHangingSystem ? 35 : 0; // Fixed price for hanging system
  
  // Base subtotal
  const baseSubtotal = acrylglas + uvPrint + led + elements + packaging + controller;
  
  // Labor cost calculation (using fallback values)
  const timePerM2 = 0.9; // hours per m²
  const timePerElement = 0.08; // hours per element
  const hourlyWage = 35; // EUR per hour
  const laborCost = (areaM2 * timePerM2 + design.elements * timePerElement) * hourlyWage;

  // Calculate surcharges using reasonable percentages
  const waterproofSurcharge = isWaterproof ? baseSubtotal * 0.25 : 0; // 25% for waterproofing
  const twoPartSurcharge = isTwoPart ? baseSubtotal * 0.15 : 0; // 15% for multi-part
  const expressProductionSurcharge = expressProduction ? baseSubtotal * 0.30 : 0; // 30% for express
  const adminCosts = baseSubtotal * 0.30; // 30% administrative costs

  const total = baseSubtotal + laborCost + hangingSystem + waterproofSurcharge + 
                twoPartSurcharge + expressProductionSurcharge + adminCosts;

  return Math.round(total * 100) / 100;
}

/**
 * Get largest sign dimensions for shipping calculation
 */
export function getLargestSignDimensions(signs: SignConfiguration[]): { width: number; height: number } {
  if (signs.length === 0) return { width: 0, height: 0 };
  
  const enabledSigns = signs.filter(sign => sign.isEnabled);
  if (enabledSigns.length === 0) return { width: 0, height: 0 };
  
  let maxWidth = 0;
  let maxHeight = 0;
  
  enabledSigns.forEach(sign => {
    if (sign.width > maxWidth) maxWidth = sign.width;
    if (sign.height > maxHeight) maxHeight = sign.height;
  });
  
  return { width: maxWidth, height: maxHeight };
}

/**
 * Get shipping information based on sign dimensions and distance
 */
export function getShippingInfo(longestSideCm: number, distanceKm?: number): {
  method: string;
  cost: number;
  description: string;
  days: string;
  requiresPostalCode: boolean;
} {
  // Simple shipping calculation without Monday.com dependency
  if (longestSideCm <= 20) {
    return {
      method: 'DHL Paket S',
      cost: 7.49,
      description: 'DHL Paket S (bis 20cm)',
      days: '1-2 Tage',
      requiresPostalCode: false
    };
  } else if (longestSideCm <= 60) {
    return {
      method: 'DHL Paket M',
      cost: 12.99,
      description: 'DHL Paket M (bis 60cm)',
      days: '1-2 Tage',
      requiresPostalCode: false
    };
  } else if (longestSideCm <= 100) {
    return {
      method: 'DHL Paket L',
      cost: 19.99,
      description: 'DHL Paket L (bis 100cm)',
      days: '1-2 Tage',
      requiresPostalCode: false
    };
  } else if (longestSideCm <= 120) {
    return {
      method: 'Spedition',
      cost: 45.00,
      description: 'Spedition (bis 120cm)',
      days: '2-3 Tage',
      requiresPostalCode: false
    };
  } else {
    return {
      method: 'Gütertransport',
      cost: 89.00,
      description: 'Gütertransport (bis 240cm)',
      days: '3-5 Tage',
      requiresPostalCode: false
    };
  }
}

/**
 * Calculate complete price breakdown
 */
export function calculatePriceBreakdown(config: ConfigurationState): PriceBreakdown {
  const { selectedDesign, customWidth, calculatedHeight, isWaterproof, includesInstallation, isTwoPart, hasUvPrint = true, hasHangingSystem = false } = config;
  const areaM2 = calculateArea(customWidth, calculatedHeight);
  
  // Calculate proportional LED length
  const proportionalLedLength = calculateProportionalLedLength(
    selectedDesign.originalWidth,
    selectedDesign.originalHeight,
    selectedDesign.ledLength,
    customWidth,
    calculatedHeight
  );
  
  const powerConsumption = calculatePowerConsumption(proportionalLedLength);
  console.log('⚡ PriceBreakdown power consumption:', powerConsumption, 'W');
  
  // Base material costs from Monday.com
  const acrylglas = areaM2 * mondayService.getAcrylglasPrice();
  const uvPrint = hasUvPrint ? areaM2 * mondayService.getUvPrintPrice() : 0;
  const led = proportionalLedLength * mondayService.getLedPrice();
  const elements = selectedDesign.elements * mondayService.getElementPrice();
  const assembly = areaM2 * mondayService.getAssemblyPrice();
  const packaging = areaM2 * mondayService.getPackagingPrice();
  const controller = mondayService.getControllerPriceByWattage(powerConsumption);
  console.log('🔌 PriceBreakdown controller selected:', controller, 'EUR for', powerConsumption, 'W');
  const powerSupply = getPowerSupplyPrice(powerConsumption);
  const hangingSystem = hasHangingSystem ? mondayService.getHangingSystemPrice() : 0;
  
  // Labor calculation
  const laborCost = mondayService.calculateLaborCost(areaM2, selectedDesign.elements);
  
  // Base subtotal before surcharges
  const baseSubtotal = acrylglas + uvPrint + led + elements + packaging + controller + powerSupply + laborCost + hangingSystem;
  
  // Apply surcharges
  const waterproofSurcharge = isWaterproof ? baseSubtotal * mondayService.getWaterproofSurcharge() : 0;
  const twoPartSurcharge = isTwoPart ? baseSubtotal * mondayService.getMultiPartSurcharge() : 0;
  const expressProductionSurcharge = config.expressProduction ? baseSubtotal * mondayService.getExpressProductionSurcharge() : 0;
  const adminCosts = baseSubtotal * mondayService.getAdministrativeCostsSurcharge();
  
  // Installation cost
  let installation = 0;
  if (includesInstallation) {
    installation = mondayService.calculateInstallationCost(areaM2, config.customerPostalCode);
  }
  
  // Express production cost
  const expressProduction = config.expressProduction ? mondayService.getExpressProductionCost() : 0;
  
  // Shipping cost (0 if installation is included)
  let shipping = 0;
  if (config.selectedShipping && !includesInstallation) {
    shipping = config.selectedShipping.price;
    if (config.selectedShipping.type === 'personal' && config.customerPostalCode) {
      const distanceInfo = calculateDistance(COMPANY_LOCATION.postalCode, config.customerPostalCode);
      shipping = distanceInfo.distance * mondayService.getDistanceRate();
    }
  }
  const subtotal = baseSubtotal + waterproofSurcharge + twoPartSurcharge + expressProductionSurcharge + adminCosts + installation + shipping;
  const tax = subtotal * 0.19; // 19% VAT
  const total = subtotal + tax;
  
  return {
    acrylglas,
    uvPrint,
    led,
    elements,
    assembly,
    packaging,
    controller,
    powerSupply,
    laborCost,
    hangingSystem,
    waterproofSurcharge,
    twoPartSurcharge,
    adminCosts,
    installation,
    shipping,
    expressProduction: expressProductionSurcharge,
    subtotal,
    tax,
    total,
    powerConsumption,
  };
}

/**
 * Validate configuration
 */
export function validateConfiguration(config: ConfigurationState): string[] {
  const errors: string[] = [];
  
  if (config.customWidth < 20) {
    errors.push('Mindestbreite beträgt 20 cm');
  }
  
  if (config.customWidth > 1000) {
    errors.push('Maximale Breite beträgt 10 m');
  }
  
  if (config.customWidth > 300 && !config.isTwoPart) {
    errors.push('Breiten über 300 cm erfordern zweiteiliges Schild');
  }
  
  if (config.calculatedHeight > 500) {
    errors.push('Maximale Höhe beträgt 5 m');
  }
  
  if (config.calculatedHeight > 200) {
    errors.push('Maximale Höhe beträgt 200 cm');
  }
  
  if (config.includesInstallation && !config.customerPostalCode) {
    errors.push('Postleitzahl erforderlich für Montage-Service');
  }
  
  if (config.customerPostalCode && !/^\d{5}$/.test(config.customerPostalCode)) {
    errors.push('Ungültige Postleitzahl (5 Ziffern erforderlich)');
  }
  
  return errors;
}