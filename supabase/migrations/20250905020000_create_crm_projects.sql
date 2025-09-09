-- Create CRM projects table for Monday.com integration
CREATE TABLE IF NOT EXISTS public.crm_projects (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_crm_projects_project_id ON public.crm_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_crm_projects_client_email ON public.crm_projects(client_email);
CREATE INDEX IF NOT EXISTS idx_crm_projects_status ON public.crm_projects(status);

-- Enable Row Level Security
ALTER TABLE public.crm_projects ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
CREATE POLICY IF NOT EXISTS "Allow all operations for service role" ON public.crm_projects
  FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.crm_projects TO service_role;
GRANT ALL ON public.crm_projects TO anon;
