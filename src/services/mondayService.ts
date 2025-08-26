import { calculateDistance } from '../utils/calculations';

// Monday.com API configuration
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
  einheit: string;
  preis: number;
  prozent?: number;
  stunde?: number;
  pulse_id?: string;
  // Design-spezifische Felder
  breite?: number;
  hoehe?: number;
  ledLaenge?: number;
  elemente?: number;
  logoSvg?: string;
}

interface MondayApiResponse {
  data: {
    boards: Array<{
      items_page: {
        items: Array<{
          id: string;
          name: string;
          group: {
            id: string;
          };
          column_values: Array<{
            id: string;
            text: string;
            value?: string;
          }>;
        }>;
      };
    }>;
  };
}

class MondayService {
  private apiToken: string;
  private boardId: string;
  private baseUrl = '/api/monday';
  private cache: Map<string, MondayPriceItem> = new Map();
  private lastSync: Date | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private lastError: string | null = null;
  private designCache: Map<string, any> = new Map();
  private connectionDetails: {
    hasToken: boolean;
    tokenLength: number;
    lastAttempt: Date | null;
    errorCount: number;
  } = {
    hasToken: false,
    tokenLength: 0,
    lastAttempt: null,
    errorCount: 0
  };

  constructor() {
    // Get API token from environment variable
    this.apiToken = import.meta.env.VITE_MONDAY_API_TOKEN || '';
    
    this.connectionDetails.hasToken = !!this.apiToken;
    this.connectionDetails.tokenLength = this.apiToken.length;
    
    if (!this.apiToken) {
      console.warn('⚠️ VITE_MONDAY_API_TOKEN nicht gefunden');
      console.log('💡 Tipp: Erstellen Sie eine .env Datei mit VITE_MONDAY_API_TOKEN=ihr_token_hier');
      this.lastError = 'Kein API-Token gefunden';
    } else {
      console.log('🔑 Monday.com API Token geladen (Länge:', this.apiToken.length, 'Zeichen)');
      console.log('🔑 Token beginnt mit:', this.apiToken.substring(0, 8) + '...');
    }
    
    this.boardId = '2090208832';
    
    // Initialize with fallback prices
    this.initializeFallbackPrices();
    
    // Test API connection on startup if token is available
    if (this.apiToken) {
      this.testConnection();
    }
  }

