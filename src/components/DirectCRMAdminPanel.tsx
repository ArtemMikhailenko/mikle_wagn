import { useState, useEffect } from 'react';
import LottieLoader from './LottieLoader';
import { Copy, Mail, Eye, RefreshCw, Database, Search, X } from 'lucide-react';
import { directCrmService, CRMProjectData } from '../services/directCrmService';

export default function DirectCRMAdminPanel() {
  const [projects, setProjects] = useState<CRMProjectData[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<CRMProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProjects();
    checkConnection();
  }, []);

  // Apply filters whenever projects or search term changes
  useEffect(() => {
    applyFilters();
  }, [projects, searchTerm]);

  const applyFilters = () => {
    let filtered = [...projects];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(project => 
        project.design_name?.toLowerCase().includes(term) ||
        project.client_email?.toLowerCase().includes(term) ||
        project.client_name?.toLowerCase().includes(term) ||
        project.id?.toLowerCase().includes(term)
      );
    }

    // Always sort by created_at DESC (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || '').getTime();
      const dateB = new Date(b.created_at || '').getTime();
      return dateB - dateA; // Newest first
    });

    setFilteredProjects(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
  };

  const getFilterCount = () => {
    let count = 0;
    if (searchTerm) count++;
    return count;
  };

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
    if (syncing) return; // guard against double clicks
    setSyncing(true);
    setSyncMessage('🔄 Обновление данных с Monday.com...');

    // Safety fallback: ensure UI doesn't get stuck
    const safety = setTimeout(() => {
      setSyncing(false);
      // Hard-clear message too if still the initial text
      setSyncMessage((prev) => prev && prev.includes('Обновление данных') ? '' : prev);
    }, 60000);

    try {
      const result = await directCrmService.syncWithMonday();
      // Stop spinner as soon as core work is done
      setSyncing(false);
      setSyncMessage(result.success ? `✅ Синхронизация завершена! ${result.processed ?? ''}`.trim() : result.message);
      
      if (result.success) {
        // Kick off projects reload but don't block UI
        loadProjects().catch(() => {/* no-op */});
        // Clear the banner shortly after
        setTimeout(() => {
          setSyncMessage('');
        }, 2000);
      }
    } catch (error) {
      setSyncMessage(`❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      clearTimeout(safety);
      // Ensure UI never remains stuck in syncing state
      setSyncing(false);
      // Auto-clear any leftover message after a max visible time
      setTimeout(() => {
        setSyncMessage((prev) => prev && (prev.includes('Обновление данных') || prev.startsWith('✅') || prev.startsWith('❌')) ? '' : prev);
      }, 8000);
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

  const createTestProject = async () => {
    console.log('Creating test project...');
    // This is a placeholder function for test project creation
    // You can implement actual test project creation logic here
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <LottieLoader size={32} className="mx-auto mb-4" label="" />
              <h2 className="text-xl font-semibold mb-2">Lade Projekte aus Monday.com...</h2>
              <p className="text-gray-400">Direkte API Verbindung</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 lg:mb-8 lg:flex-row lg:justify-between lg:items-center">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-400 mb-1 sm:mb-2">CRM Projekte</h1>
            <p className="text-gray-400 text-sm lg:text-base mb-2">
              Verwalten Sie Kundenprojekte und generieren Sie Client-Links
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <Database className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className={`${getConnectionStatusColor()}`}>
                {getConnectionStatusText()}
              </span>
              <span className="text-gray-500">• Direkte Monday.com API</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={handleSyncWithMonday}
              disabled={syncing}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm lg:text-base font-medium touch-manipulation min-h-[44px] sm:min-h-[auto]"
            >
              {syncing ? <LottieLoader size={16} className="flex-shrink-0" label="" /> : <RefreshCw className="w-4 h-4 flex-shrink-0" />}
              <span className="hidden sm:inline whitespace-nowrap">{syncing ? 'Synchronisierung...' : 'Synchronisierung mit Monday.com'}</span>
              <span className="sm:hidden">{syncing ? 'Sync...' : 'Monday'}</span>
            </button>
            <button
              onClick={() => window.location.href = '/admin'}
              className="bg-blue-600 hover:bg-blue-700 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg transition-colors text-sm lg:text-base font-medium touch-manipulation min-h-[44px] sm:min-h-[auto] whitespace-nowrap"
            >
              <span className="hidden sm:inline">Zurück zum Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Suche nach Name, E-Mail oder ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base min-h-[44px] sm:min-h-[auto]"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {getFilterCount() > 0 && (
              <button
                onClick={clearFilters}
                className="px-3 py-2.5 sm:py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base font-medium touch-manipulation min-h-[44px] sm:min-h-[auto]"
              >
                <X className="w-4 h-4 flex-shrink-0" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Filter Summary */}
          <div className="mt-3 flex items-center justify-between text-sm text-gray-400">
            <span>
              Zeige {filteredProjects.length} von {projects.length} Projekten
            </span>
            {getFilterCount() > 0 && (
              <span>
                {getFilterCount()} Filter aktiv
              </span>
            )}
          </div>
        </div>

        {syncMessage && (
          <div className="mb-6 p-4 bg-blue-900 border border-blue-700 rounded-lg">
            <p className="text-blue-200">{syncMessage}</p>
          </div>
        )}

        {/* Projects Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                    Projekt
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                    Kunde
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                    Kontakt
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-gray-400">
                      {projects.length === 0 ? 'Keine Projekte gefunden' : 'Keine Projekte entsprechen den Filterkriterien'}
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-700 transition-colors duration-200">
                      <td className="py-4 px-6">
                        <div className="text-sm font-medium text-white">
                          {project.design_name || 'Unbenannt'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-300">
                          {project.client_name || 'Unbekannt'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-300">
                          <div className="mb-1">
                            {project.client_email || 'Kein Email'}
                          </div>
                          {project.client_phone && (
                            <div className="text-xs text-gray-400">
                              {project.client_phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => copyToClipboard(`${window.location.origin}/project/${project.id}`, project.id)}
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1"
                            title="Link kopieren"
                          >
                            <Copy className="w-4 h-4" />
                            {copiedId === project.id ? 'Kopiert!' : 'Link'}
                          </button>
                          <button 
                            className="text-green-400 hover:text-green-300 text-sm font-medium flex items-center gap-1"
                            onClick={() => openClientView(project.id)}
                            title="Anzeigen"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          {project.client_email && (
                            <button 
                              className="text-yellow-400 hover:text-yellow-300 text-sm font-medium flex items-center gap-1"
                              onClick={() => sendEmailToClient(project.client_email, project.id, project.design_name || '')}
                              title="E-Mail senden"
                            >
                              <Mail className="w-4 h-4" />
                              Mail
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Test Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={createTestProject}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Test-Projekt erstellen
          </button>
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
              {syncing ? <LottieLoader size={16} label="" /> : <RefreshCw className="w-4 h-4" />}
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
