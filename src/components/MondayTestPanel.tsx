import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Database, Clock } from 'lucide-react';
import { optimizedMondayService, MondayPriceItem } from '../services/optimizedMondayService';
import LottieLoader from './LottieLoader';

export default function MondayTestPanel() {
  const [status, setStatus] = useState<any>(null);
  const [prices, setPrices] = useState<Map<string, MondayPriceItem>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    testConnection();
  }, []);

  const loadStatus = () => {
    const connectionStatus = optimizedMondayService.getConnectionStatus();
    setStatus(connectionStatus);
  };

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await optimizedMondayService.testConnection();
      if (success) {
        const priceData = await optimizedMondayService.getAllPrices();
        setPrices(priceData);
        loadStatus();
      } else {
        setError('Verbindung zu Monday.com fehlgeschlagen');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const priceData = await optimizedMondayService.forceRefresh();
      setPrices(priceData);
      loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Nie';
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Monday.com API Test</h1>
          <p className="text-gray-400">Testen Sie die Verbindung zu Monday.com und laden Sie Preisdaten</p>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              {status?.isConnected ? (
                <Wifi className="w-5 h-5 text-green-400" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-400" />
              )}
              <span className="font-medium">Verbindung</span>
            </div>
            <div className={`text-sm ${status?.isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {status?.isConnected ? 'Verbunden' : 'Getrennt'}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-blue-400" />
              <span className="font-medium">Board ID</span>
            </div>
            <div className="text-sm text-gray-300">{status?.boardId || 'Nicht gesetzt'}</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <span className="font-medium">Letzter Abruf</span>
            </div>
            <div className="text-sm text-gray-300">{formatDate(status?.lastFetch)}</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-purple-400" />
              <span className="font-medium">Cache</span>
            </div>
            <div className="text-sm text-gray-300">{status?.cacheSize || 0} Einträge</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={testConnection}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
          >
            <Wifi className="w-4 h-4" />
            {loading ? 'Teste...' : 'Verbindung testen'}
          </button>

          <button
            onClick={refreshData}
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? <LottieLoader size={16} label="" /> : <RefreshCw className="w-4 h-4" />}
            Daten aktualisieren
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-8">
            <h3 className="font-medium text-red-300 mb-2">Fehler</h3>
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Price Data Table */}
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold">Preisdaten aus Monday.com</h2>
            <p className="text-gray-400 text-sm mt-1">
              {prices.size} Einträge geladen • {status?.isConnected ? 'Live-Daten' : 'Mock-Daten'}
            </p>
          </div>

          {prices.size > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">ID</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Wert</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Monday Item ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {Array.from(prices.entries()).map(([key, item]) => (
                    <tr key={key} className="hover:bg-gray-750">
                      <td className="px-6 py-3 text-sm font-mono text-blue-300">{item.id}</td>
                      <td className="px-6 py-3 text-sm">{item.name}</td>
                      <td className="px-6 py-3 text-sm font-medium">
                        €{item.value.toFixed(2)}
                        {item.unit && <span className="text-gray-400 ml-1">/{item.unit}</span>}
                      </td>
                      <td className="px-6 py-3 text-sm font-mono text-gray-400">{item.itemId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Keine Preisdaten verfügbar</p>
              <p className="text-sm mt-2">Klicken Sie auf "Verbindung testen" um Daten zu laden</p>
            </div>
          )}
        </div>

        {/* API Info */}
        <div className="mt-8 bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">API Konfiguration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">API Token:</span>
              <span className="ml-2 font-mono">
                {status?.hasToken ? '✅ Konfiguriert' : '❌ Fehlt'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Board ID:</span>
              <span className="ml-2 font-mono">{status?.boardId || 'Nicht gesetzt'}</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-700 rounded text-xs font-mono">
            <div className="text-gray-400 mb-1">Umgebungsvariablen:</div>
            <div>VITE_MONDAY_API_TOKEN={status?.hasToken ? '[GESETZT]' : '[FEHLT]'}</div>
            <div>VITE_MONDAY_BOARD_ID={status?.boardId || '[FEHLT]'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
