import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Edit3, Package, Home, MapPin, CreditCard, FileText, Minus, Plus, Ruler, Shield, Truck, Zap, Palette, Info, X } from 'lucide-react';
import { ConfigurationState, SignConfiguration } from '../types/configurator';
import { calculateSingleSignPriceWithFakeDiscount, calculateArea, calculateDistance, getShippingInfo, calculateProportionalHeight, getRealCityName } from '../utils/calculations';
import { calculatePriceWithFakeDiscountSync } from '../utils/realCalculations';
import { mondayService } from '../services/mondayService';
import SVGPreview from './SVGPreview';
import StripeProvider from './StripeProvider';
import StripeCheckoutForm from './StripeCheckoutForm';
import PromoCodeInput from './PromoCodeInput';
// DiscountTimer удалён из шапки; используем сервис и локальный таймер для компактной плашки
import { discountService } from '../services/discountService';
import { DiscountApplication } from '../services/discountService';

interface ShippingCalculationPageProps {
  config: ConfigurationState;
  onConfigChange: (updates: Partial<ConfigurationState>) => void;
  onClose: () => void;
  onSignToggle: (signId: string, enabled: boolean) => void;
  onRemoveSign: (signId: string) => void;
}

const ShippingCalculationPage: React.FC<ShippingCalculationPageProps> = ({
  config,
  onConfigChange,
  onClose,
  onSignToggle,
  onRemoveSign,
}) => {
  const [tempPostalCode, setTempPostalCode] = useState(config.customerPostalCode || '');
  const [showStripeForm, setShowStripeForm] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountApplication | null>(null);
  // Лёгкий тик обновления для плашки
  const [, forceRender] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const unsub = discountService.onTimerChange(() => forceRender());
    forceRender();
    return unsub;
  }, []);

  // Calculate individual sign prices with fake discounts
  const signPrices = config.signs?.map(sign => {
    const priceWithDiscount = calculatePriceWithFakeDiscountSync(
      sign.design,
      sign.width,
      sign.height,
      sign.isWaterproof,
      sign.isTwoPart,
      sign.hasUvPrint,
      sign.hasHangingSystem || false,
      sign.expressProduction || false
    );
    
    return {
      ...sign,
      price: priceWithDiscount.finalPrice, // Финальная цена для расчетов
      priceInfo: priceWithDiscount, // Полная информация о скидке для отображения
    };
  }) || [];

  // Calculate totals
  const enabledSignsTotal = signPrices
    .filter(sign => sign.isEnabled)
    .reduce((total, sign) => total + sign.price, 0);

  // Get largest dimensions for shipping
  const longestSide = Math.max(
    ...signPrices.filter(s => s.isEnabled).map(s => Math.max(s.width, s.height)),
    0
  );

  // Distance and shipping calculation
  const [realCityName, setRealCityName] = useState<string>('');
  const [isLoadingCityName, setIsLoadingCityName] = useState(false);
  
  // Get distance info
  const distanceInfo = React.useMemo(() => {
    if (!config.customerPostalCode) {
      return { distance: 0, cityName: '' };
    }
    
    const basicInfo = calculateDistance('67433', config.customerPostalCode);
    return {
      distance: basicInfo.distance,
      cityName: realCityName || basicInfo.cityName // Use real city name if available
    };
  }, [config.customerPostalCode, realCityName]);
  
  // Load real city name when postal code changes
  React.useEffect(() => {
    if (config.customerPostalCode && /^\d{5}$/.test(config.customerPostalCode)) {
      setIsLoadingCityName(true);
      getRealCityName(config.customerPostalCode)
        .then(cityName => {
          console.log('🏙️ Real city name loaded:', cityName);
          setRealCityName(cityName);
        })
        .catch(error => {
          console.warn('Failed to load real city name:', error);
          // Keep fallback city name
        })
        .finally(() => {
          setIsLoadingCityName(false);
        });
    } else {
      setRealCityName('');
    }
  }, [config.customerPostalCode]);
  
  console.log('🏙️ ShippingCalculationPage - Distance Info:', {
    postalCode: config.customerPostalCode,
    distance: distanceInfo.distance,
    cityName: distanceInfo.cityName,
    realCityName,
    isLoadingCityName
  });

  const shippingInfo = getShippingInfo(longestSide, distanceInfo.distance || undefined);
  const actualShippingCost = (config.selectedShipping?.type === 'pickup' || config.includesInstallation) ? 0 : shippingInfo.cost;

  // Installation cost
  let installation = 0;
  if (config.includesInstallation && config.customerPostalCode && /^\d{5}$/.test(config.customerPostalCode)) {
    const totalArea = signPrices
      .filter(s => s.isEnabled)
      .reduce((area, sign) => area + calculateArea(sign.width, sign.height), 0);
    installation = mondayService.calculateInstallationCost(totalArea, config.customerPostalCode);
  }

  // Express production cost
  const expressProductionCost = 0; // Now included in individual sign prices

  const additionalCosts = installation + actualShippingCost + expressProductionCost;
  const subtotalBeforeDiscount = enabledSignsTotal + additionalCosts;
  
  // Apply discount if present
  const discountAmount = appliedDiscount && appliedDiscount.isValid ? appliedDiscount.discountAmount : 0;
  const subtotal = subtotalBeforeDiscount - discountAmount;
  const tax = subtotal * 0.19;
  const total = subtotal + tax;

  // Handle discount application
  const handleDiscountApplied = (discountApplication: DiscountApplication | null) => {
    setAppliedDiscount(discountApplication);
  };

  // Check if buttons should be disabled
  const shouldDisableButtons = longestSide > 239 && (!config.customerPostalCode || !/^\d{5}$/.test(config.customerPostalCode));
  
  // Debug logging
  console.log('ShippingCalculationPage Debug:', {
    longestSide,
    customerPostalCode: config.customerPostalCode,
    isValidPostalCode: config.customerPostalCode && /^\d{5}$/.test(config.customerPostalCode),
    shouldDisableButtons,
    isConfirmed,
    finalButtonDisabled: shouldDisableButtons || !isConfirmed
  });
  
  // Stripe payment handlers
  const handleStripePaymentSuccess = (paymentIntent: any) => {
    console.log('Payment successful:', paymentIntent);
    // Перенаправляем на страницу успеха
    window.location.href = `/success?payment_intent=${paymentIntent.id}`;
  };

  const handleStripePaymentError = (error: string) => {
    console.error('Payment error:', error);
    alert(`Zahlungsfehler: ${error}`);
  };

  const handleStripeCheckout = () => {
    if (shouldDisableButtons || !isConfirmed) {
      return;
    }
    setShowStripeForm(true);
  };
  
  const handlePostalCodeChange = (value: string) => {
    setTempPostalCode(value);
    if (/^\d{5}$/.test(value)) {
      onConfigChange({ customerPostalCode: value });
    }
  };

  const handleSignUpdate = (signId: string, updates: Partial<SignConfiguration>) => {
    const updatedSigns = config.signs.map(sign =>
      sign.id === signId ? { ...sign, ...updates } : sign
    );
    onConfigChange({ signs: updatedSigns });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Zurück zur Konfiguration</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Versand & Bestellung</h1>
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>
        
        {/* Скрыли большой таймер в шапке — дизайн скидки перенесён в блок калькуляции ниже */}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Full Width Stacked Layout */}
        <div className="space-y-6">
          {/* Top Module - Übersicht (Overview) - Full Width */}
          <div className="w-full">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 mb-4 sm:mb-6">
                <div className="bg-blue-600 rounded-lg p-2">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Übersicht</h2>
                <div className="bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                  {signPrices.filter(s => s.isEnabled).length} Artikel
                </div>
              </div>

              {/* Compact Sign List */}
              <div className="space-y-2 sm:space-y-3">
                {signPrices.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-gray-500">
                    <Package className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base">Keine Schilder ausgewählt</p>
                  </div>
                ) : (
                  signPrices.map((sign, index) => (
                    <div
                      key={sign.id}
                      className={`border rounded-xl p-2 sm:p-3 transition-all duration-300 ${
                        sign.isEnabled
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 bg-gray-50 opacity-75'
                      }`}
                    >
                      {/* Mobile-First Layout */}
                      <div className="space-y-2 sm:space-y-0">
                        {/* Top Row - Image and Title (Mobile) */}
                        <div className="flex items-center space-x-2 sm:hidden">
                          <SVGPreview 
                            design={sign.design}
                            width={sign.width}
                            height={sign.height}
                            className="w-12 h-12 flex-shrink-0"
                            uploadedSvgContent={sign.uploadedSvgContent}
                          />
                          <h3 className="font-medium text-gray-800 text-sm flex-1">Design #{index + 1}</h3>
                          <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                            €{sign.price.toFixed(2)}
                          </div>
                        </div>

                        {/* Desktop Layout - Single Row */}
                        <div className="hidden sm:flex sm:items-center sm:space-x-2">
                          <div className="relative group">
                            <SVGPreview 
                              design={sign.design}
                              width={sign.width}
                              height={sign.height}
                              className="w-16 h-16 flex-shrink-0"
                              uploadedSvgContent={sign.uploadedSvgContent}
                            />
                            {/* Hover popover with larger preview */}
                            <div className="pointer-events-none hidden md:flex absolute left-0 top-full mt-2 p-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                              <SVGPreview 
                                design={sign.design}
                                width={sign.width}
                                height={sign.height}
                                className="w-56 h-40"
                                uploadedSvgContent={sign.uploadedSvgContent}
                              />
                            </div>
                          </div>

                          {/* Sign Info - Desktop */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-800 text-xs truncate">Design #{index + 1}</h3>
                          </div>

                          {/* Size Controls - Desktop */}
                          <div className="hidden lg:flex items-center space-x-2">
                            <span className="text-xs text-gray-600 font-medium">Breite:</span>
                            <button
                              onClick={() => handleSignUpdate(sign.id, { 
                                width: Math.max(20, sign.width - 10),
                                height: calculateProportionalHeight(sign.design.originalWidth, sign.design.originalHeight, Math.max(20, sign.width - 10))
                              })}
                              className="w-6 h-6 bg-gray-200 hover:bg-red-100 text-gray-600 hover:text-red-600 rounded flex items-center justify-center transition-colors touch-manipulation"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              value={sign.width}
                              onChange={(e) => {
                                const newWidth = Number(e.target.value);
                                const maxWidth = sign.isTwoPart ? 1000 : 300;
                                if (newWidth >= 20 && newWidth <= maxWidth) {
                                  const newHeight = calculateProportionalHeight(sign.design.originalWidth, sign.design.originalHeight, newWidth);
                                  if (newHeight <= 200) {
                                  handleSignUpdate(sign.id, { 
                                    width: newWidth,
                                      height: newHeight
                                  });
                                  }
                                }
                              }}
                              className="w-12 h-6 text-xs text-center border border-gray-300 rounded bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                              min="20"
                              max={sign.isTwoPart ? "1000" : "300"}
                            />
                            <button
                              onClick={() => handleSignUpdate(sign.id, { 
                                width: Math.min(sign.isTwoPart ? 1000 : 300, sign.width + 10),
                                height: calculateProportionalHeight(sign.design.originalWidth, sign.design.originalHeight, Math.min(sign.isTwoPart ? 1000 : 300, sign.width + 10))
                              })}
                              className="w-6 h-6 bg-gray-200 hover:bg-green-100 text-gray-600 hover:text-green-600 rounded flex items-center justify-center transition-colors touch-manipulation"
                            >
                              +
                            </button>
                            <span className="text-xs text-gray-500">cm</span>
                            
                            {/* Height Display */}
                            <div className="flex items-center space-x-1 ml-2 px-2 py-1 bg-gray-100 rounded">
                              <span className="text-xs text-gray-600 font-medium">Höhe:</span>
                              <span className="text-xs font-bold text-gray-800">{sign.height}</span>
                              <span className="text-xs text-gray-500">cm</span>
                            </div>
                          </div>

                          {/* Price - Desktop */}
                          <div className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-semibold shadow-sm">
                            €{sign.price.toFixed(2)}
                          </div>

                          {/* Action Buttons - Desktop */}
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleSignUpdate(sign.id, { isWaterproof: !sign.isWaterproof })}
                              className={`p-1 rounded transition-colors touch-manipulation ${
                                sign.isWaterproof ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                              title="Wasserdicht"
                            >
                              <Shield className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleSignUpdate(sign.id, { hasUvPrint: !sign.hasUvPrint })}
                              className={`p-1 rounded transition-colors touch-manipulation ${
                                sign.hasUvPrint ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                              title="UV-Druck"
                            >
                              <Palette className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onSignToggle(sign.id, !sign.isEnabled)}
                              className={`p-1 rounded transition-colors touch-manipulation ${
                                sign.isEnabled
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                              }`}
                              title={sign.isEnabled ? 'Ausblenden' : 'Einblenden'}
                            >
                              {sign.isEnabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => onRemoveSign(sign.id)}
                              className="p-1 text-red-600 hover:text-white hover:bg-red-500 rounded transition-colors touch-manipulation"
                              title="Entfernen"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Mobile Size Controls */}
                        <div className="flex flex-col space-y-2 sm:hidden">
                          <div className="grid grid-cols-2 gap-2">
                            {/* Width Control */}
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs text-gray-600 font-medium">Breite:</span>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleSignUpdate(sign.id, { 
                                    width: Math.max(20, sign.width - 10),
                                    height: calculateProportionalHeight(sign.design.originalWidth, sign.design.originalHeight, Math.max(20, sign.width - 10))
                                  })}
                                  className="w-8 h-8 bg-gray-200 hover:bg-red-100 text-gray-600 hover:text-red-600 rounded flex items-center justify-center transition-colors touch-manipulation"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  value={sign.width}
                                  onChange={(e) => {
                                    const newWidth = Number(e.target.value);
                                    const maxWidth = sign.isTwoPart ? 1000 : 300;
                                    if (newWidth >= 20 && newWidth <= maxWidth) {
                                      const newHeight = calculateProportionalHeight(sign.design.originalWidth, sign.design.originalHeight, newWidth);
                                      if (newHeight <= 200) {
                                      handleSignUpdate(sign.id, { 
                                        width: newWidth,
                                          height: newHeight
                                      });
                                      }
                                    }
                                  }}
                                  className="flex-1 h-8 text-sm text-center border border-gray-300 rounded bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                                  min="20"
                                  max={sign.isTwoPart ? "1000" : "300"}
                                />
                                <button
                                  onClick={() => handleSignUpdate(sign.id, { 
                                    width: Math.min(sign.isTwoPart ? 1000 : 300, sign.width + 10),
                                    height: calculateProportionalHeight(sign.design.originalWidth, sign.design.originalHeight, Math.min(sign.isTwoPart ? 1000 : 300, sign.width + 10))
                                  })}
                                  className="w-8 h-8 bg-gray-200 hover:bg-green-100 text-gray-600 hover:text-green-600 rounded flex items-center justify-center transition-colors touch-manipulation"
                                >
                                  +
                                </button>
                                <span className="text-xs text-gray-500">cm</span>
                              </div>
                            </div>

                            {/* Height Display */}
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs text-gray-600 font-medium">Höhe:</span>
                              <div className="h-8 px-2 py-1 bg-gray-100 rounded flex items-center justify-center">
                                <span className="text-sm font-bold text-gray-800">{sign.height} cm</span>
                              </div>
                            </div>
                          </div>

                          {/* Mobile Action Buttons */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleSignUpdate(sign.id, { isWaterproof: !sign.isWaterproof })}
                                className={`p-2 rounded transition-colors touch-manipulation ${
                                  sign.isWaterproof ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title="Wasserdicht"
                              >
                                <Shield className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleSignUpdate(sign.id, { hasUvPrint: !sign.hasUvPrint })}
                                className={`p-2 rounded transition-colors touch-manipulation ${
                                  sign.hasUvPrint ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title="UV-Druck"
                              >
                                <Palette className="h-4 w-4" />
                              </button>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => onSignToggle(sign.id, !sign.isEnabled)}
                                className={`p-2 rounded transition-colors touch-manipulation ${
                                  sign.isEnabled
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                }`}
                                title={sign.isEnabled ? 'Ausblenden' : 'Einblenden'}
                              >
                                {sign.isEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => onRemoveSign(sign.id)}
                                className="p-2 text-red-600 hover:text-white hover:bg-red-500 rounded transition-colors touch-manipulation"
                                title="Entfernen"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bottom Module - Kalkulation (Calculation) - Full Width */}
          <div className="w-full">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-green-600 rounded-lg p-2">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Kalkulation</h2>
                {/* Компактная плашка со скидкой внутри калькуляции */}
                {discountService.isFakeDiscountActive?.() && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">
                          🔥 {discountService.getCurrentFakeDiscount()?.name || 'Angebot'}
                        </span>
                        <span className="text-rose-700 text-sm font-semibold">{discountService.getCurrentFakeDiscount()?.percentage}% Rabatt</span>
                      </div>
                      <div className="text-rose-700 text-xs font-mono">
                        {(() => {
                          const cfg = discountService.getCurrentFakeDiscount();
                          if (!cfg) return null;
                          const now = Date.now();
                          const diff = Math.max(0, Math.floor((new Date(cfg.endDate).getTime() - now) / 1000));
                          const h = Math.floor(diff / 3600).toString().padStart(2, '0');
                          const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
                          const s = Math.floor(diff % 60).toString().padStart(2, '0');
                          return <>⏱ {h}:{m}:{s}</>;
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid Layout for Kalkulation Content */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column - Versand & Optionen */}
                <div className="lg:col-span-1">
                  {/* Versand-Informationen Section */}
                  <div className="space-y-4 mb-6">
                    {longestSide >= 20 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-3">
                        <Truck className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-800">Aktuelle Versandoption</h3>
                      </div>
                      <div className="bg-white rounded p-3 border border-blue-200">
                        {longestSide >= 240 ? (
                          // Große Schilder ab 240cm - Spezielle Behandlung
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-blue-800">
                                {config.customerPostalCode && distanceInfo.distance <= 300 
                                  ? 'Persönliche Lieferung' 
                                  : config.customerPostalCode && distanceInfo.distance > 300
                                  ? 'Gütertransport (palettiert)'
                                  : 'Versandoption'}
                              </span>
                              <span className="font-bold text-blue-900">
                                {config.customerPostalCode 
                                  ? `€${actualShippingCost.toFixed(2)}`
                                  : '€0.00'}
                              </span>
                            </div>
                            {!config.customerPostalCode ? (
                              <div className="text-xs text-blue-600 bg-blue-100 rounded p-2">
                                ℹ️ Für Schilder ab 240cm benötigen wir Ihre PLZ zur Kostenberechnung
                              </div>
                            ) : (
                              <div className="text-xs text-blue-600">
                                {distanceInfo.distance <= 300 
                                  ? `Persönliche Lieferung nach ${distanceInfo.cityName} (${distanceInfo.distance} km)`
                                  : `Gütertransport nach ${distanceInfo.cityName} (${distanceInfo.distance} km)`}
                              </div>
                            )}
                          </div>
                        ) : (
                          // Standard Versandoptionen unter 240cm
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-blue-800">
                              {longestSide < 60 ? 'DHL Klein (20-60cm)' :
                               longestSide < 100 ? 'DHL Mittel (60-100cm)' :
                               longestSide < 120 ? 'DHL Groß (100-120cm)' :
                               'Spedition (120-240cm)'}
                            </span>
                            <span className="font-bold text-blue-900">
                              €{actualShippingCost.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-blue-600 mt-1">
                          Längste Seite: {longestSide}cm
                        </div>
                        {longestSide < 240 && config.customerPostalCode && distanceInfo.cityName && (
                          <div className="text-xs text-blue-600 mt-1">
                            Lieferung nach {isLoadingCityName ? 'Lädt...' : distanceInfo.cityName} ({config.customerPostalCode})
                          </div>
                        )}
                      </div>
                    </div>
                    )}

                    {/* Selbstabholung Toggle */}
                    <div className={`flex items-center space-x-3 p-3 border-2 rounded-lg transition-all duration-300 cursor-pointer ${
                      config.selectedShipping?.type === 'pickup'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      if (config.selectedShipping?.type === 'pickup') {
                        onConfigChange({ selectedShipping: null });
                      } else {
                        onConfigChange({
                          selectedShipping: {
                            type: 'pickup',
                            name: 'Selbstabholung',
                            price: 0,
                            description: 'Kostenlose Abholung in 67433 Neustadt'
                          }
                        });
                      }
                    }}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        config.selectedShipping?.type === 'pickup'
                          ? 'border-green-600 bg-green-600'
                          : 'border-gray-400 bg-white'
                      }`}>
                        {config.selectedShipping?.type === 'pickup' && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <Home className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">Selbstabholung</div>
                        <div className="text-sm text-gray-600">Kostenlos</div>
                      </div>
                    </div>

                    {/* PLZ Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        Postleitzahl
                      </label>
                      <input
                        type="text"
                        placeholder="z.B. 10115"
                        value={tempPostalCode}
                        onChange={(e) => handlePostalCodeChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        maxLength={5}
                      />
                      {config.customerPostalCode && (
                        <p className="text-sm text-gray-600 mt-1">
                          {isLoadingCityName ? 'Lädt Stadtname...' : (distanceInfo.cityName || `PLZ ${config.customerPostalCode}`)} • {distanceInfo.distance} km
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Express & UV-Druck Optionen */}
                </div>

                {/* Middle Column - Price Summary */}
                <div className="lg:col-span-1">
                  <div className="space-y-3 mb-6 border-t pt-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Preisübersicht</h3>
                    <div className="flex justify-between text-gray-700">
                      <span className="flex items-center gap-2">
                        Schilder ({signPrices.filter(s => s.isEnabled).length})
                        {discountService.isFakeDiscountActive() && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
                            -{discountService.getCurrentFakeDiscount()?.percentage}%
                          </span>
                        )}
                        :
                      </span>
                      {discountService.isFakeDiscountActive() && discountService.getCurrentFakeDiscount() ? (
                        (() => {
                          const cfg = discountService.getCurrentFakeDiscount()!;
                          const fakeItemsDisplay = enabledSignsTotal + (enabledSignsTotal * cfg.percentage) / 100;
                          return (
                            <span className="text-right">
                              <span className="block text-sm text-gray-400 line-through">€{fakeItemsDisplay.toFixed(2)}</span>
                              <span className="font-semibold">€{enabledSignsTotal.toFixed(2)}</span>
                            </span>
                          );
                        })()
                      ) : (
                        <span className="font-semibold">€{enabledSignsTotal.toFixed(2)}</span>
                      )}
                    </div>
                    
                    {additionalCosts > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Zusatzkosten:</span>
                        <span className="font-semibold">€{additionalCosts.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-gray-700 border-t pt-3">
                      <span>Zwischensumme vor Rabatt:</span>
                      {discountService.isFakeDiscountActive() && discountService.getCurrentFakeDiscount() ? (
                        (() => {
                          const cfg = discountService.getCurrentFakeDiscount()!;
                          const fakeSubtotalDisplay = subtotalBeforeDiscount + (enabledSignsTotal * cfg.percentage) / 100;
                          return (
                            <span className="text-right">
                              <span className="block text-sm text-gray-400 line-through">€{fakeSubtotalDisplay.toFixed(2)}</span>
                              <span className="font-semibold">€{subtotalBeforeDiscount.toFixed(2)}</span>
                            </span>
                          );
                        })()
                      ) : (
                        <span className="font-semibold">€{subtotalBeforeDiscount.toFixed(2)}</span>
                      )}
                    </div>

                    {/* Marketingrabatt (визуально, не влияет на оплату) */}
                    {discountService.isFakeDiscountActive() && discountService.getCurrentFakeDiscount() && (
                      (() => {
                        const cfg = discountService.getCurrentFakeDiscount()!;
                        const marketingDiscountAmount = (enabledSignsTotal * cfg.percentage) / 100;
                        if (marketingDiscountAmount <= 0) return null;
                        return (
                          <div className="flex justify-between items-center text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                            <span>Marketingrabatt ({cfg.name || `${cfg.percentage}%`}):</span>
                            <span className="font-semibold">-€{marketingDiscountAmount.toFixed(2)}</span>
                          </div>
                        );
                      })()
                    )}

                    {/* Discount Display */}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>Rabatt ({appliedDiscount?.discount.name}):</span>
                        <span className="font-semibold">-€{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-gray-700">
                      <span>Zwischensumme:</span>
                      <span className="font-semibold">€{subtotal.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-gray-700">
                      <span>MwSt. (19%):</span>
                      <span className="font-semibold">€{tax.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-xl font-bold text-gray-800 border-t pt-3">
                      <span>Preis:</span>
                      <span className="text-green-600">€{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column - Action Buttons */}
                <div className="lg:col-span-1">
                  {/* Promo Code Input */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                    <PromoCodeInput
                      orderTotal={subtotalBeforeDiscount}
                      onDiscountApplied={handleDiscountApplied}
                    />
                  </div>

                  {/* Kompakte Checkbox-Bestätigung */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                    <label className="flex items-start space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isConfirmed}
                        onChange={(e) => {
                          console.log('Checkbox changed:', e.target.checked);
                          setIsConfirmed(e.target.checked);
                        }}
                        className="w-4 h-4 text-green-600 focus:ring-green-500 rounded mt-0.5 flex-shrink-0"
                      />
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-700 leading-tight">
                          Ich habe das Mock-up geprüft und bestätige, dass es meinen Vorgaben entspricht.
                        </span>
                        <div className="relative group">
                          <Info className="h-3 w-3 text-gray-400 hover:text-blue-600 cursor-help transition-colors" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 w-80 text-center">
                            Individuelle Neon-Schilder sind nach § 312g Abs. 2 Nr. 1 BGB vom Widerruf ausgeschlossen
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                          </div>
                        </div>
                        <a 
                          href="/widerrufsrecht" 
                          target="_blank"
                          className="text-blue-600 hover:text-blue-800 text-xs underline transition-colors"
                        >
                          Widerrufsrecht
                        </a>
                      </div>
                    </label>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="space-y-3 mb-6">
                    <button 
                      onClick={handleStripeCheckout}
                      disabled={shouldDisableButtons || !isConfirmed}
                      className={`w-full font-bold py-4 rounded-lg transition duration-300 flex items-center justify-center space-x-3 ${
                        shouldDisableButtons || !isConfirmed
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 shadow-lg hover:shadow-xl'
                      }`}
                    >
                      <CreditCard className="h-5 w-5" />
                      <span>
                        {shouldDisableButtons 
                          ? 'PLZ erforderlich für Bestellung' 
                          : !isConfirmed
                          ? 'Bestätigung erforderlich'
                          : `Jetzt Bestellen - €${total.toFixed(2)}`
                        }
                      </span>
                    </button>
                  </div>

                  {/* Payment Methods */}
                  <div className="bg-gray-50 rounded-lg p-3 border">
                    <div className="text-center">
                      <img 
                        src="/Pay Icons.png" 
                        alt="Sichere Zahlungsmethoden - Visa, Mastercard, PayPal, SEPA" 
                       className="mx-auto max-w-full h-auto w-full transform scale-125"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Checkout Modal */}
      {showStripeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800">Zahlung abschließen</h3>
              </div>
              <button
                onClick={() => setShowStripeForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-800 mb-2">Bestellübersicht</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Artikel ({signPrices.filter(s => s.isEnabled).length})</span>
                  <span>€{enabledSignsTotal.toFixed(2)}</span>
                </div>
                {actualShippingCost > 0 && (
                  <div className="flex justify-between">
                    <span>Versand</span>
                    <span>€{actualShippingCost.toFixed(2)}</span>
                  </div>
                )}
                {installation > 0 && (
                  <div className="flex justify-between">
                    <span>Installation</span>
                    <span>€{installation.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>MwSt. (19%)</span>
                  <span>€{tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-1 mt-2 flex justify-between font-bold">
                  <span>Preis</span>
                  <span className="text-green-600">€{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <StripeProvider>
              <StripeCheckoutForm
                amount={Math.round(total * 100)} // в центах
                onSuccess={handleStripePaymentSuccess}
                onError={handleStripePaymentError}
                customerEmail=""
              />
            </StripeProvider>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingCalculationPage;