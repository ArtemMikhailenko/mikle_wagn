# 🚀 Настройка Supabase для Optimal Pricing System

## Проблемы и решения

### ❌ Текущие ошибки:
1. **Supabase CLI не установлен** - Edge Functions не могут быть развернуты
2. **Переменные окружения не настроены** - нет подключения к базе данных
3. **React импорты сломаны** - дублированные импорты в PricingCalculator.tsx

### ✅ Пошаговое решение:

## Шаг 1: Выбор варианта Supabase

### Вариант A: Онлайн Supabase (Рекомендуется - простой)

1. **Создайте проект:**
   - Идите на https://supabase.com
   - Войдите/зарегистрируйтесь
   - Создайте новый проект
   - Выберите регион и пароль БД

2. **Получите ключи:**
   - В Settings → API
   - Скопируйте Project URL
   - Скопируйте anon/public key  
   - Скопируйте service_role key

3. **Обновите .env.local:**
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   MONDAY_API_TOKEN=your_monday_token
   MONDAY_BOARD_ID=2090208832
   ```

4. **Запустите миграции:**
   ```bash
   npx supabase db push --db-url "postgresql://postgres:your_password@db.your-project.supabase.co:5432/postgres"
   ```

### Вариант B: Локальный Supabase (Сложнее)

1. **Установите Supabase CLI:**
   ```bash
   # Обновите Command Line Tools сначала:
   sudo rm -rf /Library/Developer/CommandLineTools
   sudo xcode-select --install
   
   # Затем установите Supabase:
   brew install supabase/tap/supabase
   ```

2. **Запустите локально:**
   ```bash
   ./setup-supabase.sh
   ```

## Шаг 2: Применение миграций

### Для онлайн Supabase:
```bash
cd /Users/veronika/Downloads/project
npx supabase link --project-ref your-project-ref
npx supabase db push
```

### Для локального Supabase:
```bash
supabase db reset
```

## Шаг 3: Деплой Edge Functions

### Для онлайн Supabase:
```bash
npx supabase functions deploy daily-price-sync
```

### Для локального Supabase:
```bash
supabase functions serve daily-price-sync
```

## Шаг 4: Настройка переменных для Edge Function

В онлайн Supabase:
1. Идите в Project Settings → Edge Functions
2. Добавьте переменные:
   - `MONDAY_API_TOKEN`: ваш токен Monday.com
   - `MONDAY_BOARD_ID`: 2090208832

## Шаг 5: Исправление React ошибок

Проверьте файл `src/components/PricingCalculator.tsx` - там есть дублированные импорты React.

## Шаг 6: Тестирование

1. **Запустите приложение:**
   ```bash
   npm run dev
   ```

2. **Проверьте админ панель:**
   - Откройте http://localhost:5174/admin/pricing
   - Нажмите "Manual Sync" для тестирования

3. **Проверьте базу данных:**
   - В Supabase Studio проверьте таблицы pricing_cache и pricing_sync_log

## Шаг 7: Автоматизация (Опционально)

Для автоматического запуска каждый день:
1. В Supabase перейдите в Edge Functions
2. Настройте Cron Job для `daily-price-sync`
3. Установите расписание: `0 6 * * *` (каждый день в 6 утра)

## 🎯 Результат

После настройки:
- ✅ База данных с кешированными ценами
- ✅ Автоматическая синхронизация с Monday.com  
- ✅ Админ панель для мониторинга
- ✅ API для получения цен без прямых вызовов Monday.com
- ✅ Сокращение API запросов с 8,640+ до ~30 в месяц

## 🆘 Нужна помощь?

Если возникают проблемы:
1. Проверьте логи в Supabase Edge Functions
2. Убедитесь что все переменные окружения настроены
3. Проверьте что Monday.com токен имеет доступ к нужной доске
