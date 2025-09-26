import React from 'react';
import { ChevronLeft, ChevronRight, Palette, ShoppingCart } from 'lucide-react';
import { NeonDesign } from '../types/configurator';
import DiscountTimer from './DiscountTimer';
import FakeDiscountPriceDisplay from './FakeDiscountPriceDisplay';
import { calculateSingleSignPriceWithFakeDiscount } from '../utils/calculations';
import { SignConfiguration } from '../types/configurator';
import SVGPreview from './SVGPreview';

interface DesignSelectorProps {
  designs: NeonDesign[];
  selectedDesign: NeonDesign;
  onDesignChange: (design: NeonDesign) => void;
  onToggleDesign: (design: NeonDesign, added: boolean) => void;
  config: any;
  signs?: SignConfiguration[];
  onSignToggle?: (signId: string, enabled: boolean) => void;
  onRemoveSign?: (signId: string) => void;
  isWaterproof?: boolean;
  isTwoPart?: boolean;
  hasUvPrint?: boolean;
  onUvPrintChange?: (hasUvPrint: boolean) => void;
  onConfigChange?: (updates: any) => void;
}

const DesignSelector: React.FC<DesignSelectorProps> = ({
  designs,
  selectedDesign,
  onDesignChange,
  onToggleDesign,
  config,
  isWaterproof = false,
  isTwoPart = false,
  hasUvPrint = true,
  onUvPrintChange,
}) => {
  console.log('🎨 DesignSelector hasUvPrint:', hasUvPrint);
  console.log('🎨 DesignSelector onUvPrintChange:', typeof onUvPrintChange);
  
  // State für Button Animation
  const [isAdding, setIsAdding] = React.useState(false);
  
  // Calculate current design count and pricing
  const currentDesignCount = config.signs?.filter((sign: any) => sign.design.id === selectedDesign.id).length || 0;
  const currentWidth = config.customWidth;
  const currentHeight = config.calculatedHeight;
  
  const currentIndex = designs.findIndex(d => d.id === selectedDesign.id);
  
  const goToPrevious = () => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : designs.length - 1;
    onDesignChange(designs[prevIndex]);
  };
  
  const goToNext = () => {
    const nextIndex = currentIndex < designs.length - 1 ? currentIndex + 1 : 0;
    onDesignChange(designs[nextIndex]);
  };

  const handleCheckboxChange = () => {
    // Animation starten
    setIsAdding(true);
    
    // Design hinzufügen - onToggleDesign wird jetzt immer hinzufügen
    onToggleDesign(selectedDesign, true);
    
    // Animation nach 1 Sekunde beenden
    setTimeout(() => {
      setIsAdding(false);
    }, 1000);
  };

  const handleUvPrintToggle = () => {
    console.log('🎨 UV-Druck Toggle clicked! Current:', hasUvPrint, 'New:', !hasUvPrint);
    const newValue = !hasUvPrint;
    console.log('🎨 Calling onUvPrintChange with:', newValue);
    onUvPrintChange?.(newValue);
  };

  // Calculate current design price with real-time configuration
  const currentDesignPriceData = React.useMemo(() => {
    console.log('💰 Calculating price with hasUvPrint:', hasUvPrint);
    const priceData = calculateSingleSignPriceWithFakeDiscount(
      selectedDesign,
      currentWidth,
      currentHeight,
      isWaterproof,
      isTwoPart,
      hasUvPrint,
      false, // hasHangingSystem
      config.expressProduction || false
    );
    
    console.log('💰 Single sign price (with express if enabled):', priceData.finalPrice);
    return priceData;
  }, [selectedDesign, currentWidth, currentHeight, isWaterproof, isTwoPart, hasUvPrint, config.expressProduction]);
  
  const currentDesignPrice = currentDesignPriceData.finalPrice;

  const isCurrentDesignAdded = currentDesignCount > 0;

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-xl p-4 md:p-8">
      <div className="flex items-center space-x-2 md:space-x-3 mb-4 md:mb-6">
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg p-2">
          <Palette className="h-5 md:h-6 w-5 md:w-6 text-white" />
        </div>
        <h2 className="text-lg md:text-2xl font-bold text-gray-800">Design auswählen</h2>
      </div>

      {/* Discount Timer */}
      <DiscountTimer className="mb-4" />

      {/* Design Display */}
      <div className="relative lg:block">
        <div className={`bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl p-4 md:p-6 flex items-center justify-center min-h-[350px] lg:min-h-[300px] overflow-hidden transition-all duration-300 relative border-4 border-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 shadow-2xl ${
          !isCurrentDesignAdded ? 'opacity-50 grayscale' : ''
        } lg:rounded-b-none before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r before:from-blue-500/20 before:via-purple-500/20 before:to-pink-500/20 before:blur-sm before:-z-10`}>
          
          {/* Stylische Ecken-Ornamente */}
          <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-blue-400/60 rounded-tl-lg"></div>
          <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-purple-400/60 rounded-tr-lg"></div>
          <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-pink-400/60 rounded-bl-lg"></div>
          <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-blue-400/60 rounded-br-lg"></div>
          
          {/* Glowing border effect */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
          
          {/* SVG Preview with fallback to mockup image */}
          <div className="max-w-full max-h-full flex items-center justify-center relative z-10 px-2 md:px-4">
            <SVGPreview
              design={selectedDesign}
              width={config.customWidth}
              height={config.calculatedHeight}
              className="max-w-full max-h-full shadow-2xl lg:shadow-2xl border border-white/10 rounded-lg w-[240px] h-[160px] sm:w-[280px] sm:h-[200px] md:w-[320px] md:h-[220px] lg:w-[400px] lg:h-[300px]"
            />
          </div>
          
          {/* Mobile Navigation Arrows - показывать только если дизайнов больше одного */}
          {designs.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="lg:hidden absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
              >
                <ChevronLeft className="h-6 w-6 text-gray-700" />
              </button>
              
              <button
                onClick={goToNext}
                className="lg:hidden absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
              >
                <ChevronRight className="h-6 w-6 text-gray-700" />
              </button>
            </>
          )}
          
          {/* Design Indicators - показывать только если дизайнов больше одного */}
          {designs.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 lg:space-x-1.5">
              {designs.map((_, index) => (
                <button
                  key={index}
                  onClick={() => onDesignChange(designs[index])}
                  className={`w-4 h-4 lg:w-2.5 lg:h-2.5 rounded-full transition-all duration-300 border border-white/30 ${
                    index === currentIndex
                      ? 'bg-white shadow-lg shadow-white/50 scale-110'
                      : 'bg-white/20 hover:bg-white/40 backdrop-blur-sm'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* UV-Druck Toggle - Außerhalb des Bildes */}
        <div className="mt-3 mb-3">
          <button
            onClick={handleUvPrintToggle}
            className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 border ${
              hasUvPrint
                ? 'bg-green-600 text-white border-green-500 shadow-lg hover:bg-green-700 active:scale-95'
                : 'bg-red-500 text-white border-red-400 shadow-md hover:bg-red-600 active:scale-95'
            }`}
            title="UV-Druck Zusatzoption ein/ausschalten"
          >
            {hasUvPrint ? '✅ UV-Druck AKTIV' : '❌ UV-Druck DEAKTIVIERT'}
          </button>
        </div>
        
        {/* Desktop Navigation Arrows - показывать только если дизайнов больше одного */}
        {designs.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="hidden lg:block absolute -left-3 lg:-left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-3 lg:p-2 shadow-lg transition-all duration-300 hover:scale-110"
            >
              <ChevronLeft className="h-5 lg:h-4 w-5 lg:w-4 text-gray-700" />
            </button>
            
            <button
              onClick={goToNext}
              className="hidden lg:block absolute -right-3 lg:-right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-3 lg:p-2 shadow-lg transition-all duration-300 hover:scale-110"
            >
              <ChevronRight className="h-5 lg:h-4 w-5 lg:w-4 text-gray-700" />
            </button>
          </>
        )}
      </div>

      {/* Design Info - Connected to design display */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 lg:rounded-t-none rounded-b-xl px-4 py-3 lg:px-3 lg:py-2 border-2 border-gradient-to-r from-blue-500/40 via-purple-500/40 to-pink-500/40 lg:border-t-0 mb-6 lg:mb-6 shadow-lg relative overflow-hidden">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>
        
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white truncate pr-2 relative z-10">{selectedDesign.name}</h3>
          <span className="text-xs font-bold text-gray-300 bg-gradient-to-r from-gray-700 to-gray-600 px-2 py-1 rounded-full flex-shrink-0 border border-gray-500/30 relative z-10">#{currentIndex + 1}</span>
        </div>
        
        <div className="grid grid-cols-2 lg:flex lg:items-center lg:justify-between gap-2 lg:gap-0 mt-2 text-xs relative z-10">
          <div className="text-center">
            <div className="text-gray-400 text-xs">Breite</div>
            <div className="font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded">{selectedDesign.originalWidth}cm</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-xs">Höhe</div>
            <div className="font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">{selectedDesign.originalHeight}cm</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-xs">Elemente</div>
            <div className="font-bold text-green-300 bg-green-500/20 px-2 py-0.5 rounded">{selectedDesign.elements}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-xs">LED</div>
            <div className="font-bold text-pink-300 bg-pink-500/20 px-2 py-0.5 rounded">
              {selectedDesign.ledLength}m
            </div>
          </div>
        </div>
      </div>

      {/* Add to Cart Section - Desktop Only */}
      <div className="mb-3 lg:mb-4 mt-3 lg:mt-4 hidden lg:block">
        <div className="space-y-3">
          {/* Add Button - Always visible and clickable for duplicates */}
          <button
            onClick={handleCheckboxChange}
            className={`w-full font-semibold py-3 rounded-lg transition-all duration-300 transform shadow-lg flex items-center justify-center space-x-3 relative ${
              isAdding 
                ? 'bg-green-600 text-white scale-105 shadow-xl' 
                : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 active:scale-95 cursor-pointer'
            }`}
          >
            {isAdding ? (
              <>
                <div className="bg-white/20 rounded-full p-1 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>In Warenkorb ✅</span>
              </>
            ) : (
              <>
                <div className="bg-white/20 rounded-full p-1 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span>{currentDesignCount > 0 ? 'Weitere hinzufügen' : 'Hinzufügen'}</span>
                <div className="bg-white rounded-full px-3 py-1 text-sm font-bold flex-shrink-0 shadow-md border">
                  <FakeDiscountPriceDisplay 
                    realPrice={currentDesignPriceData.originalPrice}
                    compact={true}
                  />
                </div>
              </>
            )}
            
            {/* Animated counter badge */}
            {currentDesignCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-bounce shadow-lg border-2 border-white">
                {currentDesignCount}
              </div>
            )}
          </button>
          
          {/* Cart Status - Show if items exist */}
          {currentDesignCount > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="bg-green-500 rounded-full p-1 flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-blue-800 font-semibold">
                    {currentDesignCount}x im Warenkorb
                  </span>
                </div>
              </div>
              <div className="text-sm text-blue-700 mb-1">
                LED-Schild {currentIndex + 1} ({currentWidth}×{currentHeight}cm)
                {isWaterproof && ' • Wasserdicht'}
                {isTwoPart && ' • Mehrteilig'}
                {hasUvPrint && ' • UV-Druck'}
              </div>
              <div className="text-lg font-bold text-blue-800">
                <FakeDiscountPriceDisplay 
                  realPrice={currentDesignPriceData.originalPrice}
                  className=""
                  showTimer={false}
                />
                <span className="text-sm"> pro Stück</span>
              </div>
              <div className="text-sm text-white font-medium mt-1">
                {currentDesignCount}x • €{(currentDesignPrice * currentDesignCount).toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Add to Cart Button - Simplified */}
      <div className="lg:hidden">
        <div className="space-y-3">
          {/* Add Button - Always visible and clickable for duplicates */}
          <button
            onClick={handleCheckboxChange}
            className={`w-full font-bold py-5 rounded-xl flex items-center justify-center space-x-3 shadow-lg text-lg relative transition-all duration-300 ${
              isAdding 
                ? 'bg-green-600 text-white scale-105' 
                : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white active:scale-95 cursor-pointer'
            }`}
          >
            {isAdding ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>In Warenkorb ✅</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5" />
                <span>{currentDesignCount > 0 ? 'Weitere hinzufügen' : 'Hinzufügen'}</span>
                <div className="bg-white rounded-full px-2 py-1 ml-2 shadow-md border">
                  <FakeDiscountPriceDisplay 
                    realPrice={currentDesignPriceData.originalPrice}
                    compact={true}
                  />
                </div>
              </>
            )}
            
            {/* Mobile counter badge */}
            {currentDesignCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-sm font-bold rounded-full h-7 w-7 flex items-center justify-center animate-bounce shadow-lg border-2 border-white">
                {currentDesignCount}
              </div>
            )}
          </button>
          
          {/* Mobile Cart Status - Only show if items exist */}
          {currentDesignCount > 0 && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="bg-green-500 rounded-full p-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-green-800 font-bold">{currentDesignCount}x Hinzugefügt</span>
                </div>
              </div>
              <div className="text-xl font-bold text-white mt-2">
                €{(currentDesignPrice * currentDesignCount).toFixed(2)}
                <div className="text-sm text-gray-600 font-normal">
                  {currentDesignPriceData.discountPercentage > 0 && (
                    <span className="text-red">
                      Gespart: €{(currentDesignPriceData.discountAmount * currentDesignCount).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignSelector;