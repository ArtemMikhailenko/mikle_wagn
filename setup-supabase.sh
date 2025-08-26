#!/bin/bash

echo "🚀 Настройка Supabase для системы ценообразования"
echo ""

# Проверяем наличие Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI не установлен."
    echo "📋 Инструкции по установке:"
    echo ""
    echo "   macOS (Homebrew):"
    echo "   brew install supabase/tap/supabase"
    echo ""
    echo "   Или скачайте напрямую:"
    echo "   https://github.com/supabase/cli/releases"
    echo ""
    echo "🌐 Альтернатива: Создайте проект онлайн на https://supabase.com"
    exit 1
fi

echo "✅ Supabase CLI найден"

# Инициализация проекта
echo "🔧 Инициализация Supabase проекта..."
supabase init

# Запуск локального Supabase
echo "🚀 Запуск локального Supabase..."
supabase start

echo ""
echo "🎉 Supabase настроен!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Скопируйте URL и ключи из вывода выше"
echo "2. Обновите файл .env.local"
echo "3. Запустите миграции: supabase db push"
echo "4. Загрузите Edge Function: supabase functions deploy daily-price-sync"
echo ""
