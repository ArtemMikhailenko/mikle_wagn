import React, { useState } from 'react';
import { ArrowLeft, ShoppingCart, CreditCard, FileText, Edit3, Truck, Home, MapPin, Package, Eye, EyeOff, X } from 'lucide-react';
import { ConfigurationState } from '../types/configurator';
import { calculateSingleSignPrice, calculateDistance, getShippingInfo, calculateArea } from '../utils/calculations';
import { mondayService } from '../services/mondayService';
import SVGPreview from './SVGPreview';
import StripeProvider from './StripeProvider';
import StripeCheckoutForm from './StripeCheckoutForm';
interface CartCheckoutProps {
  config: ConfigurationState;
  onConfigChange: (updates: Partial<ConfigurationState>) => void;
  onShippingChange: (shipping: any) => void;
  onSignToggle: (signId: string, enabled: boolean) => void;
  onRemoveSign: (signId: string) => void;
  onBackToDesign: () => void;
}

const CartCheckout: React.FC<CartCheckoutProps> = ({
  config,
  onConfigChange,
  onShippingChange,
  onSignToggle,
  onRemoveSign,
  onBackToDesign,
}) => {
  const [showPostalCodeInput, setShowPostalCodeInput] = useState(false);
  const [tempPostalCode, setTempPostalCode] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showStripeForm, setShowStripeForm] = useState(false);

  // Calculate current design price even if not in signs list
  const currentDesignPrice = calculateSingleSignPrice(
    config.selectedDesign,
    config.customWidth,
    config.calculatedHeight,
    config.isWaterproof,
    config.isTwoPart || false,
    config.hasUvPrint,
    config.hasHangingSystem || false,
    config.expressProduction || false
    // Express production is NOT included in individual sign prices
  );

  // Calculate individual sign prices
  const signPrices = config.signs?.map(sign => ({
    ...sign,
    price: calculateSingleSignPrice(
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

  // Get largest dimensions for shipping calculation
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

  const handlePostalCodeSubmit = () => {
    if (tempPostalCode && /^\d{5}$/.test(tempPostalCode)) {
      onConfigChange({ customerPostalCode: tempPostalCode });
      setTempPostalCode('');
      setShowPostalCodeInput(false);
    }
  };

  const handleStripePaymentSuccess = (paymentIntent: any) => {
    console.log('Payment successful:', paymentIntent);
    // Перенаправляем на страницу успеха
    window.location.href = `/success?payment_intent=${paymentIntent.id}`;
  };

  const handleStripePaymentError = (error: string) => {
    console.error('Payment error:', error);
    alert(`Zahlungsfehler: ${error}`);
    setIsProcessingPayment(false);
  };

  const handleStripeCheckout = async () => {
    setShowStripeForm(true);
  };
  // Auto-select pickup by default
  React.useEffect(() => {
    if (!config.selectedShipping && !config.includesInstallation) {
      onShippingChange({
        type: 'pickup',
        name: 'Selbstabholung',
        price: 0,
        description: 'Kostenlose Abholung in 67433 Neustadt'
      });
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 rounded-lg p-2">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Warenkorb & Versand</h1>
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {signPrices.filter(s => s.isEnabled).length + (isCurrentDesignInList ? 0 : 1)} Artikel
            </div>
          </div>
          
          <button
            onClick={onBackToDesign}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Edit3 className="h-4 w-4" />
            <span>Design anpassen</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cart Items */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Ihre Neon-Schilder</h2>
            
            {signPrices.length === 0 && !isCurrentDesignInList ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500 mb-2">Warenkorb ist leer</h3>
                <p className="text-gray-400">Fügen Sie Designs zu Ihrem Warenkorb hinzu</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current Design (if not in list) */}
                {!isCurrentDesignInList && (
                  <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      <SVGPreview 
                        design={config.selectedDesign}
                        width={config.customWidth}
                        height={config.calculatedHeight}
                        className="w-20 h-20"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-800">{config.selectedDesign.name}</h3>
                            <p className="text-sm text-gray-600">
                              Aktuelles Design • {config.customWidth}×{config.calculatedHeight}cm
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-800">€{currentDesignPrice.toFixed(2)}</div>
                            <div className="text-sm text-gray-500">pro Stück</div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {config.isWaterproof && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                              Wasserdicht (IP65)
                            </span>
                          )}
                          {config.isTwoPart && (
                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                              Mehrteilig
                            </span>
                          )}
                          {config.hasUvPrint && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                              UV-Druck
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Saved Signs */}
                {signPrices.map((sign, index) => (
                  <div
                    key={sign.id}
                    className={`border rounded-lg p-4 transition-all duration-300 ${
                      sign.isEnabled
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50 opacity-75'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <SVGPreview 
                        design={sign.design}
                        width={sign.width}
                        height={sign.height}
                        className="w-20 h-20"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-800">{sign.design.name}</h3>
                            <p className="text-sm text-gray-600">
                              Design {index + 1} • {sign.width}×{sign.height}cm
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-800">€{sign.price.toFixed(2)}</div>
                            <div className="text-sm text-gray-500">pro Stück</div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-3">
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
                          {sign.hasUvPrint && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                              UV-Druck
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onSignToggle(sign.id, !sign.isEnabled)}
                              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 ${
                                sign.isEnabled
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
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
                          
                          <button
                            onClick={() => onRemoveSign(sign.id)}
                            className="flex items-center space-x-1 px-3 py-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-all duration-300 text-sm font-medium"
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
          </div>

          {/* Shipping Options */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Versandoptionen</h2>
            
            {/* Pickup Option - Pre-selected */}
            <div className={`flex items-center space-x-3 p-4 border-2 rounded-lg transition-all duration-300 cursor-pointer mb-4 ${
              config.includesInstallation
                ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
                : config.selectedShipping && config.selectedShipping.type === 'pickup'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => {
              if (config.includesInstallation) return;
              
              if (config.selectedShipping && config.selectedShipping.type === 'pickup') {
                onShippingChange(null);
              } else {
                onShippingChange({
                  type: 'pickup',
                  name: 'Selbstabholung',
                  price: 0,
                  description: 'Kostenlose Abholung in 67433 Neustadt'
                });
              }
            }}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
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
              
              <div className={`p-2 rounded-lg ${
                config.includesInstallation
                  ? 'bg-gray-200 text-gray-400'
                  : config.selectedShipping && config.selectedShipping.type === 'pickup'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <Home className="h-5 w-5" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-800">Selbstabholung (Empfohlen)</h4>
                  <span className="font-bold text-green-600">Kostenlos</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Kostenlose Abholung in 67433 Neustadt</p>
              </div>
            </div>

            {/* Shipping Cost Information */}
            {longestSide >= 240 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">Versand verfügbar</h3>
                </div>
                
                {shippingInfo.requiresPostalCode && !config.customerPostalCode ? (
                  <>
                    <p className="text-blue-700 text-sm mb-3">
                      Längste Seite: {longestSide}cm → Postleitzahl eingeben für Kostenberechnung
                    </p>
                    <button
                      onClick={() => setShowPostalCodeInput(true)}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Postleitzahl eingeben
                    </button>
                  </>
                ) : (
                  <div className="text-sm text-blue-700">
                    <p className="mb-1">{shippingInfo.method}: €{shippingInfo.cost}</p>
                    <p>Längste Seite: {longestSide}cm → {shippingInfo.description}</p>
                    {config.customerPostalCode && (
                      <p className="mt-2 font-medium">
                        Lieferung nach {distanceInfo.cityName} ({config.customerPostalCode}) - {distanceInfo.distance} km
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Summary & Checkout */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Bestellübersicht</h2>
            
            {/* Price Summary */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-700">
                <span>Schilder ({signPrices.filter(s => s.isEnabled).length + (isCurrentDesignInList ? 0 : 1)}):</span>
                <span className="font-semibold">€{enabledSignsTotal.toFixed(2)}</span>
              </div>
              
              {additionalCosts > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Zusatzkosten:</span>
                  <span className="font-semibold">€{additionalCosts.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-gray-700 border-t pt-3">
                <span>Zwischensumme:</span>
                <span className="font-semibold">€{subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-gray-700">
                <span>MwSt. (19%):</span>
                <span className="font-semibold">€{tax.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-xl font-bold text-gray-800 border-t pt-3">
                <span>Gesamtpreis:</span>
                <span className="text-green-600">€{gesamtpreis.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Buttons */}
            <div className="space-y-3">
              {/* Checkbox-Bestätigung im Bestellprozess */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-800 mb-3">Checkbox-Bestätigung im Bestellprozess</h4>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="w-5 h-5 text-green-600 focus:ring-green-500 rounded mt-0.5 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-800 leading-relaxed">
                    <strong>☑ Ich habe das Mock-up geprüft und bestätige, dass es meinen Vorgaben entspricht.
                    Nach meiner Bestellung sind keine Änderungen oder ein Widerruf möglich.</strong>
                  </span>
                </label>
                <p className="text-xs text-gray-600 mt-2 ml-8">
                  Ohne diese Bestätigung ist eine Auftragserteilung nicht möglich.
                </p>
              </div>
              
              <button 
                onClick={handleStripeCheckout}
                disabled={isProcessingPayment || !isConfirmed}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <CreditCard className="h-5 w-5" />
                <span>
                  {isProcessingPayment ? 'Wird verarbeitet...' : 
                   !isConfirmed ? 'Bestätigung erforderlich' :
                   `Jetzt bezahlen - €${gesamtpreis.toFixed(2)}`}
                </span>
              </button>
              
              <button 
                disabled={!isConfirmed}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="h-5 w-5" />
                <span>{!isConfirmed ? 'Bestätigung erforderlich' : 'Per Rechnung bestellen'}</span>
              </button>
            </div>

            {/* Payment Methods */}
            <div className="mt-6 bg-gray-50 rounded-lg p-3 border">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-xs text-gray-600">Sichere Zahlung:</span>
              </div>
              <div className="flex items-center justify-center space-x-2 flex-wrap gap-1">
                <div className="bg-white rounded px-2 py-1 shadow-sm border flex items-center">
                  <div className="w-6 h-3 bg-blue-600 rounded-sm flex items-center justify-center">
                    <span className="text-white text-xs font-bold">V</span>
                  </div>
                </div>
                <div className="bg-white rounded px-2 py-1 shadow-sm border flex items-center">
                  <div className="w-6 h-3 flex items-center justify-center">
                    <div className="flex space-x-0.5">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full -ml-0.5"></div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded px-2 py-1 shadow-sm border flex items-center">
                  <div className="w-6 h-3 flex items-center justify-center">
                    <div className="flex space-x-0.5">
                      <div className="w-1 h-2 bg-blue-600 rounded-full"></div>
                      <div className="w-1 h-2 bg-blue-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded px-2 py-1 shadow-sm border flex items-center">
                  <div className="w-6 h-3 bg-green-600 rounded-sm flex items-center justify-center">
                    <span className="text-white text-xs font-bold">€</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Powered by Stripe • 14 Tage Widerrufsrecht • Käuferschutz
            </p>
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
                  <span>Artikel ({signPrices.filter(s => s.isEnabled).length + (isCurrentDesignInList ? 0 : 1)})</span>
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
                  <span>Gesamtpreis</span>
                  <span>€{gesamtpreis.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <StripeProvider>
              <StripeCheckoutForm
                amount={Math.round(gesamtpreis * 100)} // в центах
                onSuccess={handleStripePaymentSuccess}
                onError={handleStripePaymentError}
                customerEmail=""
              />
            </StripeProvider>
          </div>
        </div>
      )}

      {/* Postal Code Input Modal */}
      {showPostalCodeInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center space-x-2 mb-4">
              <MapPin className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Postleitzahl eingeben</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Geben Sie Ihre Postleitzahl ein, um die Versandkosten zu berechnen.
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
            
            <div className="flex space-x-3">
              <button
                onClick={handlePostalCodeSubmit}
                disabled={!tempPostalCode || !/^\d{5}$/.test(tempPostalCode)}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Berechnen
              </button>
              <button
                onClick={() => {
                  setShowPostalCodeInput(false);
                  setTempPostalCode('');
                }}
                className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartCheckout;