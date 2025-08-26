import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Temporary component to test Supabase connection
const SupabaseConnectionTest: React.FC = () => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const testConnection = async () => {
      try {
        // These should be in your .env.local file
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          setStatus('error');
          setMessage('❌ Supabase URL or Key not found in environment variables');
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Test simple query
        const { data, error } = await supabase
          .from('pricing_cache')
          .select('*')
          .limit(1);

        if (error) {
          setStatus('error');
          setMessage(`❌ Database error: ${error.message}`);
        } else {
          setStatus('connected');
          setMessage(`✅ Successfully connected to Supabase! Found ${data?.length || 0} pricing records.`);
        }
      } catch (err) {
        setStatus('error');
        setMessage(`❌ Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">🔌 Supabase Connection Test</h2>
      
      <div className="space-y-4">
        <div className={`p-4 rounded-lg ${
          status === 'connecting' ? 'bg-yellow-50 border border-yellow-200' :
          status === 'connected' ? 'bg-green-50 border border-green-200' :
          'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {status === 'connecting' && <span className="animate-spin">⏳</span>}
            {status === 'connected' && <span>✅</span>}
            {status === 'error' && <span>❌</span>}
            <span className="font-medium">
              {status === 'connecting' && 'Connecting to Supabase...'}
              {status === 'connected' && 'Connected Successfully!'}
              {status === 'error' && 'Connection Failed'}
            </span>
          </div>
          <p className="mt-2 text-sm">{message}</p>
        </div>

        <div className="text-sm text-gray-600">
          <h3 className="font-medium mb-2">🔧 Setup Requirements:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Create Supabase project at <a href="https://supabase.com" className="text-blue-600 underline">supabase.com</a></li>
            <li>Update <code className="bg-gray-100 px-1 rounded">.env.local</code> with your Supabase URL and keys</li>
            <li>Run database migrations to create pricing_cache table</li>
            <li>Deploy the daily-price-sync Edge Function</li>
          </ol>
        </div>

        <div className="text-sm text-gray-500">
          <strong>Environment Variables Expected:</strong>
          <ul className="list-disc list-inside mt-1">
            <li><code>VITE_SUPABASE_URL</code></li>
            <li><code>VITE_SUPABASE_ANON_KEY</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SupabaseConnectionTest;
