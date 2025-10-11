// CRM сервис для прямой работы с Monday.com API без Supabase
import mondayDirectService from './mondayDirectService';
import { NeonDesign } from '../types/configurator';

export interface CRMProjectData {
  id: string;
  project_id: string;
  client_email: string;
  client_name: string;
  client_phone?: string;
  design_name: string;
  svg_content?: string;
  svg_url?: string;
  mockup_url?: string;
  mockup_urls?: string[];
  mockup_content?: string;
  notes?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  mondayId?: string;
  // Добавим размеры из Monday.com
  originalWidth?: number;
  originalHeight?: number;
  ledLength?: number;
  elements?: number;
  // Добавим настройки UV и водонепроницаемости из Monday.com
  hasUvPrint?: boolean;
  isWaterproof?: boolean;
}

export interface SyncResult {
  success: boolean;
  message: string;
  processed?: number;
  errors?: string[];
}

class DirectCRMService {
  // Получить все проекты напрямую с Monday.com
  async getAllProjects(): Promise<CRMProjectData[]> {
    try {
      console.log('🔄 Loading projects directly from Monday.com...');
      
      const neonDesigns = await mondayDirectService.getAllProjects();
      
      // Конвертируем NeonDesign в CRMProjectData
      const crmProjects: CRMProjectData[] = neonDesigns.map(design => {
        const clientEmail = design.clientEmail || 'no-email@example.com';
        const clientName = design.clientName || design.name;
        const clientPhone = design.clientPhone;
        const status = (design as any).status || 'draft';
        const mondayId = (design as any).mondayId || design.id;

        return {
          id: design.id,
          project_id: design.id,
          client_email: clientEmail,
          client_name: clientName,
          client_phone: clientPhone,
          design_name: design.name,
          svg_content: design.svgContent || undefined,
          svg_url: design.svgUrl || undefined,
          mockup_url: design.mockupUrl || undefined,
          mockup_urls: design.mockupUrls && design.mockupUrls.length ? design.mockupUrls : undefined,
          notes: design.description || undefined,
          status: status,
          created_at: design.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          mondayId: mondayId,
          // Передаем реальные размеры из Monday.com
          originalWidth: design.originalWidth,
          originalHeight: design.originalHeight,
          ledLength: design.ledLength,
          elements: design.elements
        };
      });

      console.log('✅ Loaded projects from Monday.com:', crmProjects.length);
      return crmProjects;
    } catch (error) {
      console.error('❌ Error loading projects from Monday.com:', error);
      return [];
    }
  }

  // Получить конкретный проект
  async getProjectById(projectId: string): Promise<CRMProjectData | null> {
    try {
      const design = await mondayDirectService.getProjectById(projectId);
      
      if (!design) {
        return null;
      }

      const clientEmail = design.clientEmail || 'no-email@example.com';
      const clientName = design.clientName || design.name;
      const clientPhone = design.clientPhone;
      const status = (design as any).status || 'draft';
      const mondayId = (design as any).mondayId || design.id;

      return {
        id: design.id,
        project_id: design.id,
        client_email: clientEmail,
        client_name: clientName,
        client_phone: clientPhone,
        design_name: design.name,
        svg_content: design.svgContent || undefined,
        svg_url: design.svgUrl || undefined,
        mockup_url: design.mockupUrl || undefined,
        mockup_urls: design.mockupUrls && design.mockupUrls.length ? design.mockupUrls : undefined,
        notes: design.description || undefined,
        status: status,
        created_at: design.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mondayId: mondayId,
        // Передаем реальные размеры из Monday.com
        originalWidth: design.originalWidth,
        originalHeight: design.originalHeight,
        ledLength: design.ledLength,
        elements: design.elements,
        // Передаем настройки UV и водонепроницаемости из Monday.com
        hasUvPrint: design.hasUvPrint,
        isWaterproof: design.isWaterproof
      };
    } catch (error) {
      console.error('❌ Error loading project from Monday.com:', error);
      return null;
    }
  }

  // Загрузить MockUp для проекта
  async loadMockupForProject(projectId: string): Promise<string | null> {
    try {
      return await mondayDirectService.getMockupForProject(projectId);
    } catch (error) {
      console.error('❌ Error loading mockup from Monday.com:', error);
      return null;
    }
  }

  // Загрузить список MockUp изображений для проекта
  async loadMockupsForProject(projectId: string): Promise<string[]> {
    try {
      if ((mondayDirectService as any).getMockupListForProject) {
        return await (mondayDirectService as any).getMockupListForProject(projectId);
      }
    } catch (error) {
      console.error('❌ Error loading mockup list from Monday.com:', error);
    }
    return [];
  }

  // Загрузить SVG содержимое по URL
  async loadSvgContent(svgUrl: string): Promise<string | null> {
    try {
      console.log('🔄 Loading SVG content from URL:', svgUrl);
      
      // Метод 1: Прямая загрузка через fetch
      try {
        const response = await fetch(svgUrl, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'image/svg+xml,text/plain,*/*'
          }
        });
        
        if (response.ok) {
          const svgContent = await response.text();
          console.log('✅ SVG content loaded via fetch, length:', svgContent.length);
          
          if (svgContent.includes('<svg') || svgContent.includes('<?xml')) {
            return svgContent;
          }
        }
      } catch (fetchError) {
        console.log('⚠️ Fetch failed, trying proxy method:', fetchError instanceof Error ? fetchError.message : 'Unknown error');
      }