  private async testConnection(): Promise<void> {
    try {
      console.log('🧪 Teste Monday.com API-Verbindung...');
      
      // Direkter API-Aufruf ohne Proxy für Test
      const testQuery = `query { boards(ids: [${this.boardId}]) { id name } }`;
      
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`,
          'API-Version': '2023-10',
        },
        body: JSON.stringify({ query: testQuery }),
      });
      
      console.log('🌐 API Response Status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 API Response Data:', data);
        
        if (data.data?.boards) {
          console.log('✅ Monday.com API-Verbindung erfolgreich! Board:', data.data.boards[0]?.name);
          this.isConnected = true;
          this.lastError = null;
        } else if (data.errors) {
          console.error('❌ Monday.com API-Fehler:', data.errors);
          this.isConnected = false;
          this.lastError = `API Fehler: ${data.errors[0]?.message || 'Unbekannt'}`;
        }
      } else {
        const errorText = await response.text();
        console.error('❌ API Response Error:', errorText);
        console.error('❌ Monday.com API-Verbindung fehlgeschlagen:', response.status, response.statusText);
        this.isConnected = false;
        this.lastError = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error) {
      console.error('❌ Monday.com API-Verbindungstest fehlgeschlagen:', error);
      this.isConnected = false;
      this.lastError = error instanceof Error ? error.message : 'Verbindungstest fehlgeschlagen';
    }
  }

  private initializeFallbackPrices(): void {
    const fallbackPrices = [
      { name: 'acryl_glass', preis: 58.46, einheit: '€/m²', id: 'fallback-acryl' },
      { name: 'uv_print', preis: 36.22, einheit: '€/m²', id: 'fallback-uv' },
      { name: 'led', preis: 2.50, einheit: '€/m', id: 'fallback-led' },
      { name: 'elements', preis: 2.00, einheit: '€/piece', id: 'fallback-elements' },
      { name: 'assembly', preis: 150.00, einheit: '€/m²', id: 'fallback-assembly' },
      { name: 'packaging', preis: 30.00, einheit: '€/m²', id: 'fallback-packaging' },
      { name: 'controller', preis: 20.00, einheit: '€/piece', id: 'fallback-controller' },
      { name: 'controller_high_power', preis: 50.00, einheit: '€/piece', id: 'fallback-controller-hp' },
      { name: 'hourly_wage', preis: 25.00, einheit: '€/h', id: 'fallback-wage' },
      { name: 'time_per_m2', stunde: 3.0, einheit: 'h/m²', id: 'fallback-time-m2' },
      { name: 'time_per_element', stunde: 0.1, einheit: 'h/Element', id: 'fallback-time-element' },
      { name: 'waterproofing', prozent: 25, einheit: '%', id: 'fallback-waterproof' },
      { name: 'multi_part', prozent: 15, einheit: '%', id: 'fallback-multipart' },
      { name: 'administrative_costs', prozent: 20, einheit: '%', id: 'fallback-admin' },
      { name: 'express_production', prozent: 30, einheit: '%', id: 'fallback-express' },
      { name: 'distance_rate', preis: 1.50, einheit: '€/km', id: 'fallback-distance' },
      // Power supplies
      { name: 'power_usb_15w', preis: 5.00, einheit: '€', id: 'fallback-power-15w' },
      { name: 'power_30w', preis: 8.00, einheit: '€', id: 'fallback-power-30w' },
      { name: 'power_70w', preis: 15.00, einheit: '€', id: 'fallback-power-70w' },
      { name: 'power_120w', preis: 20.00, einheit: '€', id: 'fallback-power-120w' },
      { name: 'power_200w', preis: 30.00, einheit: '€', id: 'fallback-power-200w' },
      { name: 'power_250w', preis: 40.00, einheit: '€', id: 'fallback-power-250w' },
      { name: 'power_300w', preis: 50.00, einheit: '€', id: 'fallback-power-300w' },
      { name: 'power_400w', preis: 70.00, einheit: '€', id: 'fallback-power-400w' },
      { name: 'power_1000w', preis: 200.00, einheit: '€', id: 'fallback-power-1000w' },
      // Shipping
      { name: 'dhl_klein_20cm', preis: 20.00, einheit: '€', id: 'fallback-dhl-klein' },
      { name: 'dhl_mittel_60cm', preis: 40.00, einheit: '€', id: 'fallback-dhl-mittel' },
      { name: 'dhl_gross_100cm', preis: 80.00, einheit: '€', id: 'fallback-dhl-gross' },
      { name: 'spedition_120cm', preis: 160.00, einheit: '€', id: 'fallback-spedition' },
      { name: 'gutertransport_240cm', preis: 500.00, einheit: '€', id: 'fallback-gutertransport' },
      // Hanging system
      { name: 'hanging_system', preis: 15.00, einheit: '€', id: 'fallback-hanging' },
    ];

    fallbackPrices.forEach(item => {
      this.cache.set(item.name, {
        id: item.id,
        name: item.name,
        einheit: item.einheit,
        preis: item.preis,
        prozent: item.prozent,
        stunde: item.stunde
      });
    });

    console.log('💾 Fallback-Preise initialisiert:', this.cache.size, 'Einträge');
    console.log('🔗 Hängesystem Fallback-Preis:', this.cache.get('hanging_system'));
  }

  async fetchPrices(): Promise<Map<string, MondayPriceItem>> {
    this.connectionDetails.lastAttempt = new Date();
    
    try {
      // Check if API token is available
      if (!this.apiToken) {
        this.lastError = 'Kein API-Token konfiguriert';
        this.isConnected = false;
        this.lastSync = new Date();
        console.log('💾 Kein API Token - verwende Fallback-Preise');
        return this.cache;
      }
      
      console.log('🔄 Starte Monday.com API-Anfrage...', {
        boardId: this.boardId,
        tokenLength: this.apiToken.length,
        timestamp: new Date().toISOString()
      });
      
      const query = `
        query {
          boards(ids: [${this.boardId}]) {
            items_page(limit: 100) {
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

      console.log('📤 GraphQL Query bereit');
      
      const usedMethod = 'Direct API Call';
      
      // Direkter API-Aufruf
      console.log('🔄 Direkte Monday.com API-Anfrage...');
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`,
          'API-Version': '2023-10',
        },
        body: JSON.stringify({ query }),
      });
      
      console.log('📡 API-Antwort:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          url: response.url
        };
        console.error('❌ Monday API Error Details:', errorDetails);
        this.lastError = `API Error ${response.status}: ${response.statusText}`;
        this.connectionDetails.errorCount++;
        throw new Error(`Monday API Error: ${response.status} - ${response.statusText}`);
      }

      const data: MondayApiResponse = await response.json();
      console.log('📊 API Response received:', {
        hasData: !!data.data,
        hasBoards: !!data.data?.boards,
        boardsCount: data.data?.boards?.length || 0,
        fullResponse: data
      });
      
      if ((data as any).errors && (data as any).errors.length > 0) {
        console.error('❌ GraphQL Errors:', data.errors);
        this.lastError = `GraphQL Error: ${(data as any).errors[0]?.message || 'Unknown GraphQL error'}`;
        this.connectionDetails.errorCount++;
        console.warn('⚠️ GraphQL Fehler, verwende Fallback-Preise');
        this.isConnected = false;
        this.lastSync = new Date();
        return this.cache;
      }
      
      const items = data?.data?.boards?.[0]?.items_page?.items?.filter(item => 
        true
      ) || [];
      console.log('📋 Gefundene Items:', items.length);
      
      if (items.length === 0) {
        console.warn('⚠️ Keine Items vom Monday.com Board erhalten');
        this.lastError = 'Keine Items vom Board erhalten';
        this.isConnected = false;
        this.lastSync = new Date();
        return this.cache;
      }

      // Keep fallback prices and update with Monday data
      const updatedCache = new Map(this.cache);

      items.forEach(item => {
        console.log('🔍 Verarbeite Item:', {
          id: item.id,
          name: item.name,
        });
        
        // Prüfe ob es ein spezielles Item ist
        const isSpecialItem = ['2090249238', '2090255592', '2090256392', '2090288932', '2090294337'].includes(item.id);
        if (isSpecialItem) {
          console.log('🎯 SPEZIELLES ITEM GEFUNDEN:', {
            id: item.id,
            name: item.name,
            columns: item.column_values.map(col => ({ id: col.id, text: col.text }))
          });
        }
        
        const priceItem: MondayPriceItem = {
          id: item.id,
          name: item.name,
          einheit: '',
          preis: 0,
        };

        item.column_values.forEach(column => {
          if (isSpecialItem) {
            console.log(`  📊 Spalte ${column.id}: "${column.text}" (Item: ${item.id})`);
          }
          
          switch (column.id) {
            case 'text_mktmnrrm': // Unit
              priceItem.einheit = column.text || '';
              break;
            case 'numeric_mktmw8n': // Price
              const priceText = column.text?.replace(',', '.').replace('€', '').trim() || '0';
              priceItem.preis = parseFloat(priceText);
              if (isSpecialItem) {
                console.log(`    💰 Preis verarbeitet: "${column.text}" → ${priceItem.preis}`);
              }
              break;
            case 'numeric_mktmcycy': // Percentage
                console.log(`📊 PROZENT-SPALTE für Item ${item.id} ("${item.name}"):`, {
                  text: column.text,
                  value: column.value,
                  rawValue: JSON.stringify(column.value)
                });
                
                let percentValue = null;
                
                // Versuch 1: text direkt parsen
                if (column.text && column.text.trim() !== '' && column.text !== '—') {
                  const textValue = column.text.replace('%', '').replace(',', '.').trim();
                  const parsed = parseFloat(textValue);
                  if (!isNaN(parsed)) {
                    percentValue = parsed;
                    console.log(`  ✅ Text-Parsing erfolgreich: "${column.text}" → ${percentValue}%`);
                  }
                }
                
                // Versuch 2: value als JSON parsen
                if (percentValue === null && column.value) {
                  try {
                    const valueObj = typeof column.value === 'string' ? JSON.parse(column.value) : column.value;
                    if (typeof valueObj === 'number') {
                      percentValue = valueObj;
                      console.log(`  ✅ JSON-Parsing erfolgreich: ${column.value} → ${percentValue}%`);
                    }
                  } catch (e) {
                    console.log(`  ❌ JSON-Parsing fehlgeschlagen`);
                  }
                }
                
                // Versuch 3: value direkt
                if (percentValue === null && typeof column.value === 'number') {
                  percentValue = column.value;
                  console.log(`  ✅ Direkter Wert: ${percentValue}%`);
                }
                
                if (percentValue !== null) {
                  priceItem.prozent = percentValue;
                  console.log(`🎯 PROZENT GESETZT für ${item.name}: ${percentValue}%`);
                } else {
                  console.log(`❌ PROZENT NICHT GEFUNDEN für ${item.name}`);
                }
              break;
            case 'numeric_mktmz717': // Hours - nur für spezifische Items
              if (['2090288932', '2090294337'].includes(item.id)) {
                console.log(`⏰ STUNDEN-SPALTE für Item ${item.id} ("${item.name}"):`, {
                  text: column.text,
                  value: column.value,
                  rawValue: JSON.stringify(column.value)
                });
                
                let hoursValue = null;
                
                // Versuch 1: text parsen
                if (column.text && column.text.trim() !== '' && column.text !== '—') {
                  const hoursText = column.text.replace(' h', '').replace('h', '').replace(',', '.').trim();
                  const parsed = parseFloat(hoursText);
                  if (!isNaN(parsed)) {
                    hoursValue = parsed;
                    console.log(`  ✅ Text-Parsing erfolgreich: "${column.text}" → ${hoursValue}h`);
                  }
                }
                
                // Versuch 2: value als JSON parsen
                if (hoursValue === null && column.value) {
                  try {
                    const valueObj = typeof column.value === 'string' ? JSON.parse(column.value) : column.value;
                    if (typeof valueObj === 'number') {
                      hoursValue = valueObj;
                      console.log(`  ✅ JSON-Parsing erfolgreich: ${column.value} → ${hoursValue}h`);
                    }
                  } catch (e) {
                    console.log(`  ❌ JSON-Parsing fehlgeschlagen`);
                  }
                }
                
                // Versuch 3: value direkt
                if (hoursValue === null && typeof column.value === 'number') {
                  hoursValue = column.value;
                  console.log(`  ✅ Direkter Wert: ${hoursValue}h`);
                }
                
                if (hoursValue !== null) {
                  priceItem.stunde = hoursValue;
                  console.log(`🎯 STUNDEN GESETZT für ${item.name}: ${hoursValue}h`);
                } else {
                  console.log(`❌ STUNDEN NICHT GEFUNDEN für ${item.name}`);
                }
              }
              break;
            case 'pulse_id_mktmzkhz': // Element ID
              priceItem.pulse_id = column.text || '';
              break;
            case 'numeric_mkq7ejqj': // Breite
              const breiteText = column.text?.replace(',', '.').replace('cm', '').trim() || '0';
              priceItem.breite = parseFloat(breiteText);
              break;
            case 'numeric_mkq7nqpc': // Höhe
              const hoeheText = column.text?.replace(',', '.').replace('cm', '').trim() || '0';
              priceItem.hoehe = parseFloat(hoeheText);
              break;
            case 'numeric_mkqq3jcd': // LED Länge
              const ledText = column.text?.replace(',', '.').replace('m', '').trim() || '0';
              priceItem.ledLaenge = parseFloat(ledText);
              break;
            case 'numeric_mkrnkjy6': // Elemente
              const elementeText = column.text?.replace(',', '.').trim() || '0';
              priceItem.elemente = parseFloat(elementeText);
              break;
            case 'file_mkq71vjr': // Logo SVG
              // Parse file column value to get SVG URL
              try {
                const fileValue = column.value ? JSON.parse(column.value) : null;
                if (fileValue && fileValue.files && fileValue.files.length > 0) {
                  priceItem.logoSvg = fileValue.files[0].url;
                }
              } catch (e) {
                console.warn('Could not parse SVG file column:', e);
              }
              break;
          }
        });

        console.log(`✅ Verarbeitetes Item ${item.id}:`, priceItem);
        
        // Priorität 1: ID-basiertes Mapping (für wichtige Items wie UV-Druck)
        const idMappedKey = this.mapMondayIdToKey(item.id);
        if (idMappedKey) {
          updatedCache.set(idMappedKey, priceItem);
          console.log(`🎯 ID-MAPPING: Item ${item.id} ("${item.name}") → "${idMappedKey}"`, priceItem);
          
          // Spezielle Behandlung für UV-Druck
          if (item.id === '2090213361') {
            console.log(`🎨 UV-DRUCK GEFUNDEN! ID: ${item.id}, Preis: €${priceItem.preis}/m²`);
          }
          
          // Spezielle Behandlung für Hängesysteme
          if (item.id === '2092808058') {
            console.log(`🔗 HÄNGESYSTEME GEFUNDEN! ID: ${item.id}, Preis: €${priceItem.preis}`);
          }
        }
        
        // Priorität 2: Name-basiertes Mapping (als Fallback)
        const mappedKey = this.mapMondayNameToKey(item.name);
        if (mappedKey && !idMappedKey) { // Nur wenn noch kein ID-Mapping erfolgt ist
          updatedCache.set(mappedKey, priceItem);
          console.log(`🗝️ NAME-MAPPING: "${item.name}" → "${mappedKey}"`, priceItem);
        }
        
        // Store design data separately if it has design-specific fields
        if (priceItem.breite || priceItem.hoehe || priceItem.ledLaenge || priceItem.elemente || priceItem.logoSvg) {
          // Determine if logoSvg is SVG content or URL
          const isSvgContent = priceItem.logoSvg && priceItem.logoSvg.trim().startsWith('<svg');
          const isSvgUrl = priceItem.logoSvg && (priceItem.logoSvg.endsWith('.svg') || priceItem.logoSvg.includes('.svg'));
          
          this.designCache.set(item.id, {
            id: item.id,
            name: item.name,
            originalWidth: priceItem.breite || 0,
            originalHeight: priceItem.hoehe || 0,
            ledLength: priceItem.ledLaenge || 0,
            elements: priceItem.elemente || 0,
            // Handle SVG content or URL
            svgContent: isSvgContent ? priceItem.logoSvg : null,
            svgUrl: isSvgUrl ? priceItem.logoSvg : null,
            hasCustomSvg: !!(isSvgContent || isSvgUrl),
            // Fallback mockup URL
            mockupUrl: (!isSvgContent && !isSvgUrl && priceItem.logoSvg) ? priceItem.logoSvg : `https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&fit=crop`,
            description: `Design aus Monday.com: ${item.name}`
          });
          console.log(`🎨 Design-Daten gespeichert für Item ${item.id}:`, this.designCache.get(item.id));
        }
      });

      this.cache = updatedCache;
      this.lastSync = new Date();
      this.isConnected = true;
      this.lastError = null;
      this.connectionDetails.errorCount = 0;
      
      console.log('✅ Monday.com Sync erfolgreich:', {
        itemsProcessed: items.length,
        cacheSize: this.cache.size,
        method: usedMethod,
        timestamp: this.lastSync.toISOString()
      });
      return this.cache;

    } catch (error) {
      console.error('❌ Monday.com Sync Fehler:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        tokenAvailable: !!this.apiToken,
        tokenLength: this.apiToken.length
      });
      
      this.isConnected = false;
      this.lastError = error instanceof Error ? error.message : 'Unbekannter Fehler';
      this.connectionDetails.errorCount++;
      
      // Keep using fallback prices on error
      console.log('💾 Verwende Fallback-Preise bei API-Fehler');
      this.lastSync = new Date(); // Update lastSync even on error
      return this.cache;
    }
  }

  private mapMondayNameToKey(mondayName: string): string | null {
    console.log(`🗝️ Mapping-Versuch für: "${mondayName}"`);
    const mapping: Record<string, string> = {
      // Basis-Materialien
      'Acryl Glass': 'acryl_glass',
      'Acrylglas': 'acryl_glass',
      'UV Druck': 'uv_print',
      'UV-Druck': 'uv_print',
      'UV Print': 'uv_print',
      'LED': 'led',
      'Led': 'led',
      'Element': 'elements',
      'Elemente': 'elements',
      'Montage': 'assembly',
      'Assembly': 'assembly',
      'Verpackung': 'packaging',
      'Packaging': 'packaging',
      'Controller': 'controller',
      'Steuerung': 'controller',
      'Stundenlohn': 'hourly_wage',
      'Hourly Wage': 'hourly_wage',
      'Lohn': 'hourly_wage',
      // Aufschläge
      'Wasserdichtigkeit': 'waterproofing',
      'Wasserdicht': 'waterproofing',
      'Waterproof': 'waterproofing',
      'Mehrteilig': 'multi_part',
      'Multi Part': 'multi_part',
      'Zweiteilig': 'multi_part',
      'Verwaltungskosten': 'administrative_costs',
      'Verwaltung': 'administrative_costs',
      'Admin': 'administrative_costs',
      'Administrative Costs': 'administrative_costs',
      'Administrative': 'administrative_costs',
      'Verwaltungsaufwand': 'administrative_costs',
      'Administration': 'administrative_costs',
      'Express Herstellung': 'express_production',
      'Express Production': 'express_production',
      'Express': 'express_production',
      'Eilauftrag': 'express_production',
      // Transport
      'Kilometer': 'distance_rate',
      'Distance Rate': 'distance_rate',
      'Entfernung': 'distance_rate',
      'Anfahrt': 'distance_rate',
      // Netzteile
      'Netzteil USB bis 15W': 'power_usb_15w',
      'Power USB 15W': 'power_usb_15w',
      'Netzteil 30W': 'power_30w',
      'Power 30W': 'power_30w',
      'Netzteil 70W': 'power_70w',
      'Power 70W': 'power_70w',
      'Netzteil 120W': 'power_120w',
      'Power 120W': 'power_120w',
      'Netzteil 200W': 'power_200w',
      'Power 200W': 'power_200w',
      'Netzteil 250W': 'power_250w',
      'Power 250W': 'power_250w',
      'Netzteil 300W': 'power_300w',
      'Power 300W': 'power_300w',
      'Netzteil 400W': 'power_400w',
      'Power 400W': 'power_400w',
      'Netzteil 1000W': 'power_1000w',
      'Power 1000W': 'power_1000w',
      // Versand
      'DHL Klein Packet': 'dhl_klein_20cm',
      'DHL Klein': 'dhl_klein_20cm',
      'DHL mittlere Packet': 'dhl_mittel_60cm', 
      'DHL Mittel': 'dhl_mittel_60cm',
      'DHL Große Packet': 'dhl_gross_100cm',
      'DHL Groß': 'dhl_gross_100cm',
      'Spedition ab 120cm': 'spedition_120cm',
      'Spedition': 'spedition_120cm',
      'Gütertransport (palettiert) ab 240cm': 'gutertransport_240cm',
      'Gütertransport': 'gutertransport_240cm',
      // Hängesystem
      'Hängesystem': 'hanging_system',
      'Hanging System': 'hanging_system',
      'Aufhängung': 'hanging_system',
    };

    return mapping[mondayName] || null;
  }

  private mapMondayIdToKey(mondayId: string): string | null {
    // Spezielle ID-basierte Mappings für wichtige Items
    const idMapping: Record<string, string> = {
      '2090213361': 'uv_print', // UV-Druck Quadratmeter Preis
      '2090249238': 'administrative_costs', // Verwaltung
      '2090255592': 'waterproofing', // Wasserdicht
      '2090256392': 'multi_part', // Mehrteilig
      '2090288932': 'time_per_m2', // Zeit pro m²
      '2090294337': 'time_per_element', // Zeit pro Element
      '2090228072': 'hourly_wage', // Stundenlohn
      '2090227751': 'assembly', // Montage pro m²
      '2090242018': 'distance_rate', // Kilometer Preis
      '2090232832': 'dhl_klein_20cm', // DHL Klein
      '2090231734': 'dhl_mittel_60cm', // DHL Mittel
      '2090234197': 'dhl_gross_100cm', // DHL Groß
      '2090236189': 'spedition_120cm', // Spedition
      '2090240832': 'gutertransport_240cm', // Gütertransport
      '2090273149': 'controller', // Standard Controller bis 80W
      '2091194484': 'controller_high_power', // High-Power Controller ab 80W
      '2092808058': 'hanging_system', // Hängesysteme - Item ID 2092808058
    };

    return idMapping[mondayId] || null;
  }

  // Comprehensive pricing methods based on exact requirements

  // Base material costs
  getAcrylglasPrice(): number {
    return this.cache.get('acryl_glass')?.preis || 58.46;
  }

  getUvPrintPrice(): number {
    const uvPrintItem = this.cache.get('uv_print');
    const price = uvPrintItem?.preis || 36.22;
    console.log(`🎨 UV-Druck Preis abgerufen: €${price}/m² (aus Monday: ${uvPrintItem?.preis !== undefined ? uvPrintItem.preis : 'nicht gefunden'}, Item ID: ${uvPrintItem?.id || 'fallback'})`);
    return price;
  }

  getLedPrice(): number {
    return this.cache.get('led')?.preis || 2.50;
  }

  getElementPrice(): number {
    return this.cache.get('elements')?.preis || 2.00;
  }

  getAssemblyPrice(): number {
    const assemblyItem = this.cache.get('assembly');
    const price = assemblyItem?.preis || 150.00;
    console.log(`🔧 Montage pro m²: €${price} (aus Monday: ${assemblyItem?.preis !== undefined ? assemblyItem.preis : 'nicht gefunden'}, Item ID: ${assemblyItem?.id || 'fallback'})`);
    return price;
  }

  getPackagingPrice(): number {
    return this.cache.get('packaging')?.preis || 30.00;
  }

  getControllerPrice(): number {
    // Standard Controller für ≤80W - Item ID: 2090273149
    const standardController = this.cache.get('controller');
    const price = standardController?.preis || 20.00;
    console.log(`🔌 Standard Controller: €${price} (aus Monday: ${standardController?.preis !== undefined ? standardController.preis : 'nicht gefunden'}, Item ID: ${standardController?.id || 'fallback'})`);
    return price;
  }

  getHighPowerControllerPrice(): number {
    // High-Power Controller für >80W - Item ID: 2091194484
    const highPowerController = this.cache.get('controller_high_power');
    const price = highPowerController?.preis || 50.00;
    console.log(`🔌 High-Power Controller: €${price} (aus Monday: ${highPowerController?.preis !== undefined ? highPowerController.preis : 'nicht gefunden'}, Item ID: ${highPowerController?.id || 'fallback'})`);
    return price;
  }

  // Automatische Controller-Auswahl basierend auf 80W Grenze
  getControllerPriceByWattage(wattage: number): number {
    if (wattage > 80) {
      console.log(`⚡ Verbrauch ${wattage}W > 80W → High-Power Controller`);
      return this.getHighPowerControllerPrice();
    } else {
      console.log(`⚡ Verbrauch ${wattage}W ≤ 80W → Standard Controller`);
      return this.getControllerPrice();
    }
  }

  getHourlyWage(): number {
    const hourlyWageItem = this.cache.get('hourly_wage');
    const wage = hourlyWageItem?.preis || 25.00;
    console.log(`💰 Stundenlohn: €${wage}/h (aus Monday: ${hourlyWageItem?.preis !== undefined ? hourlyWageItem.preis : 'nicht gefunden'}, Item ID: ${hourlyWageItem?.id || 'fallback'})`);
    return wage;
  }

  // Power supply selection based on wattage
  getPowerSupplyPrice(wattage: number): number {
    if (wattage <= 15) return this.cache.get('power_usb_15w')?.preis || 5;
    if (wattage <= 30) return this.cache.get('power_30w')?.preis || 8;
    if (wattage <= 70) return this.cache.get('power_70w')?.preis || 15;
    if (wattage <= 120) return this.cache.get('power_120w')?.preis || 20;
    if (wattage <= 200) return this.cache.get('power_200w')?.preis || 30;
    if (wattage <= 250) return this.cache.get('power_250w')?.preis || 40;
    if (wattage <= 300) return this.cache.get('power_300w')?.preis || 50;
    if (wattage <= 400) return this.cache.get('power_400w')?.preis || 70;
    return this.cache.get('power_1000w')?.preis || 200;
  }

  // Shipping costs based on size
  getShippingPrice(longestSideCm: number): { method: string; price: number; description: string } {
    if (longestSideCm < 60) {
      return {
        method: 'DHL Klein Packet',
        price: this.cache.get('dhl_klein_20cm')?.preis || 20,
        description: 'DHL Klein Packet (20-59cm)'
      };
    }
    if (longestSideCm < 100) {
      return {
        method: 'DHL mittlere Packet',
        price: this.cache.get('dhl_mittel_60cm')?.preis || 40,
        description: 'DHL mittlere Packet (60-99cm)'
      };
    }
    if (longestSideCm < 120) {
      return {
        method: 'DHL Große Packet',
        price: this.cache.get('dhl_gross_100cm')?.preis || 80,
        description: 'DHL Große Packet (100-119cm)'
      };
    }
    if (longestSideCm < 240) {
      return {
        method: 'Spedition',
        price: this.cache.get('spedition_120cm')?.preis || 160,
        description: 'Spedition (120-239cm)'
      };
    }
    return {
      method: 'Gütertransport (palettiert)',
      price: this.cache.get('gutertransport_240cm')?.preis || 500,
      description: 'Gütertransport (ab 240cm)'
    };
  }

  // Percentage-based surcharges
  getWaterproofSurcharge(): number {
    const waterproofItem = this.cache.get('waterproofing');
    const percentage = waterproofItem?.prozent || 25;
    console.log(`🛡️ Wasserdicht Aufschlag: ${percentage}% (aus Monday: ${waterproofItem?.prozent})`);
    return percentage / 100;
  }

  getMultiPartSurcharge(): number {
    const multiPartItem = this.cache.get('multi_part');
    const percentage = multiPartItem?.prozent || 15;
    console.log(`✂️ Mehrteilig Aufschlag: ${percentage}% (aus Monday: ${multiPartItem?.prozent})`);
    return percentage / 100;
  }

  getAdministrativeCostsSurcharge(): number {
    const adminItem = this.cache.get('administrative_costs');
    console.log(`🔍 SUCHE administrative_costs in Cache:`, {
      found: adminItem ? 'JA' : 'NEIN',
      item: adminItem,
      prozent: adminItem?.prozent,
      itemId: adminItem?.id
    });
    
    const percentage = adminItem?.prozent !== undefined ? adminItem.prozent : 20;
    console.log(`📋 Verwaltungskosten: ${percentage}% (aus Monday: ${adminItem?.prozent !== undefined ? adminItem.prozent : 'nicht gefunden'}, Item ID: ${adminItem?.id || 'fallback'})`);
    return percentage / 100;
  }

  // Fixed costs
  getExpressProductionCost(): number {
    return this.cache.get('express_production')?.prozent || 30;
  }

  getExpressProductionSurcharge(): number {
    const percentage = this.getExpressProductionCost();
    console.log(`⚡ Express Herstellung: ${percentage}% (aus Monday: ${this.cache.get('express_production')?.prozent !== undefined ? this.cache.get('express_production')?.prozent : 'nicht gefunden'})`);
    return percentage / 100;
  }

  getDistanceRate(): number {
    const distanceItem = this.cache.get('distance_rate');
    const rate = distanceItem?.preis || 1.50;
    console.log(`🚗 Kilometer Preis: €${rate}/km (aus Monday: ${distanceItem?.preis !== undefined ? distanceItem.preis : 'nicht gefunden'}, Item ID: ${distanceItem?.id || 'fallback'})`);
    return rate;
  }

  getHangingSystemPrice(): number {
    const hangingSystemItem = this.cache.get('hanging_system');
    const price = hangingSystemItem?.preis || 25.00;
    console.log(`🔗 Hängesystem: €${price} (aus Monday: ${hangingSystemItem?.preis !== undefined ? hangingSystemItem.preis : 'nicht gefunden'}, Item ID: ${hangingSystemItem?.id || 'fallback'})`);
    console.log('🔍 Hanging System Cache Item:', hangingSystemItem);
    return price;
  }

  // Design-Daten Methoden
  getDesigns(): any[] {
    return Array.from(this.designCache.values());
  }

  getDesignById(id: string): any | null {
    return this.designCache.get(id) || null;
  }

  hasDesignData(): boolean {
    return this.designCache.size > 0;
  }

  // Labor calculation
  calculateLaborCost(areaM2: number, elementCount: number): number {
    // Versuche Werte aus Monday zu holen, sonst Fallback
    const timePerM2Item = this.cache.get('time_per_m2');
    const timePerElementItem = this.cache.get('time_per_element');
    
    const timePerM2 = timePerM2Item?.stunde || 3; // hours
    const timePerElement = timePerElementItem?.stunde || 0.1; // hours
    const hourlyWage = this.getHourlyWage();
    
    console.log(`⏰ Arbeitszeit: ${timePerM2}h/m² + ${timePerElement}h/Element × €${hourlyWage}/h`);
    
    const totalHours = (areaM2 * timePerM2) + (elementCount * timePerElement);
    const laborCost = totalHours * hourlyWage;
    
    console.log(`💼 Arbeitskosten: ${totalHours.toFixed(2)}h × €${hourlyWage} = €${laborCost.toFixed(2)}`);
    return laborCost;
  }

  // Installation cost calculation: (A×C)+(B×D)
  calculateInstallationCost(areaM2: number, postalCode?: string): number {
    // Nur berechnen wenn vollständige 5-stellige PLZ vorhanden
    if (!postalCode || !/^\d{5}$/.test(postalCode)) {
      return 0;
    }
    
    const assemblyPricePerM2 = this.getAssemblyPrice(); // (A) Montage pro m²
    const distanceRate = this.getDistanceRate(); // (B) Kilometer Preis
    
    let installation = assemblyPricePerM2 * areaM2; // (A × C)
    
    const distanceInfo = calculateDistance('67433', postalCode);
    const distanceKm = distanceInfo.distance; // (D) Kilometer Entfernung
    installation += distanceRate * distanceKm; // + (B × D)
    
    console.log(`🔧 Montage-Service Berechnung:
      (A) Montage pro m²: €${assemblyPricePerM2}
      (B) Kilometer Preis: €${distanceRate}/km
      (C) Quadratmeter: ${areaM2.toFixed(4)} m²
      (D) Entfernung: ${distanceKm} km
      Formel: (${assemblyPricePerM2} × ${areaM2.toFixed(4)}) + (${distanceRate} × ${distanceKm}) = €${installation.toFixed(2)}`);
    
    return installation;
  }

  // Power consumption calculation
  calculatePowerConsumption(ledLengthM: number): number {
    return Math.round(ledLengthM * 8 * 1.25); // 8W per meter × 1.25 safety factor
  }

  // Auto-sync management
  startAutoSync(intervalSeconds: number = 30): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        console.log('🔄 Auto-Sync gestartet um:', new Date().toLocaleTimeString());
        await this.fetchPrices();
        console.log('🔄 Auto-Sync erfolgreich:', new Date().toLocaleTimeString());
      } catch (error) {
        console.error('🔄 Auto-Sync Fehler:', error);
      }
    }, intervalSeconds * 1000);

    console.log(`🚀 Auto-Sync gestartet (alle ${intervalSeconds} Sekunden)`);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Auto-Sync gestoppt');
    }
  }

  // Status information
  getStatus(): { 
    isConnected: boolean; 
    lastSync: Date | null; 
    itemCount: number;
    autoSyncActive: boolean;
    lastError: string | null;
    connectionDetails: typeof this.connectionDetails;
  } {
    return {
      isConnected: this.isConnected,
      lastSync: this.lastSync,
      itemCount: this.cache.size,
      autoSyncActive: this.syncInterval !== null,
      lastError: this.lastError,
      connectionDetails: this.connectionDetails,
    };
  }

  // Debug methods
  getAllPrices(): Map<string, MondayPriceItem> {
    return new Map(this.cache);
  }

  getAllDesigns(): Map<string, any> {
    return new Map(this.designCache);
  }

  // Legacy compatibility methods (keeping old interface)
  getUvDruckPrice(): number {
    return this.getUvPrintPrice();
  }

  getVerpackungPrice(): number {
    return this.getPackagingPrice();
  }

  getMontagePrice(): number {
    return this.getAssemblyPrice();
  }

  getKilometerPrice(): number {
    return this.getDistanceRate();
  }
}

// Singleton instance
export const mondayService = new MondayService();
export default mondayService;