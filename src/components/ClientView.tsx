import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import CustomerHeader from './CustomerHeader';
import MondayStatus from './MondayStatus';
import { ConfigurationState } from '../types/configurator';
import { MOCK_DESIGNS } from '../data/mockDesigns';
import { calculateSingleSignPrice } from '../utils/calculations';
import NeonMockupStage from './NeonMockupStage';
import mondayService from '../services/mondayService';
import { crmService, CRMProjectData } from '../services/crmService';

export default function ClientView() {
  const { projectId } = useParams<{ projectId: string }>();
  
  // Основные состояния
  const [neonOn, setNeonOn] = useState(true);
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
  
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(true);
  
  // Состояния для клиентского представления
  const [projectData, setProjectData] = useState<CRMProjectData | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // SVG uploads по дизайну
  const [uploadedSvgsByDesign, setUploadedSvgsByDesign] = useState<Record<string, string>>({});
  
  // Расчет цены с мемоизацией
  const currentPrice = useMemo(() => {
    if (!config.selectedDesign) return 0;
    
    return calculateSingleSignPrice(
      config.selectedDesign,
      config.customWidth,
      config.calculatedHeight,
      config.isWaterproof,
      false, // isTwoPart
      config.hasUvPrint,
      config.hasHangingSystem,
      config.includesInstallation // expressProduction
    );
  }, [
    config.selectedDesign,
    config.customWidth,
    config.calculatedHeight,
    config.isWaterproof,
    config.hasUvPrint,
    config.hasHangingSystem,
    config.includesInstallation
  ]);

  // Загрузка данных проекта из Monday.com
  useEffect(() => {
    const loadProjectData = async () => {
      if (!projectId) return;
      
      setIsLoadingProject(true);
      try {
        console.log('🔍 Loading project data for:', projectId);
        const data = await crmService.getProject(projectId);
        
        if (!data) {
          console.warn('Project not found:', projectId);
          return;
        }
        
        setProjectData(data);
        console.log('📄 Project data loaded:', data);
        console.log('🔍 SVG Content from MockUp field:', data.svgContent);
        console.log('🔍 SVG URL from MockUp field:', data.svgUrl);
        console.log('🔍 MockUp URL:', data.mockupUrl);
        console.log('🔍 MockUp Content (length):', data.mockupContent?.length || 0);
        console.log('🔍 Notes field:', data.notes);
        console.log('🎯 Will use MockUp as background:', !!data.mockupUrl);

        // Логируем просмотр клиентом
        await crmService.logInteraction(projectId, 'page_viewed', {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });

        // Обновляем статус проекта на 'viewed'
        if (data.status === 'sent') {
          await crmService.updateProjectStatus(projectId, 'viewed');
        }
        
        // Конвертируем CRM данные в формат NeonDesign
        const design = crmService.convertToNeonDesign(data);
        console.log('🎨 Converted design:', design);
        
        // Извлекаем размеры из notes если они есть (например: "200x100cm", "width: 200, height: 100")
        let width = design.originalWidth || 200;
        let height = design.originalHeight || 100;
        
        if (data.notes) {
          // Ищем размеры в разных форматах
          const dimensionMatch = data.notes.match(/(\d+)\s*[x×]\s*(\d+)\s*cm/i) ||
                                data.notes.match(/width:\s*(\d+).*height:\s*(\d+)/i) ||
                                data.notes.match(/breite:\s*(\d+).*höhe:\s*(\d+)/i);
          
          if (dimensionMatch) {
            width = parseInt(dimensionMatch[1]);
            height = parseInt(dimensionMatch[2]);
            console.log('📏 Extracted dimensions from notes:', { width, height });
          }
        }
        
        // Обновляем design с правильными размерами
        design.originalWidth = width;
        design.originalHeight = height;
        
        // Устанавливаем SVG из svgContent (поле MockUp) или notes
        let svgToUse = null;
        if (data.svgContent) {
          svgToUse = data.svgContent;
          console.log('🖼️ SVG found in svgContent (MockUp field)');
        } else if (data.notes && data.notes.includes('<svg')) {
          svgToUse = data.notes;
          console.log('🖼️ SVG found in notes field');
        }
        
        if (svgToUse) {
          setUploadedSvgsByDesign(prev => ({
            ...prev,
            [design.id]: svgToUse
          }));
        }
        
        // Обновляем конфигурацию данными проекта
        setConfig(prev => ({
          ...prev,
          selectedDesign: design,
          customWidth: width,
          calculatedHeight: height,
          isWaterproof: data.notes?.toLowerCase().includes('waterproof') || 
                       data.notes?.toLowerCase().includes('wasserdicht') || 
                       data.notes?.toLowerCase().includes('outdoor') || false,
          hasUvPrint: data.notes?.toLowerCase().includes('uv') || true,
          hasHangingSystem: data.notes?.toLowerCase().includes('hänge') || 
                           data.notes?.toLowerCase().includes('hanging') || false,
          includesInstallation: data.notes?.toLowerCase().includes('express') || 
                              data.notes?.toLowerCase().includes('5 tag') || false,
        }));
        
      } catch (error) {
        console.error('❌ Error loading project data:', error);
      } finally {
        setIsLoadingProject(false);
      }
    };

    loadProjectData();
  }, [projectId]);

  // Загрузка дизайнов из Monday.com
  useEffect(() => {
    const loadDesigns = async () => {
      try {
        await mondayService.fetchPrices();
      } catch (error) {
        console.error('❌ Fehler beim Laden der Designs:', error);
      } finally {
        setIsLoadingDesigns(false);
      }
    };

    loadDesigns();
  }, []);

  // Показываем экран загрузки
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

  // Функция для обновления размеров с сохранением пропорций
  const updateWidth = (newWidth: number) => {
    if (!config.selectedDesign) return;
    
    const originalWidth = config.selectedDesign.originalWidth || 200;
    const originalHeight = config.selectedDesign.originalHeight || 100;
    const aspectRatio = originalHeight / originalWidth;
    const newHeight = Math.round(newWidth * aspectRatio);
    
    setConfig(prev => ({
      ...prev,
      customWidth: newWidth,
      calculatedHeight: newHeight
    }));
  };
  const getProxiedImageUrl = (originalUrl: string) => {
    if (!originalUrl) return null;
    
    console.log('🖼️ Original mockup URL:', originalUrl);
    
    // Если это Monday.com защищенная ссылка, используем Supabase прокси
    if (originalUrl.includes('monday.com/protected_static') || originalUrl.includes('monday.com')) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const proxiedUrl = `${supabaseUrl}/functions/v1/image-proxy?url=${encodeURIComponent(originalUrl)}`;
      console.log('🔄 Using proxied URL:', proxiedUrl);
      return proxiedUrl;
    }
    
    console.log('✅ Using original URL (not Monday.com)');
    // Для других URL возвращаем как есть
    return originalUrl;
  };

  const backgroundImageUrl = projectData?.mockupUrl ? getProxiedImageUrl(projectData.mockupUrl) : null;

  // Проверка загрузки фонового изображения
  useEffect(() => {
    if (!backgroundImageUrl) {
      setImageLoaded(false);
      setImageError(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setImageError(null);
      console.log('✅ Background image loaded successfully');
    };
    img.onerror = () => {
      setImageLoaded(false);
      setImageError('Fehler beim Laden des MockUp-Bildes');
      console.error('❌ Failed to load background image:', backgroundImageUrl);
    };
    img.src = backgroundImageUrl;
  }, [backgroundImageUrl]);

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom right, rgb(249, 250, 251), rgb(219, 234, 254), rgb(237, 233, 254))'
      }}
    >
      {/* Информация о проекте */}
      {projectData && (
        <div className="bg-blue-600/90 backdrop-blur-sm text-white px-4 py-3 text-center">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-lg">{projectData.clientName}</span>
                <span className="opacity-75">•</span>
                <span>{config.customWidth}×{config.calculatedHeight} cm</span>
                <span className="opacity-75">•</span>
                <span className="text-green-300 font-semibold">€{currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {config.isWaterproof && <span className="bg-green-500/20 px-2 py-1 rounded">Wasserdicht</span>}
                {config.hasUvPrint && <span className="bg-blue-500/20 px-2 py-1 rounded">UV-Druck</span>}
                {config.hasHangingSystem && <span className="bg-purple-500/20 px-2 py-1 rounded">Hängesystem</span>}
                {config.includesInstallation && <span className="bg-red-500/20 px-2 py-1 rounded">Express</span>}
                {projectData.mockupUrl && (
                  <span className={`px-2 py-1 rounded ${
                    imageError ? 'bg-red-500/20 text-red-200' :
                    imageLoaded ? 'bg-green-500/20 text-green-200' :
                    'bg-yellow-500/20 text-yellow-200'
                  }`}>
                    {imageError ? '❌ MockUp Fehler' :
                     imageLoaded ? '✅ MockUp geladen' :
                     '⏳ MockUp lädt...'}
                  </span>
                )}
              </div>
            </div>
            {projectData.notes && !projectData.notes.includes('<svg') && (
              <div className="mt-2 text-sm opacity-90 border-t border-white/20 pt-2">
                <strong>Notizen:</strong> {projectData.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Фоновые элементы (только если нет MockUp изображения) */}
      {!projectData?.mockupUrl && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        </div>
      )}

      <CustomerHeader customerName={projectData?.clientName || ''} orderToken={''} />
      
      <MondayStatus />
      
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Neon Konfigurator
            </h1>
            <p className="text-gray-600">
              Gestalten Sie Ihre individuelle LED-Neon Lichtwerbung
            </p>
          </div>

          {/* Превью дизайна проекта */}
          {config.selectedDesign && (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/30 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Ihr Design: {config.selectedDesign.name}</h3>
                <div className="flex items-center gap-4">
                  {/* Отображение цены */}
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Preis (inkl. MwSt.)</div>
                    <div className="text-2xl font-bold text-green-600">
                      €{currentPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(currentPrice / ((config.customWidth * config.calculatedHeight) / 10000)).toFixed(2)} €/m²
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Neon</span>
                    <button
                      onClick={() => setNeonOn(!neonOn)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        neonOn ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          neonOn ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                <NeonMockupStage
                  lengthCm={Math.max(config.customWidth, config.calculatedHeight)}
                  waterproof={config.isWaterproof}
                  neonOn={neonOn}
                  uvOn={config.hasUvPrint || false}
                  currentSvgContent={uploadedSvgsByDesign[config.selectedDesign.id]}
                />
              </div>
            </div>
          )}

          {/* Опции конфигурации */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 mb-8 border border-white/30">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Konfiguration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Breite (cm)</label>
                <input
                  type="number"
                  value={config.customWidth}
                  onChange={(e) => updateWidth(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="10"
                  max="500"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Höhe (cm)</label>
                <input
                  type="number"
                  value={config.calculatedHeight}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Preis (gesamt)</label>
                <div className="text-2xl font-bold text-green-600">
                  €{currentPrice.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Опции */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isWaterproof}
                  onChange={(e) => setConfig(prev => ({ ...prev, isWaterproof: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Wasserdicht</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.hasUvPrint}
                  onChange={(e) => setConfig(prev => ({ ...prev, hasUvPrint: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">UV-Druck</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.hasHangingSystem}
                  onChange={(e) => setConfig(prev => ({ ...prev, hasHangingSystem: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Hängesystem</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includesInstallation}
                  onChange={(e) => setConfig(prev => ({ ...prev, includesInstallation: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Express (5 Tage)</span>
              </label>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="text-center space-y-4">
            <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/30 mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Zusammenfassung</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{config.customWidth}×{config.calculatedHeight} cm</div>
                  <div className="text-sm text-gray-600">Abmessungen</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">€{currentPrice.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Gesamtpreis (inkl. MwSt.)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {config.includesInstallation ? '5' : '10-14'} Tage
                  </div>
                  <div className="text-sm text-gray-600">Lieferzeit</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={async () => {
                if (!projectData) return;
                
                console.log('Design approved by client');
                
                // Логируем одобрение дизайна
                await crmService.logInteraction(projectData.projectId, 'design_approved', {
                  finalPrice: currentPrice,
                  configuration: config,
                  timestamp: new Date().toISOString()
                });
                
                // Обновляем статус проекта
                await crmService.updateProjectStatus(projectData.projectId, 'approved');
                
                alert('Vielen Dank! Ihr Design wurde bestätigt. Wir werden uns in Kürze mit Ihnen in Verbindung setzen.');
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              ✓ Design bestätigen & Bestellung aufgeben
            </button>
            
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Nach der Bestätigung erhalten Sie eine E-Mail mit allen Details und den nächsten Schritten.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
