-- Создание таблицы для фиктивных скидок (маркетинговых)
CREATE TABLE IF NOT EXISTS fake_discounts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT 'Limitiertes Angebot',
  percentage INTEGER NOT NULL CHECK (percentage > 0 AND percentage <= 50) DEFAULT 25,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска активных скидок
CREATE INDEX IF NOT EXISTS idx_fake_discounts_active_date ON fake_discounts (is_active, start_date, end_date);

-- Включаем RLS (Row Level Security)
ALTER TABLE fake_discounts ENABLE ROW LEVEL SECURITY;

-- Создаем политику для чтения всем
CREATE POLICY IF NOT EXISTS "Allow public read access" ON fake_discounts
  FOR SELECT USING (true);

-- Создаем политику для записи всем (в реальном проекте нужно ограничить)
CREATE POLICY IF NOT EXISTS "Allow public write access" ON fake_discounts
  FOR ALL USING (true);

-- Создаем функцию автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_fake_discounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_fake_discounts_updated_at ON fake_discounts;
CREATE TRIGGER update_fake_discounts_updated_at
    BEFORE UPDATE ON fake_discounts
    FOR EACH ROW
    EXECUTE FUNCTION update_fake_discounts_updated_at();

-- Вставляем дефолтную фиктивную скидку на 2 часа
INSERT INTO fake_discounts (name, percentage, start_date, end_date, is_active)
VALUES (
  'Flash Sale - Nur heute!',
  25,
  NOW(),
  NOW() + INTERVAL '2 hours',
  true
)
ON CONFLICT DO NOTHING;

-- Комментарии к таблице
COMMENT ON TABLE fake_discounts IS 'Фиктивные маркетинговые скидки с таймером';
COMMENT ON COLUMN fake_discounts.percentage IS 'Процент фиктивной скидки (цена завышается на этот процент, затем показывается как скидка)';
COMMENT ON COLUMN fake_discounts.is_active IS 'Активна ли скидка (может быть отключена админом до истечения времени)';