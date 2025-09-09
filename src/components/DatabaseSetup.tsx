import React, { useState } from 'react';
import { Database, Play, CheckCircle, AlertCircle, Copy } from 'lucide-react';

const DatabaseSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ query: string; success: boolean; message: string }>>([]);

  const sqlQueries = [
    {
      name: 'Создание таблицы discounts',
      sql: `
CREATE TABLE IF NOT EXISTS discounts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_value DECIMAL(10,2) DEFAULT NULL,
  max_discount_amount DECIMAL(10,2) DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  usage_limit INTEGER DEFAULT NULL,
  usage_count INTEGER DEFAULT 0,
  code VARCHAR(50) DEFAULT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
    },
    {
      name: 'Создание индексов',
      sql: `
CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts(code);
CREATE INDEX IF NOT EXISTS idx_discounts_dates ON discounts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_discounts_created_at ON discounts(created_at);`
    },
    {
      name: 'Настройка Row Level Security',
      sql: `
-- Включить RLS для таблицы discounts
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;

-- Удалить существующие политики если есть
DROP POLICY IF EXISTS "Public can view active discounts" ON discounts;
DROP POLICY IF EXISTS "Admin full access" ON discounts;
DROP POLICY IF EXISTS "Enable read access for all users" ON discounts;
DROP POLICY IF EXISTS "Enable insert for all users" ON discounts;
DROP POLICY IF EXISTS "Enable update for all users" ON discounts;
DROP POLICY IF EXISTS "Enable delete for all users" ON discounts;

-- Создать новые политики для полного доступа (для разработки)
CREATE POLICY "Enable all access for all users" ON discounts
  FOR ALL 
  USING (true)
  WITH CHECK (true);`
    },
    {
      name: 'Добавление тестовых данных',
      sql: `
INSERT INTO discounts (name, description, discount_type, discount_value, min_order_value, is_active, code) 
VALUES
  ('Скидка новому клиенту', 'Скидка 10% для новых клиентов', 'percentage', 10.00, 100.00, true, 'WELCOME10'),
  ('Летняя распродажа', 'Скидка 15% на все товары летом', 'percentage', 15.00, 200.00, true, 'SUMMER15'),
  ('Скидка на большой заказ', 'Фиксированная скидка 50€ при заказе от 500€', 'fixed_amount', 50.00, 500.00, true, 'BIG50'),
  ('Зимняя акция', 'Скидка 20% на зимний период', 'percentage', 20.00, 150.00, false, 'WINTER20')
ON CONFLICT (code) DO NOTHING;`
    }
  ];

  const runSetup = async () => {
    setLoading(true);
    setResults([]);
    
    for (const query of sqlQueries) {
      try {
        console.log(`Выполняю: ${query.name}`);
        
        // For Supabase, we'll try using the REST API
        // This is a simplified approach - in real setup you'd use Supabase SQL editor
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql: query.sql })
        });

        if (response.ok) {
          setResults(prev => [...prev, { 
            query: query.name, 
            success: true, 
            message: 'Выполнено успешно' 
          }]);
        } else {
          setResults(prev => [...prev, { 
            query: query.name, 
            success: false, 
            message: `Ошибка: ${response.status} ${response.statusText}` 
          }]);
        }
      } catch (error) {
        setResults(prev => [...prev, { 
          query: query.name, 
          success: false, 
          message: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` 
        }]);
      }
      
      // Small delay between queries
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setLoading(false);
  };

  const copyToClipboard = (sql: string) => {
    navigator.clipboard.writeText(sql);
  };

  const copyAllSQL = () => {
    const allSQL = sqlQueries.map(q => `-- ${q.name}\n${q.sql}`).join('\n\n');
    navigator.clipboard.writeText(allSQL);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Database className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Настройка базы данных</h1>
            <p className="text-gray-600">Создание таблиц и настройка для системы скидок</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Инструкции по настройке:</h3>
          <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
            <li>Откройте Supabase Dashboard → SQL Editor</li>
            <li>Скопируйте и выполните SQL запросы ниже</li>
            <li>Или попробуйте автоматическую настройку (может не работать из-за ограничений прав доступа)</li>
          </ol>
        </div>

        {/* Auto setup */}
        <div className="mb-6 flex items-center space-x-3">
          <button
            onClick={runSetup}
            disabled={loading}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            <span>{loading ? 'Настройка...' : 'Автоматическая настройка'}</span>
          </button>
          
          <button
            onClick={copyAllSQL}
            className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Copy className="h-4 w-4" />
            <span>Скопировать все SQL</span>
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mb-6 space-y-2">
            <h3 className="font-semibold text-gray-900">Результаты выполнения:</h3>
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg flex items-center space-x-2 ${
                  result.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.query}: {result.message}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* SQL Queries */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">SQL запросы для ручного выполнения:</h3>
          {sqlQueries.map((query, index) => (
            <div key={index} className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{query.name}</h4>
                <button
                  onClick={() => copyToClipboard(query.sql)}
                  className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                  title="Скопировать SQL"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <pre className="p-4 bg-gray-900 text-green-400 text-sm overflow-x-auto">
                <code>{query.sql.trim()}</code>
              </pre>
            </div>
          ))}
        </div>

        {/* Testing */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">После настройки:</h3>
          <p className="text-yellow-800 text-sm">
            1. Перейдите на <code>/admin/discounts</code> для проверки работы<br/>
            2. Создайте первые скидки<br/>
            3. Протестируйте применение промокодов
          </p>
        </div>
      </div>
    </div>
  );
};

export default DatabaseSetup;
