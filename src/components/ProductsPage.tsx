import React, { useState, useEffect } from 'react';
import { STRIPE_PRODUCTS, StripeProduct } from '../stripe-config';
import { ShoppingCart, CreditCard, Package, User, LogOut } from 'lucide-react';

const ProductsPage: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const navigate = useNavigate();

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
    if (!supabase) return;
    
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch subscription data
        const { data: subscriptionData } = await supabase
          .from('stripe_user_subscriptions')
          .select('*')
          .maybeSingle();
        
        setSubscription(subscriptionData);
      }
    };

    getCurrentUser();

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (!session?.user) {
        setSubscription(null);
      }
    });

    return () => authSubscription.unsubscribe();
  }, [supabase]);

  const handlePurchase = async (product: StripeProduct) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(product.id);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      if (supabaseUrl && supabaseUrl !== '') {
        // Full Supabase + Stripe integration
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/login');
          return;
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            price_id: product.priceId,
            success_url: `${window.location.origin}/success`,
            cancel_url: `${window.location.origin}/products`,
            mode: product.mode,
          }),
        });

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        window.location.href = data.url;
      } else {
        // Demo mode for static deployment
        const confirmed = confirm(
          `🛒 DEMO PURCHASE\n\n` +
          `Produkt: ${product.name}\n` +
          `Beschreibung: ${product.description}\n` +
          `Preis: €1.00\n` +
          `Typ: ${product.mode === 'subscription' ? 'Abonnement' : 'Einmalzahlung'}\n\n` +
          `Dies ist eine Demo. Möchten Sie zur Erfolgsseite weitergeleitet werden?`
        );
        
        if (confirmed) {
          navigate('/success?demo=true');
        }
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      alert(`Kauf-Fehler: ${error.message || 'Bitte versuchen Sie es erneut.'}`);
    } finally {
      setLoading(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getSubscriptionPlanName = (priceId: string | null) => {
    if (!priceId) return null;
    const product = STRIPE_PRODUCTS.find(p => p.priceId === priceId);
    return product?.name || 'Unknown Plan';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2">
                <Package className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Products</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                  {subscription && subscription.subscription_status === 'active' && (
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      {getSubscriptionPlanName(subscription.price_id)}
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              )}
              {!user && (
                <button
                  onClick={() => navigate('/login')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Choose Your Plan</h2>
          <p className="text-xl text-gray-600">Select the perfect product for your needs</p>
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {STRIPE_PRODUCTS.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl shadow-xl p-8 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full transform translate-x-16 -translate-y-16"></div>
              
              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-3">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">{product.name}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      product.mode === 'subscription' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {product.mode === 'subscription' ? 'Subscription' : 'One-time'}
                    </span>
                  </div>
                </div>

                <p className="text-gray-600 mb-6 leading-relaxed">
                  {product.description}
                </p>

                <div className="mb-8">
                  <div className="text-3xl font-bold text-gray-800 mb-2">
                    €1.00
                    {product.mode === 'subscription' && (
                      <span className="text-lg font-normal text-gray-600">/month</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handlePurchase(product)}
                  disabled={loading === product.id}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                >
                  {loading === product.id ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      <span>
                        {product.mode === 'subscription' ? 'Subscribe Now' : 'Buy Now'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Auth prompt for non-logged in users */}
        {!user && (
          <div className="mt-12 text-center">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
              <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-full p-3 w-16 h-16 mx-auto mb-4">
                <User className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Ready to get started?</h3>
              <p className="text-gray-600 mb-6">Create an account or sign in to purchase products</p>
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate('/signup')}
                  className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold py-3 rounded-lg hover:from-green-700 hover:to-blue-700 transition duration-300"
                >
                  Sign Up
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="flex-1 bg-gray-600 text-white font-semibold py-3 rounded-lg hover:bg-gray-700 transition duration-300"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProductsPage;