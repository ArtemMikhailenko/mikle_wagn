// Optimized Monday.com API Service with Smart Caching
const MONDAY_API_URL = 'https://api.monday.com/v2';
const API_TOKEN = import.meta.env.VITE_MONDAY_API_TOKEN;
const BOARD_ID = import.meta.env.VITE_MONDAY_BOARD_ID || '2090208832';

interface MondayPriceItem {
  id: string;
  name: string;
  value: number;
  unit?: string;
  itemId: string;
}

interface MondayApiResponse {
  data: {
    boards: Array<{
      items_page: {
        items: Array<{
          id: string;
          name: string;
          column_values: Array<{
            id: string;
            text: string;
            value: string;
          }>;
        }>;
      };
    }>;
  };
  errors?: Array<{
    message: string;
  }>;
}

class OptimizedMondayService {
  private cache: Map<string, MondayPriceItem> = new Map();
  private lastFetch: Date | null = null;
  private isConnected: boolean = false;
  private fetchPromise: Promise<Map<string, MondayPriceItem>> | null = null;
  
  // Cache settings optimized for API limits
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly LOCAL_STORAGE_KEY = 'monday_price_cache';
  private readonly TIMESTAMP_KEY = 'monday_cache_timestamp';
  
  // API tracking
  private requestCount = 0;
  private dailyRequestCount = 0;
  private lastResetDate = new Date().toDateString();
  private readonly MAX_DAILY_REQUESTS = 100; // Conservative limit

  constructor() {
    if (!API_TOKEN) {
      console.warn('⚠️ MONDAY_API_TOKEN not found');
      return;
    }
    
    console.log('🔑 Monday.com API configured with smart caching');
    console.log('📋 Board ID:', BOARD_ID);
    console.log('⏱️ Cache Duration:', this.CACHE_DURATION / 60000, 'minutes');
    console.log('🚫 Daily Request Limit:', this.MAX_DAILY_REQUESTS);
    
    // Load persistent cache
    this.loadCacheFromStorage();
  }

  // Load cache from localStorage to persist between sessions
  private loadCacheFromStorage(): boolean {
    try {
      const storedCache = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      const storedTimestamp = localStorage.getItem(this.TIMESTAMP_KEY);
      
      if (storedCache && storedTimestamp) {
        const timestamp = parseInt(storedTimestamp);
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - timestamp < this.CACHE_DURATION) {
          const cacheData = JSON.parse(storedCache);
          this.cache = new Map(Object.entries(cacheData));
          this.lastFetch = new Date(timestamp);
          this.isConnected = true;
          
          console.log('📦 Loaded persistent cache:', this.cache.size, 'items');
          console.log('⏰ Cache valid for', Math.round((this.CACHE_DURATION - (now - timestamp)) / 60000), 'more minutes');
          return true;
        } else {
          console.log('⏰ Cache expired, will fetch fresh data');
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cache from storage:', error);
    }
    return false;
  }

  // Save cache to localStorage for persistence
  private saveCacheToStorage(): void {
    try {
      const cacheObject = Object.fromEntries(this.cache);
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(cacheObject));
      localStorage.setItem(this.TIMESTAMP_KEY, Date.now().toString());
      console.log('💾 Cache saved to localStorage');
    } catch (error) {
      console.warn('⚠️ Failed to save cache:', error);
    }
  }

  // Track API usage to stay within limits
  private trackApiCall(): boolean {
    const today = new Date().toDateString();
    
    // Reset daily counter if new day
    if (today !== this.lastResetDate) {
      this.dailyRequestCount = 0;
      this.lastResetDate = today;
      console.log('🗓️ New day, reset API counter');
    }
    
    // Check if we're hitting limits
    if (this.dailyRequestCount >= this.MAX_DAILY_REQUESTS) {
      console.warn('🚫 Daily API limit reached, using cache');
      return false;
    }
    
    this.requestCount++;
    this.dailyRequestCount++;
    console.log(`📊 API Call #${this.requestCount} (today: ${this.dailyRequestCount}/${this.MAX_DAILY_REQUESTS})`);
    return true;
  }

  // Check if cache is valid and should be used
  private isCacheValid(): boolean {
    if (!this.lastFetch || this.cache.size === 0) return false;
    
    const now = Date.now();
    const cacheAge = now - this.lastFetch.getTime();
    const isValid = cacheAge < this.CACHE_DURATION;
    
    if (!isValid) {
      console.log('⏰ Cache expired (age:', Math.round(cacheAge / 60000), 'minutes)');
    }
    
    return isValid;
  }

  // Main method to fetch prices with smart caching
  async fetchPriceData(): Promise<Map<string, MondayPriceItem>> {
    // Return cached data if valid
    if (this.isCacheValid()) {
      console.log('📦 Using cached data (', this.cache.size, 'items)');
      return this.cache;
    }

    // Prevent multiple simultaneous requests
    if (this.fetchPromise) {
      console.log('⏳ Request already in progress, waiting...');
      return this.fetchPromise;
    }

    // Check API limits
    if (!this.trackApiCall()) {
      console.log('🚫 API limit reached, using stale cache or fallback');
      return this.cache.size > 0 ? this.cache : this.getMockData();
    }

    // Create and store the fetch promise
    this.fetchPromise = this.performAPIFetch();
    
    try {
      const result = await this.fetchPromise;
      return result;
    } finally {
      this.fetchPromise = null;
    }
  }

