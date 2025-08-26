import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink, Clock, User, Mail, Phone, Calendar } from 'lucide-react';
import { crmService, CRMProjectData } from '../services/crmService';
import { NeonDesign, ConfigurationState } from '../types/configurator';
import DesignSelector from './DesignSelector';
import ConfigurationPanel from './ConfigurationPanel';
import PricingCalculator from './PricingCalculator';
import { MOCK_DESIGNS } from '../data/mockDesigns';

const ClientView: React.FC = () => {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState<CRMProjectData | null>(null);
  const [designs, setDesigns] = useState<NeonDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<NeonDesign | null>(null);
  
  // Configuration state
  const [config, setConfig] = useState<ConfigurationState>({
    selectedDesign: MOCK_DESIGNS[0],
    customWidth: 200,
    calculatedHeight: 100,
    isWaterproof: false,
    hasUvPrint: true,
    hasHangingSystem: false,
    includesInstallation: false,
    customerPostalCode: '',
    selectedShipping: null,
    signs: [],
  });

  useEffect(() => {
    loadProjectData();
  }, [linkId]);

  const loadProjectData = async () => {
    if (!linkId) {
      setError('Ungültige Link-ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Извлекаем project ID из link ID (в реальной системе это будет иначе)
      const projectId = linkId.includes('demo_') ? 'proj_123456' : linkId;
      
      const data = await makeService.fetchProjectData(projectId);
      
      if (!data) {
        setError('Projekt nicht gefunden oder Link abgelaufen');
        return;
      }

      // Проверяем срок действия ссылки
      if (data.designs[0]?.expiresAt) {
        const expiryDate = new Date(data.designs[0].expiresAt);
        if (expiryDate < new Date()) {
          setError('Dieser Link ist abgelaufen. Bitte kontaktieren Sie uns für einen neuen Link.');
          return;
        }
      }

      setProjectData(data);
      
      // Конвертируем CRM данные в NeonDesign формат
      const convertedDesigns = makeService.convertToNeonDesigns(data);
      setDesigns(convertedDesigns);
      
      if (convertedDesigns.length > 0) {
        const firstDesign = convertedDesigns[0];
        setSelectedDesign(firstDesign);
        
        // Применяем настройки из CRM
        const crmDesign = data.designs[0];
        setConfig(prev => ({
          ...prev,
          selectedDesign: firstDesign,
          customWidth: crmDesign.width,
          calculatedHeight: crmDesign.height,
          isWaterproof: crmDesign.isWaterproof,
          hasUvPrint: crmDesign.hasUvPrint,
        }));
      }
      
    } catch (err) {
      console.error('Fehler beim Laden der Projektdaten:', err);
      setError('Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (updates: Partial<ConfigurationState>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleDesignChange = (design: NeonDesign) => {
    setSelectedDesign(design);
    
    // Найдем соответствующие CRM данные
    const crmDesign = projectData?.designs.find(d => d.id === design.id);
    if (crmDesign) {
      setConfig(prev => ({
        ...prev,
        selectedDesign: design,
        customWidth: crmDesign.width,
        calculatedHeight: crmDesign.height,
        isWaterproof: crmDesign.isWaterproof,
        hasUvPrint: crmDesign.hasUvPrint,
      }));
    }
  };

  const formatDate = (dateString: string) => {
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Projektdaten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
          <div className="text-red-500 mb-4">
            <ExternalLink className="h-12 w-12 mx-auto mb-2" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Fehler</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  if (!projectData || designs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Keine Daten verfügbar</h2>
          <p className="text-gray-600">Für diesen Link wurden keine Designdaten gefunden.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header mit Projektinformationen */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {projectData.clientName || 'Ihr Neon-Projekt'}
              </h1>
              <p className="text-gray-600 mt-1">
                Projekt ID: {projectData.projectId} • {designs.length} Design{designs.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            {/* Projektdetails */}
            <div className="mt-4 lg:mt-0 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              {projectData.metadata?.contactEmail && (
                <div className="flex items-center text-gray-600">
                  <Mail className="h-4 w-4 mr-1" />
                  <span className="truncate">{projectData.metadata.contactEmail}</span>
                </div>
              )}
              {projectData.metadata?.contactPhone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="h-4 w-4 mr-1" />
                  <span>{projectData.metadata.contactPhone}</span>
                </div>
              )}
              {projectData.metadata?.deadline && (
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Bis {formatDate(projectData.metadata.deadline)}</span>
                </div>
              )}
              {designs[0]?.expiresAt && (
                <div className="flex items-center text-orange-600">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Link bis {formatDate(designs[0].expiresAt)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Notizen */}
          {projectData.metadata?.notes && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-sm">
                <strong>Hinweise:</strong> {projectData.metadata.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hauptinhalt */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Design Auswahl */}
          <div className="lg:col-span-2">
            {selectedDesign && (
              <DesignSelector
                designs={designs}
                selectedDesign={selectedDesign}
                onDesignChange={handleDesignChange}
                onToggleDesign={() => {}} // Nicht verwendet in Client View
                config={config}
                signs={config.signs}
                isWaterproof={config.isWaterproof}
                isTwoPart={config.isTwoPart}
                hasUvPrint={config.hasUvPrint}
              />
            )}
          </div>

          {/* Konfiguration */}
          <div className="space-y-6">
            <ConfigurationPanel
              config={config}
              onConfigChange={handleConfigChange}
            />
            
            <PricingCalculator
              config={config}
              onRemoveSign={() => {}}
              onGoToCart={() => navigate('/cart')}
            />
          </div>
        </div>

        {/* CRM-Daten Debug (nur in Development) */}
        {import.meta.env.DEV && (
          <div className="mt-8 bg-gray-100 rounded-lg p-4">
            <h3 className="font-bold mb-2">Debug: CRM-Daten</h3>
            <pre className="text-xs bg-gray-800 text-green-400 p-2 rounded overflow-auto">
              {JSON.stringify(projectData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientView;
