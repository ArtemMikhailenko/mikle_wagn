import { useState, useEffect } from 'react';
import { Copy, Mail, Eye, CheckCircle, Clock, User, Search, Filter } from 'lucide-react';
import { crmService, CRMProjectData } from '../services/crmService';

export default function CRMAdminPanel() {
  const [projects, setProjects] = useState<CRMProjectData[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<CRMProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, statusFilter]);

  const filterProjects = () => {
    let filtered = [...projects];

    // Фильтр по поисковому запросу
    if (searchTerm) {
      filtered = filtered.filter(project => 
        project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.designName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.projectId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Фильтр по статусу
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    setFilteredProjects(filtered);
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading CRM projects from Supabase...');
      const data = await crmService.getAllProjects();
      console.log('✅ Loaded projects:', data.length, 'projects');
      
      // Сортируем проекты по дате создания (новые сверху)
      const sortedData = data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setProjects(sortedData);
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
      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">CRM Projekte</h1>
              <p className="text-gray-400 text-sm lg:text-base">Verwalten Sie Kundenprojekte und generieren Sie Client-Links</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button 
                onClick={handleSyncWithMonday}
                disabled={syncing}
                className={`${syncing ? 'bg-gray-600' : 'bg-purple-600 hover:bg-purple-700'} text-white px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-2 text-sm lg:text-base font-medium transition-colors touch-manipulation min-h-[44px] sm:min-h-[auto]`}
              >
                <span className="text-base">🔄</span>
                <span className="hidden sm:inline whitespace-nowrap">{syncing ? 'Синхронизация...' : 'Синхронизация с Monday.com'}</span>
                <span className="sm:hidden">{syncing ? 'Sync...' : 'Monday'}</span>
              </button>
              <button 
                onClick={createTestProject}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-2 text-sm lg:text-base font-medium transition-colors touch-manipulation min-h-[44px] sm:min-h-[auto]"
              >
                <User className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">Test-Projekt erstellen</span>
                <span className="sm:hidden">Test</span>
              </button>
            </div>
          </div>
          
          {syncMessage && (
            <div className={`mt-4 p-3 sm:p-4 rounded-lg text-sm sm:text-base ${
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
          <>
            {/* Фильтры и поиск */}
            <div className="mb-4 sm:mb-6 bg-gray-800 rounded-xl p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row">
                {/* Поиск */}
                <div className="flex-1 order-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Suche nach Name, E-Mail oder ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 sm:py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm sm:text-base min-h-[44px] sm:min-h-[auto]"
                    />
                  </div>
                </div>

                {/* Контейнер для фильтра и счетчика */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 order-2 lg:order-2">
                  {/* Статус фильтр */}
                  <div className="flex items-center gap-2">
                    <Filter className="text-gray-400 w-4 h-4 flex-shrink-0" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2.5 sm:py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base min-h-[44px] sm:min-h-[auto] flex-1 sm:flex-none"
                    >
                      <option value="all">Alle Status</option>
                      <option value="draft">Entwurf</option>
                      <option value="sent">Gesendet</option>
                      <option value="viewed">Angesehen</option>
                      <option value="approved">Genehmigt</option>
                      <option value="completed">Abgeschlossen</option>
                    </select>
                  </div>

                  {/* Anzahl Ergebnisse */}
                  <div className="flex items-center justify-center sm:justify-start text-xs sm:text-sm text-gray-400 py-1">
                    <span className="whitespace-nowrap">{filteredProjects.length} von {projects.length} Projekten</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium">Projekt</th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium">Kunde</th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium hidden sm:table-cell">Status</th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium hidden md:table-cell">Erstellt</th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredProjects.map((project) => (
                      <tr key={project.projectId} className="hover:bg-gray-750 transition-colors">
                        <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                          <div>
                            <div className="font-medium text-sm lg:text-base line-clamp-2">{project.designName}</div>
                            <div className="text-xs sm:text-sm text-gray-400 font-mono">{project.projectId}</div>
                            {project.notes && (
                              <div className="text-xs text-gray-500 mt-1 line-clamp-2">{project.notes}</div>
                            )}
                            {/* На мобильных показываем статус здесь */}
                            <div className="sm:hidden mt-2">
                              {getStatusBadge(project.status)}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-sm lg:text-base line-clamp-1">{project.clientName}</span>
                          </div>
                          <div className="text-xs sm:text-sm text-gray-400 break-all">{project.clientEmail}</div>
                          {/* На мобильных показываем дату здесь */}
                          <div className="md:hidden mt-1">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span className="line-clamp-1">{formatDate(project.createdAt)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden sm:table-cell">
                          {getStatusBadge(project.status)}
                        </td>
                        <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden md:table-cell">
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            <span className="line-clamp-1">{formatDate(project.createdAt)}</span>
                          </div>
                          {project.expiresAt && (
                            <div className="text-xs text-gray-500 mt-1">
                              Läuft ab: {formatDate(project.expiresAt)}
                            </div>
                          )}
                        </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            <button
                              onClick={() => copyClientLink(project.projectId)}
                              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs sm:text-sm transition-colors whitespace-nowrap touch-manipulation min-h-[36px] sm:min-h-[auto]"
                              title="Client-Link kopieren"
                            >
                              <Copy className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="hidden sm:inline">{copiedId === project.projectId ? 'Kopiert!' : 'Link'}</span>
                            </button>
                            
                            <button
                              onClick={() => sendClientEmail(project.projectId, project.clientEmail)}
                              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-1 bg-green-600 hover:bg-green-700 rounded text-xs sm:text-sm transition-colors whitespace-nowrap touch-manipulation min-h-[36px] sm:min-h-[auto]"
                              title="Email senden"
                            >
                              <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="hidden sm:inline">Email</span>
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {project.status === 'viewed' && (
                              <div className="flex items-center gap-1 text-green-400 text-xs sm:text-sm">
                                <Eye className="w-3 h-3 flex-shrink-0" />
                                <span className="hidden sm:inline">Gesehen</span>
                              </div>
                            )}

                            {project.status === 'approved' && (
                              <div className="flex items-center gap-1 text-green-400 text-xs sm:text-sm">
                                <CheckCircle className="w-3 h-3 flex-shrink-0" />
                                <span className="hidden sm:inline">Genehmigt</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}

        <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gray-800 rounded-xl">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Entwicklungs-Hinweise</h2>
          <div className="space-y-2 text-xs sm:text-sm text-gray-400">
            <p>• Testdaten verfügbar: CRM-001, CRM-002</p>
            <p>• Client-Links: <code className="text-blue-400 text-xs">/client/CRM-001</code></p>
            <p>• Status wird automatisch aktualisiert wenn Kunden die Links öffnen</p>
            <p>• Email-Versand ist simuliert (siehe Console-Log)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
