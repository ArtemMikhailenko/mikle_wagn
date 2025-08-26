import { NeonDesign } from '../types/configurator';
import mondayService from '../services/mondayService';

export const MOCK_DESIGNS: NeonDesign[] = [
  {
    id: 'design-1',
    name: 'Classic Business Logo',
    originalWidth: 400, // 4m
    originalHeight: 200, // 2m
    elements: 5,
    ledLength: 12,
    mockupUrl: 'https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&fit=crop',
    description: 'Klassisches Firmenlogo-Design mit klaren Linien',
    // Example SVG content from CRM
    svgContent: `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="380" height="180" fill="none" stroke="#3B82F6" stroke-width="3" rx="20"/>
      <text x="200" y="100" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#3B82F6">BUSINESS</text>
      <text x="200" y="140" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="18" fill="#6B7280">Professional Logo</text>
    </svg>`,
    hasCustomSvg: true
  },
  {
    id: 'design-2',
    name: 'Modern Script Text',
    originalWidth: 300,
    originalHeight: 100,
    elements: 8,
    ledLength: 18,
    mockupUrl: 'https://images.pexels.com/photos/1036622/pexels-photo-1036622.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&fit=crop',
    description: 'Moderne Schreibschrift für elegante Auftritte',
    // Example SVG with script font
    svgContent: `<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 60 Q40 20, 80 60 Q120 20, 160 60 Q200 20, 240 60 Q280 20, 280 60" fill="none" stroke="#8B5CF6" stroke-width="4" stroke-linecap="round"/>
      <text x="150" y="70" text-anchor="middle" font-family="cursive" font-size="24" font-style="italic" fill="#8B5CF6">Elegant Script</text>
    </svg>`,
    hasCustomSvg: true
  },
  {
    id: 'design-3',
    name: 'Geometric Pattern',
    originalWidth: 250,
    originalHeight: 250,
    elements: 12,
    ledLength: 25,
    mockupUrl: 'https://images.pexels.com/photos/1036641/pexels-photo-1036641.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&fit=crop',
    description: 'Geometrisches Muster für auffällige Designs',
    // Example geometric SVG
    svgContent: `<svg viewBox="0 0 250 250" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="hexPattern" x="0" y="0" width="50" height="43.3" patternUnits="userSpaceOnUse">
          <polygon points="25,5 43.3,15 43.3,35 25,45 6.7,35 6.7,15" fill="none" stroke="#EC4899" stroke-width="2"/>
        </pattern>
      </defs>
      <rect width="250" height="250" fill="url(#hexPattern)"/>
      <circle cx="125" cy="125" r="80" fill="none" stroke="#EC4899" stroke-width="4"/>
      <text x="125" y="135" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#EC4899">GEO</text>
    </svg>`,
    hasCustomSvg: true
  },
  {
    id: 'design-4',
    name: 'Restaurant Sign',
    originalWidth: 500,
    originalHeight: 150,
    elements: 6,
    ledLength: 20,
    mockupUrl: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&fit=crop',
    description: 'Perfekt für Restaurants und Gastronomie'
  },
  {
    id: 'design-5',
    name: 'Minimalist Icon',
    originalWidth: 150,
    originalHeight: 150,
    elements: 3,
    ledLength: 8,
    mockupUrl: 'https://images.pexels.com/photos/1036624/pexels-photo-1036624.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&fit=crop',
    description: 'Minimalistisches Icon-Design'
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