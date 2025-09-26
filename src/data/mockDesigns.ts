import { NeonDesign } from '../types/configurator';
import mondayService from '../services/mondayService';

export const MOCK_DESIGNS: NeonDesign[] = [
  {
    id: 'design-1',
    name: 'Custom Project',
    originalWidth: 200, // 2m
    originalHeight: 60, // 60cm
    elements: 1,
    ledLength: 5.2,
    mockupUrl: '', // Убираем мокапы изображения
    description: 'Индивидуальный проект',
    svgContent: '',
    hasCustomSvg: false,
    createdAt: new Date().toISOString()
  }
];

// Function to get designs from Monday.com or fallback to mock designs
export const getAvailableDesigns = async (): Promise<NeonDesign[]> => {
  try {
    await mondayService.fetchPrices();
    const mondayDesigns = mondayService.getDesigns();
    
    if (mondayDesigns.length > 0) {
      console.log('🎨 Using Monday.com designs:', mondayDesigns.length);
      return mondayDesigns;
    }
  } catch (error) {
    console.warn('❌ Failed to load Monday.com designs, using mock designs:', error);
  }
  
  console.log('📦 Using mock designs as fallback');
  return MOCK_DESIGNS;
};