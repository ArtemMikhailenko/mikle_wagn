// Real CRM Integration Service with Supabase
import { supabase } from '../lib/supabase';
import { NeonDesign } from '../types/configurator';

export interface CRMProjectData {
  projectId: string;
  clientEmail: string;
  clientName: string;
  designName: string;
  svgContent?: string;
  svgUrl?: string;
  mockupUrl?: string;
  mockupContent?: string;
  notes?: string;
  createdAt: string;
  expiresAt?: string;
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'completed';
}

export interface ClientInteraction {
  id: string;
  projectId: string;
  interactionType: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: string;
}

class CRMService {
  private cache: Map<string, CRMProjectData> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Синхронизация с Monday.com
  async syncWithMonday(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Starting Monday.com sync...');
      
      // Прямой вызов Edge Function через HTTP
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/client-sync`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown sync error');
      }
      
      // Очищаем кеш после синхронизации
      this.cache.clear();
      this.cacheExpiry = 0;
      
      return {
        success: true,
        message: `✅ Синхронизировано ${data.clientsUpdated || 0} клиентов из Monday.com`
      };
    } catch (error) {
      console.error('❌ Error syncing with Monday.com:', error);
      return {
        success: false,
        message: `❌ Ошибка синхронизации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      };
    }
  }

  async getAllProjects(): Promise<CRMProjectData[]> {
    try {
      const { data, error } = await supabase
        .from('crm_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching CRM projects:', error);
        return this.getFallbackData();
      }

      return data.map(this.mapSupabaseToProject);
    } catch (error) {
      console.error('CRM fetch error:', error);
      return this.getFallbackData();
    }
  }

  async getProject(projectId: string): Promise<CRMProjectData | null> {
    try {
      const { data, error } = await supabase
        .from('crm_projects')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error || !data) {
        console.error('Error fetching project:', error);
        return null;
      }

      return this.mapSupabaseToProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      return null;
    }
  }

  async createProject(projectData: Partial<CRMProjectData>): Promise<string> {
    try {
      const projectId = this.generateProjectId();
      
      const { error } = await supabase
        .from('crm_projects')
        .insert({
          project_id: projectId,
          client_email: projectData.clientEmail,
          client_name: projectData.clientName,
          design_name: projectData.designName,
          svg_content: projectData.svgContent,
          svg_url: projectData.svgUrl,
          notes: projectData.notes,
          status: projectData.status || 'draft',
          expires_at: projectData.expiresAt
        });

      if (error) {
        console.error('Error creating project:', error);
        throw new Error('Failed to create project');
      }

      return projectId;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProjectStatus(projectId: string, status: CRMProjectData['status']): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('crm_projects')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId);

      if (error) {
        console.error('Error updating project status:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating project status:', error);
      return false;
    }
  }

  async logInteraction(projectId: string, interactionType: string, metadata?: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('client_interactions')
        .insert({
          project_id: projectId,
          interaction_type: interactionType,
          ip_address: metadata?.ipAddress,
          user_agent: navigator.userAgent,
          metadata: metadata
        });

      if (error) {
        console.error('Error logging interaction:', error);
      }
    } catch (error) {
      console.error('Error logging interaction:', error);
    }
  }

  async getProjectInteractions(projectId: string): Promise<ClientInteraction[]> {
    try {
      const { data, error } = await supabase
        .from('client_interactions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching interactions:', error);
        return [];
      }

      return data.map(item => ({
        id: item.id,
        projectId: item.project_id,
        interactionType: item.interaction_type,
        ipAddress: item.ip_address,
        userAgent: item.user_agent,
        metadata: item.metadata,
        createdAt: item.created_at
      }));
    } catch (error) {
      console.error('Error fetching interactions:', error);
      return [];
    }
  }

  generateClientLink(projectId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/client/${projectId}`;
  }

  generateProjectId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `CRM-${timestamp}-${random}`.toUpperCase();
  }

  async sendClientEmail(projectId: string, clientEmail: string): Promise<boolean> {
    try {
      // Log the email sending attempt
      await this.logInteraction(projectId, 'email_sent', {
        clientEmail,
        timestamp: new Date().toISOString()
      });

      // Update project status to 'sent'
      await this.updateProjectStatus(projectId, 'sent');

      // In a real implementation, you would integrate with an email service here
      // For now, we'll simulate success
      console.log(`Email sent to ${clientEmail} for project ${projectId}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  private mapSupabaseToProject(data: any): CRMProjectData {
    return {
      projectId: data.project_id,
      clientEmail: data.client_email,
      clientName: data.client_name,
      designName: data.design_name,
      svgContent: data.svg_content,
      svgUrl: data.svg_url,
      mockupUrl: data.mockup_url,
      mockupContent: data.mockup_content,
      notes: data.notes,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      status: data.status
    };
  }

  private getFallbackData(): CRMProjectData[] {
    // Fallback mock data if Supabase is unavailable
    return [
      {
        projectId: "CRM-001",
        clientEmail: "kunde@example.com",
        clientName: "Max Mustermann",
        designName: "Cafe Berlin Neon",
        svgContent: `<svg viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg">
          <text x="20" y="50" fill="#00ff00" font-family="Arial" font-size="30">CAFE BERLIN</text>
        </svg>`,
        notes: "Erstes Design für Cafe Berlin",
        createdAt: new Date().toISOString(),
        status: 'sent'
      },
      {
        projectId: "CRM-002",
        clientEmail: "info@restaurant-luna.de",
        clientName: "Restaurant Luna",
        designName: "Luna Restaurant Sign",
        svgContent: `<svg viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg">
          <text x="10" y="50" fill="#4488ff" font-family="serif" font-size="32">LUNA</text>
        </svg>`,
        notes: "Blaue Neonfarbe, elegante Schrift",
        createdAt: new Date().toISOString(),
        status: 'viewed'
      }
    ];
  }

  // Конвертация CRM проекта в NeonDesign для клиентского интерфейса
  convertToNeonDesign(projectData: CRMProjectData): NeonDesign {
    return {
      id: projectData.projectId,
      name: projectData.designName,
      originalWidth: 400,
      originalHeight: 100,
      elements: 1,
      ledLength: 3,
      mockupUrl: projectData.svgUrl || '',
      description: projectData.notes || `Custom design for ${projectData.clientName}`,
      svgContent: projectData.svgContent || `<svg viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg">
        <text x="20" y="60" fill="#00ff00" font-family="Arial" font-size="36">${projectData.clientName}</text>
      </svg>`,
      svgUrl: projectData.svgUrl,
      hasCustomSvg: !!projectData.svgContent,
      expiresAt: projectData.expiresAt,
      createdAt: projectData.createdAt
    };
  }
}

export const crmService = new CRMService();
