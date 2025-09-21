import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import CustomerHeaderClient from './CustomerHeaderClient';
import MondayStatus from './MondayStatus';
import ShippingCalculationPage from './ShippingCalculationPage';
import { ConfigurationState, SignConfiguration } from '../types/configurator';
import { MOCK_DESIGNS } from '../data/mockDesigns';
import { calculateProportionalHeight, calculateSingleSignPrice } from '../utils/calculations';
import NeonMockupStage from './NeonMockupStage';
import { FileText, Ruler, Shield, Truck, Info, Scissors, Palette } from 'lucide-react';
import mondayDirectService from '../services/mondayDirectService';

export default function ClientViewFullConfigurator() {
  const { projectId } = useParams<{ projectId: string }>();
  
  // States from main configurator
  const [neonOn, setNeonOn] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [config, setConfig] = useState<ConfigurationState>({
    selectedDesign: MOCK_DESIGNS[0],
    customWidth: 200,
    calculatedHeight: 100,
    isWaterproof: false,
    isTwoPart: false,
    hasUvPrint: true,
    hasHangingSystem: false,
    includesInstallation: false,
    customerPostalCode: '',
    selectedShipping: null,
    signs: [],
  });
  
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [currentStep, setCurrentStep] = useState<'design' | 'cart'>('design');
  const [showShippingPage, setShowShippingPage] = useState(false);
  
  // Client-specific states
  const [projectData, setProjectData] = useState<any>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isDesignApproved, setIsDesignApproved] = useState(false);
  
  // SVG uploads по дизайну
  const [uploadedSvgsByDesign, setUploadedSvgsByDesign] = useState<Record<string, string>>({});

  // DEBUG: Test if component renders
  useEffect(() => {
    console.log('✅ ClientViewFullConfigurator loaded, isDesignApproved:', isDesignApproved);
  }, [isDesignApproved]);

  // DEBUG: Check all important states
  useEffect(() => {
    console.log('🔍 Component State Debug:', {
      currentStep,
      showShippingPage,
      isLoadingProject,
      isLoadingDesigns,
      isDesignApproved,
      projectData: !!projectData,
      projectId
    });
  }, [currentStep, showShippingPage, isLoadingProject, isLoadingDesigns, isDesignApproved, projectData, projectId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Load project data from Monday.com
  useEffect(() => {
    const loadProjectData = async () => {
      if (!projectId) return;
      
      setIsLoadingProject(true);
      try {
        console.log('🔍 Loading project data for:', projectId);
        
        let data = await mondayDirectService.getProjectById(projectId);
        
        if (!data) {
          console.log('🔄 Project not found by ID, searching by name...');
          const allProjects = await mondayDirectService.getAllProjects();
          data = allProjects.find((p: any) => 
            p.name.toLowerCase().includes(projectId.toLowerCase()) || 
            p.id === projectId
          ) || null;
        }
        
        if (!data) {
          console.warn('Project not found:', projectId);
          return;
        }
        
        setProjectData(data);
        console.log('📄 Project data loaded:', data);
        console.log('🎯 MockUp URL found:', data.mockupUrl);
        console.log('🎯 SVG Content:', data.svgContent ? 'Available' : 'Not available');
        console.log('🎯 SVG URL:', data.svgUrl);
        
        // Конвертируем данные Monday.com в формат NeonDesign
        const design = {
          ...data,
          id: data.id,
          name: data.name,
          // Если есть мокап, используем его как фон для всей SVG области
          mockupUrl: data.mockupUrl || '', 
        };
        
        // Обновляем конфигурацию реальными данными проекта
        setConfig(prev => ({
          ...prev,
          selectedDesign: design,
          customWidth: data.originalWidth || 200,
          calculatedHeight: data.originalHeight || 100,
          isWaterproof: (data as any).isWaterproof || false,
          hasUvPrint: (data as any).hasUvPrint !== false, // Default to true unless explicitly false
          hasHangingSystem: (data as any).hasHangingSystem || false,
          includesInstallation: (data as any).expressProduction || false,
        }));

        
      } catch (error) {
        console.error('❌ Error loading project data:', error);
      } finally {
        setIsLoadingProject(false);
      }
    };

    loadProjectData();
  }, [projectId]);  // Load designs 
  useEffect(() => {
    const loadDesigns = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('❌ Fehler beim Laden der Designs:', error);
      } finally {
        setIsLoadingDesigns(false);
      }
    };

    loadDesigns();
  }, []);

  // Helper functions from main configurator
  const handleConfigChange = (updates: Partial<ConfigurationState>) => {
    setConfig(prev => ({
      ...prev,
      ...updates,
      calculatedHeight: updates.customWidth 
        ? calculateProportionalHeight(
            config.selectedDesign?.originalWidth || 200,
            config.selectedDesign?.originalHeight || 100,
            updates.customWidth
          )
        : prev.calculatedHeight
    }));
    
    if (updates.customWidth !== undefined) {
      setIsResizing(true);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        setIsResizing(false);
      }, 500);
    }
  };

  const handleWidthChange = (newWidth: number) => {
    const clampedWidth = Math.max(30, Math.min(newWidth, config.isTwoPart ? 1000 : 300));
    const newHeight = calculateProportionalHeight(
      config.selectedDesign?.originalWidth || 200,
      config.selectedDesign?.originalHeight || 100,
      clampedWidth
    );
    
    setConfig(prev => ({
      ...prev,
      customWidth: clampedWidth,
      calculatedHeight: newHeight
    }));
    
    setIsResizing(true);
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(() => {
      setIsResizing(false);
    }, 500);
  };

  const handleToggleDesign = (design: any, add: boolean) => {
    if (add) {
      setIsAddingToCart(true);
      setTimeout(() => setIsAddingToCart(false), 1000);
      
      const newSign: SignConfiguration = {
        id: `${design.id}-${Date.now()}`,
        design: design,
        width: config.customWidth,
        height: config.calculatedHeight,
        isWaterproof: config.isWaterproof,
        isTwoPart: config.isTwoPart,
        hasUvPrint: config.hasUvPrint,
        hasHangingSystem: config.hasHangingSystem,
        expressProduction: config.includesInstallation,
        isEnabled: true,
      };
      
      setConfig(prev => ({
        ...prev,
        signs: [...prev.signs, newSign]
      }));
    }
  };

  const handleShowShippingPage = () => {
    setShowShippingPage(true);
  };

  const handleCloseShippingPage = () => {
    setShowShippingPage(false);
  };

  const handleSignToggle = (signId: string) => {
    // Implementation for sign toggle
  };

  const handleRemoveSign = (signId: string) => {
    setConfig(prev => ({
      ...prev,
      signs: prev.signs.filter(sign => sign.id !== signId)
    }));
  };

  const handleGoToCart = () => {
    setCurrentStep('cart');
  };

  // Calculations
  const currentDesignCount = config.signs.filter(sign => 
    sign.design.id === config.selectedDesign?.id
  ).length;

  const currentDesignPrice = config.selectedDesign ? calculateSingleSignPrice(
    config.selectedDesign,
    config.customWidth,
    config.calculatedHeight,
    config.isWaterproof,
    config.isTwoPart,
    config.hasUvPrint,
    config.hasHangingSystem,
    config.includesInstallation
  ) : 0;

  const cartItemCount = config.signs.length;
  const effectiveMaxWidth = config.isTwoPart ? 1000 : 300;

  // Get preview content
  const getPreviewContent = () => {
    if (projectData?.mockupUrl) {
      return {
        type: 'mockup',
        url: projectData.mockupUrl
      };
    }
    
    if (projectData?.svgUrl) {
      return {
        type: 'svg', 
        url: projectData.svgUrl
      };
    }
    
    return null;
  };

  const previewContent = getPreviewContent();

  // Loading state
  if (isLoadingProject || isLoadingDesigns) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Projekt wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom right, rgb(249, 250, 251), rgb(219, 234, 254), rgb(237, 233, 254))'
      }}
    >
      {/* Shipping Calculation Page */}
      {showShippingPage && (
        <ShippingCalculationPage
          config={config}
          onConfigChange={handleConfigChange}
          onClose={handleCloseShippingPage}
          onSignToggle={handleSignToggle}
          onRemoveSign={handleRemoveSign}
        />
      )}

      {/* Main Content - Hidden when shipping page is open */}
      {!showShippingPage && (
      <>
      {/* Project Info Banner */}
      {projectData && (
        <div className="bg-blue-600/90 backdrop-blur-sm text-white px-4 py-2 text-center">
          <p className="text-sm">
            Projekt: <span className="font-semibold">{projectData.name}</span>
            <span className="ml-4 opacity-75">• {config.customWidth}×{config.calculatedHeight} cm</span>
            <span className="ml-4 opacity-75">• Client Preview</span>
            {projectData.mockupUrl && (
              <span className="ml-4 opacity-75">• ✅ MockUp verfügbar</span>
            )}
            {!projectData.mockupUrl && projectData.svgUrl && (
              <span className="ml-4 opacity-75 text-yellow-300">• 🎨 SVG verfügbar</span>
            )}
            {!projectData.mockupUrl && !projectData.svgUrl && (
              <span className="ml-4 opacity-75 text-red-300">• ⚠️ Kein MockUp/SVG</span>
            )}
          </p>
        </div>
      )}

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 left-1/3 w-32 h-32 bg-purple-200/30 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-blue-200/30 rounded-full blur-2xl"></div>
      </div>

      {currentStep === 'design' && (
      <>
      {/* Header */}
      <CustomerHeaderClient 
        customerName={projectData?.name || ''}
        orderToken={''}
      />

      <main className="relative z-10 container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto flex flex-col">
        
          {/* 1. Design Preview Section - Full Width on Mobile */}
          <div className="w-full mb-3 sm:mb-4 md:mb-6 order-1">
            <div className="bg-white/80 backdrop-blur-md rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg sm:shadow-xl p-3 sm:p-4 lg:p-6 border border-white/30">
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 lg:mb-6 space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-1.5 sm:p-2">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800">
                      Ihr Design: {config.selectedDesign?.name || 'Laden...'}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600">Vorschau in Echtzeit</p>
                  </div>
                </div>
                
                {/* Controls - Responsive */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                  {/* LED Toggle */}
                  <div className="flex items-center justify-between sm:justify-start space-x-2 sm:space-x-3 p-2 bg-gray-50 rounded-lg">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Neon</span>
                    <button
                      onClick={() => {
                        console.log('🔵 ClientViewFullConfigurator: Toggling neon from', neonOn, 'to', !neonOn);
                        setNeonOn(!neonOn);
                      }}
                      className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        neonOn ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                          neonOn ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {/* Price Display */}
                  <div className="text-center sm:text-right p-2 bg-green-50 rounded-lg">
                    <div className="text-xs text-gray-600">Preis</div>
                    <div className="text-sm sm:text-base lg:text-lg font-bold text-green-600">
                      €{currentDesignPrice.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Design Preview */}
              <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 h-[400px] sm:h-[500px] lg:h-[600px] flex items-center justify-center w-full border-4 border-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 shadow-2xl overflow-hidden rounded-lg sm:rounded-xl before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/10 before:via-purple-500/10 before:to-pink-500/10 before:animate-pulse before:pointer-events-none after:absolute after:inset-0 after:border-2 after:border-gradient-to-r after:from-cyan-400/20 after:via-purple-400/20 after:to-pink-400/20 after:rounded-lg after:animate-pulse after:pointer-events-none group">
                {/* Stylische Ecken-Ornamente */}
                <div className="absolute top-4 left-4 w-6 h-6 sm:w-8 sm:h-8 border-l-3 border-t-3 border-blue-400/60 rounded-tl-xl z-10"></div>
                <div className="absolute top-4 right-4 w-6 h-6 sm:w-8 sm:h-8 border-r-3 border-t-3 border-purple-400/60 rounded-tr-xl z-10"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 sm:w-8 sm:h-8 border-l-3 border-b-3 border-pink-400/60 rounded-bl-xl z-10"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 sm:w-8 sm:h-8 border-r-3 border-b-3 border-cyan-400/60 rounded-br-xl z-10"></div>
                
                {/* Glowing border effect */}
                <div className="absolute inset-2 rounded-xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-pulse pointer-events-none z-10"></div>
                
                <NeonMockupStage
                  lengthCm={Math.max(config.customWidth, config.calculatedHeight)}
                  waterproof={config.isWaterproof}
                  neonOn={neonOn}
                  uvOn={config.hasUvPrint || false}
                  customMockupUrl={previewContent?.type === 'mockup' ? previewContent.url : undefined}
                  svgImageUrl={previewContent?.type === 'svg' ? previewContent.url : undefined}
                  currentSvgContent={uploadedSvgsByDesign[config.selectedDesign.id]}
                  onSvgUpload={(svgContent) => {
                    if (svgContent) {
                      setUploadedSvgsByDesign(prev => ({
                        ...prev,
                        [config.selectedDesign.id]: svgContent
                      }));
                    } else {
                      setUploadedSvgsByDesign(prev => {
                        const updated = { ...prev };
                        delete updated[config.selectedDesign.id];
                        return updated;
                      });
                    }
                  }}
                  hideSettingsButton={true}
                />
                
                {/* Overlay Info */}
                <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 flex justify-between items-start">
                  <div className="bg-black/50 backdrop-blur-sm text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <span className="text-green-400">●</span>
                      <span>Live Vorschau</span>
                    </div>
                  </div>
                  
                  <div className="bg-black/50 backdrop-blur-sm text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs">
                    <div className="flex items-center space-x-2 sm:space-x-4">
                      <span className="text-blue-400 hidden sm:inline">Breite:</span>
                      <span className="text-blue-400 sm:hidden">B:</span>
                      <span className="font-bold text-blue-300">{config.customWidth}cm</span>
                      <span className="text-purple-400 hidden sm:inline">Höhe:</span>
                      <span className="text-purple-400 sm:hidden">H:</span>
                      <span className="font-bold text-purple-300">{config.calculatedHeight}cm</span>
                    </div>
                  </div>
                </div>
                
                {/* Bottom Stats */}
                <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4">
                  <div className="bg-black/50 backdrop-blur-sm text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1">
                        <span className="text-green-400 hidden sm:inline">Elemente:</span>
                        <span className="text-green-400 sm:hidden">E:</span>
                        <span className="font-bold text-green-300">5</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-blue-400 hidden sm:inline">LED-Länge:</span>
                        <span className="text-blue-400 sm:hidden">LED:</span>
                        <span className="font-bold text-blue-300">{config.selectedDesign?.ledLength || '6'}m</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-purple-400 hidden sm:inline">Verbrauch:</span>
                        <span className="text-purple-400 sm:hidden">V:</span>
                        <span className="font-bold text-purple-300">60W</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 2. Technical Information Section - Responsive Order */}
          <div className="w-full mb-3 sm:mb-4 md:mb-6 order-3 lg:order-2">
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-2 sm:p-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs">
                <div className="text-center">
                  <div className="text-blue-700 font-medium mb-1">Technische Daten</div>
                  <div className="grid grid-cols-1 gap-1">
                    <div>
                      <div className="text-gray-600">Elemente:</div>
                      <div className="font-bold text-gray-800">5</div>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-green-700 font-medium mb-1">Originale Daten</div>
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <div className="text-gray-600">Breite:</div>
                      <div className="font-bold text-gray-800">{projectData?.originalWidth || config.customWidth}cm</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Höhe:</div>
                      <div className="font-bold text-gray-800">{projectData?.originalHeight || config.calculatedHeight}cm</div>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-orange-700 font-medium mb-1">LED-Streifen</div>
                  <div>
                    <div className="text-orange-600">LED-Länge:</div>
                    <div className="font-bold text-orange-800">{config.selectedDesign?.ledLength || '6'}m</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-purple-700 font-medium mb-1">Leistung</div>
                  <div>
                    <div className="text-purple-600">Verbrauch:</div>
                    <div className="font-bold text-purple-800">60W</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 3. Configuration Section - Responsive */}
          <div className="w-full order-2 lg:order-3">
            <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg sm:shadow-xl p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 lg:mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 lg:mb-6 space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-1.5 sm:p-2">
                    <Ruler className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                  </div>
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800">Konfiguration</h2>
                </div>
                
                {/* Action Buttons - Responsive */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  {/* Add Button */}
                  {isAddingToCart ? (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-2 sm:p-3 min-h-[40px] sm:min-h-[44px] flex items-center justify-center">
                      <div className="flex items-center space-x-2 animate-pulse justify-center">
                        <div className="bg-green-500 rounded-full p-0.5">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-green-800 font-bold text-xs sm:text-sm animate-pulse">Im Warenkorb</span>
                        <div className="text-xs sm:text-sm font-bold text-green-800">
                          €{currentDesignPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleToggleDesign(config.selectedDesign, true)}
                      className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:from-green-700 active:to-emerald-800 text-white font-bold py-2 sm:py-2.5 lg:py-3 px-3 sm:px-4 lg:px-6 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm lg:text-base group relative overflow-hidden z-20 min-h-[40px] sm:min-h-[44px] touch-manipulation"
                    >
                      {/* Glowing background animation */}
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 animate-pulse"></div>
                      
                      <div className="bg-white/20 rounded-full p-0.5 flex-shrink-0">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <span className="font-bold relative z-10 text-center flex-1 sm:flex-initial">
                        <span className="hidden sm:inline">{currentDesignCount > 0 ? 'Weitere hinzufügen' : 'Hinzufügen'}</span>
                        <span className="sm:hidden">Hinzufügen</span>
                      </span>
                      <div className="bg-white/20 rounded-full px-1.5 sm:px-2 py-0.5 text-xs sm:text-sm font-bold flex-shrink-0">
                        €{currentDesignPrice.toFixed(2)}
                      </div>
                    </button>
                  )}
                  
                  {/* Shipping Button */}
                  <div className="relative w-full sm:w-auto">
                    <button 
                      onClick={handleShowShippingPage}
                      className="relative w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:from-blue-700 active:to-indigo-800 text-white py-2 sm:py-2.5 lg:py-3 px-3 sm:px-4 lg:px-6 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center space-x-1.5 sm:space-x-2 font-bold text-xs sm:text-sm lg:text-base group z-10 overflow-hidden min-h-[40px] sm:min-h-[44px] touch-manipulation"
                    >
                      {/* Sliding background animation */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
                      
                      <Truck className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 relative z-10 group-hover:animate-bounce flex-shrink-0" />
                      <span className="font-bold relative z-10 text-center">
                        <span className="hidden sm:inline">Versand berechnen</span>
                        <span className="sm:hidden">Versand</span>
                      </span>
                    </button>
                    
                    {/* Animated Cart Counter Badge */}
                    {cartItemCount > 0 && (
                      <div className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 lg:-top-2 lg:-right-2 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 flex items-center justify-center animate-bounce shadow-lg border border-white z-30 min-w-[16px] sm:min-w-[20px] lg:min-w-[24px]">
                        {cartItemCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Size Controls - Responsive */}
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Width Control */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Breite</label>
                    <div className="flex items-center space-x-2 mb-1">
                      <input
                        type="number"
                        min="30"
                        max={effectiveMaxWidth}
                        value={config.customWidth}
                        onChange={(e) => handleWidthChange(Number(e.target.value))}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-center font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      {isResizing && (
                        <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs px-1 py-0.5 rounded animate-pulse">
                          ⚡
                        </div>
                      )}
                      <span className="text-gray-600 font-medium text-sm">cm</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max={config.isTwoPart ? 1000 : 300}
                      value={config.customWidth}
                      onChange={(e) => handleConfigChange({ customWidth: Number(e.target.value) })}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>30cm</span>
                      <span>{config.isTwoPart ? '10m' : '3m'}</span>
                    </div>
                    
                    {/* Multi-part Option - Only visible at 300cm */}
                    {config.customWidth >= 300 && (
                      <div className="mt-3 animate-fade-in">
                        <label className="flex items-center space-x-2 cursor-pointer p-2 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={config.isTwoPart || false}
                            onChange={(e) => handleConfigChange({ isTwoPart: e.target.checked })}
                            className="w-4 h-4 text-orange-600 focus:ring-orange-500 rounded"
                          />
                          <Scissors className="h-4 w-4 text-orange-600" />
                          <div className="flex items-center space-x-1 flex-1">
                            <span className="text-sm font-medium text-orange-800">Mehrteilig (+15%)</span>
                            <div className="relative group">
                              <Info className="h-4 w-4 text-orange-500 hover:text-orange-700 cursor-help transition-colors" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                Das Schild wird aus mehreren Teilen gefertigt und muss vor Ort zusammengesetzt werden
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-orange-600">Erforderlich ab 300cm</div>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Height Display */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Höhe</label>
                    <div className="bg-gray-100 px-2 py-2 rounded-lg text-center mb-1">
                      <span className="text-lg font-bold text-gray-800">{config.calculatedHeight} cm</span>
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      Automatisch berechnet
                    </div>
                    <div className="text-xs text-gray-500 text-center mt-1">
                      Max: 200cm
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Options Grid - Responsive */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 overflow-visible"
                   style={{ position: 'relative', zIndex: 1 }}>
                {/* Waterproof */}
                <div className="relative group">
                  <button
                    onClick={() => handleConfigChange({ isWaterproof: !config.isWaterproof })}
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-md border-2 transition-all duration-300 hover:scale-105 w-full ${
                      config.isWaterproof
                        ? 'bg-blue-500 border-blue-500 text-white shadow-lg'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 mb-1" />
                    <div className="flex items-center space-x-1">
                      <span className="text-xs sm:text-sm font-medium leading-tight text-center">Wasserdicht</span>
                      <Info className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 hover:text-blue-600 cursor-help transition-colors" />
                    </div>
                    <span className="text-xs opacity-75 leading-tight">+25%</span>
                  </button>
                </div>
                
                {/* UV Print */}
                <button
                  onClick={() => handleConfigChange({ hasUvPrint: !config.hasUvPrint })}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-md border-2 transition-all duration-300 hover:scale-105 relative ${
                    config.hasUvPrint
                      ? 'bg-purple-500 border-purple-500 text-white shadow-lg'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <Palette className="h-4 w-4 sm:h-5 sm:w-5 mb-1" />
                  <div className="flex items-center space-x-1">
                    <span className="text-xs sm:text-sm font-medium leading-tight text-center">UV-Druck</span>
                    <Info className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 hover:text-purple-600 cursor-help transition-colors" />
                  </div>
                  <span className="text-xs opacity-75 leading-tight">Empfohlen</span>
                </button>
                
                {/* Hanging System */}
                <button
                  onClick={() => handleConfigChange({ hasHangingSystem: !(config.hasHangingSystem || false) })}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-md border-2 transition-all duration-300 hover:scale-105 ${
                    config.hasHangingSystem || false
                      ? 'bg-green-500 border-green-500 text-white shadow-lg'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <div className="text-green-600 text-base sm:text-lg mb-1">🔗</div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs sm:text-sm font-medium leading-tight text-center">Hängesystem</span>
                    <Info className="h-3 w-3 sm:h-4 sm:w-4 text-green-400 hover:text-green-600 cursor-help transition-colors" />
                  </div>
                  <span className="text-xs opacity-75 leading-tight">Optional</span>
                </button>
                
                {/* Express Production */}
                <button
                  onClick={() => handleConfigChange({ includesInstallation: !(config.includesInstallation || false) })}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-md border-2 transition-all duration-300 hover:scale-105 ${
                    config.includesInstallation || false
                      ? 'bg-orange-500 border-orange-500 text-white shadow-lg'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50'
                  }`}
                >
                  <div className="text-orange-600 text-base sm:text-lg mb-1">⚡</div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs sm:text-sm font-medium leading-tight text-center">Express</span>
                    <Info className="h-3 w-3 sm:h-4 sm:w-4 text-orange-400 hover:text-orange-600 cursor-help transition-colors" />
                  </div>
                  <span className="text-xs opacity-75 leading-tight">+30%</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Design Approval and Order Section */}
      
        <div className="mt-8 mb-4 order-4">
          <MondayStatus />
        </div>
      </main>
      </>
      )}

      {/* Footer как на главной странице */}
      <footer className="text-gray-500 py-4 px-4 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
              <span className="font-medium text-gray-700">© 2025, Nontel Alle Rechte vorbehalten</span>
              <a href="/widerrufsrecht" className="hover:text-blue-600 transition-colors font-medium">
                Widerrufsrecht
              </a>
              <span className="text-gray-300">•</span>
              <a href="/datenschutz" className="hover:text-blue-600 transition-colors font-medium">
                Datenschutzerklärung
              </a>
              <span className="text-gray-300">•</span>
              <a href="/agb" className="hover:text-blue-600 transition-colors font-medium">
                AGB
              </a>
              <span className="text-gray-300">•</span>
              <a href="/zahlung-versand" className="hover:text-blue-600 transition-colors font-medium">
                Zahlung und Versand
              </a>
              <span className="text-gray-300">•</span>
              <a href="/impressum" className="hover:text-blue-600 transition-colors font-medium">
                Impressum
              </a>
            </div>
          </div>
        </div>
      </footer>
      </>
      )}
    </div>
  );
}
