import { useState } from 'react';
import RealPricingCalculator from '../components/RealPricingCalculator';
import { ConfigurationState } from '../types/configurator';
import { MOCK_DESIGNS } from '../data/mockDesigns';

export default function PricingTestPage() {
  const [selectedDesign] = useState(MOCK_DESIGNS[0]);
  const [config, setConfig] = useState<ConfigurationState>({
    selectedDesign: selectedDesign,
    customWidth: 100,
    calculatedHeight: 20,
    isWaterproof: false,
    isTwoPart: false,
    hasUvPrint: false,
    hasHangingSystem: false,
    includesInstallation: false,
    expressProduction: false,
    customerPostalCode: '',
    selectedShipping: null,
    signs: []
  });

  const handleConfigChange = (updates: Partial<ConfigurationState>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Preiskalkulator Test</h1>
          <p className="text-gray-400">Testen Sie den neuen Kalkulatro mit echten Monday.com Preisen</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Controls */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Konfiguration</h2>
              
              {/* Size Controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Breite (cm)</label>
                  <input
                    type="number"
                    value={config.customWidth}
                    onChange={(e) => handleConfigChange({ customWidth: parseInt(e.target.value) || 100 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    min="10"
                    max="500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Höhe (cm)</label>
                  <input
                    type="number"
                    value={config.calculatedHeight}
                    onChange={(e) => handleConfigChange({ calculatedHeight: parseInt(e.target.value) || 20 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    min="5"
                    max="200"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="mt-6 space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.isWaterproof}
                    onChange={(e) => handleConfigChange({ isWaterproof: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <span>Wasserdicht</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.hasUvPrint || false}
                    onChange={(e) => handleConfigChange({ hasUvPrint: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <span>UV-Druck</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.isTwoPart || false}
                    onChange={(e) => handleConfigChange({ isTwoPart: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <span>Mehrteilig</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.hasHangingSystem || false}
                    onChange={(e) => handleConfigChange({ hasHangingSystem: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <span>Aufhängesystem</span>
                </label>
              </div>
            </div>

            {/* Design Info */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Ausgewähltes Design</h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎨</span>
                </div>
                <div>
                  <h4 className="font-medium">{selectedDesign.name}</h4>
                  <p className="text-sm text-gray-400">{selectedDesign.description}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedDesign.elements} Elemente • {selectedDesign.ledLength}m LED
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Calculator */}
          <div>
            <RealPricingCalculator 
              config={config} 
              selectedDesign={selectedDesign}
            />
          </div>
        </div>

        {/* Test Presets */}
        <div className="mt-8 bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Test-Konfigurationen</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleConfigChange({
                customWidth: 50,
                calculatedHeight: 10,
                isWaterproof: false,
                hasUvPrint: false,
                isTwoPart: false,
                hasHangingSystem: false
              })}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left transition-colors"
            >
              <div className="font-medium">Klein & Einfach</div>
              <div className="text-sm text-gray-400">50×10cm, Basic</div>
            </button>

            <button
              onClick={() => handleConfigChange({
                customWidth: 150,
                calculatedHeight: 30,
                isWaterproof: true,
                hasUvPrint: true,
                isTwoPart: false,
                hasHangingSystem: true
              })}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left transition-colors"
            >
              <div className="font-medium">Mittel & Premium</div>
              <div className="text-sm text-gray-400">150×30cm, Wasserdicht, UV-Druck</div>
            </button>

            <button
              onClick={() => handleConfigChange({
                customWidth: 300,
                calculatedHeight: 50,
                isWaterproof: true,
                hasUvPrint: true,
                isTwoPart: true,
                hasHangingSystem: true
              })}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left transition-colors"
            >
              <div className="font-medium">Groß & Vollausstattung</div>
              <div className="text-sm text-gray-400">300×50cm, Alle Optionen</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
