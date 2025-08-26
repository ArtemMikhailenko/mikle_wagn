import React, { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink, Copy, Check, Database, Settings, Users, Calendar } from 'lucide-react';
import makeService, { CRMProjectData } from '../services/makeService';
import mondayService from '../services/mondayService';

const MakeAdminPanel: React.FC = () => {
  const [makeStatus, setMakeStatus] = useState<any>(null);
  const [mondayStatus, setMondayStatus] = useState<any>(null);
  const [projects, setProjects] = useState<CRMProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load Make service status
      const makeServiceStatus = makeService.getStatus();
      setMakeStatus(makeServiceStatus);

      // Load Monday service status  
      const mondayServiceStatus = mondayService.getStatus();
      setMondayStatus(mondayServiceStatus);

      // Load projects
      const allProjects = makeService.getAllProjects();
      setProjects(allProjects);

    } catch (error) {
      console.error('Fehler beim Laden der Admin-Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleGenerateLink = async (project: CRMProjectData) => {
    setGeneratingLink(project.projectId);
    try {
      const linkUrl = await makeService.requestClientLink(project);
      if (linkUrl) {
        await navigator.clipboard.writeText(linkUrl);
        setCopiedLink(project.projectId);
        setTimeout(() => setCopiedLink(null), 2000);
      }
    } catch (error) {
      console.error('Fehler beim Generieren der Kundenseite:', error);
    } finally {
      setGeneratingLink(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nicht verfügbar';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">CRM & Make Integration</h1>
        <button
          onClick={handleRefresh}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Aktualisieren</span>
        </button>
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Make.com Status */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-2 rounded-lg ${makeStatus?.isConfigured ? 'bg-green-100' : 'bg-red-100'}`}>
              <Settings className={`h-5 w-5 ${makeStatus?.isConfigured ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <h2 className="text-xl font-semibold">Make.com Service</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${makeStatus?.isConfigured ? 'text-green-600' : 'text-red-600'}`}>
                {makeStatus?.isConfigured ? 'Konfiguriert' : 'Nicht konfiguriert'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Webhook URL:</span>
              <span className={`font-medium ${makeStatus?.hasWebhookUrl ? 'text-green-600' : 'text-red-600'}`}>
                {makeStatus?.hasWebhookUrl ? 'Verfügbar' : 'Fehlt'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">API Key:</span>
              <span className={`font-medium ${makeStatus?.hasApiKey ? 'text-green-600' : 'text-red-600'}`}>
                {makeStatus?.hasApiKey ? 'Verfügbar' : 'Fehlt'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cached Projects:</span>
              <span className="font-medium">{makeStatus?.cachedProjects || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Update:</span>
              <span className="font-medium">{formatDate(makeStatus?.lastUpdate)}</span>
            </div>
          </div>
        </div>

        {/* Monday.com Status */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-2 rounded-lg ${mondayStatus?.isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
              <Database className={`h-5 w-5 ${mondayStatus?.isConnected ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <h2 className="text-xl font-semibold">Monday.com Service</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Connection:</span>
              <span className={`font-medium ${mondayStatus?.isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {mondayStatus?.isConnected ? 'Verbunden' : 'Getrennt'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">API Token:</span>
              <span className={`font-medium ${mondayStatus?.connectionDetails?.hasToken ? 'text-green-600' : 'text-red-600'}`}>
                {mondayStatus?.connectionDetails?.hasToken ? `Verfügbar (${mondayStatus.connectionDetails.tokenLength} chars)` : 'Fehlt'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Sync:</span>
              <span className="font-medium">{formatDate(mondayStatus?.lastSync)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cache Size:</span>
              <span className="font-medium">{mondayStatus?.cacheSize || 0} items</span>
            </div>
            {mondayStatus?.lastError && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                Error: {mondayStatus.lastError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Aktive Projekte</h2>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {projects.length}
            </span>
          </div>
        </div>
        
        <div className="p-6">
          {projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Keine Projekte verfügbar</p>
              <p className="text-sm">Projekte werden automatisch von Make.com geladen</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <div key={project.projectId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg">{project.clientName || 'Unbekannter Kunde'}</h3>
                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                          {project.projectId}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <span className="text-gray-600 text-sm">Designs:</span>
                          <div className="font-medium">{project.designs.length}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 text-sm">Kontakt:</span>
                          <div className="font-medium text-sm">
                            {project.metadata?.contactEmail || 'Nicht verfügbar'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 text-sm">Deadline:</span>
                          <div className="font-medium text-sm">
                            {project.metadata?.deadline ? formatDate(project.metadata.deadline) : 'Nicht verfügbar'}
                          </div>
                        </div>
                      </div>

                      {/* Designs */}
                      <div className="mb-4">
                        <span className="text-gray-600 text-sm mb-2 block">Designs:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {project.designs.map((design) => (
                            <div key={design.id} className="bg-gray-50 rounded p-3 text-sm">
                              <div className="font-medium mb-1">{design.name}</div>
                              <div className="text-gray-600">
                                {design.width}×{design.height}cm • {design.elements} Elemente
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                {design.isWaterproof && (
                                  <span className="bg-blue-100 text-blue-800 text-xs px-1 py-0.5 rounded">Wasserdicht</span>
                                )}
                                {design.hasUvPrint && (
                                  <span className="bg-purple-100 text-purple-800 text-xs px-1 py-0.5 rounded">UV-Druck</span>
                                )}
                                {design.svgContent && (
                                  <span className="bg-green-100 text-green-800 text-xs px-1 py-0.5 rounded">SVG</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      {project.metadata?.notes && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                          <span className="text-yellow-800 text-sm">
                            <strong>Notizen:</strong> {project.metadata.notes}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="ml-4">
                      <button
                        onClick={() => handleGenerateLink(project)}
                        disabled={generatingLink === project.projectId}
                        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingLink === project.projectId ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : copiedLink === project.projectId ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                        <span>
                          {generatingLink === project.projectId ? 'Generiere...' : 
                           copiedLink === project.projectId ? 'Kopiert!' : 
                           'Kundenlink'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Debug Information */}
      {import.meta.env.DEV && (
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-white font-bold mb-2">Debug Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-gray-300 font-medium mb-1">Make Status</h4>
              <pre className="text-xs text-green-400 bg-gray-800 p-2 rounded overflow-auto">
                {JSON.stringify(makeStatus, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="text-gray-300 font-medium mb-1">Monday Status</h4>
              <pre className="text-xs text-green-400 bg-gray-800 p-2 rounded overflow-auto">
                {JSON.stringify(mondayStatus, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MakeAdminPanel;
