import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerHeader from './components/CustomerHeader';
import MondayStatus from './components/MondayStatus';
import ConfigurationPanel from './components/ConfigurationPanel';
import DesignSelector from './components/DesignSelector';
import PricingCalculator from './components/PricingCalculator';
import CartCheckout from './components/CartCheckout';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import ProductsPage from './components/ProductsPage';
import SuccessPage from './components/SuccessPage';
import PaymentSuccess from './components/PaymentSuccess';
import StripeTestPage from './components/StripeTestPage';
import WiderrufsrechtPage from './components/legal/WiderrufsrechtPage';
import DatenschutzPage from './components/legal/DatenschutzPage';
import AgbPage from './components/legal/AgbPage';
import ZahlungVersandPage from './components/legal/ZahlungVersandPage';
import ImpressumPage from './components/legal/ImpressumPage';
import { ConfigurationState, SignConfiguration } from './types/configurator';
import { MOCK_DESIGNS } from './data/mockDesigns';
import { calculateProportionalHeight, calculateSingleSignPrice, calculateProportionalLedLength } from './utils/calculations';
import NeonMockupStage from './components/NeonMockupStage';
import { ShoppingCart, X, ArrowLeft, ChevronLeft, ChevronRight, Settings, FileText, Ruler, Shield, Truck, Wrench, MapPin, Info, Scissors, Palette } from 'lucide-react';
import { Edit3 } from 'lucide-react';
import ShippingCalculationPage from './components/ShippingCalculationPage';
import MondayTestPanel from './components/MondayTestPanel';
import MondayConnectionTest from './components/MondayConnectionTest';
import PricingTestPage from './components/PricingTestPage';
import CRMAdminPanel from './components/CRMAdminPanel';
import DirectCRMAdminPanel from './components/DirectCRMAdminPanel';
import PricingAdminPanel from './components/PricingAdminPanel';
import DiscountAdminPanel from './components/DiscountAdminPanel';
import DatabaseSetup from './components/DatabaseSetup';
import SupabaseConnectionTest from './components/SupabaseConnectionTest';
import MondayBoardAnalyzer from './components/MondayBoardAnalyzer';
import AdminDashboard from './components/AdminDashboard';
import mondayService from './services/mondayService';
import makeService from './services/makeService';
import ClientViewFullConfigurator from './components/ClientViewFullConfigurator';
import DebugProject from './components/DebugProject';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    // Dynamic import of Supabase
    const loadSupabase = async () => {
      try {
        const supabaseModule = await import('./lib/supabase');
        setSupabase(supabaseModule.supabase);
      } catch (error) {
        console.warn('Supabase not configured, running in demo mode');
        setLoading(false);
      }
    };

    loadSupabase();
  }, []);

  useEffect(() => {
    if (supabase) {
      // Get initial session
      supabase.auth.getSession().then(({ data }: { data: { session: any } }) => {
        setUser(data.session?.user ?? null);
        setLoading(false);
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event:any, session:any) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    } else if (supabase === null) {
      // Demo mode - no authentication
      setLoading(false);
    }
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/products" />} />
        <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/products" />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/success" element={<PaymentSuccess />} />
        <Route path="/widerrufsrecht" element={<WiderrufsrechtPage />} />
        <Route path="/datenschutz" element={<DatenschutzPage />} />
        <Route path="/agb" element={<AgbPage />} />
        <Route path="/zahlung-versand" element={<ZahlungVersandPage />} />
        <Route path="/impressum" element={<ImpressumPage />} />
        {/* Admin Dashboard */}
        <Route path="/admin" element={<AdminDashboard />} />
        {/* Admin panel for Direct Monday.com CRM */}
        <Route path="/admin/crm" element={<DirectCRMAdminPanel />} />
        <Route path="/admin/crm-old" element={<CRMAdminPanel />} />
        <Route path="/admin/monday" element={<MondayTestPanel />} />
        <Route path="/admin/monday-connection" element={<MondayConnectionTest />} />
        <Route path="/admin/pricing" element={<PricingAdminPanel />} />
        <Route path="/admin/discounts" element={<DiscountAdminPanel />} />
        <Route path="/admin/database-setup" element={<DatabaseSetup />} />
        <Route path="/admin/supabase-test" element={<SupabaseConnectionTest />} />
        <Route path="/admin/board-analyzer" element={<MondayBoardAnalyzer />} />
        <Route path="/test/pricing" element={<PricingTestPage />} />
        <Route path="/test/stripe" element={<StripeTestPage />} />
        {/* Client view for CRM links */}
        <Route path="/client/:projectId" element={<ClientViewFullConfigurator />} />
        <Route path="/debug/:projectId" element={<DebugProject />} />
        <Route path="/" element={<NeonConfiguratorApp />} />
      </Routes>
    </Router>
  );
}

function NeonConfiguratorApp() {
  const [neonOn, setNeonOn] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [config, setConfig] = useState<ConfigurationState>({
    selectedDesign: MOCK_DESIGNS[0],
    customWidth: 200, // 2m
    calculatedHeight: 100, // Will be calculated
    isWaterproof: false,
    hasUvPrint: true,
    hasHangingSystem: false,
    includesInstallation: false,
    customerPostalCode: '',
    selectedShipping: null,
    // Initialize with empty signs array
    signs: [],
  });
  
  const [availableDesigns, setAvailableDesigns] = useState(MOCK_DESIGNS);
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(true);
  
  // State für temporäre "Im Warenkorb" Animation
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  // Mobile cart state
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [currentStep, setCurrentStep] = useState<'design' | 'cart'>('design');
  const [showShippingPage, setShowShippingPage] = useState(false);
  
  // Uploaded SVG state - теперь по ID дизайна
  const [uploadedSvgsByDesign, setUploadedSvgsByDesign] = useState<Record<string, string>>({});
  
  // Settings per design - сохраняем настройки для каждого дизайна
  const [settingsByDesign, setSettingsByDesign] = useState<Record<string, {
    customWidth: number;
    isWaterproof: boolean;
    isTwoPart?: boolean;
    hasUvPrint?: boolean;
    hasHangingSystem?: boolean;
    expressProduction?: boolean;
  }>>({});
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Load designs from Monday.com on component mount
  useEffect(() => {
    const loadDesigns = async () => {
      try {
        await mondayService.fetchPrices();
        const mondayDesigns = mondayService.getDesigns();
        
        if (mondayDesigns.length > 0) {
          console.log('🎨 Monday.com Designs geladen:', mondayDesigns.length);
          setAvailableDesigns(mondayDesigns);
          // Set first Monday design as selected if available
          if (mondayDesigns[0]) {
            setConfig(prev => ({
              ...prev,
              selectedDesign: mondayDesigns[0]
            }));
          }
        } else {
          console.log('📦 Verwende Mock-Designs als Fallback');
          setAvailableDesigns(MOCK_DESIGNS);
        }
      } catch (error) {
        console.error('❌ Fehler beim Laden der Designs:', error);
        setAvailableDesigns(MOCK_DESIGNS);
      } finally {
        setIsLoadingDesigns(false);
      }
    };

    loadDesigns();
  }, []);

  // Update height when design or width changes
  useEffect(() => {
    const newHeight = calculateProportionalHeight(
      config.selectedDesign.originalWidth,
      config.selectedDesign.originalHeight,
      config.customWidth
    );
    setConfig(prev => ({ ...prev, calculatedHeight: newHeight }));
  }, [config.selectedDesign, config.customWidth]);

  // Инициализация настроек для первого дизайна
  useEffect(() => {
    if (config.selectedDesign && !settingsByDesign[config.selectedDesign.id]) {
      setSettingsByDesign(prev => ({
        ...prev,
        [config.selectedDesign.id]: {
          customWidth: config.customWidth,
          isWaterproof: config.isWaterproof,
          isTwoPart: config.isTwoPart,
          hasUvPrint: config.hasUvPrint,
          hasHangingSystem: config.hasHangingSystem,
          expressProduction: config.expressProduction,
        }
      }));
    }
  }, [config.selectedDesign, settingsByDesign]);

  const handleConfigChange = (updates: Partial<ConfigurationState>) => {
    console.log('🔧 Config change:', updates);
    
    // Neon ausschalten bei Konfigurationsänderungen die das Design beeinflussen
    if ((updates.customWidth !== undefined || updates.calculatedHeight !== undefined || 
         updates.isWaterproof !== undefined || updates.isTwoPart !== undefined) && neonOn) {
      setNeonOn(false);
      setIsResizing(true);
      
      // Clear existing timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // Neon nach 600ms wieder einschalten
      resizeTimeoutRef.current = setTimeout(() => {
        setNeonOn(true);
        setIsResizing(false);
      }, 600);
    }
    
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      
      // Reset shipping selection when installation is enabled
      if (updates.includesInstallation === true) {
        newConfig.selectedShipping = null;
      }
      
      // Update existing signs with new configuration when relevant settings change
      if (updates.isWaterproof !== undefined || updates.isTwoPart !== undefined || updates.hasUvPrint !== undefined || updates.hasHangingSystem !== undefined) {
        const updatedSigns = newConfig.signs.map(sign => ({
          ...sign,
          isWaterproof: updates.isWaterproof !== undefined ? updates.isWaterproof : newConfig.isWaterproof,
          isTwoPart: updates.isTwoPart !== undefined ? updates.isTwoPart : newConfig.isTwoPart,
          hasUvPrint: updates.hasUvPrint !== undefined ? updates.hasUvPrint : newConfig.hasUvPrint,
          hasHangingSystem: updates.hasHangingSystem !== undefined ? updates.hasHangingSystem : newConfig.hasHangingSystem,
        }));
        newConfig.signs = updatedSigns;
      }
      
      // Also update signs when width changes (this affects the current design dimensions)
      if (updates.customWidth !== undefined || updates.calculatedHeight !== undefined) {
        const updatedSigns = newConfig.signs.map(sign => {
          // Only update signs that match the current selected design
          if (sign.design.id === newConfig.selectedDesign.id) {
            return {
              ...sign,
              width: updates.customWidth !== undefined ? updates.customWidth : newConfig.customWidth,
              height: updates.calculatedHeight !== undefined ? updates.calculatedHeight : newConfig.calculatedHeight,
              // Also update hasUvPrint for the current design
              hasUvPrint: updates.hasUvPrint !== undefined ? updates.hasUvPrint : newConfig.hasUvPrint,
              hasHangingSystem: updates.hasHangingSystem !== undefined ? updates.hasHangingSystem : newConfig.hasHangingSystem,
            };
          }
          return sign;
        });
        newConfig.signs = updatedSigns;
      }
      
      console.log('🔧 New config after update:', newConfig);
      
      // Сохраняем настройки текущего дизайна при их изменении
      if (updates.customWidth !== undefined || 
          updates.isWaterproof !== undefined || 
          updates.isTwoPart !== undefined || 
          updates.hasUvPrint !== undefined || 
          updates.hasHangingSystem !== undefined ||
          updates.expressProduction !== undefined) {
        setSettingsByDesign(prevSettings => ({
          ...prevSettings,
          [newConfig.selectedDesign.id]: {
            customWidth: newConfig.customWidth,
            isWaterproof: newConfig.isWaterproof,
            isTwoPart: newConfig.isTwoPart,
            hasUvPrint: newConfig.hasUvPrint,
            hasHangingSystem: newConfig.hasHangingSystem,
            expressProduction: newConfig.expressProduction,
          }
        }));
      }
      
      return newConfig;
    });
  };

  // Функция для сохранения настроек текущего дизайна
  const saveCurrentDesignSettings = () => {
    setSettingsByDesign(prev => ({
      ...prev,
      [config.selectedDesign.id]: {
        customWidth: config.customWidth,
        isWaterproof: config.isWaterproof,
        isTwoPart: config.isTwoPart,
        hasUvPrint: config.hasUvPrint,
        hasHangingSystem: config.hasHangingSystem,
        expressProduction: config.expressProduction,
      }
    }));
  };

  // Функция для загрузки настроек дизайна
  const loadDesignSettings = (designId: string) => {
    return settingsByDesign[designId] || {
      customWidth: 107, // Значение по умолчанию
      isWaterproof: false,
      isTwoPart: false,
      hasUvPrint: true,
      hasHangingSystem: false,
      expressProduction: false,
    };
  };

  const handleDesignChange = (design: typeof MOCK_DESIGNS[0]) => {
    // Сохраняем настройки текущего дизайна перед переключением
    saveCurrentDesignSettings();
    
    // Загружаем настройки для нового дизайна
    const designSettings = loadDesignSettings(design.id);
    
    const newHeight = calculateProportionalHeight(
      design.originalWidth,
      design.originalHeight,
      designSettings.customWidth
    );
    
    setConfig(prev => ({
      ...prev,
      selectedDesign: design,
      customWidth: designSettings.customWidth,
      calculatedHeight: newHeight,
      isWaterproof: designSettings.isWaterproof,
      isTwoPart: designSettings.isTwoPart,
      hasUvPrint: designSettings.hasUvPrint,
      hasHangingSystem: designSettings.hasHangingSystem,
      expressProduction: designSettings.expressProduction,
    }));
    
    console.log('🔄 Design changed to:', design.name, 'with settings:', designSettings);
  };

  const handleToggleDesign = (design: typeof MOCK_DESIGNS[0], added: boolean) => {
    // Starte Animation
    setIsAddingToCart(true);
    
    // Always add new sign (ignore 'added' parameter)
    const currentDesignSvg = uploadedSvgsByDesign[design.id] || null;
    const newSign: SignConfiguration = {
      id: `sign-${design.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID for duplicates
      design: design,
      width: config.customWidth,
      height: calculateProportionalHeight(design.originalWidth, design.originalHeight, config.customWidth),
      isEnabled: true,
      isWaterproof: config.isWaterproof,
      isTwoPart: config.isTwoPart,
      hasUvPrint: config.hasUvPrint ?? true,
      hasHangingSystem: config.hasHangingSystem ?? false,
      uploadedSvgContent: currentDesignSvg, // Привязываем SVG конкретного дизайна
    };
    console.log('➕ Adding new sign with hasUvPrint:', newSign.hasUvPrint, 'uploadedSvg for design', design.id, ':', !!currentDesignSvg);
    setConfig(prev => ({
      ...prev,
      signs: [...prev.signs, newSign]
    }));
    
    // Animation nach 1 Sekunde beenden
    setTimeout(() => {
      setIsAddingToCart(false);
    }, 1000);
  };
  const handleSignToggle = (signId: string, enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      signs: prev.signs.map(sign =>
        sign.id === signId ? { ...sign, isEnabled: enabled } : sign
      )
    }));
  };

  const handleRemoveSign = (signId: string) => {
    setConfig(prev => ({
      ...prev,
      signs: prev.signs.filter(sign => sign.id !== signId)
    }));
  };

  const handleShippingChange = (shipping: any) => {
    setConfig(prev => ({ ...prev, selectedShipping: shipping }));
  };

  const handleDesignUpdate = (updatedDesign: typeof MOCK_DESIGNS[0]) => {
    setConfig(prev => ({
      ...prev,
      selectedDesign: updatedDesign
    }));
  };

  // Check if current design is already added
  const currentDesignCount = config.signs.filter(sign => sign.design.id === config.selectedDesign.id).length;
  const isCurrentDesignAdded = currentDesignCount > 0;
  // Customer data (would come from URL params or API in real implementation)
  const customerData = {
    name: "Müller GmbH & Co. KG",
    logo: "/Logo Long White.png",
    orderToken: "neon-order-8f4e2d1a-b3c5-4d6e-7f8g-9h0i1j2k3l4m",
  };
  
  // Calculate current design price for mobile cart
  const currentDesignPrice = React.useMemo(() => {
    console.log('📱 Mobile cart price calculation with hasUvPrint:', config.hasUvPrint, 'hasHangingSystem:', config.hasHangingSystem);
    const basePrice = calculateSingleSignPrice(
      config.selectedDesign,
      config.customWidth,
      config.calculatedHeight,
      config.isWaterproof,
      config.isTwoPart || false,
      config.hasUvPrint,
      config.hasHangingSystem || false,
      config.expressProduction || false
    );
    
    return basePrice;
  }, [config.selectedDesign, config.customWidth, config.calculatedHeight, config.isWaterproof, config.isTwoPart, config.hasUvPrint, config.hasHangingSystem, config.expressProduction]);
  
  // Calculate total items in cart
  const cartItemCount = config.signs.filter(s => s.isEnabled).length;

  // Calculate effective max width based on height constraints
  const maxWidthForHeight = React.useMemo(() => {
    const maxHeight = 200; // Maximum allowed height in cm
    return Math.floor((maxHeight * config.selectedDesign.originalWidth) / config.selectedDesign.originalHeight);
  }, [config.selectedDesign.originalWidth, config.selectedDesign.originalHeight]);

  const effectiveMaxWidth = React.useMemo(() => {
    if (config.isTwoPart) {
      return 1000; // 10m for two-part signs
    }
    return Math.min(300, maxWidthForHeight); // 3m or height-constrained width, whichever is smaller
  }, [config.isTwoPart, maxWidthForHeight]);

  const handleWidthChange = (newWidth: number) => {
    // Neon ausschalten während Größenänderung
    if (neonOn) {
      setNeonOn(false);
      setIsResizing(true);
    }
    
    // Clear existing timeout
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    const newHeight = calculateProportionalHeight(
      config.selectedDesign.originalWidth,
      config.selectedDesign.originalHeight,
      newWidth
    );
    
    // Check if height exceeds 200cm and isTwoPart is not enabled
    if (newHeight > 200 && !config.isTwoPart) {
      // Don't update if it would exceed height limit
      return;
    }
    
    handleConfigChange({ 
      customWidth: newWidth,
      calculatedHeight: newHeight
    });
    
    // Neon nach 800ms wieder einschalten
    resizeTimeoutRef.current = setTimeout(() => {
      setNeonOn(true);
      setIsResizing(false);
    }, 800);
  };

  const handleGoToCart = () => {
    setCurrentStep('cart');
  };

  const handleBackToDesign = () => {
    setCurrentStep('design');
  };

  const handleShowShippingPage = () => {
    setShowShippingPage(true);
  };

  const handleCloseShippingPage = () => {
    setShowShippingPage(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 overflow-x-hidden relative">
      {!showShippingPage && (
        <CustomerHeader
          customerName={customerData.name}
          customerLogo={customerData.logo}
          orderToken={customerData.orderToken}
        />
      )}
      
      {/* Shipping Calculation Page */}
      {showShippingPage && (
        <ShippingCalculationPage
          config={config}
          onConfigChange={handleConfigChange}
          onClose={handleCloseShippingPage}
          onSignToggle={handleSignToggle}
          onRemoveSign={handleRemoveSign}
        />
      )}
      
      {/* Main Content - Hidden when shipping page is open */}
      {!showShippingPage && (
      <>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-20 lg:pb-12">
        {/* Step Navigation */}
        {currentStep === 'cart' && (
          <div className="mb-6 pt-20">
            <button
              onClick={handleBackToDesign}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Zurück zur Konfiguration</span>
            </button>
          </div>
        )}

        {/* Unified Layout - Responsive Desktop Design */}
        <div className={`${currentStep === 'cart' ? 'hidden' : ''}`}>
          {/* 1. Product Preview Section - Full Width */}
          <div className="mb-4 sm:mb-6 lg:mb-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 md:-mt-12">
            {/* Large Mockup Image - Full Width */}
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 h-[400px] sm:h-[500px] lg:h-[600px] pt-16 sm:pt-20 flex items-center justify-center w-full border-4 border-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 shadow-2xl overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/10 before:via-purple-500/10 before:to-pink-500/10 before:animate-pulse before:pointer-events-none after:absolute after:inset-0 after:border-2 after:border-gradient-to-r after:from-cyan-400/20 after:via-purple-400/20 after:to-pink-400/20 after:rounded-lg after:animate-pulse after:pointer-events-none">
              {/* Stylische Ecken-Ornamente */}
              <div className="absolute top-4 left-4 w-6 h-6 sm:w-8 sm:h-8 border-l-3 border-t-3 border-blue-400/60 rounded-tl-xl z-10"></div>
              <div className="absolute top-4 right-4 w-6 h-6 sm:w-8 sm:h-8 border-r-3 border-t-3 border-purple-400/60 rounded-tr-xl z-10"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 sm:w-8 sm:h-8 border-l-3 border-b-3 border-pink-400/60 rounded-bl-xl z-10"></div>
              <div className="absolute bottom-4 right-4 w-6 h-6 sm:w-8 sm:h-8 border-r-3 border-b-3 border-cyan-400/60 rounded-br-xl z-10"></div>
              
              {/* Glowing border effect */}
              <div className="absolute inset-2 rounded-xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-pulse pointer-events-none z-10"></div>
              
              <NeonMockupStage
                lengthCm={config.customWidth}
                waterproof={config.isWaterproof}
                uvOn={!!config.hasUvPrint}
                neonOn={neonOn && !isResizing}
                currentSvgContent={uploadedSvgsByDesign[config.selectedDesign.id] || null}
                onSvgUpload={(svgContent) => {
                  if (svgContent) {
                    setUploadedSvgsByDesign(prev => ({
                      ...prev,
                      [config.selectedDesign.id]: svgContent
                    }));
                  } else {
                    setUploadedSvgsByDesign(prev => {
                      const updated = { ...prev };
                      delete updated[config.selectedDesign.id];
                      return updated;
                    });
                  }
                }}
              />
              
              <button
                onClick={() => {
                  const currentIndex = availableDesigns.findIndex(d => d.id === config.selectedDesign.id);
                  const prevIndex = currentIndex > 0 ? currentIndex - 1 : availableDesigns.length - 1;
                  handleDesignChange(availableDesigns[prevIndex]);
                }}
                className="absolute left-2 sm:left-6 top-1/2 transform -translate-y-1/2 transition-all duration-300"
              >
                <ChevronLeft className="h-8 w-4 sm:h-12 sm:w-6 text-white drop-shadow-lg" />
              </button>
              
              <button
                onClick={() => {
                  const currentIndex = availableDesigns.findIndex(d => d.id === config.selectedDesign.id);
                  const nextIndex = currentIndex < availableDesigns.length - 1 ? currentIndex + 1 : 0;
                  handleDesignChange(availableDesigns[nextIndex]);
                }}
                className="absolute right-2 sm:right-6 top-1/2 transform -translate-y-1/2 transition-all duration-300"
              >
                <ChevronRight className="h-8 w-4 sm:h-12 sm:w-6 text-white drop-shadow-lg" />
              </button>
              
              {/* Design Indicators */}
              <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 sm:space-x-3">
                {availableDesigns.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleDesignChange(availableDesigns[index])}
                    className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-300 border-2 border-white/50 ${
                      index === availableDesigns.findIndex(d => d.id === config.selectedDesign.id)
                        ? 'bg-white shadow-lg shadow-white/50 scale-125'
                        : 'bg-white/30 hover:bg-white/60 backdrop-blur-sm'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {/* 2. Technical Information - Responsive */}
            <div className="mx-4 sm:mx-6 lg:mx-8 -mt-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs py-3 px-4 sm:px-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 space-y-2 sm:space-y-0">
                {/* Technical Data Section - Left */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-bold text-green-800">Technische Daten</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <div>
                      <span className="text-green-700">Elemente:</span>
                      <span className="font-bold text-green-600 ml-1">{config.selectedDesign.elements}</span>
                    </div>
                    <div>
                      <span className="text-green-700">LED-Länge:</span>
                      <span className="font-bold text-green-600 ml-1">
                        {calculateProportionalLedLength(
                          config.selectedDesign.originalWidth,
                          config.selectedDesign.originalHeight,
                          config.selectedDesign.ledLength,
                          config.customWidth,
                          config.calculatedHeight
                        )}m
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Verbrauch:</span>
                      <span className="font-bold text-green-600 ml-1">
                        {Math.round(calculateProportionalLedLength(
                          config.selectedDesign.originalWidth,
                          config.selectedDesign.originalHeight,
                          config.selectedDesign.ledLength,
                          config.customWidth,
                          config.calculatedHeight
                        ) * 8 * 1.25)}W
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Original Data Section - Right */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs font-bold text-blue-800">Originale Daten</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <div>
                      <span className="text-blue-700">Breite:</span>
                      <span className="font-bold text-blue-600 ml-1">{config.selectedDesign.originalWidth}cm</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Höhe:</span>
                      <span className="font-bold text-blue-600 ml-1">{config.selectedDesign.originalHeight}cm</span>
                    </div>
                    <div>
                      <span className="text-blue-700">LED-Länge:</span>
                      <span className="font-bold text-blue-600 ml-1">{config.selectedDesign.ledLength}m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 3. Configuration Section - Responsive */}
          <div className="w-full">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-2">
                    <Ruler className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800">Konfiguration</h2>
                  
                  {/* Neon Toggle */}
                  <div className="flex items-center space-x-2 ml-4 p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Neon</span>
                    <button
                      onClick={() => {
                        console.log('🔵 App.tsx: Toggling neon from', neonOn, 'to', !neonOn);
                        setNeonOn(!neonOn);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        neonOn ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          neonOn ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                
                {/* Action Buttons - Responsive */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  {/* Add Button */}
                  {isAddingToCart ? (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 min-h-[44px] flex items-center justify-center">
                      <div className="flex items-center space-x-2 animate-pulse justify-center">
                        <div className="bg-green-500 rounded-full p-0.5">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-green-800 font-bold text-xs sm:text-sm lg:text-base animate-pulse">Im Warenkorb</span>
                        <div className="text-xs sm:text-sm lg:text-base font-bold text-green-800">
                          €{currentDesignPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleToggleDesign(config.selectedDesign, true)}
                      className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:from-green-700 active:to-emerald-800 text-white font-bold py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg sm:shadow-xl hover:shadow-xl sm:hover:shadow-2xl flex items-center justify-center space-x-1.5 sm:space-x-2 lg:space-x-3 text-xs sm:text-sm lg:text-lg group relative overflow-hidden z-20 min-h-[44px] touch-manipulation"
                    >
                      {/* Glowing background animation */}
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 animate-pulse"></div>
                      
                      <div className="bg-white/20 rounded-full p-0.5 flex-shrink-0">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <span className="font-bold relative z-10 text-center flex-1 sm:flex-initial">
                        <span className="hidden sm:inline">{currentDesignCount > 0 ? 'Weitere hinzufügen' : 'Hinzufügen'}</span>
                        <span className="sm:hidden">{currentDesignCount > 0 ? 'Weitere' : 'Hinzufügen'}</span>
                      </span>
                      <div className="bg-white/20 rounded-full px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 text-xs sm:text-sm lg:text-base font-bold flex-shrink-0">
                        €{currentDesignPrice.toFixed(2)}
                      </div>
                    </button>
                  )}
                  
                  {/* Shipping Button */}
                  <div className="relative w-full sm:w-auto">
                    <button 
                      onClick={handleShowShippingPage}
                      className="relative w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:from-blue-700 active:to-indigo-800 text-white py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-8 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg sm:shadow-xl hover:shadow-xl sm:hover:shadow-2xl flex items-center justify-center space-x-1.5 sm:space-x-2 lg:space-x-3 font-bold text-xs sm:text-sm lg:text-lg group z-10 overflow-hidden min-h-[44px] touch-manipulation"
                    >
                      {/* Sliding background animation */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
                      
                      <Truck className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 relative z-10 group-hover:animate-bounce flex-shrink-0" />
                      <span className="font-bold relative z-10 text-center">
                        <span className="hidden sm:inline">Versand berechnen</span>
                        <span className="sm:hidden">Versand</span>
                      </span>
                    </button>
                    
                    {/* Animated Cart Counter Badge */}
                    {cartItemCount > 0 && (
                      <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 lg:-top-3 lg:-right-3 bg-red-500 text-white text-xs sm:text-sm font-bold rounded-full h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 flex items-center justify-center animate-bounce shadow-xl border-2 lg:border-3 border-white z-30 min-w-[20px] sm:min-w-[24px] lg:min-w-[32px]">
                        {cartItemCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Size Controls - Responsive */}
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Width Control */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Breite</label>
                    <div className="flex items-center space-x-2 mb-1">
                      <input
                        type="number"
                        min="30"
                        max={effectiveMaxWidth}
                        value={config.customWidth}
                        onChange={(e) => handleWidthChange(Number(e.target.value))}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-center font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      {isResizing && (
                        <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs px-1 py-0.5 rounded animate-pulse">
                          ⚡
                        </div>
                      )}
                      <span className="text-gray-600 font-medium text-sm">cm</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max={config.isTwoPart ? 1000 : 300}
                      value={config.customWidth}
                      onChange={(e) => handleConfigChange({ customWidth: Number(e.target.value) })}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>30cm</span>
                      <span>{config.isTwoPart ? '10m' : '3m'}</span>
                    </div>
                    
                    {/* Multi-part Option - Only visible at 300cm */}
                    {config.customWidth >= 300 && (
                      <div className="mt-3 animate-fade-in">
                        <label className="flex items-center space-x-2 cursor-pointer p-2 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={config.isTwoPart || false}
                            onChange={(e) => handleConfigChange({ isTwoPart: e.target.checked })}
                            className="w-4 h-4 text-orange-600 focus:ring-orange-500 rounded"
                          />
                          <Scissors className="h-4 w-4 text-orange-600" />
                          <div className="flex items-center space-x-1 flex-1">
                            <span className="text-sm font-medium text-orange-800">Mehrteilig (+15%)</span>
                            <div className="relative group">
                              <Info className="h-4 w-4 text-orange-500 hover:text-orange-700 cursor-help transition-colors" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                Das Schild wird aus mehreren Teilen gefertigt und muss vor Ort zusammengesetzt werden
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-orange-600">Erforderlich ab 300cm</div>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Height Display */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Höhe</label>
                    <div className="bg-gray-100 px-2 py-2 rounded-lg text-center mb-1">
                      <span className="text-lg font-bold text-gray-800">{config.calculatedHeight} cm</span>
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      Automatisch berechnet
                    </div>
                    <div className="text-xs text-gray-500 text-center mt-1">
                      Max: 200cm
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Options Grid - Responsive */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 overflow-visible"
                   style={{ position: 'relative', zIndex: 1 }}>
                {/* Waterproof */}
                <div className="relative group">
                  <button
                    onClick={() => handleConfigChange({ isWaterproof: !config.isWaterproof })}
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-md border-2 transition-all duration-300 hover:scale-105 w-full ${
                      config.isWaterproof
                        ? 'bg-blue-500 border-blue-500 text-white shadow-lg'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 mb-1" />
                    <div className="flex items-center space-x-1">
                      <span className="text-xs sm:text-sm font-medium leading-tight text-center">Wasserdicht</span>
                      <Info className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 hover:text-blue-600 cursor-help transition-colors" />
                    </div>
                    <span className="text-xs opacity-75 leading-tight">+25%</span>
                  </button>
                  {/* Tooltip */}
                  <div className="absolute -top-12 sm:-top-10 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-[9999] border border-gray-700">
                    Für Außenbereich geeignet • UV-Schutz & Wasserschutz (IP65)
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
                
                {/* UV Print */}
                <button
                  onClick={() => handleConfigChange({ hasUvPrint: !config.hasUvPrint })}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-md border-2 transition-all duration-300 hover:scale-105 relative ${
                    config.hasUvPrint
                      ? 'bg-purple-500 border-purple-500 text-white shadow-lg'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <Palette className="h-4 w-4 sm:h-5 sm:w-5 mb-1" />
                  <div className="flex items-center space-x-1">
                    <span className="text-xs sm:text-sm font-medium leading-tight text-center">UV-Druck</span>
                    <div className="relative group">
                      <Info className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 hover:text-purple-600 cursor-help transition-colors" />
                      <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20 min-w-max">
                        Hochwertige UV-Farben im Hintergrund
                        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs opacity-75 leading-tight">Empfohlen</span>
                </button>
                
                {/* Hanging System */}
                <button
                  onClick={() => handleConfigChange({ hasHangingSystem: !(config.hasHangingSystem || false) })}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-md border-2 transition-all duration-300 hover:scale-105 ${
                    config.hasHangingSystem || false
                      ? 'bg-green-500 border-green-500 text-white shadow-lg'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <div className="text-green-600 text-base sm:text-lg mb-1">🔗</div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs sm:text-sm font-medium leading-tight text-center">Hängesystem</span>
                    <div className="relative group">
                      <Info className="h-3 w-3 sm:h-4 sm:w-4 text-green-400 hover:text-green-600 cursor-help transition-colors" />
                      <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20 min-w-max">
                        Spezielle Aufhängevorrichtung für die Montage an Stahlseilen. Ohne diese Option erhalten Sie Standard-Wandhalterungen.
                        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs opacity-75 leading-tight">Optional</span>
                </button>
                
                {/* Express Production */}
                <button
                  onClick={() => handleConfigChange({ expressProduction: !(config.expressProduction || false) })}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-md border-2 transition-all duration-300 hover:scale-105 ${
                    config.expressProduction || false
                      ? 'bg-orange-500 border-orange-500 text-white shadow-lg'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50'
                  }`}
                >
                  <div className="text-orange-600 text-base sm:text-lg mb-1">⚡</div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs sm:text-sm font-medium leading-tight text-center">Express</span>
                    <div className="relative group">
                      <Info className="h-3 w-3 sm:h-4 sm:w-4 text-orange-400 hover:text-orange-600 cursor-help transition-colors" />
                      <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20 min-w-max">
                        5 Tage anstatt 2-3 Wochen Produktionszeit
                        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs opacity-75 leading-tight">+30%</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cart View */}
        {currentStep === 'cart' && (
          <div className="pt-20 lg:pt-0">
            <CartCheckout
              config={config}
              onConfigChange={handleConfigChange}
              onShippingChange={handleShippingChange}
              onSignToggle={handleSignToggle}
              onRemoveSign={handleRemoveSign}
              onBackToDesign={() => setCurrentStep('design')}
            />
          </div>
        )}
      </main>

      {/* Mobile Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">
              {cartItemCount} Artikel • €{currentDesignPrice.toFixed(2)}
            </div>
            <div className="text-lg font-bold text-green-600">
              Gesamt: €{(currentDesignPrice * 1.19).toFixed(2)}
            </div>
          </div>
          <button
            onClick={handleGoToCart}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Warenkorb
          </button>
        </div>
      </div>

      <div className="mt-8 mb-4">
        <MondayStatus />
      </div>
      
      <footer className="text-gray-500 py-4 px-4 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
              <span className="font-medium text-gray-700">© 2025, Nontel Alle Rechte vorbehalten</span>
              <a href="/widerrufsrecht" className="hover:text-blue-600 transition-colors font-medium">
                Widerrufsrecht
              </a>
              <span className="text-gray-300">•</span>
              <a href="/datenschutz" className="hover:text-blue-600 transition-colors font-medium">
                Datenschutzerklärung
              </a>
              <span className="text-gray-300">•</span>
              <a href="/agb" className="hover:text-blue-600 transition-colors font-medium">
                AGB
              </a>
              <span className="text-gray-300">•</span>
              <a href="/zahlung-versand" className="hover:text-blue-600 transition-colors font-medium">
                Zahlung und Versand
              </a>
              <span className="text-gray-300">•</span>
              <a href="/impressum" className="hover:text-blue-600 transition-colors font-medium">
                Impressum
              </a>
            </div>
          </div>
        </div>
      </footer>
      </>
      )}

    </div>
  );
}

export default App;