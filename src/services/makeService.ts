import { NeonDesign } from '../types/configurator';

// Типы данных, которые приходят из CRM через Make
export interface CRMDesignData {
  id: string;
  name: string;
  width: number; // в см
  height: number; // в см
  ledLength: number; // в метрах
  elements: number; // количество элементов
  svgContent?: string; // SVG-файл дизайна
  svgUrl?: string; // URL на SVG-файл
  isWaterproof: boolean; // Wasserdicht
  hasUvPrint: boolean; // UV-Druck
  clientId?: string; // ID клиента для генерации ссылки
  projectId?: string; // ID проекта
  createdAt?: string;
  expiresAt?: string;
}

export interface CRMProjectData {
  projectId: string;
  clientId: string;
  clientName?: string;
  designs: CRMDesignData[];
  metadata?: {
    contactEmail?: string;
    contactPhone?: string;
    deadline?: string;
    notes?: string;
  };
}

class MakeService {
  private webhookUrl: string;
  private apiKey: string;
  private scenarioId: string;
  private isConfigured: boolean = false;
  private cache: Map<string, CRMProjectData> = new Map();
  private lastUpdate: Date | null = null;

  constructor() {
    this.webhookUrl = import.meta.env.VITE_MAKE_WEBHOOK_URL || '';
    this.apiKey = import.meta.env.VITE_MAKE_API_KEY || '';
    this.scenarioId = import.meta.env.VITE_MAKE_SCENARIO_ID || '';
    
    this.isConfigured = !!(this.webhookUrl && this.apiKey);
    
    if (!this.isConfigured) {
      console.warn('⚠️ Make.com не настроен - отсутствуют переменные окружения');
      console.log('💡 Добавьте VITE_MAKE_WEBHOOK_URL и VITE_MAKE_API_KEY в .env файл');
    } else {
      console.log('🔗 Make.com сервис инициализирован');
      console.log('🔗 Webhook URL:', this.webhookUrl.substring(0, 50) + '...');
    }

    // Инициализация тестовых данных
    this.initializeMockData();
  }

