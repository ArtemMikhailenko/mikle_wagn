import React, { useState, useEffect } from 'react';
import LottieLoader from './LottieLoader';
import { Percent, Plus, Edit3, Trash2, Save, X, Timer, Clock, Play, Pause } from 'lucide-react';
import { discountService, FakeDiscountConfiguration } from '../services/discountService';

interface Discount {
  id?: number;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_order_value?: number;
  max_discount_amount?: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  usage_limit?: number;
  usage_count: number;
  code?: string;
  created_at?: string;
  updated_at?: string;
}

const DiscountAdminPanel: React.FC = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string>('');
  
  // Состояние для фиктивных скидок
  const [fakeDiscount, setFakeDiscount] = useState<FakeDiscountConfiguration | null>(null);
  const [fakeDiscountForm, setFakeDiscountForm] = useState({
    name: 'Распродажа дня!',
    percentage: 25,
    duration: 60, // минуты
    isActive: false
  });

  const emptyDiscount: Discount = {
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_order_value: 0,
    max_discount_amount: undefined,
    start_date: '',
    end_date: '',
    is_active: true,
    usage_limit: undefined,
    usage_count: 0,
    code: ''
  };

  useEffect(() => {
    loadDiscounts();
    loadFakeDiscount();
  }, []);

  const loadFakeDiscount = async () => {
    try {
      const nowIso = new Date().toISOString();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/fake_discounts?select=*&is_active=eq.true&start_date=lte.${nowIso}&end_date=gte.${nowIso}&order=start_date.desc&order=created_at.desc&limit=1`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.length > 0) {
          const discount = data[0];
          const fakeDiscount = {
            id: discount.id.toString(),
            name: discount.name,
            percentage: discount.percentage,
            startDate: new Date(discount.start_date),
            endDate: new Date(discount.end_date),
            isActive: discount.is_active,
          };
          setFakeDiscount(fakeDiscount);
          
          const now = new Date();
          const isActive = now >= fakeDiscount.startDate && now <= fakeDiscount.endDate && fakeDiscount.isActive;
          
          setFakeDiscountForm({
            name: fakeDiscount.name,
            percentage: fakeDiscount.percentage,
            duration: Math.max(1, Math.ceil((fakeDiscount.endDate.getTime() - now.getTime()) / (1000 * 60))),
            isActive: isActive
          });
        } else {
          setFakeDiscount(null);
          setFakeDiscountForm({
            name: 'Limitiertes Angebot',
            percentage: 25,
            duration: 60,
            isActive: false
          });
        }
      }
    } catch (error) {
      console.error('Error loading fake discount:', error);
    }
  };

  const startFakeDiscount = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const endDate = new Date();
      endDate.setMinutes(endDate.getMinutes() + fakeDiscountForm.duration);

      // Сначала деактивируем все существующие фиктивные скидки
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/fake_discounts`,
        {
          method: 'PATCH',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            is_active: false
          })
        }
      );

      // Создаем новую активную фиктивную скидку
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/fake_discounts`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: fakeDiscountForm.name,
            percentage: fakeDiscountForm.percentage,
            start_date: now.toISOString(),
            end_date: endDate.toISOString(),
            is_active: true
          })
        }
      );

      if (response.ok) {
        // Обновляем локальное состояние и сервис скидок
        await loadFakeDiscount();
        await discountService.refreshFakeDiscount(true);
        setMessage('✅ Фиктивная скидка запущена!');
      } else {
        throw new Error('Failed to create fake discount');
      }
    } catch (error) {
      console.error('Error starting fake discount:', error);
      setMessage('❌ Ошибка запуска фиктивной скидки');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const stopFakeDiscount = async () => {
    if (!fakeDiscount) return;
    
    setLoading(true);
    try {
      // Обновляем запись в базе данных
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/fake_discounts?id=eq.${fakeDiscount.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            is_active: false,
            end_date: new Date().toISOString()
          })
        }
      );

  await loadFakeDiscount();
  await discountService.refreshFakeDiscount(true);
      setMessage('⏹️ Фиктивная скидка остановлена!');
    } catch (error) {
      console.error('Error stopping fake discount:', error);
      setMessage('❌ Ошибка остановки фиктивной скидки');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const createFakeDiscountsTableIfNotExists = async () => {
    setLoading(true);
    setMessage('🔧 Проверяем существование таблицы фиктивных скидок...');
    
    try {
      // Пробуем создать простую запись, чтобы проверить существует ли таблица
      const testResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/fake_discounts?select=id&limit=1`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          }
        }
      );

      if (testResponse.ok) {
        setMessage('✅ Таблица фиктивных скидок уже существует!');
        
        // Если таблица существует, но пустая, создаем дефолтную скидку
        const data = await testResponse.json();
        if (data.length === 0) {
          await createDefaultFakeDiscount();
        }
        loadFakeDiscount();
      } else if (testResponse.status === 404) {
        // Таблица не существует, показываем инструкции
        setMessage(`
❌ Таблица fake_discounts не найдена. 

📋 Для создания таблицы выполните следующие шаги:

1. Перейдите в Supabase Dashboard → SQL Editor
2. Скопируйте и выполните SQL из файла: create_fake_discounts_table.sql
3. Или скопируйте этот код:

CREATE TABLE fake_discounts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT 'Limitiertes Angebot',
  percentage INTEGER NOT NULL CHECK (percentage > 0 AND percentage <= 50) DEFAULT 25,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fake_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON fake_discounts FOR SELECT USING (true);
CREATE POLICY "Allow public write access" ON fake_discounts FOR ALL USING (true);

INSERT INTO fake_discounts (name, percentage, start_date, end_date, is_active)
VALUES ('Flash Sale - Nur heute!', 25, NOW(), NOW() + INTERVAL '2 hours', true);

4. После создания таблицы нажмите эту кнопку снова
        `);
        console.log('SQL файл находится в корне проекта: create_fake_discounts_table.sql');
      } else {
        throw new Error(`HTTP error! status: ${testResponse.status}`);
      }
    } catch (error) {
      console.error('Error checking fake discounts table:', error);
      setMessage(`❌ Ошибка подключения к базе данных. 
      
Проверьте:
1. Настройки VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env файле
2. Подключение к интернету
3. Статус проекта Supabase`);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 15000); // Показываем дольше для инструкций
    }
  };

  const createDefaultFakeDiscount = async () => {
    const now = new Date();
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 часа
    
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/fake_discounts`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'Flash Sale - Nur heute!',
            percentage: 25,
            start_date: now.toISOString(),
            end_date: endTime.toISOString(),
            is_active: true
          })
        }
      );
      
      setMessage('✅ Дефолтная фиктивная скидка создана!');
      loadFakeDiscount();
    } catch (error) {
      console.error('Error creating default fake discount:', error);
    }
  };

  const loadDiscounts = async () => {
    setLoading(true);
    try {
      // First try to create table if it doesn't exist
      await createTableIfNotExists();
      
      // Use direct REST API call to avoid type issues
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/discounts?select=*&order=created_at.desc`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDiscounts(data || []);
    } catch (error) {
      console.error('Error loading discounts:', error);
      setMessage('❌ Ошибка загрузки скидок. Возможно, таблица еще не создана.');
    } finally {
      setLoading(false);
    }
  };

  const createTableIfNotExists = async () => {
    try {
      // Try to create table using SQL
      const sql = `
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
        );
        
        -- Enable RLS
        ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for public access to active discounts
        CREATE POLICY IF NOT EXISTS "Public can view active discounts" ON discounts
          FOR SELECT USING (is_active = true);
      `;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql })
      });

      // It's ok if this fails - table might already exist or we might not have permissions
      if (response.ok) {
        console.log('✅ Table created successfully');
      }
    } catch (error) {
      // Ignore table creation errors - table might already exist
      console.log('Table creation skipped:', error);
    }
  };

  const saveDiscount = async (discount: Discount) => {
    setLoading(true);
    try {
      const payload = {
        ...discount,
        updated_at: new Date().toISOString()
      };

      if (discount.id) {
        // Update existing
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/discounts?id=eq.${discount.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        setMessage('✅ Скидка обновлена');
      } else {
        // Create new
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/discounts`, {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...payload,
            created_at: new Date().toISOString()
          })
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        setMessage('✅ Скидка создана');
      }
      
      await loadDiscounts();
      setShowForm(false);
      setEditingDiscount(null);
    } catch (error) {
      console.error('Error saving discount:', error);
      setMessage('❌ Ошибка сохранения скидки');
    } finally {
      setLoading(false);
    }
  };

  const deleteDiscount = async (id: number) => {
    if (!confirm('Удалить эту скидку?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/discounts?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setMessage('✅ Скидка удалена');
      await loadDiscounts();
    } catch (error) {
      console.error('Error deleting discount:', error);
      setMessage('❌ Ошибка удаления скидки');
    } finally {
      setLoading(false);
    }
  };

  const toggleDiscountStatus = async (discount: Discount) => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/discounts?id=eq.${discount.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_active: !discount.is_active,
          updated_at: new Date().toISOString()
        })
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setMessage(`✅ Скидка ${!discount.is_active ? 'активирована' : 'деактивирована'}`);
      await loadDiscounts();
    } catch (error) {
      console.error('Error toggling discount:', error);
      setMessage('❌ Ошибка изменения статуса');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (discount: Discount) => {
    setEditingDiscount({ ...discount });
    setShowForm(true);
  };

  const startCreate = () => {
    setEditingDiscount({ ...emptyDiscount });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingDiscount(null);
    setShowForm(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Не указано';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const isDiscountExpired = (discount: Discount) => {
    if (!discount.end_date) return false;
    return new Date(discount.end_date) < new Date();
  };

  const isDiscountUsageLimitReached = (discount: Discount) => {
    if (!discount.usage_limit) return false;
    return discount.usage_count >= discount.usage_limit;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Percent className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Управление скидками</h1>
              <p className="text-gray-600">Создание и управление скидками для клиентов</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={createTableIfNotExists}
              disabled={loading}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              title="Создать таблицу скидок, если она не существует"
            >
              <span>🔧</span>
              <span>Создать таблицу</span>
            </button>
            <button
              onClick={createFakeDiscountsTableIfNotExists}
              disabled={loading}
              className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              title="Создать таблицу фиктивных скидок"
            >
              <span>⚡</span>
              <span>Таблица фиктивных скидок</span>
            </button>
            <button
              onClick={startCreate}
              disabled={loading}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Новая скидка</span>
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <pre className="text-blue-800 text-sm whitespace-pre-wrap font-sans">{message}</pre>
          </div>
        )}

        {/* Фиктивная скидка с таймером */}
        <div className="mb-6 p-6 border border-orange-200 rounded-lg bg-orange-50">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Timer className="h-5 w-5 mr-2 text-orange-600" />
            Фиктивная скидка (Маркетинговая)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название
              </label>
              <input
                type="text"
                value={fakeDiscountForm.name}
                onChange={(e) => setFakeDiscountForm({...fakeDiscountForm, name: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Процент скидки
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={fakeDiscountForm.percentage}
                onChange={(e) => setFakeDiscountForm({...fakeDiscountForm, percentage: parseInt(e.target.value) || 0})}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Длительность (мин)
              </label>
              <input
                type="number"
                min="5"
                max="1440"
                value={fakeDiscountForm.duration}
                onChange={(e) => setFakeDiscountForm({...fakeDiscountForm, duration: parseInt(e.target.value) || 60})}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="flex items-end">
              {fakeDiscountForm.isActive ? (
                <button
                  onClick={stopFakeDiscount}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center justify-center space-x-2"
                >
                  <Pause className="h-4 w-4" />
                  <span>Остановить</span>
                </button>
              ) : (
                <button
                  onClick={startFakeDiscount}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center justify-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Запустить</span>
                </button>
              )}
            </div>
          </div>
          
          {fakeDiscount && fakeDiscountForm.isActive && (
            <div className="text-sm text-gray-600">
              <p><strong>Статус:</strong> Активна до {fakeDiscount.endDate.toLocaleString()}</p>
              <p><strong>Принцип:</strong> Цена завышается на {fakeDiscount.percentage}%, затем показывается как скидка</p>
            </div>
          )}
        </div>

        {/* Form for creating/editing discount */}
        {showForm && editingDiscount && (
          <div className="mb-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">
              {editingDiscount.id ? 'Редактировать скидку' : 'Создать новую скидку'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название скидки *
                </label>
                <input
                  type="text"
                  value={editingDiscount.name}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Например: Летняя распродажа"
                />
              </div>

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Промокод (необязательно)
                </label>
                <input
                  type="text"
                  value={editingDiscount.code || ''}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, code: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="SUMMER2024"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={editingDiscount.description}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows={2}
                  placeholder="Описание скидки для клиентов"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Тип скидки *
                </label>
                <select
                  value={editingDiscount.discount_type}
                  onChange={(e) => setEditingDiscount({ 
                    ...editingDiscount, 
                    discount_type: e.target.value as 'percentage' | 'fixed_amount' 
                  })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="percentage">Процентная скидка (%)</option>
                  <option value="fixed_amount">Фиксированная сумма (€)</option>
                </select>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Размер скидки *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={editingDiscount.discount_value}
                    onChange={(e) => setEditingDiscount({ 
                      ...editingDiscount, 
                      discount_value: parseFloat(e.target.value) || 0 
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md pr-8"
                    min="0"
                    step={editingDiscount.discount_type === 'percentage' ? '1' : '0.01'}
                  />
                  <span className="absolute right-2 top-2 text-gray-500">
                    {editingDiscount.discount_type === 'percentage' ? '%' : '€'}
                  </span>
                </div>
              </div>

              {/* Min Order Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Минимальная сумма заказа (€)
                </label>
                <input
                  type="number"
                  value={editingDiscount.min_order_value || ''}
                  onChange={(e) => setEditingDiscount({ 
                    ...editingDiscount, 
                    min_order_value: parseFloat(e.target.value) || undefined 
                  })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="0"
                  step="0.01"
                  placeholder="0"
                />
              </div>

              {/* Max Discount Amount (only for percentage) */}
              {editingDiscount.discount_type === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Максимальная сумма скидки (€)
                  </label>
                  <input
                    type="number"
                    value={editingDiscount.max_discount_amount || ''}
                    onChange={(e) => setEditingDiscount({ 
                      ...editingDiscount, 
                      max_discount_amount: parseFloat(e.target.value) || undefined 
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    min="0"
                    step="0.01"
                    placeholder="Без ограничений"
                  />
                </div>
              )}

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата начала
                </label>
                <input
                  type="date"
                  value={editingDiscount.start_date || ''}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, start_date: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата окончания
                </label>
                <input
                  type="date"
                  value={editingDiscount.end_date || ''}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, end_date: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Usage Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Лимит использований
                </label>
                <input
                  type="number"
                  value={editingDiscount.usage_limit || ''}
                  onChange={(e) => setEditingDiscount({ 
                    ...editingDiscount, 
                    usage_limit: parseInt(e.target.value) || undefined 
                  })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="1"
                  placeholder="Без ограничений"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingDiscount.is_active}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, is_active: e.target.checked })}
                  className="h-4 w-4 text-green-600"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Скидка активна
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 inline mr-2" />
                Отмена
              </button>
              <button
                onClick={() => saveDiscount(editingDiscount)}
                disabled={loading || !editingDiscount.name || editingDiscount.discount_value <= 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4 inline mr-2" />
                Сохранить
              </button>
            </div>
          </div>
        )}

        {/* Discounts List */}
        <div className="space-y-4">
          {loading && discounts.length === 0 ? (
            <div className="text-center py-8">
              <LottieLoader size={32} label="Загрузка скидок..." />
            </div>
          ) : discounts.length === 0 ? (
            <div className="text-center py-8">
              <Percent className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Скидки не найдены</p>
              <p className="text-gray-500 text-sm">Создайте первую скидку, нажав кнопку выше</p>
            </div>
          ) : (
            discounts.map((discount) => (
              <div 
                key={discount.id} 
                className={`p-4 border rounded-lg ${
                  discount.is_active && !isDiscountExpired(discount) && !isDiscountUsageLimitReached(discount)
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{discount.name}</h3>
                      {discount.code && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-mono rounded">
                          {discount.code}
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        discount.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {discount.is_active ? 'Активна' : 'Неактивна'}
                      </span>
                      {isDiscountExpired(discount) && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                          Истекла
                        </span>
                      )}
                      {isDiscountUsageLimitReached(discount) && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                          Лимит исчерпан
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-2">{discount.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700">
                      <div>
                        <span className="font-medium">Скидка:</span>{' '}
                        {discount.discount_type === 'percentage' 
                          ? `${discount.discount_value}%` 
                          : `€${discount.discount_value}`
                        }
                      </div>
                      <div>
                        <span className="font-medium">Мин. заказ:</span>{' '}
                        {discount.min_order_value ? `€${discount.min_order_value}` : 'Нет'}
                      </div>
                      <div>
                        <span className="font-medium">Период:</span>{' '}
                        {discount.start_date ? formatDate(discount.start_date) : 'Не указан'} -{' '}
                        {discount.end_date ? formatDate(discount.end_date) : 'Постоянно'}
                      </div>
                      <div>
                        <span className="font-medium">Использований:</span>{' '}
                        {discount.usage_count}/{discount.usage_limit || '∞'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => toggleDiscountStatus(discount)}
                      disabled={loading}
                      className={`p-2 rounded-lg transition-colors ${
                        discount.is_active 
                          ? 'bg-red-100 hover:bg-red-200 text-red-700' 
                          : 'bg-green-100 hover:bg-green-200 text-green-700'
                      }`}
                      title={discount.is_active ? 'Деактивировать' : 'Активировать'}
                    >
                      {discount.is_active ? '⏸️' : '▶️'}
                    </button>
                    <button
                      onClick={() => startEdit(discount)}
                      disabled={loading}
                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                      title="Редактировать"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => discount.id && deleteDiscount(discount.id)}
                      disabled={loading}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscountAdminPanel;
