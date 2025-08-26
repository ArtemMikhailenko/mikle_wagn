import React from 'react';
import { Calculator, CreditCard, Eye, EyeOff, X, ShoppingCart, Package, Truck, Home, MapPin } from 'lucide-react';
import { ConfigurationState } from '../types/configurator';
import { calculatePriceBreakdown, getShippingInfo, calculateArea, calculateDistance, calculateRealDistance } from '../utils/calculations';
import { calculateRealSingleSignPriceSync } from '../utils/realCalculations';
import { mondayService } from '../services/mondayService';

interface PricingCalculatorProps {
  config: ConfigurationState;
  onRemoveSign?: (signId: string) => void;
  onGoToCart?: () => void;
}

const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  config,
  onRemoveSign,
  onGoToCart,
}) => {
  const [showCartModal, setShowCartModal] = React.useState(false);
  
  // Calculate current design price with real Monday.com data
  const currentDesignPrice = calculateRealSingleSignPriceSync(
    config.selectedDesign,
    config.customWidth,
    config.calculatedHeight,
    config.isWaterproof,
    config.isTwoPart || false,
    config.hasUvPrint,
    config.hasHangingSystem || false,
    config.expressProduction || false
  );
  
  const [showPostalCodeInput, setShowPostalCodeInput] = React.useState(false);
  const [tempPostalCode, setTempPostalCode] = React.useState('');
  const [showDistanceInfo, setShowDistanceInfo] = React.useState(false);
  const [showMapView, setShowMapView] = React.useState(false);
  const [routeInfo, setRouteInfo] = React.useState<{
    distance: number;
    cityName: string;
    travelTime: string;
    postalCode: string;
    isRealData: boolean;
    route?: any;
  } | null>(null);
  
  // Calculate individual sign prices using real Monday.com data
  const signPrices = config.signs?.map(sign => ({
    ...sign,
    price: calculateRealSingleSignPriceSync(
      sign.design,
      sign.width,
      sign.height,
      sign.isWaterproof,
      sign.isTwoPart,
      sign.hasUvPrint,
      sign.hasHangingSystem || false,
      sign.expressProduction || false
    )
  })) || [];
  
  // Calculate total: enabled signs + current design if not in list
  const isCurrentDesignInList = config.signs?.some(sign => sign.design.id === config.selectedDesign.id) || false;
  const enabledSignsTotal = signPrices
    .filter(sign => sign.isEnabled)
    .reduce((total, sign) => total + sign.price, 0) + 
    (isCurrentDesignInList ? 0 : currentDesignPrice);
  
  console.log('💰 Total calculation:', {
    signPricesCount: signPrices.length,
    enabledSigns: signPrices.filter(s => s.isEnabled).length,
    enabledSignsTotal,
    currentDesignPrice,
    isCurrentDesignInList
  });

  // Get largest dimensions for shipping calculation
  // Use current configuration dimensions for real-time shipping calculation
  const longestSide = Math.max(config.customWidth, config.calculatedHeight);
  
  // Get distance info if postal code is available
  const distanceInfo = config.customerPostalCode 
    ? calculateDistance('67433', config.customerPostalCode)
    : { distance: 0, cityName: '' };

  // Get shipping info based on longest side and distance
  const shippingInfo = getShippingInfo(longestSide, distanceInfo.distance || undefined);
  
  // Calculate shipping cost (0 if pickup is selected OR installation is included)
  const actualShippingCost = (config.selectedShipping?.type === 'pickup' || config.includesInstallation) ? 0 : shippingInfo.cost;
  
  // Calculate additional costs (installation + shipping)
  let installation = 0;
  if (config.includesInstallation && config.customerPostalCode && /^\d{5}$/.test(config.customerPostalCode)) {
    const areaM2 = calculateArea(config.customWidth, config.calculatedHeight);
    installation = mondayService.calculateInstallationCost(areaM2, config.customerPostalCode);
  }
  
  // Express production cost
  const expressProductionCost = 0; // Now included in individual sign prices
  
  const additionalCosts = installation + actualShippingCost + expressProductionCost;

  // Calculate totals after all costs are determined
  const subtotal = enabledSignsTotal + additionalCosts;
  const tax = subtotal * 0.19;
  const gesamtpreis = subtotal + tax;

  const getShippingOptions = () => {
    const options = [];
    
    // Always show pickup option (selectable)
    options.push({
      type: 'pickup',
      name: 'Selbstabholung',
      price: 0,
      description: 'Kostenlose Abholung in 67433 Neustadt',
      selectable: true
    });
    
    if (shippingInfo.requiresPostalCode && !config.customerPostalCode) {
      options.push({
        type: 'postal-input',
        name: shippingInfo.description,
        price: shippingInfo.cost,
        description: 'Längste Seite ab 250cm',
        selectable: false
      });
    } else {
      options.push({
        type: 'automatic',
        name: `${shippingInfo.method} - €${shippingInfo.cost}`,
        price: shippingInfo.cost,
        description: `${shippingInfo.description} - ${shippingInfo.days}`,
        selectable: false
      });
    }
    
    return options;
  };

  const shippingOptions = getShippingOptions();
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'dhl': return <Package className="h-4 w-4" />;
      case 'spedition': return <Truck className="h-4 w-4" />;
      case 'automatic': return <Truck className="h-4 w-4" />;
      case 'pickup': return <Home className="h-4 w-4" />;
      case 'postal-input': return <MapPin className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const handlePostalCodeSubmit = () => {
    if (tempPostalCode && /^\d{5}$/.test(tempPostalCode)) {
      // Show loading state
      setRouteInfo({
        distance: 0,
        cityName: 'Berechne...',
        travelTime: 'Lädt...',
        postalCode: tempPostalCode,
        isRealData: false
      });
      setShowMapView(true);
      
      // Try real distance calculation first
      calculateRealDistance(tempPostalCode, '67433')
        .then(realData => {
          const hours = Math.floor(realData.duration / 60);
          const minutes = realData.duration % 60;
          const travelTime = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
          
          setRouteInfo({
            distance: realData.distance,
            cityName: realData.cityName,
            travelTime,
            postalCode: tempPostalCode,
            isRealData: true,
            route: realData.route
          });
          
          config.onConfigChange?.({ customerPostalCode: tempPostalCode });
        })
        .catch(error => {
          console.error('Real distance failed, using fallback:', error);
          // Fallback to approximate calculation
          const distanceInfo = calculateDistance('67433', tempPostalCode);
          const travelTimeMinutes = Math.round(distanceInfo.distance * 1.2);
          const hours = Math.floor(travelTimeMinutes / 60);
          const minutes = travelTimeMinutes % 60;
          const travelTime = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
          
          setRouteInfo({
            distance: distanceInfo.distance,
            cityName: distanceInfo.cityName,
            travelTime,
            postalCode: tempPostalCode,
            isRealData: false
          });
          
          config.onConfigChange?.({ customerPostalCode: tempPostalCode });
        });
      
      setTempPostalCode('');
    }
  };

  // Update shipping when postal code changes for large signs
  React.useEffect(() => {
    if (shippingInfo.requiresPostalCode && config.customerPostalCode && !config.includesInstallation) {
      // Auto-select the appropriate shipping method for large signs
      const distance = calculateDistance('67433', config.customerPostalCode).distance;
      const updatedShippingInfo = getShippingInfo(longestSide, distance);
      
      config.onShippingChange?.({
        type: 'automatic',
        name: `${updatedShippingInfo.method} - €${updatedShippingInfo.cost}`,
        price: updatedShippingInfo.cost,
        description: updatedShippingInfo.description
      });
    }
  }, [config.customerPostalCode, longestSide, shippingInfo.requiresPostalCode, config.includesInstallation]);

  // Update shipping method in real-time when dimensions change
  React.useEffect(() => {
    if (!config.includesInstallation && config.selectedShipping) {
      const distance = config.customerPostalCode 
        ? calculateDistance('67433', config.customerPostalCode).distance 
        : undefined;
      const updatedShippingInfo = getShippingInfo(longestSide, distance);
      
      // Auto-remove shipping if no longer needed (< 250cm)
      if (longestSide < 240 && config.selectedShipping.type === 'automatic') {
        config.onShippingChange?.(null);
      }
      // Only auto-update if pickup is not selected and size still requires shipping
      else if (config.selectedShipping.type !== 'pickup' && longestSide >= 240) {
        config.onShippingChange?.({
          type: 'automatic',
          name: `${updatedShippingInfo.method} - €${updatedShippingInfo.cost}`,
          price: updatedShippingInfo.cost,
          description: updatedShippingInfo.description
        });
      }
    }
  }, [config.customWidth, config.calculatedHeight, longestSide, config.includesInstallation, config.customerPostalCode]);

  return (
    <>
      <div className="bg-white rounded-xl lg:rounded-2xl shadow-xl p-4 lg:p-6">
      <div className="flex items-center space-x-2 lg:space-x-3 mb-4 lg:mb-6">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-2">
          <Calculator className="h-5 lg:h-6 w-5 lg:w-6 text-white" />
        </div>
        <h2 className="text-lg lg:text-xl font-bold text-gray-800">Preiskalkulation</h2>
        
        {/* Shopping Cart Icon */}
        {signPrices.length > 0 && (
          <div className="ml-auto">
            <button
              onClick={() => setShowCartModal(true)}
              className="relative bg-blue-600 hover:bg-blue-700 text-white p-2 lg:p-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl active:scale-95"
            >
              <ShoppingCart className="h-5 lg:h-6 w-5 lg:w-6" />
              {/* Cart Badge */}
              <div className="absolute -top-1 lg:-top-2 -right-1 lg:-right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 lg:h-6 w-5 lg:w-6 flex items-center justify-center">
                {signPrices.filter(s => s.isEnabled).length}
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Selbstabholung Option */}
      <div className="mb-4 lg:mb-6">
        <div className="flex items-center space-x-2 mb-3">
          <Home className="h-5 w-5 text-green-600" />
          <h3 className="text-sm lg:text-base font-semibold text-gray-800">Selbstabholung</h3>
        </div>

        <div className={`flex items-center space-x-3 p-3 border-2 rounded-lg transition-all duration-300 cursor-pointer ${
          config.includesInstallation
            ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
            : config.selectedShipping && config.selectedShipping.type === 'pickup'
            ? 'border-green-500 bg-green-50'
            : 'border-gray-200 lg:hover:border-gray-300 lg:hover:bg-gray-50'
        }`}
        onClick={() => {
          if (config.includesInstallation) return;
          
          // Toggle behavior: if already selected, deselect it
          if (config.selectedShipping && config.selectedShipping.type === 'pickup') {
            config.onShippingChange?.(null);
          } else {
            config.onShippingChange?.({
              type: 'pickup',
              name: 'Selbstabholung',
              price: 0,
              description: 'Kostenlose Abholung in 67433 Neustadt'
            });
          }
        }}
        >
          <div className={`w-5 lg:w-4 h-5 lg:h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            config.includesInstallation
              ? 'border-gray-300 bg-gray-200'
              : config.selectedShipping && config.selectedShipping.type === 'pickup'
              ? 'border-green-600 bg-green-600'
              : 'border-gray-400 bg-white'
          }`}>
            {!config.includesInstallation && 
             (config.selectedShipping && config.selectedShipping.type === 'pickup') && (
              <div className="w-2 h-2 rounded-full bg-white"></div>
            )}
          </div>
          
          <div className={`p-2 rounded-lg flex-shrink-0 ${
            config.includesInstallation
              ? 'bg-gray-200 text-gray-400'
              : config.selectedShipping && config.selectedShipping.type === 'pickup'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}>
            <Home className="h-4 w-4" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-800 text-sm truncate pr-2">Selbstabholung</h4>
              <span className="font-bold text-sm text-gray-800 flex-shrink-0">Kostenlos</span>
            </div>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">Kostenlose Abholung in 67433 Neustadt</p>
            
            {/* Distance button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPostalCodeInput(true);
              }}
              className="mt-2 w-full px-3 py-2 lg:py-1.5 text-xs bg-blue-100 text-blue-700 rounded-md lg:hover:bg-blue-200 transition-colors"
            >
              Wie weit von mir?
            </button>
          </div>
        </div>
        
        {/* Postal Code Input Modal */}
        {showPostalCodeInput && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center space-x-2 mb-4">
                <MapPin className="h-5 w-5 text-blue-600" />
                <h3 className="text-base lg:text-lg font-semibold text-gray-800">Postleitzahl eingeben</h3>
              </div>
              
              {!showMapView ? (
                <>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    Geben Sie Ihre Postleitzahl ein, um die Entfernung und Kosten zu berechnen.
                  </p>
                  
                  <input
                    type="text"
                    placeholder="z.B. 10115"
                    value={tempPostalCode}
                    onChange={(e) => setTempPostalCode(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg mb-4"
                    maxLength={5}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handlePostalCodeSubmit();
                      }
                    }}
                  />
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={handlePostalCodeSubmit}
                      disabled={!tempPostalCode || !/^\d{5}$/.test(tempPostalCode)}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-lg lg:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Berechnen
                    </button>
                    <button
                      onClick={() => {
                        setShowPostalCodeInput(false);
                        setTempPostalCode('');
                      }}
                      className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg lg:hover:bg-gray-400 transition-colors"
                    >
                      Abbrechen
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Route Information Header */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-base lg:text-lg font-semibold text-gray-800">Route berechnet</h4>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        routeInfo?.isRealData 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {routeInfo?.isRealData ? '🗺️ Echte Daten' : '📍 Geschätzt'}
                      </div>
                    </div>
                    <div className={`border rounded-lg p-3 ${
                      routeInfo?.isRealData 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
                        <span className={`font-medium ${
                          routeInfo?.isRealData ? 'text-green-800' : 'text-blue-800'
                        } truncate`}>Von: {routeInfo?.cityName} ({routeInfo?.postalCode})</span>
                        <span className={`text-sm ${
                          routeInfo?.isRealData ? 'text-green-600' : 'text-blue-600'
                        } font-medium`}>{routeInfo?.distance} km</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
                        <span className={`font-medium ${
                          routeInfo?.isRealData ? 'text-green-800' : 'text-blue-800'
                        } truncate`}>Nach: Neustadt a.d. Weinstraße (67433)</span>
                        <span className={`text-sm ${
                          routeInfo?.isRealData ? 'text-green-600' : 'text-blue-600'
                        } font-medium`}>≈ {routeInfo?.travelTime}</span>
                      </div>
                      <p className={`text-sm ${
                        routeInfo?.isRealData ? 'text-green-700' : 'text-blue-700'
                      }`}>Hermann-Wehrle-Str. 10</p>
                      {routeInfo?.isRealData && (
                        <p className="text-xs text-green-600 mt-2 font-medium">
                          ✓ Berechnet über OpenStreetMap Routing
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Map Display */}
                  <div className="mb-4">
                    <div className={`rounded-lg p-4 lg:p-6 min-h-[180px] lg:min-h-[200px] flex flex-col items-center justify-center border-2 border-dashed ${
                      routeInfo?.isRealData 
                        ? 'bg-gradient-to-br from-green-100 to-emerald-100 border-green-300' 
                        : 'bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-300'
                    }`}>
                      <div className="text-center mb-4">
                        <MapPin className={`h-12 w-12 mx-auto mb-2 ${
                          routeInfo?.isRealData ? 'text-green-600' : 'text-blue-600'
                        }`} />
                        <h5 className="text-base lg:text-lg font-semibold text-gray-800">Routenübersicht</h5>
                        {routeInfo?.cityName === 'Berechne...' && (
                          <div className="flex items-center justify-center space-x-2 mt-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm text-gray-600">Berechne echte Route...</span>
                          </div>
                        )}
                      </div>
                      
                      {routeInfo?.cityName !== 'Berechne...' && (
                        <>
                          {/* Route Visualization */}
                          <div className="flex items-center space-x-2 lg:space-x-4 w-full max-w-sm">
                            {/* Start Point */}
                            <div className="flex flex-col items-center">
                              <div className="w-4 h-4 bg-green-500 rounded-full mb-1"></div>
                              <span className="text-xs text-gray-600 text-center truncate max-w-[60px]">{routeInfo?.cityName}</span>
                              <span className="text-xs text-gray-500">{routeInfo?.postalCode}</span>
                            </div>
                            
                            {/* Route Line */}
                            <div className="flex-1 relative">
                              <div className={`h-0.5 w-full ${
                                routeInfo?.isRealData 
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                  : 'bg-gradient-to-r from-green-500 to-blue-500'
                              }`}></div>
                              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-1 lg:px-2 py-1 rounded text-xs font-medium text-gray-700 border whitespace-nowrap">
                                {routeInfo?.distance} km
                              </div>
                            </div>
                            
                            {/* End Point */}
                            <div className="flex flex-col items-center">
                              <div className={`w-4 h-4 rounded-full mb-1 ${
                                routeInfo?.isRealData ? 'bg-emerald-500' : 'bg-blue-500'
                              }`}></div>
                              <span className="text-xs text-gray-600 text-center truncate max-w-[60px]">Neustadt</span>
                              <span className="text-xs text-gray-500">67433</span>
                            </div>
                          </div>
                          
                          {/* Travel Time */}
                          <div className="mt-4 bg-white rounded-lg px-4 py-2 border">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full animate-pulse ${
                                routeInfo?.isRealData ? 'bg-green-500' : 'bg-orange-500'
                              }`}></div>
                              <span className="text-sm font-medium text-gray-700">
                                {routeInfo?.isRealData ? 'Fahrzeit' : 'Geschätzte Fahrzeit'}: {routeInfo?.travelTime}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={() => {
                        setShowMapView(false);
                        setRouteInfo(null);
                      }}
                      className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg lg:hover:bg-gray-400 transition-colors"
                    >
                      Neue PLZ
                    </button>
                    <button
                      onClick={() => {
                        setShowPostalCodeInput(false);
                        setShowMapView(false);
                        setTempPostalCode('');
                      }}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-lg lg:hover:bg-blue-700 transition-colors"
                    >
                      Schließen
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Shipping Cost Information */}
      {signPrices.filter(s => s.isEnabled).length > 0 && !config.includesInstallation && (
        <div className="mb-4 lg:mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <Truck className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm lg:text-base font-semibold text-gray-800">Versandkosten-Information</h3>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 lg:p-4">
            {shippingInfo.requiresPostalCode && !config.customerPostalCode ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-800 font-medium text-sm lg:text-base">PLZ erforderlich: €0</span>
                  <span className="text-blue-600 text-sm">()</span>
                </div>
                <p className="text-blue-700 text-sm mb-3 leading-relaxed">
                  Längste Seite: {longestSide}cm (≥240cm) → Postleitzahl eingeben für Kostenberechnung
                </p>
                <button
                  onClick={() => setShowPostalCodeInput(true)}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg lg:hover:bg-blue-700 transition-colors"
                >
                  Postleitzahl eingeben
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-800 font-medium text-sm lg:text-base truncate pr-2">{shippingInfo.method}: €{shippingInfo.cost}</span>
                  <span className="text-blue-600 text-sm">({shippingInfo.days})</span>
                </div>
                <p className="text-blue-700 text-sm leading-relaxed">
                  Längste Seite: {longestSide}cm → {shippingInfo.description}
                </p>
                
                {/* Postal Code Edit Field */}
                {config.customerPostalCode && (
                  <div className="mt-3 bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Lieferadresse:</span>
                      </div>
                      <button
                        onClick={() => setShowPostalCodeInput(true)}
                        className="text-xs text-blue-600 lg:hover:text-blue-800 underline"
                      >
                        Ändern
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                      <div className="text-sm text-gray-800">
                        <span className="font-medium">{distanceInfo.cityName}</span>
                        <span className="text-gray-500 ml-1">({config.customerPostalCode})</span>
                      </div>
                      <div className="text-sm font-medium text-blue-600">
                        {distanceInfo.distance} km
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            {config.selectedShipping?.type === 'pickup' && (
              <p className="text-green-700 text-sm font-medium mt-2">
                ✓ Bei Selbstabholung entfallen die Versandkosten
              </p>
            )}
          </div>
        </div>
      )}

      {/* Additional Costs Section */}
      {(config.isWaterproof || installation > 0 || actualShippingCost > 0 || expressProductionCost > 0) && (
        <div className="mb-4">
          <h3 className="text-sm lg:text-base font-semibold text-gray-800 mb-3">Zusatzkosten</h3>
          <div className="space-y-2 bg-gray-50 rounded-lg p-3">
            {config.isWaterproof && (
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-700 font-medium text-sm">Wasserdicht (IP65)</span>
                  <div className="text-sm text-gray-500">+25% Aufpreis</div>
                </div>
                <span className="font-semibold text-gray-800 text-sm lg:text-base">€{(enabledSignsTotal * 0.25).toFixed(2)}</span>
              </div>
            )}
            
            {expressProductionCost > 0 && (
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-700 font-medium text-sm">Express Herstellung</span>
                  <div className="text-sm text-gray-500">4-6 Tage statt Standard</div>
                </div>
                <span className="font-semibold text-gray-800 text-sm lg:text-base">€{expressProductionCost.toFixed(2)}</span>
              </div>
            )}
            
            {installation > 0 && config.customerPostalCode && /^\d{5}$/.test(config.customerPostalCode) && (
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-gray-700 font-medium text-sm">Montage-Service</span>
                  <div className="text-sm text-gray-500 leading-relaxed">
                    Montage + Anfahrt
                    <span className="font-medium text-blue-600">
                      {' '}({distanceInfo.distance} km)
                    </span>
                  </div>
                </div>
                <span className="font-semibold text-gray-800 text-sm lg:text-base">€{installation.toFixed(2)}</span>
              </div>
            )}
            
            {actualShippingCost > 0 && (
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-gray-700 font-medium text-sm">Versand</span>
                  <div className="text-sm text-gray-500 leading-relaxed">
                    {shippingInfo.method === 'Lokale Zustellung' ? `Lokale Zustellung (${distanceInfo.distance} km × €3,00)` : shippingInfo.method}
                    {config.customerPostalCode && shippingInfo.requiresPostalCode && (
                      <span className="font-medium text-blue-600">
                        {' '}({distanceInfo.distance} km)
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-semibold text-gray-800 text-sm lg:text-base">€{actualShippingCost.toFixed(2)}</span>
              </div>
            )}
            
            {config.includesInstallation && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-800 font-medium text-sm">Versandkostenfrei</span>
                </div>
                <p className="text-green-700 text-xs">
                  Bei Montage-Service entfallen alle Versandkosten
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Price Summary */}
      {(signPrices.length > 0 || !isCurrentDesignInList) && (
        <div className="border-t pt-3 space-y-2 mb-4">
          <div className="flex justify-between text-sm lg:text-base text-gray-700">
            <span>{isCurrentDesignInList ? 'Ausgewählte Schilder:' : 'Aktuelles Design:'}</span>
            <span className="font-semibold">€{enabledSignsTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm lg:text-base text-gray-700">
            <span>Zusatzkosten:</span>
            <span className="font-semibold">€{additionalCosts.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm lg:text-base text-gray-700">
            <span>Zwischensumme:</span>
            <span className="font-semibold">€{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm lg:text-base text-gray-700">
            <span>MwSt. (19%):</span>
            <span className="font-semibold">€{tax.toFixed(2)}</span>
          </div>
        </div>
      )}

                
      {/* Gesamtpreis (Total Price) - Prominently Displayed */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-4 border-2 border-green-200">
        <div className="flex justify-between items-center">
          <span className="text-lg lg:text-xl font-bold text-gray-800">Gesamtpreis:</span>
          <span className="text-3xl font-bold text-green-600">
            €{gesamtpreis.toFixed(2)}
          </span>
        </div>
        <div className="mt-2 text-sm text-gray-600 leading-relaxed">
          {isCurrentDesignInList 
            ? `${signPrices.filter(s => s.isEnabled).length} Schild(er) ausgewählt`
            : `Aktuelles Design: ${config.selectedDesign.name}`
          }
          {config.customerPostalCode && (
            <span>
              {' '}• Entfernung: {distanceInfo.distance} km nach {distanceInfo.cityName}
            </span>
          )}
        </div>
      </div>

      {/* Savings Notification - Above Payment Button */}
      {signPrices.filter(s => s.isEnabled).length > 0 && 
       !config.includesInstallation && 
       actualShippingCost > 0 && 
       longestSide > 120 && (
        <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-3">
          <p className="text-green-800 font-medium text-xs text-center">
            💰 Sie können €{actualShippingCost.toFixed(2)} ersparen bei Selbstabholung!
          </p>
        </div>
      )}

      {/* Payment Button */}
      <div className="space-y-3">
        <button 
          onClick={onGoToCart}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-lg lg:hover:from-blue-700 lg:hover:to-purple-700 transition duration-300 lg:transform lg:hover:scale-105 shadow-lg lg:hover:shadow-xl flex items-center justify-center space-x-2 lg:space-x-3 disabled:opacity-50 disabled:cursor-not-allowed lg:disabled:transform-none active:scale-95"
          disabled={signPrices.filter(s => s.isEnabled).length === 0 && isCurrentDesignInList}
        >
          <CreditCard className="h-5 w-5" />
          <span className="text-sm lg:text-base">Warenkorb - €{gesamtpreis.toFixed(2)}</span>
        </button>
        
        {/* Payment Methods */}
        <div className="bg-gray-50 rounded-lg p-3 lg:p-2 border">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <span className="text-xs text-gray-600">Sichere Zahlung:</span>
          </div>
          <div className="flex items-center justify-center space-x-1 lg:space-x-2 flex-wrap gap-1">
            {/* Visa */}
            <div className="bg-white rounded px-2 lg:px-1.5 py-1 lg:py-0.5 shadow-sm border flex items-center">
              <div className="w-6 h-3 bg-blue-600 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs font-bold">V</span>
              </div>
            </div>
            
            {/* Mastercard */}
            <div className="bg-white rounded px-2 lg:px-1.5 py-1 lg:py-0.5 shadow-sm border flex items-center">
              <div className="w-6 h-3 flex items-center justify-center">
                <div className="flex space-x-0.5">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full -ml-0.5"></div>
                </div>
              </div>
            </div>
            
            {/* PayPal */}
            <div className="bg-white rounded px-2 lg:px-1.5 py-1 lg:py-0.5 shadow-sm border flex items-center">
              <div className="w-6 h-3 flex items-center justify-center">
                <div className="flex space-x-0.5">
                  <div className="w-1 h-2 bg-blue-600 rounded-full"></div>
                  <div className="w-1 h-2 bg-blue-400 rounded-full"></div>
                </div>
              </div>
            </div>
            
            {/* SEPA (sehr wichtig in Deutschland) */}
            <div className="bg-white rounded px-2 lg:px-1.5 py-1 lg:py-0.5 shadow-sm border flex items-center">
              <div className="w-6 h-3 bg-green-600 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs font-bold">€</span>
              </div>
            </div>
            
            {/* Giropay (sehr beliebt in Deutschland) */}
            <div className="bg-white rounded px-2 lg:px-1.5 py-1 lg:py-0.5 shadow-sm border flex items-center">
              <div className="w-6 h-3 bg-red-600 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs font-bold">G</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mt-2 leading-relaxed">
          Powered by Stripe • 14 Tage Widerrufsrecht • Käuferschutz
        </p>
      </div>

      {/* Shopping Cart Modal */}
      {showCartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-auto max-h-[95vh] lg:max-h-[90vh] overflow-hidden flex flex-col lg:flex-row">
            {/* Left Side - Cart Items */}
            <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="bg-blue-600 rounded-lg p-2">
                    <ShoppingCart className="h-5 lg:h-6 w-5 lg:w-6 text-white" />
                  </div>
                  <h2 className="text-lg lg:text-2xl font-bold text-gray-800">Warenkorb</h2>
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {signPrices.filter(s => s.isEnabled).length} Artikel
                  </div>
                </div>
                <button
                  onClick={() => setShowCartModal(false)}
                  className="text-gray-400 lg:hover:text-gray-600 lg:hover:bg-gray-100 rounded-full p-2 transition-colors"
                >
                  <X className="h-5 lg:h-6 w-5 lg:w-6" />
                </button>
              </div>

              {/* Cart Items */}
              {signPrices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Keine Schilder ausgewählt</p>
                  <p className="text-sm mt-2">Wählen Sie ein Design aus und fügen Sie es zur Liste hinzu</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {signPrices.map((sign, index) => (
                    <div
                      key={sign.id}
                      className={`border rounded-lg p-3 md:p-4 transition-all duration-300 ${
                        sign.isEnabled
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 bg-gray-50 opacity-75'
                      }`}
                    >
                      <div className="flex items-start space-x-3 lg:space-x-4">
                        {/* Design Image */}
                        <SVGPreview 
                          design={sign.design}
                          width={sign.width}
                          height={sign.height}
                          className="w-16 lg:w-20 h-16 lg:h-20"
                        />
                        
                        {/* Sign Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-800 text-sm lg:text-base truncate">{sign.design.name}</h3>
                              <p className="text-sm text-gray-600">
                                Design {config.signs?.findIndex(s => s.design.id === sign.design.id) + 1} • {sign.width}×{sign.height}cm
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-lg lg:text-xl font-bold text-gray-800">€{sign.price.toFixed(2)}</div>
                              <div className="text-sm text-gray-500">pro Stück</div>
                            </div>
                          </div>
                          
                          {/* Options */}
                          <div className="flex flex-wrap items-center gap-2 lg:space-x-4 mb-3">
                            {sign.isWaterproof && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                Wasserdicht (IP65)
                              </span>
                            )}
                            {sign.isTwoPart && (
                              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                                Mehrteilig
                              </span>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                            <div className="flex items-center space-x-2">
                              {/* Toggle Button */}
                              <button
                                onClick={() => config.onSignToggle?.(sign.id, !sign.isEnabled)}
                                className={`flex items-center space-x-2 px-3 py-2 lg:py-1.5 rounded-md text-sm font-medium transition-all duration-300 ${
                                  sign.isEnabled
                                    ? 'bg-green-500 text-white lg:hover:bg-green-600'
                                    : 'bg-gray-300 text-gray-700 lg:hover:bg-gray-400'
                                }`}
                              >
                                {sign.isEnabled ? (
                                  <>
                                    <Eye className="h-4 w-4" />
                                    <span>Aktiv</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="h-4 w-4" />
                                    <span>Inaktiv</span>
                                  </>
                                )}
                              </button>
                            </div>
                            
                            {/* Remove Button */}
                            <button
                              onClick={() => onRemoveSign?.(sign.id)}
                              className="flex items-center space-x-1 px-3 py-2 lg:py-1.5 text-red-600 lg:hover:text-red-800 lg:hover:bg-red-50 rounded-md transition-all duration-300 text-sm font-medium"
                            >
                              <X className="h-4 w-4" />
                              <span>Entfernen</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
                
              {signPrices.length === 0 && (
                <div className="text-center py-8 lg:py-12">
                  <ShoppingCart className="h-12 lg:h-16 w-12 lg:w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-base lg:text-lg font-medium text-gray-500 mb-2">Warenkorb ist leer</h3>
                  <p className="text-gray-400">Fügen Sie Designs zu Ihrem Warenkorb hinzu</p>
                </div>
              )}
            </div>
            
            {/* Right Side - Summary */}
            <div className="w-full lg:w-80 bg-gray-50 p-4 lg:p-6 border-t lg:border-t-0 lg:border-l">
              <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-4">Zusammenfassung</h3>
              
              {/* Active Items Summary */}
              <div className="space-y-2 lg:space-y-3 mb-4 lg:mb-6">
                {signPrices.filter(s => s.isEnabled).map((sign, index) => (
                  <div key={sign.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate pr-2">
                      Schild {signPrices.indexOf(sign) + 1} ({sign.width}×{sign.height}cm)
                    </span>
                    <span className="font-medium text-gray-800 flex-shrink-0">€{sign.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between text-base lg:text-lg font-bold text-gray-800">
                  <span>Zwischensumme:</span>
                  <span>
                    €{signPrices.filter(s => s.isEnabled).reduce((total, sign) => total + sign.price, 0).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  zzgl. Versand und MwSt.
                </p>
              </div>
              
              {/* Actions */}
              <div className="mt-4 lg:mt-6 space-y-2 lg:space-y-3">
                <button
                  onClick={() => setShowCartModal(false)}
                  className="w-full py-3 bg-blue-600 lg:hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Weiter konfigurieren
                </button>
                <button className="w-full py-3 lg:py-2 bg-gray-200 lg:hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors">
                  Warenkorb leeren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default PricingCalculator;