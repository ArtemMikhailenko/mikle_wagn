import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, Clock, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { finalPricingService } from '../services/finalPricingService';

const PricingAdminPanel: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [prices, setPrices] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    loadStatus();
    loadPrices();
  }, []);

  const loadStatus = () => {
    const serviceStatus = finalPricingService.getStatus();
    setStatus(serviceStatus);
  };

  const loadPrices = async () => {
    try {
      const allPrices = await finalPricingService.getAllPrices();
      setPrices(allPrices);
    } catch (error) {
      console.error('Error loading prices:', error);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      await finalPricingService.forceRefresh();
      await loadPrices();
      loadStatus();
      setMessage('✅ Prices refreshed successfully!');
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Pricing Administration
            </h1>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Prices'}</span>
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Database</span>
            </div>
            <div className="mt-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                status?.isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {status?.isConnected ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Disconnected
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Cache Status</span>
            </div>
            <div className="mt-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                status?.cacheValid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {status?.cacheValid ? 'Valid' : 'Expired'}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Items Count</span>
            </div>
            <div className="mt-2">
              <span className="text-lg font-bold text-gray-900">
                {status?.cacheSize || 0}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Last Update</span>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-700">
                {status?.lastFetch ? 
                  new Date(status.lastFetch).toLocaleString('de-DE') : 
                  'Never'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Current Prices Table */}
        <div className="bg-white rounded-lg border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Current Prices</h3>
            <p className="text-sm text-gray-600">
              These prices are loaded from Supabase database cache
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.from(prices.entries()).map(([key, price]) => (
                  <tr key={key}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {price.price_key}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {price.price_value.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {price.unit || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(price.last_updated).toLocaleString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Architecture Info */}
        <div className="bg-blue-50 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            🎯 Optimal Architecture
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">📦 Client Side (This App):</h4>
              <ul className="space-y-1 ml-4">
                <li>• Loads prices from Supabase database</li>
                <li>• 30-minute local cache</li>
                <li>• No Monday.com API calls from users</li>
                <li>• Fast response times</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">⚡ Server Side (Supabase):</h4>
              <ul className="space-y-1 ml-4">
                <li>• Daily automated sync from Monday.com</li>
                <li>• Edge Function handles API limits</li>
                <li>• Database caching for all users</li>
                <li>• Manual sync option available</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingAdminPanel;
