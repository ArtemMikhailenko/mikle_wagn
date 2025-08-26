import React, { useState, useEffect } from 'react';
import { Copy, Mail, Eye, CheckCircle, Clock, User } from 'lucide-react';
import { crmService, CRMProjectData } from '../services/crmService';

export default function CRMAdminPanel() {
  const [projects, setProjects] = useState<CRMProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading CRM projects from Supabase...');
      const data = await crmService.getAllProjects();
      console.log('✅ Loaded projects:', data.length, 'projects');
      setProjects(data);
    } catch (error) {
      console.error('❌ Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncWithMonday = async () => {
    setSyncing(true);
    setSyncMessage('🔄 Синхронизация с Monday.com...');
    
    try {
      const result = await crmService.syncWithMonday();
      setSyncMessage(result.message);
      
      if (result.success) {
        // Перезагружаем данные после успешной синхронизации
        setTimeout(() => {
          loadProjects();
          setSyncMessage('');
        }, 2000);
      }
    } catch (error) {
      setSyncMessage(`❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setSyncing(false);
    }
  };

  const copyClientLink = async (projectId: string) => {
    const link = crmService.generateClientLink(projectId);
    await navigator.clipboard.writeText(link);
    setCopiedId(projectId);
    setTimeout(() => setCopiedId(null), 2000);
  };

    const sendClientEmail = async (projectId: string, clientEmail: string) => {
    try {
      const success = await crmService.sendClientEmail(projectId, clientEmail);
      if (success) {
        alert(`Email an ${clientEmail} erfolgreich gesendet!`);
        loadProjects(); // Reload to update status
      } else {
        alert('Fehler beim Senden der Email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Fehler beim Senden der Email');
    }
  };

  const createTestProject = async () => {
    try {
      const testProject = {
        clientEmail: `test-${Date.now()}@example.com`,
        clientName: `Test Kunde ${new Date().toLocaleTimeString()}`,
        designName: `Test Design ${Math.floor(Math.random() * 1000)}`,
        svgContent: `<svg viewBox="0 0 300 60" xmlns="http://www.w3.org/2000/svg">
          <text x="15" y="35" fill="#ff6600" font-family="Arial" font-size="24">TEST NEON</text>
        </svg>`,
        notes: `Neues Test-Projekt erstellt um ${new Date().toLocaleString()}`,
        status: 'draft' as const
      };

      const projectId = await crmService.createProject(testProject);
      console.log('✅ Test project created:', projectId);
      alert(`Test-Projekt ${projectId} erfolgreich erstellt!`);
      loadProjects(); // Reload projects
    } catch (error) {
      console.error('❌ Error creating test project:', error);
      alert('Fehler beim Erstellen des Test-Projekts');
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('de-DE', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const getStatusBadge = (status: CRMProjectData['status']) => {
    const statusConfig = {
      draft: { color: 'gray', text: 'Entwurf' },
      sent: { color: 'blue', text: 'Gesendet' },
      viewed: { color: 'yellow', text: 'Angesehen' },
      approved: { color: 'green', text: 'Genehmigt' },
      completed: { color: 'green', text: 'Abgeschlossen' }
    };
    
    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium 
        ${config.color === 'gray' ? 'bg-gray-600 text-gray-200' : ''}
        ${config.color === 'blue' ? 'bg-blue-600 text-blue-200' : ''}
        ${config.color === 'yellow' ? 'bg-yellow-600 text-yellow-200' : ''}
        ${config.color === 'green' ? 'bg-green-600 text-green-200' : ''}
      `}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="text-xl">Projekte werden geladen...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">CRM Projekte</h1>
              <p className="text-gray-400">Verwalten Sie Kundenprojekte und generieren Sie Client-Links</p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={handleSyncWithMonday}
                disabled={syncing}
                className={`${syncing ? 'bg-gray-600' : 'bg-purple-600 hover:bg-purple-700'} text-white px-4 py-2 rounded-lg flex items-center space-x-2`}
              >
                <span>🔄</span>
                <span>{syncing ? 'Синхронизация...' : 'Синхронизация с Monday.com'}</span>
              </button>
              <button 
                onClick={createTestProject}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>Test-Projekt erstellen</span>
              </button>
            </div>
          </div>
          
          {syncMessage && (
            <div className={`mt-4 p-3 rounded-lg ${
              syncMessage.includes('✅') ? 'bg-green-800 text-green-200' : 
              syncMessage.includes('❌') ? 'bg-red-800 text-red-200' : 
              'bg-blue-800 text-blue-200'
            }`}>
              {syncMessage}
            </div>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">Keine Projekte gefunden</div>
            <div className="text-sm text-gray-500 mt-2">Erstellen Sie ein neues Projekt im CRM System</div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left">Projekt</th>
                    <th className="px-6 py-4 text-left">Kunde</th>
                    <th className="px-6 py-4 text-left">Status</th>
                    <th className="px-6 py-4 text-left">Erstellt</th>
                    <th className="px-6 py-4 text-left">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {projects.map((project) => (
                    <tr key={project.projectId} className="hover:bg-gray-750">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium">{project.designName}</div>
                          <div className="text-sm text-gray-400">{project.projectId}</div>
                          {project.notes && (
                            <div className="text-xs text-gray-500 mt-1">{project.notes}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{project.clientName}</span>
                        </div>
                        <div className="text-sm text-gray-400">{project.clientEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(project.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Clock className="w-4 h-4" />
                          {formatDate(project.createdAt)}
                        </div>
                        {project.expiresAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            Läuft ab: {formatDate(project.expiresAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyClientLink(project.projectId)}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                            title="Client-Link kopieren"
                          >
                            <Copy className="w-3 h-3" />
                            {copiedId === project.projectId ? 'Kopiert!' : 'Link'}
                          </button>
                          
                          <button
                            onClick={() => sendClientEmail(project.projectId, project.clientEmail)}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                            title="Email senden"
                          >
                            <Mail className="w-3 h-3" />
                            Email
                          </button>

                          {project.status === 'viewed' && (
                            <div className="flex items-center gap-1 text-green-400 text-sm">
                              <Eye className="w-3 h-3" />
                              <span>Gesehen</span>
                            </div>
                          )}

                          {project.status === 'approved' && (
                            <div className="flex items-center gap-1 text-green-400 text-sm">
                              <CheckCircle className="w-3 h-3" />
                              <span>Genehmigt</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8 p-6 bg-gray-800 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Entwicklungs-Hinweise</h2>
          <div className="space-y-2 text-sm text-gray-400">
            <p>• Testdaten verfügbar: CRM-001, CRM-002</p>
            <p>• Client-Links: <code className="text-blue-400">/client/CRM-001</code></p>
            <p>• Status wird automatisch aktualisiert wenn Kunden die Links öffnen</p>
            <p>• Email-Versand ist simuliert (siehe Console-Log)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
