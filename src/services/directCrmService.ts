// CRM сервис для прямой работы с Monday.com API без Supabase
import mondayDirectService from './mondayDirectService';
import { NeonDesign } from '../types/configurator';

export interface CRMProjectData {
  id: string;
  project_id: string;
  client_email: string;
  client_name: string;
  design_name: string;
  svg_content?: string;
  svg_url?: string;
  mockup_url?: string;
  mockup_content?: string;
  notes?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  mondayId?: string;
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
        const clientEmail = (design as any).clientEmail || 'no-email@example.com';
        const clientName = (design as any).clientName || design.name;
        const status = (design as any).status || 'draft';
        const mondayId = (design as any).mondayId || design.id;

        return {
          id: design.id,
          project_id: design.id,
          client_email: clientEmail,
          client_name: clientName,
          design_name: design.name,
          svg_content: design.svgContent || undefined,
          svg_url: design.svgUrl || undefined,
          mockup_url: design.mockupUrl || undefined,
          notes: design.description || undefined,
          status: status,
          created_at: design.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          mondayId: mondayId
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

      const clientEmail = (design as any).clientEmail || 'no-email@example.com';
      const clientName = (design as any).clientName || design.name;
      const status = (design as any).status || 'draft';
      const mondayId = (design as any).mondayId || design.id;

      return {
        id: design.id,
        project_id: design.id,
        client_email: clientEmail,
        client_name: clientName,
        design_name: design.name,
        svg_content: design.svgContent || undefined,
        svg_url: design.svgUrl || undefined,
        mockup_url: design.mockupUrl || undefined,
        notes: design.description || undefined,
        status: status,
        created_at: design.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mondayId: mondayId
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
      originalWidth: 100, // default
      originalHeight: 30, // default
      elements: 1,
      ledLength: 3.0,
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
    return `${baseUrl}/client/${projectId}`;
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
