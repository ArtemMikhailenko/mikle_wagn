import React, { useState, useEffect } from 'react';
import { Calculator, Euro, AlertCircle, CheckCircle } from 'lucide-react';
import LottieLoader from './LottieLoader';
import { optimizedMondayService, MondayPriceItem } from '../services/optimizedMondayService';
import { ConfigurationState } from '../types/configurator';

interface RealPricingCalculatorProps {
  config: ConfigurationState;
  selectedDesign?: any;
}

interface PriceCalculation {
  basePrice: number;
  waterproofing: number;
  uvPrint: number;
  multiPart: number;
  laborCost: number;
  administrativeCosts: number;
  controller: number;
  hangingSystem: number;
  shipping: number;
  total: number;
}

export default function RealPricingCalculator({ config, selectedDesign }: RealPricingCalculatorProps) {
  const [prices, setPrices] = useState<Map<string, MondayPriceItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculation, setCalculation] = useState<PriceCalculation | null>(null);

  useEffect(() => {
    loadPrices();
  }, []);

  useEffect(() => {
    if (prices.size > 0) {
      calculatePrice();
    }
  }, [prices, config, selectedDesign]);

  const loadPrices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const priceData = await optimizedMondayService.getAllPrices();
      setPrices(priceData);
      console.log('💰 Prices loaded for calculator:', priceData.size, 'items');
    } catch (err) {
      setError('Fehler beim Laden der Preise');
      console.error('Error loading prices:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (key: string): number => {
    const item = prices.get(key);
    return item?.value || 0;
  };

  const calculatePrice = () => {
    if (!selectedDesign || prices.size === 0) return;

    // Base calculations - use correct property names from ConfigurationState
    const width = config.customWidth || selectedDesign.originalWidth || 100;
    const height = config.calculatedHeight || selectedDesign.originalHeight || 20;
    const area = (width / 100) * (height / 100); // Convert cm to m²
    const elements = selectedDesign.elements || 1;
    const ledLength = selectedDesign.ledLength || 3;
    
    // Get prices from Monday.com
    const administrativeCosts = getPrice('verwaltungskosten') || getPrice('administrative_costs');
    const waterproofingPrice = getPrice('wasserdichtigkeit') || getPrice('waterproofing');
    const multiPartPrice = getPrice('mehrteilig') || getPrice('multi_part');
    const timePerM2 = getPrice('zeit_pro_m²') || getPrice('time_per_m2');
    const timePerElement = getPrice('zeit_pro_element') || getPrice('time_per_element');
    const hourlyWage = getPrice('hourly_wage') || 45; // Fallback
    const controllerPrice = getPrice('controller');
    const hangingSystemPrice = getPrice('hanging_system');
    const uvPrintPrice = getPrice('uv_print');

    // Base price calculation (simplified)
    const basePrice = area * 150; // €150 per m² as base price

    // Additional costs
    const waterproofing = config.isWaterproof ? waterproofingPrice : 0;
    const uvPrint = config.hasUvPrint ? (uvPrintPrice * area) : 0;
    const multiPart = config.isTwoPart ? multiPartPrice : 0;
    
    // Labor costs
    const laborTime = (timePerM2 * area) + (timePerElement * elements);
    const laborCost = laborTime * hourlyWage;
    
    // Components
    const controller = elements > 0 ? controllerPrice : 0;
    const hangingSystem = config.hasHangingSystem ? hangingSystemPrice : 0;
    
    // Shipping (simplified)
    const shipping = getShippingCost(width, height);
    
    const total = basePrice + waterproofing + uvPrint + multiPart + laborCost + 
                 administrativeCosts + controller + hangingSystem + shipping;

    setCalculation({
      basePrice,
      waterproofing,
      uvPrint,
      multiPart,
      laborCost,
      administrativeCosts,
      controller,
      hangingSystem,
      shipping,
      total
    });
  };

  const getShippingCost = (width: number, height: number): number => {
    const maxDimension = Math.max(width, height);
    
    if (maxDimension <= 20) return getPrice('dhl_klein_20cm');
    if (maxDimension <= 60) return getPrice('dhl_mittel_60cm');
    if (maxDimension <= 100) return getPrice('dhl_gross_100cm');
    if (maxDimension <= 120) return getPrice('spedition_120cm');
    return getPrice('gutertransport_240cm');
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold">Preiskalkulation</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <LottieLoader size={24} label="" />
          <span className="ml-2 text-gray-400">Preise werden geladen...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold">Preiskalkulation</h3>
        </div>
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <button
          onClick={loadPrices}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (!calculation) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold">Preiskalkulation</h3>
        </div>
        <div className="text-gray-400 text-center py-4">
          Wählen Sie ein Design aus, um den Preis zu berechnen
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold">Preiskalkulation</h3>
        <div className="ml-auto flex items-center gap-1 text-xs text-green-400">
          <CheckCircle className="w-3 h-3" />
          <span>Live-Preise</span>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="bg-gray-700 rounded-lg p-4 mb-6">
        <h4 className="font-medium mb-3">Konfiguration</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-400">Größe:</span>
            <span className="ml-2">{config.customWidth || selectedDesign?.originalWidth || 100} × {config.calculatedHeight || selectedDesign?.originalHeight || 20} cm</span>
          </div>
          <div>
            <span className="text-gray-400">Fläche:</span>
            <span className="ml-2">{(((config.customWidth || selectedDesign?.originalWidth || 100) * (config.calculatedHeight || selectedDesign?.originalHeight || 20)) / 10000).toFixed(2)} m²</span>
          </div>
          <div>
            <span className="text-gray-400">Elemente:</span>
            <span className="ml-2">{selectedDesign?.elements || 1}</span>
          </div>
          <div>
            <span className="text-gray-400">LED-Länge:</span>
            <span className="ml-2">{selectedDesign?.ledLength || 3} m</span>
          </div>
        </div>
        
        <div className="mt-3 flex flex-wrap gap-2">
          {config.isWaterproof && (
            <span className="px-2 py-1 bg-blue-600 text-blue-100 text-xs rounded">Wasserdicht</span>
          )}
          {config.hasUvPrint && (
            <span className="px-2 py-1 bg-purple-600 text-purple-100 text-xs rounded">UV-Druck</span>
          )}
          {config.isTwoPart && (
            <span className="px-2 py-1 bg-orange-600 text-orange-100 text-xs rounded">Mehrteilig</span>
          )}
          {config.hasHangingSystem && (
            <span className="px-2 py-1 bg-green-600 text-green-100 text-xs rounded">Aufhängesystem</span>
          )}
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Grundpreis (Acrylglas + LED)</span>
          <span className="font-medium">{formatPrice(calculation.basePrice)}</span>
        </div>

        {calculation.waterproofing > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Wasserdichtigkeit</span>
            <span className="font-medium">{formatPrice(calculation.waterproofing)}</span>
          </div>
        )}

        {calculation.uvPrint > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-300">UV-Druck</span>
            <span className="font-medium">{formatPrice(calculation.uvPrint)}</span>
          </div>
        )}

        {calculation.multiPart > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Mehrteilig</span>
            <span className="font-medium">{formatPrice(calculation.multiPart)}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-gray-300">Arbeitskosten</span>
          <span className="font-medium">{formatPrice(calculation.laborCost)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-300">Verwaltungskosten</span>
          <span className="font-medium">{formatPrice(calculation.administrativeCosts)}</span>
        </div>

        {calculation.controller > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Controller</span>
            <span className="font-medium">{formatPrice(calculation.controller)}</span>
          </div>
        )}

        {calculation.hangingSystem > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Aufhängesystem</span>
            <span className="font-medium">{formatPrice(calculation.hangingSystem)}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-gray-300">Versand</span>
          <span className="font-medium">{formatPrice(calculation.shipping)}</span>
        </div>

        <div className="border-t border-gray-600 pt-3 mt-4">
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Preis</span>
            <div className="flex items-center gap-2">
              <Euro className="w-4 h-4 text-green-400" />
              <span className="text-green-400">{formatPrice(calculation.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Source Info */}
      <div className="mt-6 p-3 bg-gray-700 rounded text-xs">
        <div className="flex items-center gap-2 text-gray-400">
          <CheckCircle className="w-3 h-3 text-green-400" />
          <span>Preise aus Monday.com Board (ID: {optimizedMondayService.getConnectionStatus().boardId})</span>
        </div>
        <div className="text-gray-500 mt-1">
          Letzter Abruf: {optimizedMondayService.getConnectionStatus().lastFetch?.toLocaleTimeString('de-DE') || 'Unbekannt'}
        </div>
        <div className="text-gray-500 mt-1">
          Cache gültig: {optimizedMondayService.getConnectionStatus().cacheValid ? '✅' : '❌'} • 
          API Calls heute: {optimizedMondayService.getConnectionStatus().dailyRequestCount}/{optimizedMondayService.getConnectionStatus().dailyLimit}
        </div>
      </div>
    </div>
  );
}
