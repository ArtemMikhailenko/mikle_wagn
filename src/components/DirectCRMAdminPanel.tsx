import { useState, useEffect } from 'react';
import { Copy, Mail, Eye, CheckCircle, Clock, User, RefreshCw, Database, Search, Filter, X } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadProjects();
    checkConnection();
  }, []);

  // Apply filters whenever projects or filter criteria change
  useEffect(() => {
    applyFilters();
  }, [projects, searchTerm, statusFilter, dateFilter]);

  const applyFilters = () => {
    let filtered = [...projects];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(project => 
        project.design_name?.toLowerCase().includes(term) ||
        project.client_email?.toLowerCase().includes(term) ||
        project.client_name?.toLowerCase().includes(term) ||
        project.id?.toLowerCase().includes(term) ||
        project.status?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => {
        const status = project.status?.toLowerCase() || '';
        switch (statusFilter) {
          case 'completed':
            return status === 'completed' || status === 'done' || status === 'fertig';
          case 'in_progress':
            return status === 'in_progress' || status === 'working' || status === 'in arbeit';
          case 'draft':
            return status === 'draft' || status === 'entwurf';
          default:
            return true;
        }
      });
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(project => {
        if (!project.created_at) return false;
        const projectDate = new Date(project.created_at);
        const diffTime = Math.abs(now.getTime() - projectDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        switch (dateFilter) {
          case 'today':
            return diffDays <= 1;
          case 'week':
            return diffDays <= 7;
          case 'month':
            return diffDays <= 30;
          default:
            return true;
        }
      });
    }

    // Sort filtered results
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'design_name':
          aValue = a.design_name || '';
          bValue = b.design_name || '';
          break;
        case 'client_name':
          aValue = a.client_name || '';
          bValue = b.client_name || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at || '').getTime();
          bValue = new Date(b.created_at || '').getTime();
          break;
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredProjects(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('all');
  };

  const getFilterCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (statusFilter !== 'all') count++;
    if (dateFilter !== 'all') count++;
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
              Zurück zum Dashboard
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Suche nach Name, E-Mail, ID oder Status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="lg:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alle Status</option>
                <option value="completed">Fertig</option>
                <option value="in_progress">In Arbeit</option>
                <option value="draft">Entwurf</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="lg:w-48">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alle Zeiten</option>
                <option value="today">Heute</option>
                <option value="week">Diese Woche</option>
                <option value="month">Dieser Monat</option>
              </select>
            </div>

            {/* Filter Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                {getFilterCount() > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {getFilterCount()}
                  </span>
                )}
              </button>
              {getFilterCount() > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
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
                    Client
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                    Erstellt
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
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
                          {project.client_email || 'Kein Email'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          project.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : project.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status || 'Neu'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-300">
                        {project.created_at ? new Date(project.created_at).toLocaleDateString('de-DE') : 'Unbekannt'}
                      </td>
                      <td className="py-4 px-6">
                        <button 
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                          onClick={() => console.log('View project:', project.id)}
                        >
                          Anzeigen
                        </button>
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
