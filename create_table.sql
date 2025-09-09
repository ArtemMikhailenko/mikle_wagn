-- Выполните этот SQL в Supabase Dashboard -> SQL Editor

-- Удаляем таблицу если она существует (для чистого создания)
DROP TABLE IF EXISTS public.crm_projects CASCADE;

-- Создаем таблицу заново
CREATE TABLE public.crm_projects (
  id BIGSERIAL PRIMARY KEY,
  project_id TEXT UNIQUE NOT NULL,
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  design_name TEXT NOT NULL,
  svg_content TEXT,
  svg_url TEXT,
  mockup_url TEXT,
  mockup_content TEXT,
  notes TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы
CREATE INDEX idx_crm_projects_project_id ON public.crm_projects(project_id);
CREATE INDEX idx_crm_projects_client_email ON public.crm_projects(client_email);
CREATE INDEX idx_crm_projects_status ON public.crm_projects(status);

-- Включаем Row Level Security
ALTER TABLE public.crm_projects ENABLE ROW LEVEL SECURITY;

-- Создаем политики доступа
CREATE POLICY "Allow all operations for service role" ON public.crm_projects
  FOR ALL USING (true);

-- Предоставляем права
GRANT ALL ON public.crm_projects TO service_role;
GRANT ALL ON public.crm_projects TO anon;

-- Добавляем тестовые записи с разными MockUp изображениями
INSERT INTO public.crm_projects (
  project_id, 
  client_email, 
  client_name, 
  design_name, 
  mockup_url,
  notes
) VALUES 
(
  'CRM-MONDAY-TEST-OFFICE', 
  'office@example.com', 
  'Office Design Client', 
  'Modern Office Design',
  'https://images.unsplash.com/photo-1560017103-3db5dfecb1b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
  'Modern office environment mockup'
),
(
  'CRM-MONDAY-TEST-RESTAURANT', 
  'restaurant@example.com', 
  'Restaurant Neon', 
  'Restaurant Sign',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
  'Restaurant environment mockup'
),
(
  'CRM-MONDAY-TEST-SHOP', 
  'shop@example.com', 
  'Retail Store', 
  'Shop Front Sign',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
  'Retail store mockup'
);

-- Проверяем что все создалось
SELECT * FROM public.crm_projects;
