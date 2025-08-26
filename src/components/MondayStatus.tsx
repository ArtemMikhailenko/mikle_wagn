import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Clock, Database, Server, Wifi, WifiOff } from 'lucide-react';
import mondayService from '../services/mondayService';

const MondayStatus: React.FC = () => {
  const [status, setStatus] = useState(mondayService.getStatus());
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    // Initial sync
    const initSync = async () => {
      try {
        console.log('🚀 Initialer Monday.com Sync gestartet...');
        await mondayService.fetchPrices();
        setStatus(mondayService.getStatus());
        console.log('✅ Monday.com Preise synchronisiert');
      } catch (error) {
        console.error('❌ Monday.com Sync Fehler:', error);
        setStatus(mondayService.getStatus());
      }
    };

    initSync();

    // Start auto-sync every 30 seconds
    mondayService.startAutoSync(30);
    
    // Update status every 5 seconds
    const statusInterval = setInterval(() => {
      setStatus(mondayService.getStatus());
    }, 5000);

    return () => {
      clearInterval(statusInterval);
      mondayService.stopAutoSync();
    };
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      console.log('🔄 Manueller Sync gestartet...');
      await mondayService.fetchPrices();
      setStatus(mondayService.getStatus());
      console.log('✅ Manueller Sync erfolgreich');
    } catch (error) {
      console.error('❌ Manueller Sync Fehler:', error);
      setStatus(mondayService.getStatus());
    } finally {
      setIsManualSyncing(false);
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Nie';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `vor ${diff}s`;
    if (diff < 3600) return `vor ${Math.floor(diff / 60)}min`;
    return date.toLocaleTimeString('de-DE');
  };

  return (
    <div className="flex items-center justify-center space-x-1 text-xs text-gray-400 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm border border-gray-200/50 max-w-fit mx-auto cursor-pointer hover:bg-white/90 transition-colors group"
         onClick={handleManualSync}
         title={`Klicken für manuellen Sync${status.lastError ? ` | Letzter Fehler: ${status.lastError}` : ''}`}>
      <Server className="h-3 w-3" />
      <div className={`w-2 h-2 rounded-full ${
        isManualSyncing ? 'bg-yellow-500 animate-pulse' : 
        status.isConnected ? 'bg-green-500' : 'bg-red-500'
      }`}></div>
      <span>
        {isManualSyncing 
          ? 'Synchronisiere...'
          : status.isConnected 
          ? `Preisstand-Sync erfolgreich ✓`
          : `Preisstand-Sync fehlgeschlagen ✗`
        }
      </span>
      {!status.isConnected && status.lastError && (
        <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50">
          {status.lastError}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-800"></div>
        </div>
      )}
      {status.autoSyncActive && (
        <span className="text-green-500">●</span>
      )}
      {isManualSyncing && (
        <RefreshCw className="h-3 w-3 animate-spin text-yellow-500" />
      )}
    </div>
  );
};

export default MondayStatus;