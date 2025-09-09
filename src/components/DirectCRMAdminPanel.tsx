import { useState, useEffect } from 'react';
import { Copy, Mail, Eye, CheckCircle, Clock, User, RefreshCw, Database } from 'lucide-react';
import { directCrmService, CRMProjectData } from '../services/directCrmService';

export default function DirectCRMAdminPanel() {
  const [projects, setProjects] = useState<CRMProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

  useEffect(() => {
    loadProjects();
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const isConnected = await directCrmService.checkMondayConnection();
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading CRM projects directly from Monday.com...');
      const data = await directCrmService.getAllProjects();
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
    setSyncMessage('🔄 Обновление данных с Monday.com...');
    
    try {
      const result = await directCrmService.syncWithMonday();
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

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const generateClientLink = (projectId: string) => {
    return directCrmService.generateClientLink(projectId);
  };

  const openClientView = (projectId: string) => {
    const link = generateClientLink(projectId);
    window.open(link, '_blank');
  };

  const sendEmailToClient = (clientEmail: string, projectId: string, designName: string) => {
    const clientLink = generateClientLink(projectId);
    const subject = encodeURIComponent(`Ihr Neon-Design: ${designName}`);
    const body = encodeURIComponent(`
Hallo,

Ihr individuelles Neon-Design ist bereit zur Ansicht!

Design: ${designName}
Projekt-ID: ${projectId}

Hier können Sie Ihr Design ansehen:
${clientLink}

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen,
Ihr Nontel Team
    `);
    
    window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
      case 'fertig':
        return 'text-green-400';
      case 'in_progress':
      case 'working':
      case 'in arbeit':
        return 'text-yellow-400';
      case 'draft':
      case 'entwurf':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
      case 'fertig':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
      case 'working':
      case 'in arbeit':
        return <Clock className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-400';
      case 'disconnected':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Monday.com verbunden';
      case 'disconnected':
        return 'Monday.com getrennt';
      default:
        return 'Verbindung prüfen...';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
              <h2 className="text-xl font-semibold mb-2">Lade Projekte aus Monday.com...</h2>
              <p className="text-gray-400">Direkte API Verbindung</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-400 mb-2">CRM Projekte</h1>
            <p className="text-gray-400">
              Verwalten Sie Kundenprojekte und generieren Sie Client-Links
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Database className="w-4 h-4" />
              <span className={`text-sm ${getConnectionStatusColor()}`}>
                {getConnectionStatusText()}
              </span>
              <span className="text-gray-500 text-sm">• Direkte Monday.com API</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSyncWithMonday}
              disabled={syncing}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Synchronisierung...' : 'Synchronisierung mit Monday.com'}
            </button>
            <button
              onClick={() => window.location.href = '/admin'}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              Test-Projekt erstellen
            </button>
          </div>
        </div>

        {/* Sync Message */}
        {syncMessage && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-sm">{syncMessage}</p>
          </div>
        )}

        {/* Projects Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700 border-b border-gray-600">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-300">Projekt</th>
                  <th className="text-left p-4 font-semibold text-gray-300">Kunde</th>
                  <th className="text-left p-4 font-semibold text-gray-300">Status</th>
                  <th className="text-left p-4 font-semibold text-gray-300">Erstellt</th>
                  <th className="text-left p-4 font-semibold text-gray-300">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="p-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-white">{project.design_name}</h3>
                        <p className="text-sm text-gray-400">{project.project_id}</p>
                        {project.notes && (
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {project.notes}
                          </p>
                        )}
                        {project.mockup_url && (
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <span>●</span>
                            <span>MockUp verfügbar</span>
                          </div>
                        )}
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className="text-yellow-400 text-xs">★</span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-white">{project.client_name}</p>
                          <p className="text-sm text-gray-400">{project.client_email}</p>
                          {project.mondayId && (
                            <p className="text-xs text-gray-500">Monday ID: {project.mondayId}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className={`flex items-center gap-2 ${getStatusColor(project.status)}`}>
                        {getStatusIcon(project.status)}
                        <span className="capitalize">{project.status}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <p className="text-white">{formatDate(project.created_at).split(',')[0]}</p>
                        <p className="text-gray-400">{formatDate(project.created_at).split(',')[1]}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(generateClientLink(project.project_id), project.id)}
                          className="bg-blue-600 hover:bg-blue-700 p-2 rounded transition-colors"
                          title="Link kopieren"
                        >
                          {copiedId === project.id ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => sendEmailToClient(project.client_email, project.project_id, project.design_name)}
                          className="bg-green-600 hover:bg-green-700 p-2 rounded transition-colors"
                          title="E-Mail senden"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openClientView(project.project_id)}
                          className="bg-purple-600 hover:bg-purple-700 p-2 rounded transition-colors"
                          title="Vorschau öffnen"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <Database className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold mb-2 text-gray-400">Keine Projekte gefunden</h3>
            <p className="text-gray-500 mb-6">
              {connectionStatus === 'disconnected' 
                ? 'Verbindung zu Monday.com prüfen'
                : 'Synchronisieren Sie mit Monday.com um Projekte zu laden'
              }
            </p>
            <button
              onClick={handleSyncWithMonday}
              disabled={syncing}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 px-6 py-3 rounded-lg flex items-center gap-2 mx-auto transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Mit Monday.com synchronisieren
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            {projects.length} Projekte • Direkte Monday.com API • 
            Status: <span className={getConnectionStatusColor()}>{getConnectionStatusText()}</span>
          </p>
          <p className="mt-1">
            Alle Daten werden in Echtzeit von Monday.com geladen ohne Supabase
          </p>
        </div>
      </div>
    </div>
  );
}
