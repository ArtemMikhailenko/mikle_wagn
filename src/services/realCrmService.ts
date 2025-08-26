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

  async updateProjectStatus(projectId: string, status: CRMProjectData['status']): Promise<void> {
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
        throw new Error('Failed to update project status');
      }
    } catch (error) {
      console.error('Error updating project status:', error);
      throw error;
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

  private mapSupabaseToProject(data: any): CRMProjectData {
    return {
      projectId: data.project_id,
      clientEmail: data.client_email,
      clientName: data.client_name,
      designName: data.design_name,
      svgContent: data.svg_content,
      svgUrl: data.svg_url,
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
}

export const crmService = new CRMService();
