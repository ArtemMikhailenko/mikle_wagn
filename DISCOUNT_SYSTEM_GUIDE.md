# 🎯 Система управления скидками

Полная система управления скидками и промокодами для интернет-магазина неоновых вывесок.

## 📋 Возможности системы

### 🔧 Админ панель (`/admin/discounts`)
- ✅ Создание и редактирование скидок
- ✅ Два типа скидок: процентные и фиксированные
- ✅ Настройка промокодов
- ✅ Ограничения по датам
- ✅ Минимальная сумма заказа
- ✅ Лимиты использований
- ✅ Максимальная сумма скидки (для процентных)
- ✅ Активация/деактивация скидок
- ✅ Статистика использований

### 🛒 Клиентская часть
- ✅ Отображение доступных скидок на главной
- ✅ Ввод промокодов в корзине
- ✅ Автоматическое применение лучших скидок
- ✅ Валидация промокодов
- ✅ Расчет финальной цены со скидкой

## 🏗️ Архитектура

### База данных (PostgreSQL/Supabase)
```sql
discounts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2),
  max_discount_amount DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  code VARCHAR(50) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

### Сервисы
- **`discountService.ts`** - Основной сервис для работы со скидками
- **`DiscountAdminPanel.tsx`** - Админ интерфейс
- **`DiscountDisplay.tsx`** - Отображение скидок на главной
- **`PromoCodeInput.tsx`** - Ввод промокодов в корзине

## 🚀 Установка и настройка

### 1. Создание таблицы в базе данных
Выполните SQL скрипт:
```bash
psql -f create_discounts_table.sql
```

### 2. Настройка переменных окружения
Убедитесь что в `.env` есть:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Доступ к админ панели
Перейдите на `/admin/discounts` для управления скидками.

## 📊 Типы скидок

### 1. Процентные скидки
```typescript
{
  discount_type: 'percentage',
  discount_value: 15, // 15%
  max_discount_amount: 100 // Максимум €100 скидки
}
```

### 2. Фиксированные скидки
```typescript
{
  discount_type: 'fixed_amount',
  discount_value: 50 // €50 скидки
}
```

## 🎯 Логика применения скидок

### Автоматические скидки
- Применяются автоматически при расчете цены
- Выбирается скидка с максимальной выгодой
- Работают только скидки без промокодов

### Промокоды
- Вводятся клиентом в корзине
- Имеют уникальный код
- Могут комбинироваться с автоматическими скидками
- Валидируются по всем условиям

### Приоритет применения
1. Промокод (если введен)
2. Лучшая автоматическая скидка
3. Без скидки

## 💻 Использование в коде

### Применение скидки
```typescript
import { discountService } from '../services/discountService';

// Автоматическое применение лучшей скидки
const application = await discountService.applyDiscount(orderTotal);

// Применение промокода
const application = await discountService.applyDiscount(orderTotal, 'SUMMER15');

if (application && application.isValid) {
  console.log('Скидка:', application.discountAmount);
  console.log('Финальная цена:', application.finalPrice);
}
```

### Отображение доступных скидок
```tsx
import DiscountDisplay from '../components/DiscountDisplay';

<DiscountDisplay 
  orderTotal={1500}
  onDiscountSelect={(discount) => console.log('Selected:', discount)}
/>
```

### Ввод промокода
```tsx
import PromoCodeInput from '../components/PromoCodeInput';

<PromoCodeInput
  orderTotal={1500}
  onDiscountApplied={(application) => {
    if (application) {
      setFinalPrice(application.finalPrice);
    }
  }}
/>
```

## 🔒 Безопасность

### Row Level Security (RLS)
- Включена для таблицы `discounts`
- Публичный доступ только к активным скидкам
- Полный доступ только для авторизованных администраторов

### Валидация
- Проверка всех условий на сервере
- Защита от повторного использования
- Проверка лимитов и дат

## 📈 Мониторинг

### Статистика использования
```sql
-- Топ используемых скидок
SELECT name, usage_count, usage_limit 
FROM discounts 
ORDER BY usage_count DESC;

-- Активные скидки
SELECT name, discount_value, discount_type, is_active
FROM discounts 
WHERE is_active = true;
```

### Аналитика в админ панели
- Счетчик использований
- Статус активности
- Проверка лимитов
- Отслеживание истекших скидок

## 🎨 Примеры настройки

### Скидка новому клиенту
```sql
INSERT INTO discounts (name, description, discount_type, discount_value, min_order_value, code, is_active) 
VALUES ('Скидка новому клиенту', 'Скидка 10% для новых клиентов', 'percentage', 10.00, 100.00, 'WELCOME10', true);
```

### Сезонная распродажа
```sql
INSERT INTO discounts (name, description, discount_type, discount_value, start_date, end_date, is_active) 
VALUES ('Летняя распродажа', 'Скидка 20% на лето', 'percentage', 20.00, '2024-06-01', '2024-08-31', true);
```

### Скидка на большой заказ
```sql
INSERT INTO discounts (name, description, discount_type, discount_value, min_order_value, is_active) 
VALUES ('Большой заказ', 'Скидка €100 при заказе от €1000', 'fixed_amount', 100.00, 1000.00, true);
```

## 🔧 Расширения

### Планируемые возможности
- [ ] Персональные скидки для клиентов
- [ ] Скидки по категориям товаров
- [ ] Программа лояльности
- [ ] A/B тестирование скидок
- [ ] Интеграция с email маркетингом

### Кастомизация
Система легко расширяется для:
- Дополнительных типов скидок
- Сложных условий применения
- Интеграции с внешними системами
- Персонализации предложений

## 📞 Поддержка

Для вопросов по системе скидок:
1. **Админ панель:** `/admin/discounts`
2. **Логи:** Browser DevTools → Console
3. **База данных:** Supabase Dashboard → Database → discounts table
