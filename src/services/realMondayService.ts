// Real Monday.com API Integration Service
const MONDAY_API_URL = 'https://api.monday.com/v2';
const API_TOKEN = import.meta.env.VITE_MONDAY_API_TOKEN;
const BOARD_ID = import.meta.env.VITE_MONDAY_BOARD_ID || '2090208832';

// Monday.com Item IDs mapping
const MONDAY_ITEMS = {
  uv_print: '2090213361',
  administrative_costs: '2090249238', 
  waterproofing: '2090255592',
  multi_part: '2090256392',
  time_per_m2: '2090288932',
  time_per_element: '2090294337',
  hourly_wage: '2090228072',
  assembly: '2090227751',
  distance_rate: '2090242018',
  dhl_klein_20cm: '2090232832',
  dhl_mittel_60cm: '2090231734',
  dhl_gross_100cm: '2090234197',
  spedition_120cm: '2090236189',
  gutertransport_240cm: '2090240832',
  controller: '2090273149',
  controller_high_power: '2091194484',
  hanging_system: '2092808058'
} as const;

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

class RealMondayService {
  private cache: Map<string, MondayPriceItem> = new Map();
  private lastFetch: Date | null = null;
  private isConnected: boolean = false;
  private fetchPromise: Promise<Map<string, MondayPriceItem>> | null = null;
  
  // Extended cache settings to reduce API calls
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes instead of 5
  private readonly MAX_RETRIES = 3;
  private requestCount = 0;
  private dailyRequestCount = 0;
  private lastResetDate = new Date().toDateString();

  constructor() {
    if (!API_TOKEN) {
      console.warn('⚠️ MONDAY_API_TOKEN not found');
      return;
    }
    console.log('🔑 Monday.com API configured');
    console.log('📋 Board ID:', BOARD_ID);
    console.log('⏱️ Cache Duration:', this.CACHE_DURATION / 60000, 'minutes');
    
  // Load cache from localStorage to persist between sessions
  private loadCacheFromStorage() {
    try {
      const storedCache = localStorage.getItem('monday_price_cache');
      const storedTimestamp = localStorage.getItem('monday_cache_timestamp');
      
      if (storedCache && storedTimestamp) {
        const timestamp = parseInt(storedTimestamp);
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - timestamp < this.CACHE_DURATION) {
          const cacheData = JSON.parse(storedCache);
          this.cache = new Map(Object.entries(cacheData));
          this.lastFetch = new Date(timestamp);
          this.isConnected = true;
          console.log('📦 Loaded cached Monday.com data:', this.cache.size, 'items');
          return;
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cache from storage:', error);
    }
  }

  // Save cache to localStorage
  private saveCacheToStorage() {
    try {
      const cacheObject = Object.fromEntries(this.cache);
      localStorage.setItem('monday_price_cache', JSON.stringify(cacheObject));
      localStorage.setItem('monday_cache_timestamp', Date.now().toString());
      console.log('💾 Saved cache to storage');
    } catch (error) {
      console.warn('⚠️ Failed to save cache to storage:', error);
    }
  }

  // Track API usage
  private trackApiCall() {
    this.requestCount++;
    
    // Reset daily counter if new day
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyRequestCount = 0;
      this.lastResetDate = today;
    }
    
    this.dailyRequestCount++;
    console.log(`📊 API Call #${this.requestCount} (today: ${this.dailyRequestCount})`);
  }

  // Check if cache is valid
  private isCacheValid(): boolean {
    if (!this.lastFetch || this.cache.size === 0) return false;
    
    const now = Date.now();
    const cacheAge = now - this.lastFetch.getTime();
    return cacheAge < this.CACHE_DURATION;
  }

  // Fetch data from Monday.com API
  async fetchPriceData(): Promise<Map<string, MondayPriceItem>> {
    if (!API_TOKEN) {
      console.error('❌ No Monday.com API token provided');
      return this.getMockData();
    }

    try {
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
      
      console.log('📋 Monday.com API Response:', data);

      if (data.errors && data.errors.length > 0) {
        console.error('❌ Monday.com API errors:', data.errors);
        return this.getMockData();
      }

      console.log('✅ Monday.com data fetched successfully');
      
      // Process the response
      const priceMap = new Map<string, MondayPriceItem>();
      const items = data.data.boards[0]?.items_page?.items || [];
      
      console.log('📦 Items found:', items.length);
      
      items.forEach((item, index) => {
        console.log(`📝 Item ${index + 1}:`, {
          id: item.id,
          name: item.name,
          columns: item.column_values.map(col => ({ id: col.id, text: col.text, value: col.value }))
        });
        
        // Find the price column (usually 'preis' or 'value')
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
          const value = parseFloat(priceColumn.text.replace(',', '.'));
          if (!isNaN(value)) {
            const priceItem: MondayPriceItem = {
              id: item.name.toLowerCase().replace(/\s+/g, '_'),
              name: item.name,
              value: value,
              itemId: item.id
            };
            
            priceMap.set(priceItem.id, priceItem);
            console.log(`📊 ${item.name}: €${value}`);
          }
        }
      });

      this.cache = priceMap;
      this.lastFetch = new Date();
      this.isConnected = true;
      
      return priceMap;

    } catch (error) {
      console.error('❌ Error fetching Monday.com data:', error);
      this.isConnected = false;
      return this.getMockData();
    }
  }