      // Метод 2: Загрузка через proxy сервер для обхода CORS
      try {
        const apiBase = typeof window !== 'undefined' && window.location && window.location.origin
          ? window.location.origin
          : '';
        const edgeUrl = `${apiBase}/api/proxy-svg?url=${encodeURIComponent(svgUrl)}`;
        const localUrl = `http://localhost:3001/proxy-svg?url=${encodeURIComponent(svgUrl)}`;
        const proxyUrl = edgeUrl;
        console.log('🌐 Trying proxy URL:', proxyUrl);
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'image/svg+xml,text/plain,*/*'
          }
        });
        
        if (response.ok) {
          const svgContent = await response.text();
          console.log('✅ SVG content loaded via proxy, length:', svgContent.length);
          
          if (svgContent.includes('<svg') || svgContent.includes('<?xml')) {
            return svgContent;
          }
        } else {
          console.log('❌ Proxy response not ok:', response.status, response.statusText);
          // Dev fallback to local proxy
          try {
            console.log('🔁 Trying local proxy fallback:', localUrl);
            const resp2 = await fetch(localUrl, { headers: { 'Accept': 'image/svg+xml,text/plain,*/*' } });
            if (resp2.ok) {
              const svgContent = await resp2.text();
              if (svgContent.includes('<svg') || svgContent.includes('<?xml')) return svgContent;
            }
          } catch {}
        }
      } catch (proxyError) {
        console.log('⚠️ Proxy method failed:', proxyError instanceof Error ? proxyError.message : 'Unknown error');
        // Dev fallback to local proxy
        try {
          const localUrl = `http://localhost:3001/proxy-svg?url=${encodeURIComponent(svgUrl)}`;
          console.log('🔁 Trying local proxy fallback after error:', localUrl);
          const resp2 = await fetch(localUrl, { headers: { 'Accept': 'image/svg+xml,text/plain,*/*' } });
          if (resp2.ok) {
            const svgContent = await resp2.text();
            if (svgContent.includes('<svg') || svgContent.includes('<?xml')) return svgContent;
          }
        } catch {}
      }

      // Метод 3: Загрузка через img элемент и canvas (последний резерв)
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = async () => {
          try {
            // Создаем canvas для получения данных изображения
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              
              // Если это SVG, пытаемся получить оригинальный источник
              // Но так как это растровое изображение, создаем простой SVG wrapper
              const svgWrapper = `
                <svg width="${img.naturalWidth}" height="${img.naturalHeight}" xmlns="http://www.w3.org/2000/svg">
                  <image href="${svgUrl}" width="${img.naturalWidth}" height="${img.naturalHeight}"/>
                </svg>
              `;
              
              console.log('✅ Created SVG wrapper for image');
              resolve(svgWrapper);
            } else {
              console.warn('⚠️ Could not create canvas context');
              resolve(null);
            }
          } catch (error) {
            console.error('❌ Error processing image:', error);
            resolve(null);
          }
        };
        
        img.onerror = () => {
          console.error('❌ Could not load image from URL');
          resolve(null);
        };
        
        img.src = svgUrl;
      });
      
    } catch (error) {
      console.error('❌ Error loading SVG content:', error);
      return null;
    }
  }

  // Синхронизация с Monday.com (в данном случае просто обновление данных)
  async syncWithMonday(): Promise<SyncResult> {
    try {
      console.log('🔄 Syncing with Monday.com...');
      
      const projects = await this.getAllProjects();
      
      // Загружаем MockUp для каждого проекта
      let processedCount = 0;
      const errors: string[] = [];

      for (const project of projects) {
        try {
          const mockupUrl = await this.loadMockupForProject(project.mondayId || project.id);
          if (mockupUrl) {
            project.mockup_url = mockupUrl;
          }
          processedCount++;
        } catch (error) {
          errors.push(`Failed to load mockup for ${project.design_name}: ${error}`);
        }
      }

      return {
        success: true,
        message: `✅ Синхронизация завершена! Обработано ${processedCount} проектов из Monday.com`,
        processed: processedCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Ошибка синхронизации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        processed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Конвертация в NeonDesign (для совместимости)
  convertToNeonDesign(project: CRMProjectData): NeonDesign {
    return {
      id: project.project_id,
      name: project.design_name,
      originalWidth: project.originalWidth || 100, // Используем реальную ширину из Monday.com
      originalHeight: project.originalHeight || 30, // Используем реальную высоту из Monday.com
      elements: project.elements || 1,
      ledLength: project.ledLength || 3.0,
      mockupUrl: project.mockup_url || '',
      description: project.notes || '',
      svgContent: project.svg_content,
      svgUrl: project.svg_url,
      hasCustomSvg: !!project.svg_content,
      createdAt: project.created_at,
    };
  }

  // Создать клиентскую ссылку
  generateClientLink(projectId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/project/${projectId}`;
  }

  // Проверить доступность Monday.com API
  async checkMondayConnection(): Promise<boolean> {
    try {
      const projects = await mondayDirectService.getAllProjects();
      return Array.isArray(projects);
    } catch (error) {
      console.error('❌ Monday.com connection failed:', error);
      return false;
    }
  }
}

export const directCrmService = new DirectCRMService();
export default directCrmService;
