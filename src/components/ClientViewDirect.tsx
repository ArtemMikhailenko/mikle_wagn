import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import CustomerHeader from './CustomerHeader';
import MondayStatus from './MondayStatus';
import { ConfigurationState } from '../types/configurator';
import { MOCK_DESIGNS } from '../data/mockDesigns';
import { calculateSingleSignPrice } from '../utils/calculations';
import NeonMockupStage from './NeonMockupStage';
import mondayDirectService from '../services/mondayDirectService';

export default function ClientViewDirect() {
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
  const [projectData, setProjectData] = useState<any>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  
  // SVG uploads по дизайну (пока не используется)
  // const [uploadedSvgsByDesign, setUploadedSvgsByDesign] = useState<Record<string, string>>({});
  
  // Расчет цены
  const currentPrice = config.selectedDesign ? calculateSingleSignPrice(
    config.selectedDesign,
    config.customWidth,
    config.calculatedHeight,
    config.isWaterproof,
    false, // isTwoPart
    config.hasUvPrint,
    config.hasHangingSystem,
    config.includesInstallation // expressProduction
  ) : 0;

  // Загрузка данных проекта из Monday.com напрямую
  useEffect(() => {
    const loadProjectData = async () => {
      if (!projectId) return;
      
      setIsLoadingProject(true);
      try {
        console.log('� Loading project data for:', projectId);
        
        // Пробуем загрузить проект по ID
        let data = await mondayDirectService.getProjectById(projectId);
        
        if (!data) {
          // Если не найден по ID, пробуем найти по имени
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
        console.log('🖼️ Mockup URL from project:', data.mockupUrl);
        console.log('🎨 SVG URL from project:', data.svgUrl);
        
        // ВАЖНО: Проверяем, не является ли мокап fallback из другого проекта
        if (data.mockupUrl && data.mockupUrl.includes('143534739')) {
          console.warn('⚠️ Detected fallback mockup from another project, removing it');
          data.mockupUrl = '';
        }
        
        // MockUp URL уже загружен в основной функции getProjectById
        // Больше не нужно делать отдельный запрос getMockupForProject
        
        // Конвертируем данные Monday.com в формат NeonDesign (реальные данные)
        const design = {
          ...data, // Используем реальные данные из Monday.com
          id: data.id,
          name: data.name,
        };
        
        // Обновляем конфигурацию реальными данными проекта
        setConfig(prev => ({
          ...prev,
          selectedDesign: design,
          customWidth: data.originalWidth || 100, // Реальная ширина из Monday.com
          calculatedHeight: data.originalHeight || 30, // Реальная высота из Monday.com
          isWaterproof: data.isWaterproof || false, // Реальное значение из Monday.com
          hasUvPrint: data.hasUvPrint || false, // Реальное значение из Monday.com
        }));
        
      } catch (error) {
        console.error('❌ Error loading project data:', error);
      } finally {
        setIsLoadingProject(false);
      }
    };

    loadProjectData();
  }, [projectId]);

  // Определяем какой контент использовать для превью
  const getPreviewContent = () => {
    // Если есть мокап, используем его
    if (projectData?.mockupUrl) {
      return {
        type: 'mockup',
        url: projectData.mockupUrl
      };
    }
    
    // Если мокапа нет, но есть SVG, используем SVG как изображение
    if (projectData?.svgUrl) {
      return {
        type: 'svg',
        url: projectData.svgUrl
      };
    }
    
    // Если ничего нет, используем null
    return null;
  };

  const previewContent = getPreviewContent();

  // Загрузка дизайнов (симуляция как в оригинале)
  useEffect(() => {
    const loadDesigns = async () => {
      try {
        // Симуляция загрузки
        await new Promise(resolve => setTimeout(resolve, 500));
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

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom right, rgb(249, 250, 251), rgb(219, 234, 254), rgb(237, 233, 254))'
      }}
    >
      {/* Информация о проекте */}
      {projectData && (
        <div className="bg-blue-600/90 backdrop-blur-sm text-white px-4 py-2 text-center">
          <p className="text-sm">
            Projekt: <span className="font-semibold">{projectData.name}</span>
            <span className="ml-4 opacity-75">• {config.customWidth}×{config.calculatedHeight} cm</span>
            <span className="ml-4 opacity-75">• Direct Monday.com</span>
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

      {/* Фоновые элементы */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
      </div>

      <CustomerHeader customerName={projectData?.name || ''} orderToken={''} />
      
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
                    <div className="text-sm text-gray-600">Preis</div>
                    <div className="text-lg font-bold text-blue-600">
                      {currentPrice.toFixed(2)} €
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
                  customMockupUrl={previewContent?.type === 'mockup' ? previewContent.url : undefined}
                  svgImageUrl={previewContent?.type === 'svg' ? previewContent.url : undefined}
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
                  onChange={(e) => setConfig(prev => ({ ...prev, customWidth: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="text-sm font-medium text-gray-700">Preis</label>
                <div className="text-2xl font-bold text-green-600">
                  €{calculateSingleSignPrice(
                    config.selectedDesign,
                    config.customWidth,
                    config.calculatedHeight,
                    config.isWaterproof,
                    config.hasUvPrint,
                    config.hasHangingSystem,
                    false, // isTwoPart
                    false  // expressProduction
                  ).toFixed(2)}
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
          <div className="text-center">
            <button
              onClick={() => console.log('Design approved by client')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              Design bestätigen & Bestellung aufgeben
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
