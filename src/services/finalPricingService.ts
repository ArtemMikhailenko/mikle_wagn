import { supabase } from '../lib/supabase';

interface PricingCacheItem {
  price_key: string;
  price_value: number;
  unit: string | null;
  last_updated: string;
}

class FinalPricingService {
  private cache: Map<string, PricingCacheItem> = new Map();
  private lastCacheLoad: Date | null = null;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Initialize and load prices from Supabase
   */
  async initialize(): Promise<void> {
    await this.loadPricesFromSupabase();
  }

  /**
   * Load prices from Supabase database
   */
  private async loadPricesFromSupabase(): Promise<void> {
    try {
      console.log('🔄 Loading prices from Supabase...');
      
      // Use simple query to avoid type issues
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/pricing_cache?select=price_key,price_value,unit,last_updated`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Update cache
      this.cache.clear();
      data.forEach((item: any) => {
        this.cache.set(item.price_key, {
          price_key: item.price_key,
          price_value: item.price_value,
          unit: item.unit,
          last_updated: item.last_updated
        });
      });

      this.lastCacheLoad = new Date();
      console.log('✅ Loaded', data.length, 'prices from Supabase');
      
    } catch (error) {
      console.error('❌ Error loading from Supabase:', error);
      this.loadFallbackPrices();
    }
  }

  /**
   * Get all prices with caching
   */
  async getAllPrices(): Promise<Map<string, PricingCacheItem>> {
    // Check if cache is valid
    if (this.isCacheValid()) {
      return this.cache;
    }

    // Reload from Supabase
    await this.loadPricesFromSupabase();
    return this.cache;
  }

  /**
   * Get specific price by key
   */
  async getPrice(key: string): Promise<number> {
    const prices = await this.getAllPrices();
    const item = prices.get(key);
    return item?.price_value || 0;
  }

  /**
   * Get pricing components for calculations
   */
  async getPricingComponents(): Promise<{
    acrylglas: number;
    led: number;
    controller: number;
    uvPrint: number;
    packaging: number;
    elementCost: number;
    waterproofSurcharge: number;
    multiPartSurcharge: number;
    adminCosts: number;
    hangingSystem: number;
  }> {
    const prices = await this.getAllPrices();
    
    return {
      acrylglas: 45, // Fixed price for acrylglas per m²
      led: 8, // Fixed price for LED per meter
      controller: prices.get('controller')?.price_value || 25,
      uvPrint: prices.get('uv_print')?.price_value || 50,
      packaging: 8, // Fixed packaging cost per m²
      elementCost: 25, // Fixed element cost
      waterproofSurcharge: (prices.get('wasserdichtigkeit')?.price_value || 25) / 100,
      multiPartSurcharge: (prices.get('mehrteilig')?.price_value || 15) / 100,
      adminCosts: (prices.get('verwaltungskosten')?.price_value || 30) / 100,
      hangingSystem: prices.get('hanging_system')?.price_value || 35,
    };
  }

  /**
   * Get shipping prices
   */
  async getShippingPrices(): Promise<{
    dhl_klein: number;
    dhl_mittel: number;
    dhl_gross: number;
    spedition: number;
    gutertransport: number;
  }> {
    const prices = await this.getAllPrices();
    
    return {
      dhl_klein: prices.get('dhl_klein_20cm')?.price_value || 7.49,
      dhl_mittel: prices.get('dhl_mittel_60cm')?.price_value || 12.99,
      dhl_gross: prices.get('dhl_gross_100cm')?.price_value || 19.99,
      spedition: prices.get('spedition_120cm')?.price_value || 45.00,
      gutertransport: prices.get('gutertransport_240cm')?.price_value || 89.00,
    };
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    return this.lastCacheLoad !== null && 
           this.cache.size > 0 && 
           (Date.now() - this.lastCacheLoad.getTime()) < this.CACHE_DURATION;
  }

  /**
   * Load fallback prices
   */
  private loadFallbackPrices(): void {
    console.log('⚠️ Loading fallback prices');
    
    const fallbackData = [
      { key: 'verwaltungskosten', value: 30.00, unit: 'percent' },
      { key: 'wasserdichtigkeit', value: 25.00, unit: 'percent' },
      { key: 'mehrteilig', value: 15.00, unit: 'percent' },
      { key: 'controller', value: 25.00, unit: 'eur' },
      { key: 'hanging_system', value: 35.00, unit: 'eur' },
      { key: 'uv_print', value: 50.00, unit: 'eur_per_m2' },
      { key: 'dhl_klein_20cm', value: 7.49, unit: 'eur' },
      { key: 'dhl_mittel_60cm', value: 12.99, unit: 'eur' },
      { key: 'dhl_gross_100cm', value: 19.99, unit: 'eur' },
      { key: 'spedition_120cm', value: 45.00, unit: 'eur' },
      { key: 'gutertransport_240cm', value: 89.00, unit: 'eur' },
    ];

    this.cache.clear();
    fallbackData.forEach(item => {
      this.cache.set(item.key, {
        price_key: item.key,
        price_value: item.value,
        unit: item.unit,
        last_updated: new Date().toISOString()
      });
    });

    this.lastCacheLoad = new Date();
  }

  /**
   * Force refresh cache
   */
  async forceRefresh(): Promise<void> {
    this.lastCacheLoad = null;
    await this.loadPricesFromSupabase();
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isConnected: this.cache.size > 0,
      cacheValid: this.isCacheValid(),
      lastFetch: this.lastCacheLoad,
      cacheSize: this.cache.size,
      source: 'Supabase Database (cached)'
    };
  }
}

// Export singleton instance
export const finalPricingService = new FinalPricingService();

// Initialize on import
finalPricingService.initialize().catch(console.error);

export type { PricingCacheItem };
