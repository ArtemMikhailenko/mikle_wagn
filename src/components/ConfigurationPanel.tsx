import React from 'react';
import { Ruler, Shield, Wrench, MapPin, Scissors, Info } from 'lucide-react';
import { ConfigurationState, NeonDesign } from '../types/configurator';
import { calculateProportionalHeight, calculateProportionalLedLength, validateConfiguration } from '../utils/calculations';

interface ConfigurationPanelProps {
  configuration: ConfigurationState;
  selectedDesign: NeonDesign;
  onConfigurationChange: (updates: Partial<ConfigurationState>) => void;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  configuration,
  selectedDesign,
  onConfigurationChange,
}) => {
  // Early return if selectedDesign is not available
  if (!selectedDesign) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="text-gray-400">Design wird geladen...</div>
      </div>
    );
  }

  const errors = validateConfiguration(configuration);
  
  // Calculate maximum width based on height constraint
  const maxWidthForHeight = Math.floor((200 * selectedDesign.originalWidth) / selectedDesign.originalHeight);
  const effectiveMaxWidth = configuration.isTwoPart ? 1000 : Math.min(300, maxWidthForHeight);
  
  const handleWidthChange = (newWidth: number) => {
    const newHeight = calculateProportionalHeight(
      selectedDesign.originalWidth,
      selectedDesign.originalHeight,
      newWidth
    );
    
    // Don't allow width that would make height > 200cm (unless two-part)
    if (!configuration.isTwoPart && newHeight > 200) {
      return;
    }
    
    onConfigurationChange({
      customWidth: newWidth,
      calculatedHeight: newHeight
    });
  };

  const handleTwoPartChange = (isTwoPart: boolean) => {
    // When switching to two-part, allow larger widths
    if (!isTwoPart && configuration.customWidth > 300) {
      // Recalculate to fit within single-part constraints
      const newWidth = Math.min(configuration.customWidth, maxWidthForHeight);
      const newHeight = calculateProportionalHeight(
        selectedDesign.originalWidth,
        selectedDesign.originalHeight,
        newWidth
      );
      onConfigurationChange({
        customWidth: newWidth,
        calculatedHeight: newHeight,
        isTwoPart
      });
    } else {
      onConfigurationChange({ isTwoPart });
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <Wrench className="w-6 h-6 mr-2" />
        Konfiguration
      </h2>

      <div className="space-y-6">
        {/* Width Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm font-medium">
              <Ruler className="w-4 h-4 mr-2" />
              Breite
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="10"
                max={effectiveMaxWidth}
                step="1"
                value={configuration.customWidth}
                onChange={(e) => handleWidthChange(parseInt(e.target.value))}
                className="w-32"
              />
              <input
                type="number"
                min="10"
                max={effectiveMaxWidth}
                value={configuration.customWidth}
                onChange={(e) => handleWidthChange(parseInt(e.target.value))}
                className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
              />
              <span>{configuration.isTwoPart ? '10m' : '3m'}</span>
            </div>
          </div>
        </div>

        {/* Height Display */}
        <div className="flex items-center justify-between">
          <label className="flex items-center text-sm font-medium">
            <Scissors className="w-4 h-4 mr-2" />
            Höhe (berechnet)
          </label>
          <span className="text-lg md:text-lg font-bold text-gray-800">{configuration.calculatedHeight} cm</span>
        </div>

        {/* Two-Part Option */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm font-medium">
              <MapPin className="w-4 h-4 mr-2" />
              Mehrteilig (über 3m)
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={configuration.isTwoPart || false}
                onChange={(e) => handleTwoPartChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          {configuration.isTwoPart && (
            <div className="text-xs text-yellow-400 bg-yellow-400/10 p-2 rounded">
              <Info className="w-4 h-4 inline mr-1" />
              Mehrteilige Schilder haben einen Aufpreis von 15% und längere Lieferzeiten.
            </div>
          )}
        </div>

        {/* Elements Info */}
        <div className="flex items-center justify-between">
          <label className="flex items-center text-sm font-medium">
            <Shield className="w-4 h-4 mr-2" />
            Elemente
          </label>
          <div className="text-base md:text-lg font-bold text-blue-600">{selectedDesign.elements}</div>
        </div>

        {/* LED Length Display */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">LED-Länge</label>
          <div className="text-sm text-gray-400">
            {calculateProportionalLedLength(
              selectedDesign.originalWidth,
              selectedDesign.originalHeight,
              selectedDesign.ledLength,
              configuration.customWidth,
              configuration.calculatedHeight
            ).toFixed(1)}m
          </div>
        </div>

        {/* Power Consumption */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Stromverbrauch</label>
          <div className="text-sm text-gray-400">
            {Math.round(calculateProportionalLedLength(
              selectedDesign.originalWidth,
              selectedDesign.originalHeight,
              selectedDesign.ledLength,
              configuration.customWidth,
              configuration.calculatedHeight
            ) * 12)}W
          </div>
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="space-y-2">
            {errors.map((error, index) => (
              <div key={index} className="text-red-400 text-sm bg-red-400/10 p-2 rounded">
                {error}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigurationPanel;
