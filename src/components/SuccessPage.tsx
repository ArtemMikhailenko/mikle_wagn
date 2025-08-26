import React, { useEffect, useState } from 'react';
import { CheckCircle, Package, ArrowRight, Home } from 'lucide-react';

const SuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [isDemo, setIsDemo] = useState(false);

  // Import supabase conditionally
  const [supabase, setSupabase] = useState<any>(null);
  
  useEffect(() => {
    const loadSupabase = async () => {
      try {
        const supabaseModule = await import('../lib/supabase');
        setSupabase(supabaseModule.supabase);
      } catch (error) {
        console.warn('Supabase not available, running in demo mode');
      }
    };
    loadSupabase();
  }, []);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const demoMode = searchParams.get('demo');
    
    setIsDemo(demoMode === 'true');
    
    if (sessionId) {
      // Fetch order details if needed
      fetchOrderDetails(sessionId);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchOrderDetails = async (sessionId: string) => {
    try {
      // You could fetch order details from your database here
      // For now, we'll just set loading to false
      setLoading(false);
    } catch (error) {
      console.error('Error fetching order details:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Success Icon */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-full p-4 w-20 h-20 mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            {isDemo ? 'Demo Bestellung Erfolgreich!' : 'Zahlung Erfolgreich!'}
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            {isDemo 
              ? 'Dies war eine Demo-Bestellung. In der echten Version würden Sie jetzt eine Bestätigungs-E-Mail erhalten.'
              : 'Vielen Dank für Ihren Kauf. Ihre Zahlung wurde erfolgreich verarbeitet und Sie erhalten in Kürze eine Bestätigungs-E-Mail.'
            }
          </p>

          {/* Order Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Package className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-800">
                {isDemo ? 'Demo Bestätigung' : 'Bestellbestätigung'}
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              {isDemo 
                ? 'In der echten Version würde Ihre Bestellung jetzt bearbeitet werden.'
                : 'Ihre Bestellung wird bearbeitet und Sie erhalten Updates per E-Mail.'
              }
            </p>
            {isDemo && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                  🎯 Demo-Modus: Verbinden Sie Supabase für echte Zahlungen
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <Edit3 className="h-5 w-5" />
              <span>Neues Design konfigurieren</span>
            </button>
            
            <button
              onClick={() => navigate('/products')}
              className="w-full bg-gray-600 text-white font-semibold py-3 rounded-lg hover:bg-gray-700 transition duration-300 flex items-center justify-center space-x-2"
            >
              <Package className="h-5 w-5" />
              <span>Produkte ansehen</span>
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Bei Fragen zu Ihrer Bestellung kontaktieren Sie bitte unser Support-Team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;