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
    
    onConfigChange({
      customWidth: newWidth,
      calculatedHeight: newHeight,
    });
  };

  const handleTwoPartChange = (isTwoPart: boolean) => {
    if (!isTwoPart && config.customWidth > 300) {
      // Reset width to 300 if disabling two-part and current width > 300
      const newHeight = calculateProportionalHeight(
        config.selectedDesign.originalWidth,
        config.selectedDesign.originalHeight,
        300
      );
      onConfigChange({
        isTwoPart,
        customWidth: 300,
        calculatedHeight: newHeight,
      });
    } else {
      onConfigChange({ isTwoPart });
    }
  };

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-xl p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center space-x-2 md:space-x-3 mb-4 md:mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-2">
          <Ruler className="h-5 md:h-6 w-5 md:w-6 text-white" />
        </div>
        <h2 className="text-lg md:text-xl font-bold text-gray-800">Konfiguration</h2>
      </div>

      {/* Size Configuration */}
      <div className="space-y-3 md:space-y-4">
        {/* Horizontal Width and Height */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div>
            <label className="block text-sm md:text-sm font-semibold text-gray-700 mb-2">
              Breite
            </label>
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="number"
                min="20"
                max={effectiveMaxWidth}
                value={config.customWidth}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                className="flex-1 mobile-input text-center font-medium"
              />
              <span className="text-gray-600 text-sm font-medium">cm</span>
            </div>
            <input
              type="range"
              min="20"
              max={effectiveMaxWidth}
              value={config.customWidth}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
              className="w-full mobile-slider appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>20cm</span>
              <span>{config.isTwoPart ? '10m' : '3m'}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm md:text-sm font-semibold text-gray-700 mb-2">
              Höhe
            </label>
            <div className="bg-gray-100 px-3 py-3 md:py-2 rounded-lg text-center mb-2">
              <span className="text-lg md:text-lg font-bold text-gray-800">{config.calculatedHeight} cm</span>
            </div>
            <div className="text-xs text-gray-500 text-center mb-1">
              Automatisch berechnet
            </div>
            <div className="text-xs text-gray-500 text-center">
              Max: 200cm
            </div>
          </div>
        </div>

        {/* Two-Part Sign Option - Moved down and compact */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 md:p-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.isTwoPart || false}
              onChange={(e) => handleTwoPartChange(e.target.checked)}
              className="mobile-checkbox text-orange-600 focus:ring-orange-500"
            />
            <Scissors className="h-4 md:h-3 w-4 md:w-3 text-gray-500 flex-shrink-0" />
            <div className="flex items-center space-x-1">
              <span className="text-sm md:text-xs text-gray-600">
                Mehrteilig (&gt;300cm, +15%)
              </span>
              <div className="relative group">
                <Info className="h-4 md:h-3 w-4 md:w-3 text-gray-400 hover:text-blue-500 cursor-help transition-colors flex-shrink-0" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 hidden md:block w-64 text-center">
                  Für Außenbereich geeignet - Schutz vor Regen, Staub und Feuchtigkeit (IP65-Zertifizierung)
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                </div>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Technical Specifications (Read-only) */}
      <div className="border-t pt-4 md:pt-6">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 md:p-3 border border-blue-100">
          <h3 className="text-xs md:text-xs font-bold text-gray-700 mb-3 md:mb-2 flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            Technische Daten
          </h3>
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            <div className="text-center">
              <div className="text-base md:text-lg font-bold text-blue-600">{config.selectedDesign.elements}</div>
              <div className="text-xs text-gray-600">Elemente</div>
            </div>
            <div className="text-center">
              <div className="text-base md:text-lg font-bold text-purple-600">
                {calculateProportionalLedLength(
                  config.selectedDesign.originalWidth,
                  config.selectedDesign.originalHeight,
                  config.selectedDesign.ledLength,
                  config.customWidth,
                  config.calculatedHeight
                )}m
              </div>
              <div className="text-xs text-gray-600">LED-Länge</div>
            </div>
            <div className="text-center">
              <div className="text-base md:text-lg font-bold text-green-600">
                {Math.round(calculateProportionalLedLength(
                  config.selectedDesign.originalWidth,
                  config.selectedDesign.originalHeight,
                  config.selectedDesign.ledLength,
                  config.customWidth,
                  config.calculatedHeight
                ) * 9 * 1.25)}W
              </div>
              <div className="text-xs text-gray-600">Verbrauch</div>
            </div>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="border-t pt-4 md:pt-6">
        <h3 className="text-sm md:text-sm font-semibold text-gray-800 mb-3">Zusatzoptionen</h3>
        <div className="space-y-3 md:space-y-4">
          <label className="flex items-start space-x-3 cursor-pointer p-2 md:p-0 hover:bg-gray-50 md:hover:bg-transparent rounded-lg md:rounded-none transition-colors">
            <input
              type="checkbox"
              checked={config.isWaterproof}
              onChange={(e) => onConfigChange({ isWaterproof: e.target.checked })}
              className="mobile-checkbox text-blue-600 focus:ring-blue-500 mt-0.5 flex-shrink-0"
            />
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div>
                <span className="text-gray-700 font-medium text-sm md:text-base">Wasserdicht (IP65)</span>
                <div className="text-sm text-gray-500">+25% Aufpreis</div>
              </div>
            </div>
          </label>

          <div className="flex items-start space-x-3 p-2 md:p-0 rounded-lg">
            <div className="w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0">
              <div className="w-3 h-3 bg-gray-300 rounded border"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-red-600 text-lg flex-shrink-0">🔥</div>
              <div className="flex-1">
                <span className="text-gray-700 font-medium text-sm md:text-base">Super EXPRESS Produktion</span>
                <div className="text-sm text-gray-500">1 Tag • Muss telefonisch abgeklärt werden</div>
                <div className="text-xs text-blue-600 font-medium mt-1">
                  Brauchst du es noch schneller? Dann ruf uns unverzüglich an: +4915225325349
                </div>
              </div>
              <div className="relative group">
                <Info className="h-4 w-4 text-gray-400 hover:text-blue-500 cursor-help transition-colors flex-shrink-0" />
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 hidden md:block">
                  Dafür werden zusätzliche Kosten berechnet.<br/>Brauchst du es noch schneller? Dann ruf uns unverzüglich an: +4915225325349
                  <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                </div>
              </div>
            </div>
          </div>

          <label className="flex items-start space-x-3 cursor-pointer p-2 md:p-0 hover:bg-gray-50 md:hover:bg-transparent rounded-lg md:rounded-none transition-colors">
            <input
              type="checkbox"
              checked={config.includesInstallation}
              onChange={(e) => onConfigChange({ includesInstallation: e.target.checked })}
              className="mobile-checkbox text-blue-600 focus:ring-blue-500 mt-0.5 flex-shrink-0"
            />
            <div className="flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <span className="text-gray-700 font-medium text-sm md:text-base">Montage-Service</span>
                <div className="text-sm text-gray-500">PLZ eingeben für Kostenberechnung</div>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Postal Code for Installation */}
      {config.includesInstallation && (
        <div className="border-t pt-4 md:pt-6">
          <div className="flex items-center space-x-2 mb-3">
            <MapPin className="h-5 w-5 text-blue-600" />
            <label className="text-sm md:text-sm font-semibold text-gray-800">
              Ihre Postleitzahl
            </label>
          </div>
          <input
            type="text"
            placeholder="z.B. 10115"
            value={config.customerPostalCode}
            onChange={(e) => onConfigChange({ customerPostalCode: e.target.value })}
            className="w-full mobile-input"
            maxLength={5}
          />
          <p className="text-sm text-gray-500 mt-2">
            Benötigt für die Berechnung der Anfahrtskosten
          </p>
        </div>
      )}

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="border-t pt-4 md:pt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <h4 className="text-red-800 font-semibold mb-2">Bitte korrigieren Sie:</h4>
            <ul className="text-red-700 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationPanel;