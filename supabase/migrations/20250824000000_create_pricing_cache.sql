-- Create pricing cache table
CREATE TABLE IF NOT EXISTS pricing_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  price_key VARCHAR(100) NOT NULL UNIQUE,
  price_value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50),
  monday_item_id VARCHAR(100),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_pricing_cache_key ON pricing_cache(price_key);
CREATE INDEX idx_pricing_cache_updated ON pricing_cache(last_updated);

-- Create pricing sync log table
CREATE TABLE IF NOT EXISTS pricing_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_started_at TIMESTAMPTZ DEFAULT NOW(),
  sync_completed_at TIMESTAMPTZ,
  items_updated INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'running',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing data (fallback values)
INSERT INTO pricing_cache (price_key, price_value, unit, monday_item_id) VALUES
('verwaltungskosten', 30.00, 'percent', '2090249238'),
('wasserdichtigkeit', 25.00, 'percent', '2090255592'),
('mehrteilig', 15.00, 'percent', '2090256392'),
('zeit_pro_m²', 0.90, 'hours', '2090288932'),
('zeit_pro_element', 0.08, 'hours', '2090294337'),
('stundenlohn', 35.00, 'eur', '2090228072'),
('montage', 45.00, 'eur_per_m2', '2090227751'),
('entfernungspreis', 1.50, 'eur_per_km', '2090242018'),
('controller', 25.00, 'eur', '2090273149'),
('controller_high_power', 120.00, 'eur', '2091194484'),
('hanging_system', 35.00, 'eur', '2092808058'),
('uv_print', 50.00, 'eur_per_m2', '2090213361'),
('dhl_klein_20cm', 7.49, 'eur', '2090232832'),
('dhl_mittel_60cm', 12.99, 'eur', '2090231734'),
('dhl_gross_100cm', 19.99, 'eur', '2090234197'),
('spedition_120cm', 45.00, 'eur', '2090236189'),
('gutertransport_240cm', 89.00, 'eur', '2090240832')
ON CONFLICT (price_key) DO NOTHING;

-- Enable RLS
ALTER TABLE pricing_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_sync_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow anonymous read access to pricing cache" ON pricing_cache
  FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to pricing cache" ON pricing_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anonymous read access to sync log" ON pricing_sync_log
  FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to sync log" ON pricing_sync_log
  FOR ALL USING (auth.role() = 'service_role');