  /**
   * Инициализация тестовых данных для демонстрации
   */
  private initializeMockData(): void {
    const mockProject: CRMProjectData = {
      projectId: 'proj_123456',
      clientId: 'client_789',
      clientName: 'Musterfirma GmbH',
      designs: [
        {
          id: 'crm_design_1',
          name: 'Firmenlogo Musterfirma',
          width: 400, // 4m
          height: 200, // 2m 
          ledLength: 12,
          elements: 5,
          isWaterproof: true,
          hasUvPrint: true,
          svgContent: `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="10" width="380" height="180" fill="none" stroke="#2563EB" stroke-width="4" rx="20"/>
            <text x="200" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#2563EB">MUSTERFIRMA</text>
            <text x="200" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6B7280">Professional Solutions GmbH</text>
            <circle cx="50" cy="50" r="20" fill="#2563EB"/>
            <circle cx="350" cy="150" r="15" fill="#2563EB"/>
          </svg>`,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 дней
        },
        {
          id: 'crm_design_2', 
          name: 'Produktname Neon',
          width: 300, // 3m
          height: 100, // 1m
          ledLength: 8,
          elements: 3,
          isWaterproof: false,
          hasUvPrint: true,
          svgContent: `<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 50 Q80 20, 140 50 Q200 20, 280 50" fill="none" stroke="#DC2626" stroke-width="6" stroke-linecap="round"/>
            <text x="150" y="65" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#DC2626">PREMIUM NEON</text>
          </svg>`,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      metadata: {
        contactEmail: 'kunde@musterfirma.de',
        contactPhone: '+49 123 456789',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Eilauftrag - bis Ende des Monats benötigt'
      }
    };

    this.cache.set(mockProject.projectId, mockProject);
    this.lastUpdate = new Date();
    console.log('🧪 Make.com Mock-Daten initialisiert:', mockProject);
  }

  /**
   * Получить данные проекта из CRM через Make
   */
  async fetchProjectData(projectId: string): Promise<CRMProjectData | null> {
    if (!this.isConfigured) {
      console.log('📦 Make.com не настроен - возвращаем mock данные');
      return this.cache.get(projectId) || null;
    }

    try {
      console.log('🔄 Запрос данных проекта из Make.com:', projectId);
      
      const response = await fetch(`${this.webhookUrl}/project/${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const projectData: CRMProjectData = await response.json();
      
      // Кешируем данные
      this.cache.set(projectId, projectData);
      this.lastUpdate = new Date();
      
      console.log('✅ Данные проекта получены из Make.com:', projectData);
      return projectData;
      
    } catch (error) {
      console.error('❌ Ошибка получения данных из Make.com:', error);
      
      // Fallback к кешированным данным
      const cachedData = this.cache.get(projectId);
      if (cachedData) {
        console.log('📦 Используем кешированные данные');
        return cachedData;
      }
      
      return null;
    }
  }

  /**
   * Отправить запрос на создание клиентской ссылки
   */
  async requestClientLink(projectData: CRMProjectData): Promise<string | null> {
    if (!this.isConfigured) {
      // Генерируем mock ссылку
      const linkId = `demo_${projectData.projectId}_${Date.now()}`;
      console.log('🔗 Mock клиентская ссылка:', linkId);
      return `${window.location.origin}/client/${linkId}`;
    }

    try {
      console.log('🔄 Запрос создания клиентской ссылки через Make.com');
      
      const response = await fetch(`${this.webhookUrl}/create-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          projectId: projectData.projectId,
          clientId: projectData.clientId,
          designs: projectData.designs.map(d => ({
            id: d.id,
            name: d.name,
            width: d.width,
            height: d.height,
            ledLength: d.ledLength,
            elements: d.elements,
            isWaterproof: d.isWaterproof,
            hasUvPrint: d.hasUvPrint
          })),
          expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 дней в миллисекундах
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Клиентская ссылка создана:', result.linkUrl);
      return result.linkUrl;
      
    } catch (error) {
      console.error('❌ Ошибка создания клиентской ссылки:', error);
      return null;
    }
  }

  /**
   * Конвертировать CRM данные в формат NeonDesign
   */
  convertToNeonDesigns(crmData: CRMProjectData): NeonDesign[] {
    return crmData.designs.map((design) => ({
      id: design.id,
      name: design.name,
      originalWidth: design.width,
      originalHeight: design.height,
      elements: design.elements,
      ledLength: design.ledLength,
      mockupUrl: `https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&fit=crop`,
      description: `Design aus CRM: ${design.name}`,
      // SVG поддержка
      svgContent: design.svgContent,
      svgUrl: design.svgUrl,
      hasCustomSvg: !!(design.svgContent || design.svgUrl),
      // Client link support
      expiresAt: design.expiresAt,
      createdAt: design.createdAt,
    }));
  }

  /**
   * Получить все доступные проекты (для админки)
   */
  getAllProjects(): CRMProjectData[] {
    return Array.from(this.cache.values());
  }

  /**
   * Получить статус сервиса
   */
  getStatus() {
    return {
      isConfigured: this.isConfigured,
      hasWebhookUrl: !!this.webhookUrl,
      hasApiKey: !!this.apiKey,
      lastUpdate: this.lastUpdate,
      cachedProjects: this.cache.size,
      projects: this.getAllProjects().map(p => ({
        projectId: p.projectId,
        clientName: p.clientName,
        designCount: p.designs.length
      }))
    };
  }

  /**
   * Очистить кеш (для тестирования)
   */
  clearCache(): void {
    this.cache.clear();
    this.lastUpdate = null;
    console.log('🧹 Make.com кеш очищен');
  }

  /**
   * Webhook endpoint для приема данных от Make.com
   * Это должно вызываться из API route
   */
  handleWebhook(data: any): CRMProjectData | null {
    try {
      // Валидация входящих данных
      if (!data.projectId || !data.designs || !Array.isArray(data.designs)) {
        throw new Error('Неверный формат данных webhook');
      }

      const projectData: CRMProjectData = {
        projectId: data.projectId,
        clientId: data.clientId || `client_${Date.now()}`,
        clientName: data.clientName,
        designs: data.designs.map((d: any) => ({
          id: d.id || `design_${Date.now()}_${Math.random()}`,
          name: d.name || 'Неизвестный дизайн',
          width: Number(d.width) || 200,
          height: Number(d.height) || 100,
          ledLength: Number(d.ledLength) || 5,
          elements: Number(d.elements) || 1,
          isWaterproof: Boolean(d.isWaterproof),
          hasUvPrint: Boolean(d.hasUvPrint),
          svgContent: d.svgContent,
          svgUrl: d.svgUrl,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })),
        metadata: data.metadata || {}
      };

      // Сохраняем в кеш
      this.cache.set(projectData.projectId, projectData);
      this.lastUpdate = new Date();

      console.log('📥 Webhook данные обработаны:', projectData);
      return projectData;
      
    } catch (error) {
      console.error('❌ Ошибка обработки webhook:', error);
      return null;
    }
  }
}

// Экспорт singleton instance
export const makeService = new MakeService();
export default makeService;
