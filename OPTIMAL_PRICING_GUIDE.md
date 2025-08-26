# 🎯 Optimal Pricing Architecture - Руководство

## 📋 Обзор архитектуры

Мы создали оптимальную систему ценообразования, которая минимизирует API запросы к Monday.com и обеспечивает быструю работу для всех пользователей.

## 🏗️ Архитектура

### 1. **Клиентская часть (Пользователи)**
- ✅ Загружает цены из Supabase базы данных
- ✅ 30-минутный локальный кеш в браузере
- ✅ Никаких прямых запросов к Monday.com API
- ✅ Быстрое время отклика (<100ms)

### 2. **Серверная часть (Supabase)**
- ✅ Автоматическая ежедневная синхронизация из Monday.com
- ✅ Edge Function управляет API лимитами
- ✅ Централизованный кеш для всех пользователей
- ✅ Возможность ручной синхронизации

## 📊 Компоненты системы

### База данных (Supabase)
```sql
-- Таблица кеша цен
CREATE TABLE pricing_cache (
  price_key VARCHAR(100) UNIQUE,
  price_value DECIMAL(10,2),
  unit VARCHAR(50),
  monday_item_id VARCHAR(100),
  last_updated TIMESTAMPTZ
);

-- Логи синхронизации
CREATE TABLE pricing_sync_log (
  sync_started_at TIMESTAMPTZ,
  sync_completed_at TIMESTAMPTZ,
  items_updated INTEGER,
  status VARCHAR(50)
);
```

### Сервисы
1. **`finalPricingService.ts`** - Основной сервис для клиентов
2. **`daily-price-sync/index.ts`** - Supabase Edge Function для синхронизации
3. **`optimalCalculations.ts`** - Расчеты с кешированными ценами

### Компоненты
1. **`PricingAdminPanel.tsx`** - Админ панель управления ценами
2. **Обновленный `PricingCalculator.tsx`** - Использует кешированные цены

## 🚀 Использование

### Для разработчиков

#### 1. Получение цен в компонентах
```typescript
import { finalPricingService } from '../services/finalPricingService';

// Асинхронное получение
const pricing = await finalPricingService.getPricingComponents();

// Получение отдельной цены
const controllerPrice = await finalPricingService.getPrice('controller');
```

#### 2. Расчет цены товара
```typescript
import { calculateOptimalSignPrice } from '../utils/optimalCalculations';

const price = await calculateOptimalSignPrice(
  design, width, height, isWaterproof, isTwoPart, hasUvPrint
);
```

#### 3. Информация о доставке
```typescript
import { getOptimalShippingInfo } from '../utils/optimalCalculations';

const shipping = await getOptimalShippingInfo(longestSideCm);
```

### Для администраторов

#### Доступ к админ панели
```
http://localhost:5174/admin/pricing
```

#### Функции админ панели:
- 📊 Просмотр текущих цен из кеша
- 🔄 Принудительная синхронизация цен
- 📈 Статистика последних обновлений
- ⚡ Статус подключения к базе данных

## 📈 Преимущества решения

### 1. **Производительность**
- **До:** 🐌 Каждый пользователь → Monday.com API (slow)
- **После:** ⚡ Каждый пользователь → Supabase DB (fast)

### 2. **API лимиты**
- **До:** 🚫 8,640+ запросов/месяц от пользователей
- **После:** ✅ ~30 запросов/месяц от сервера

### 3. **Надежность**
- **До:** ❌ Сбой при недоступности Monday.com
- **После:** ✅ Fallback цены + локальный кеш

### 4. **Масштабируемость**
- **До:** 📉 Лимиты растут с количеством пользователей
- **После:** 📈 Один запрос обслуживает всех пользователей

## ⚙️ Настройка

### 1. Переменные окружения
```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Monday.com (для Edge Function)
MONDAY_API_TOKEN=your_monday_token
MONDAY_BOARD_ID=2090208832
```

### 2. Развертывание миграций
```bash
# Создать таблицы
supabase db push

# Развернуть Edge Function
supabase functions deploy daily-price-sync
```

### 3. Настройка автоматической синхронизации
Создайте cron job в Supabase для ежедневного вызова Edge Function:
```sql
SELECT cron.schedule(
  'daily-price-sync',
  '0 2 * * *', -- каждый день в 2:00
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/daily-price-sync',
    headers := jsonb_build_object('Authorization', 'Bearer ' || 'YOUR_SERVICE_ROLE_KEY')
  );
  $$
);
```

## 🔧 Мониторинг

### Логи синхронизации
```sql
SELECT * FROM pricing_sync_log 
ORDER BY sync_started_at DESC 
LIMIT 10;
```

### Актуальность цен
```sql
SELECT price_key, price_value, last_updated 
FROM pricing_cache 
ORDER BY last_updated DESC;
```

## 🎯 Результат

✅ **Задача решена:** Создана оптимальная архитектура без необходимости поднимать отдельный бекенд  
✅ **API лимиты:** Минимизированы до ~1 запроса в день  
✅ **Производительность:** Мгновенная загрузка цен для пользователей  
✅ **Надежность:** Fallback система и кеширование  
✅ **Масштабируемость:** Готова к росту количества пользователей  

## 📞 Поддержка

Для управления системой используйте:
1. **Админ панель:** `/admin/pricing`
2. **Логи Supabase:** Dashboard → Functions → daily-price-sync
3. **Мониторинг:** Dashboard → Database → pricing_cache table
