import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink, Clock, User, Mail, CheckCircle } from 'lucide-react';
import { crmService, CRMProjectData } from '../services/crmService';
import { NeonDesign, ConfigurationState } from '../types/configurator';
import ConfigurationPanel from './ConfigurationPanel';
import PricingCalculator from './PricingCalculator';

export default function ClientView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [projectData, setProjectData] = useState<CRMProjectData | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<NeonDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [configuration, setConfiguration] = useState<Partial<ConfigurationState>>({
    customWidth: 100,
    calculatedHeight: 20,
    isWaterproof: false,
    hasUvPrint: true,
    isTwoPart: false,
    hasHangingSystem: false,
    includesInstallation: false,
    expressProduction: false,
    customerPostalCode: '',
    selectedShipping: null,
    signs: []
  });

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) return;
      
      setLoading(true);
      try {
        // Fetch project data from CRM service
        const data = await crmService.getProject(projectId);
        
        if (!data) {
          setError('Projekt nicht gefunden oder abgelaufen');
          return;
        }
        
        setProjectData(data);
        
        // Convert CRM data to NeonDesign format
        const design = crmService.convertToNeonDesign(data);
        setSelectedDesign(design);
        
        // Set initial configuration
        setConfiguration({
          selectedDesign: design,
          customWidth: design.originalWidth,
          calculatedHeight: design.originalHeight,
          isWaterproof: false,
          hasUvPrint: true,
          isTwoPart: false,
          hasHangingSystem: false,
          includesInstallation: false,
          expressProduction: false,
          customerPostalCode: '',
          selectedShipping: null,
          signs: []
        });
        
      } catch (err) {
        setError('Fehler beim Laden des Projekts');
        console.error('Error loading project:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('de-DE').format(new Date(dateString));
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const handleApproval = async () => {
    if (!projectData) return;
    
    const success = await crmService.updateProjectStatus(projectData.projectId, 'approved');
    if (success) {
      navigate('/cart-checkout', { 
        state: { 
          design: selectedDesign, 
          configuration,
          projectId: projectData.projectId 
        } 
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Projekt wird geladen...</div>
      </div>
    );
  }

  if (error || !projectData || !selectedDesign) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error || 'Projekt nicht gefunden'}</div>
          <button 
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Zurück zur Startseite
          </button>
        </div>
      </div>
    );
  }

  if (isExpired(projectData.expiresAt)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Dieses Projekt ist abgelaufen</div>
          <div className="text-gray-400 mb-6">
            Ablaufdatum: {formatDate(projectData.expiresAt!)}
          </div>
          <button 
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Neues Projekt starten
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Ihr Neon-Design</h1>
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span>Projekt aktiv</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">Kunde:</span>
              <span>{projectData.clientName}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">Email:</span>
              <span className="truncate">{projectData.clientEmail}</span>
            </div>
            
            {projectData.expiresAt && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Gültig bis:</span>
                <span>{formatDate(projectData.expiresAt)}</span>
              </div>
            )}
          </div>
          
          {projectData.notes && (
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <strong>Hinweise:</strong> {projectData.notes}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Design Preview */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Design-Vorschau</h2>
              
              <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                {selectedDesign.svgContent ? (
                  <div 
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: selectedDesign.svgContent }}
                  />
                ) : selectedDesign.svgUrl ? (
                  <img 
                    src={selectedDesign.svgUrl} 
                    alt={selectedDesign.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-gray-400 text-center">
                    <div className="text-4xl mb-2">🎨</div>
                    <div>Design wird geladen...</div>
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-medium">{selectedDesign.name}</h3>
              <p className="text-gray-400">{selectedDesign.description}</p>
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-6">
            <ConfigurationPanel
              configuration={configuration as ConfigurationState}
              selectedDesign={selectedDesign}
              onConfigurationChange={setConfiguration}
            />
            
            <PricingCalculator
              config={{
                selectedDesign: selectedDesign,
                customWidth: configuration.customWidth || 100,
                calculatedHeight: configuration.calculatedHeight || 20,
                isWaterproof: configuration.isWaterproof || false,
                isTwoPart: configuration.isTwoPart || false,
                hasUvPrint: configuration.hasUvPrint || true,
                hasHangingSystem: configuration.hasHangingSystem || false,
                includesInstallation: configuration.includesInstallation || false,
                expressProduction: configuration.expressProduction || false,
                customerPostalCode: configuration.customerPostalCode || '',
                selectedShipping: configuration.selectedShipping || null,
                signs: configuration.signs || []
              }}
            />
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleApproval}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Design genehmigen und bestellen
              </button>
              
              <button
                onClick={() => navigate('/')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Änderungen anfordern
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