  // Get specific price by key
  async getPrice(key: string): Promise<number> {
    if (this.cache.size === 0 || !this.lastFetch || 
        Date.now() - this.lastFetch.getTime() > 5 * 60 * 1000) {
      await this.fetchPriceData();
    }

    const item = this.cache.get(key);
    return item?.value || 0;
  }

  // Get all prices
  async getAllPrices(): Promise<Map<string, MondayPriceItem>> {
    if (this.cache.size === 0) {
      await this.fetchPriceData();
    }
    return this.cache;
  }

  // Fallback mock data if API fails
  private getMockData(): Map<string, MondayPriceItem> {
    console.log('📝 Using mock Monday.com data');
    
    const mockData = new Map<string, MondayPriceItem>([
      ['uv_print', { id: 'uv_print', name: 'UV-Druck', value: 50, itemId: MONDAY_ITEMS.uv_print }],
      ['administrative_costs', { id: 'administrative_costs', name: 'Verwaltungskosten', value: 25, itemId: MONDAY_ITEMS.administrative_costs }],
      ['waterproofing', { id: 'waterproofing', name: 'Wasserdicht', value: 30, itemId: MONDAY_ITEMS.waterproofing }],
      ['multi_part', { id: 'multi_part', name: 'Mehrteilig', value: 15, itemId: MONDAY_ITEMS.multi_part }],
      ['time_per_m2', { id: 'time_per_m2', name: 'Zeit pro m²', value: 2.5, itemId: MONDAY_ITEMS.time_per_m2 }],
      ['time_per_element', { id: 'time_per_element', name: 'Zeit pro Element', value: 1.5, itemId: MONDAY_ITEMS.time_per_element }],
      ['hourly_wage', { id: 'hourly_wage', name: 'Stundenlohn', value: 45, itemId: MONDAY_ITEMS.hourly_wage }],
      ['assembly', { id: 'assembly', name: 'Montage', value: 80, itemId: MONDAY_ITEMS.assembly }],
      ['distance_rate', { id: 'distance_rate', name: 'Kilometerpreis', value: 0.6, itemId: MONDAY_ITEMS.distance_rate }],
      ['dhl_klein_20cm', { id: 'dhl_klein_20cm', name: 'DHL Klein (bis 20cm)', value: 7.49, itemId: MONDAY_ITEMS.dhl_klein_20cm }],
      ['dhl_mittel_60cm', { id: 'dhl_mittel_60cm', name: 'DHL Mittel (bis 60cm)', value: 12.99, itemId: MONDAY_ITEMS.dhl_mittel_60cm }],
      ['dhl_gross_100cm', { id: 'dhl_gross_100cm', name: 'DHL Groß (bis 100cm)', value: 19.99, itemId: MONDAY_ITEMS.dhl_gross_100cm }],
      ['spedition_120cm', { id: 'spedition_120cm', name: 'Spedition (bis 120cm)', value: 45.00, itemId: MONDAY_ITEMS.spedition_120cm }],
      ['gutertransport_240cm', { id: 'gutertransport_240cm', name: 'Gütertransport (bis 240cm)', value: 89.00, itemId: MONDAY_ITEMS.gutertransport_240cm }],
      ['controller', { id: 'controller', name: 'Controller', value: 25, itemId: MONDAY_ITEMS.controller }],
      ['controller_high_power', { id: 'controller_high_power', name: 'Controller Hochleistung', value: 45, itemId: MONDAY_ITEMS.controller_high_power }],
      ['hanging_system', { id: 'hanging_system', name: 'Aufhängesystem', value: 35, itemId: MONDAY_ITEMS.hanging_system }]
    ]);

    return mockData;
  }

  // Connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      hasToken: !!API_TOKEN,
      boardId: BOARD_ID,
      lastFetch: this.lastFetch,
      cacheSize: this.cache.size
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

export const realMondayService = new RealMondayService();
export type { MondayPriceItem };
