-- Создание таблицы скидок для системы управления скидками
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

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts(code);
CREATE INDEX IF NOT EXISTS idx_discounts_dates ON discounts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_discounts_created_at ON discounts(created_at);

-- Добавление комментариев к полям
COMMENT ON TABLE discounts IS 'Таблица скидок для системы управления промоакциями';
COMMENT ON COLUMN discounts.id IS 'Уникальный идентификатор скидки';
COMMENT ON COLUMN discounts.name IS 'Название скидки';
COMMENT ON COLUMN discounts.description IS 'Описание скидки для клиентов';
COMMENT ON COLUMN discounts.discount_type IS 'Тип скидки: percentage (процентная) или fixed_amount (фиксированная сумма)';
COMMENT ON COLUMN discounts.discount_value IS 'Размер скидки (процент или сумма в евро)';
COMMENT ON COLUMN discounts.min_order_value IS 'Минимальная сумма заказа для применения скидки';
COMMENT ON COLUMN discounts.max_discount_amount IS 'Максимальная сумма скидки (только для процентных скидок)';
COMMENT ON COLUMN discounts.start_date IS 'Дата начала действия скидки';
COMMENT ON COLUMN discounts.end_date IS 'Дата окончания действия скидки';
COMMENT ON COLUMN discounts.is_active IS 'Активна ли скидка в данный момент';
COMMENT ON COLUMN discounts.usage_limit IS 'Максимальное количество использований скидки';
COMMENT ON COLUMN discounts.usage_count IS 'Текущее количество использований скидки';
COMMENT ON COLUMN discounts.code IS 'Промокод для применения скидки';

-- Создание функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггера для автоматического обновления updated_at
CREATE TRIGGER update_discounts_updated_at 
    BEFORE UPDATE ON discounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Примеры тестовых скидок для демонстрации
INSERT INTO discounts (name, description, discount_type, discount_value, min_order_value, is_active, code) VALUES
('Скидка новому клиенту', 'Скидка 10% для новых клиентов', 'percentage', 10.00, 100.00, true, 'WELCOME10'),
('Летняя распродажа', 'Скидка 15% на все товары летом', 'percentage', 15.00, 200.00, true, 'SUMMER15'),
('Скидка на большой заказ', 'Фиксированная скидка 50€ при заказе от 500€', 'fixed_amount', 50.00, 500.00, true, 'BIG50'),
('Зимняя акция', 'Скидка 20% на зимний период', 'percentage', 20.00, 150.00, false, 'WINTER20')
ON CONFLICT (code) DO NOTHING;

-- Включение Row Level Security (RLS) для безопасности
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;

-- Создание политики для чтения (все могут читать активные скидки)
CREATE POLICY "Public can view active discounts" ON discounts
  FOR SELECT USING (is_active = true);

-- Создание политики для администраторов (полный доступ)
CREATE POLICY "Admin full access" ON discounts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
