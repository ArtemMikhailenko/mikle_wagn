import { supabase } from '../lib/supabase';

interface PricingCacheItem {
  price_key: string;
  price_value: number;
  unit: string | null;
  last_updated: string;
}

class OptimalPricingService {
  private cache: Map<string, PricingCacheItem> = new Map();
  private lastCacheLoad: Date | null = null;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes local cache

  /**
   * Get all prices from Supabase (no Monday.com API calls from client)
   */
  async getAllPrices(): Promise<Map<string, PricingCacheItem>> {
    try {
      // Check local cache first
      if (this.isCacheValid()) {
        console.log('📦 Using local cache:', this.cache.size, 'items');
        return this.cache;
      }

      console.log('🔄 Loading prices from Supabase...');
      
      // Simple Supabase query
      const { data, error } = await supabase
        .from('pricing_cache')
        .select('price_key, price_value, unit, last_updated');

      if (error) {
        console.error('❌ Error loading prices from Supabase:', error);
        return this.getFallbackPrices();
      }

      // Update local cache
      this.cache.clear();
      if (data) {
        data.forEach((item: any) => {
          this.cache.set(item.price_key, {
            price_key: item.price_key,
            price_value: item.price_value,
            unit: item.unit,
            last_updated: item.last_updated
          });
        });
      }

      this.lastCacheLoad = new Date();
      console.log('✅ Loaded', data?.length || 0, 'prices from Supabase');
      
      return this.cache;
    } catch (error) {
      console.error('Error loading prices:', error);
      return this.getFallbackPrices();
    }
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
   * Trigger manual sync (calls Edge Function)
   */
  async triggerSync(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Triggering manual price sync...');
      
      const { data, error } = await supabase.functions.invoke('daily-price-sync', {
        body: { manual: true }
      });

      if (error) {
        throw error;
      }

      // Clear local cache to force reload
      this.clearCache();

      return {
        success: true,
        message: `Sync completed. Updated ${data.itemsUpdated} items.`
      };
    } catch (error) {
      console.error('Sync error:', error);
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    lastSync: Date | null;
    status: string;
    itemCount: number;
    needsUpdate: boolean;
  }> {
    try {
      const { data: syncData } = await supabase
        .from('pricing_sync_log')
        .select('sync_completed_at, status, items_updated')
        .eq('status', 'completed')
        .order('sync_completed_at', { ascending: false })
        .limit(1)
        .single();

      const { count } = await supabase
        .from('pricing_cache')
        .select('*', { count: 'exact', head: true });

      const lastSync = syncData?.sync_completed_at ? new Date(syncData.sync_completed_at) : null;
      const needsUpdate = lastSync ? 
        (Date.now() - lastSync.getTime()) > (24 * 60 * 60 * 1000) : true;

      return {
        lastSync,
        status: syncData?.status || 'unknown',
        itemCount: count || 0,
        needsUpdate
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        lastSync: null,
        status: 'error',
        itemCount: 0,
        needsUpdate: true
      };
    }
  }

  /**
   * Check if local cache is valid
   */
  private isCacheValid(): boolean {
    return this.lastCacheLoad !== null && 
           this.cache.size > 0 && 
           (Date.now() - this.lastCacheLoad.getTime()) < this.CACHE_DURATION;
  }

  /**
   * Clear local cache
   */
  clearCache(): void {
    this.cache.clear();
    this.lastCacheLoad = null;
    console.log('🗑️ Local cache cleared');
  }

  /**
   * Fallback prices if database is unavailable
   */
  private getFallbackPrices(): Map<string, PricingCacheItem> {
    const fallbacks = new Map<string, PricingCacheItem>();
    
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

    fallbackData.forEach(item => {
      fallbacks.set(item.key, {
        price_key: item.key,
        price_value: item.value,
        unit: item.unit,
        last_updated: new Date().toISOString()
      });
    });

    console.log('⚠️ Using fallback prices');
    return fallbacks;
  }

  /**
   * Get connection status for admin panel
   */
  getConnectionStatus() {
    return {
      isConnected: true, // Always connected to Supabase
      hasCache: this.cache.size > 0,
      cacheValid: this.isCacheValid(),
      lastFetch: this.lastCacheLoad,
      cacheSize: this.cache.size,
      source: 'Supabase Database'
    };
  }
}

// Export singleton instance
export const optimalPricingService = new OptimalPricingService();
export type { PricingCacheItem };
