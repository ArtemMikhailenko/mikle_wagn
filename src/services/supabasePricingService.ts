import { supabase } from '../lib/supabase';

interface PricingCacheItem {
  id: string;
  price_key: string;
  price_value: number;
  unit: string | null;
  monday_item_id: string | null;
  last_updated: string;
  created_at: string;
}

interface PricingSyncLog {
  id: string;
  sync_started_at: string;
  sync_completed_at: string | null;
  items_updated: number;
  status: 'running' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
}

class SupabasePricingService {
  private cache: Map<string, PricingCacheItem> = new Map();
  private lastCacheLoad: Date | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes local cache

  /**
   * Get all prices from Supabase cache
   */
  async getAllPrices(): Promise<Map<string, PricingCacheItem>> {
    try {
      // Check if we have fresh local cache
      if (this.lastCacheLoad && 
          (Date.now() - this.lastCacheLoad.getTime()) < this.CACHE_DURATION && 
          this.cache.size > 0) {
        console.log('📦 Using local cache:', this.cache.size, 'items');
        return this.cache;
      }

      console.log('🔄 Loading prices from Supabase...');
      
      // Simple query without complex chaining
      const result = await supabase.from('pricing_cache').select('*');
      
      if (result.error) {
        console.error('❌ Error loading prices from Supabase:', result.error);
        throw result.error;
      }

      // Update local cache
      this.cache.clear();
      if (result.data) {
        result.data.forEach((item: any) => {
          this.cache.set(item.price_key, item);
        });
      }

      this.lastCacheLoad = new Date();
      console.log('✅ Loaded', result.data?.length || 0, 'prices from Supabase');
      
      return this.cache;
    } catch (error) {
      console.error('Error in getAllPrices:', error);
      
      // Return fallback prices if no cache available
      if (this.cache.size === 0) {
        return this.getFallbackPrices();
      }
      
      return this.cache;
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
   * Update prices from Monday.com (admin function)
   */
  async syncPricesFromMonday(mondayPrices: Map<string, any>): Promise<boolean> {
    try {
      console.log('🔄 Starting sync to Supabase...');

      // Simple insert for sync log
      const logResult = await supabase
        .from('pricing_sync_log')
        .insert({ status: 'running' });

      if (logResult.error) {
        console.error('Error creating sync log:', logResult.error);
      }

      let updatedCount = 0;

      // Update each price individually to avoid complex upsert
      for (const [key, mondayItem] of mondayPrices) {
        const updateData = {
          price_key: key,
          price_value: mondayItem.value,
          unit: mondayItem.unit || null,
          monday_item_id: mondayItem.itemId || null,
          last_updated: new Date().toISOString()
        };

        // Try to update first
        const updateResult = await supabase
          .from('pricing_cache')
          .update(updateData)
          .eq('price_key', key);

        // If no rows affected, insert new
        if (updateResult.error || !updateResult.data || updateResult.data.length === 0) {
          const insertResult = await supabase
            .from('pricing_cache')
            .insert(updateData);
          
          if (!insertResult.error) {
            updatedCount++;
          }
        } else {
          updatedCount++;
        }
      }

      // Update sync log
      if (logResult.data && logResult.data.length > 0) {
        await supabase
          .from('pricing_sync_log')
          .update({
            status: 'completed',
            items_updated: updatedCount,
            sync_completed_at: new Date().toISOString()
          })
          .eq('id', (logResult.data[0] as any).id);
      }

      // Clear local cache to force reload
      this.cache.clear();
      this.lastCacheLoad = null;

      console.log('✅ Successfully synced', updatedCount, 'prices to Supabase');
      return true;
    } catch (error) {
      console.error('Error syncing prices:', error);
      return false;
    }
  }

  /**
   * Check if prices need daily update
   */
  async needsDailyUpdate(): Promise<boolean> {
    try {
      const result = await supabase
        .from('pricing_sync_log')
        .select('sync_completed_at, status')
        .eq('status', 'completed')
        .limit(1);

      if (result.error || !result.data || result.data.length === 0) {
        console.log('📅 No previous sync found, update needed');
        return true;
      }

      const lastSync = new Date(result.data[0].sync_completed_at);
      const now = new Date();
      const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

      const needsUpdate = hoursSinceSync >= 24;
      console.log('📅 Last sync:', lastSync.toLocaleString(), 
                  '| Hours since:', Math.round(hoursSinceSync), 
                  '| Needs update:', needsUpdate);
      
      return needsUpdate;
    } catch (error) {
      console.error('Error checking daily update:', error);
      return true; // Default to needing update on error
    }
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus(): Promise<{
    lastSync: Date | null;
    status: string;
    itemCount: number;
    needsUpdate: boolean;
  }> {
    try {
      const [syncResult, countResult] = await Promise.all([
        supabase.from('pricing_sync_log').select('sync_completed_at, status').limit(1),
        supabase.from('pricing_cache').select('id', { count: 'exact' })
      ]);

      const needsUpdate = await this.needsDailyUpdate();

      return {
        lastSync: syncResult.data?.[0]?.sync_completed_at ? 
                  new Date(syncResult.data[0].sync_completed_at) : null,
        status: syncResult.data?.[0]?.status || 'unknown',
        itemCount: countResult.count || 0,
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
   * Force refresh local cache
   */
  clearCache(): void {
    this.cache.clear();
    this.lastCacheLoad = null;
    console.log('🗑️ Local cache cleared');
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
  }> {
    const prices = await this.getAllPrices();
    
    return {
      acrylglas: 45, // Fixed price for acrylglas per m²
      led: 8, // Fixed price for LED per meter
      controller: prices.get('controller')?.price_value || 25,
      uvPrint: prices.get('uv_print')?.price_value || 50,
      packaging: 8, // Fixed packaging cost per m²
      elementCost: 25, // Fixed element cost
    };
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
    ];

    fallbackData.forEach(item => {
      fallbacks.set(item.key, {
        id: `fallback-${item.key}`,
        price_key: item.key,
        price_value: item.value,
        unit: item.unit,
        monday_item_id: null,
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
    });

    return fallbacks;
  }
}

export const supabasePricingService = new SupabasePricingService();
export type { PricingCacheItem, PricingSyncLog };