  // Actual API fetch implementation
  private async performAPIFetch(): Promise<Map<string, MondayPriceItem>> {
    try {
      console.log('🌐 Fetching fresh data from Monday.com API...');
      
      const query = `
        query {
          boards(ids: [${BOARD_ID}]) {
            items_page(limit: 50) {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `;

      const response = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': API_TOKEN,
          'API-Version': '2023-10'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: MondayApiResponse = await response.json();

      if (data.errors && data.errors.length > 0) {
        console.error('❌ Monday.com API errors:', data.errors);
        return this.cache.size > 0 ? this.cache : this.getMockData();
      }

      // Process the response
      const priceMap = new Map<string, MondayPriceItem>();
      const items = data.data.boards[0]?.items_page?.items || [];

      console.log(`📦 Processing ${items.length} items from Monday.com`);

      items.forEach((item, index) => {
        // Find price column with multiple fallbacks
        const priceColumn = item.column_values.find(col => 
          col.id === 'preis' || 
          col.id === 'value' || 
          col.id === 'numbers' ||
          col.id === 'number' ||
          col.id.includes('preis') ||
          col.id.includes('price') ||
          col.text?.includes('€') ||
          col.text?.match(/^\d+([.,]\d+)?$/)
        );
        
        if (priceColumn && priceColumn.text) {
          const value = parseFloat(priceColumn.text.replace(',', '.').replace('€', ''));
          if (!isNaN(value)) {
            const priceItem: MondayPriceItem = {
              id: item.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
              name: item.name,
              value: value,
              itemId: item.id
            };
            
            priceMap.set(priceItem.id, priceItem);
            console.log(`💰 ${item.name}: €${value}`);
          }
        } else {
          console.log(`⚠️ No price found for item ${index + 1}: ${item.name}`);
        }
      });

      // Update cache and save to storage
      this.cache = priceMap;
      this.lastFetch = new Date();
      this.isConnected = true;
      this.saveCacheToStorage();
      
      console.log(`✅ Successfully cached ${priceMap.size} prices from Monday.com`);
      return priceMap;

    } catch (error) {
      console.error('❌ Error fetching Monday.com data:', error);
      this.isConnected = false;
      
      // Return stale cache if available, otherwise mock data
      if (this.cache.size > 0) {
        console.log('📦 Using stale cache due to API error');
        return this.cache;
      }
      
      return this.getMockData();
    }
  }

  // Get specific price by key
  async getPrice(key: string): Promise<number> {
    const prices = await this.fetchPriceData();
    const item = prices.get(key);
    return item?.value || 0;
  }

  // Get all prices
  async getAllPrices(): Promise<Map<string, MondayPriceItem>> {
    return this.fetchPriceData();
  }

  // Force refresh (ignores cache)
  async forceRefresh(): Promise<Map<string, MondayPriceItem>> {
    console.log('🔄 Force refresh requested');
    this.lastFetch = null;
    this.cache.clear();
    localStorage.removeItem(this.LOCAL_STORAGE_KEY);
    localStorage.removeItem(this.TIMESTAMP_KEY);
    return this.fetchPriceData();
  }

  // Fallback mock data
  private getMockData(): Map<string, MondayPriceItem> {
    console.log('📝 Using fallback mock data');
    
    return new Map([
      ['verwaltungskosten', { id: 'verwaltungskosten', name: 'Verwaltungskosten', value: 30, itemId: '2090249238' }],
      ['wasserdichtigkeit', { id: 'wasserdichtigkeit', name: 'Wasserdichtigkeit', value: 25, itemId: '2090255592' }],
      ['mehrteilig', { id: 'mehrteilig', name: 'Mehrteilig', value: 15, itemId: '2090256392' }],
      ['zeit_pro_m²', { id: 'zeit_pro_m²', name: 'Zeit pro m²', value: 0.9, itemId: '2090288932' }],
      ['zeit_pro_element', { id: 'zeit_pro_element', name: 'Zeit pro Element', value: 0.08, itemId: '2090294337' }],
      ['controller', { id: 'controller', name: 'Controller', value: 25, itemId: '2090273149' }],
      ['hanging_system', { id: 'hanging_system', name: 'Aufhängesystem', value: 35, itemId: '2092808058' }],
      ['uv_print', { id: 'uv_print', name: 'UV-Druck', value: 50, itemId: '2090213361' }],
      ['dhl_klein_20cm', { id: 'dhl_klein_20cm', name: 'DHL Klein (bis 20cm)', value: 7.49, itemId: '2090232832' }],
      ['dhl_mittel_60cm', { id: 'dhl_mittel_60cm', name: 'DHL Mittel (bis 60cm)', value: 12.99, itemId: '2090231734' }],
      ['dhl_gross_100cm', { id: 'dhl_gross_100cm', name: 'DHL Groß (bis 100cm)', value: 19.99, itemId: '2090234197' }],
      ['spedition_120cm', { id: 'spedition_120cm', name: 'Spedition (bis 120cm)', value: 45.00, itemId: '2090236189' }],
      ['gutertransport_240cm', { id: 'gutertransport_240cm', name: 'Gütertransport (bis 240cm)', value: 89.00, itemId: '2090240832' }]
    ]);
  }

  // Get connection and cache status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      hasToken: !!API_TOKEN,
      boardId: BOARD_ID,
      lastFetch: this.lastFetch,
      cacheSize: this.cache.size,
      cacheValid: this.isCacheValid(),
      cacheDuration: this.CACHE_DURATION / 60000,
      requestCount: this.requestCount,
      dailyRequestCount: this.dailyRequestCount,
      dailyLimit: this.MAX_DAILY_REQUESTS
    };
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.fetchPriceData();
      return this.isConnected;
    } catch {
      return false;
    }
  }
}

export const optimizedMondayService = new OptimizedMondayService();
export type { MondayPriceItem };
