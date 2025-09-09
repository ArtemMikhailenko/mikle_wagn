-- Create CRM projects table
CREATE TABLE IF NOT EXISTS crm_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id VARCHAR(50) NOT NULL UNIQUE,
  client_email VARCHAR(255) NOT NULL,
  client_name VARCHAR(255),
  design_name VARCHAR(255),
  svg_content TEXT,
  svg_url VARCHAR(500),
  mockup_url VARCHAR(500),
  mockup_content TEXT,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_crm_projects_project_id ON crm_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_crm_projects_email ON crm_projects(client_email);
CREATE INDEX IF NOT EXISTS idx_crm_projects_status ON crm_projects(status);
CREATE INDEX IF NOT EXISTS idx_crm_projects_mockup_url ON crm_projects(mockup_url);

-- Create client interactions log
CREATE TABLE IF NOT EXISTS client_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id VARCHAR(50) NOT NULL REFERENCES crm_projects(project_id),
  interaction_type VARCHAR(50) NOT NULL, -- 'email_sent', 'link_viewed', 'design_approved', etc.
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for interactions
CREATE INDEX IF NOT EXISTS idx_client_interactions_project_id ON client_interactions(project_id);
CREATE INDEX IF NOT EXISTS idx_client_interactions_type ON client_interactions(interaction_type);

-- Insert sample CRM data
INSERT INTO crm_projects (project_id, client_email, client_name, design_name, svg_content, status, notes) VALUES
('CRM-001', 'kunde@example.com', 'Max Mustermann', 'Cafe Berlin Neon', 
 '<svg viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg"><text x="20" y="50" fill="#00ff00" font-family="Arial" font-size="30">CAFE BERLIN</text></svg>', 
 'sent', 'Erstes Design für Cafe Berlin'),
('CRM-002', 'shop@boutique.de', 'Anna Schmidt', 'Boutique Elegance', 
 '<svg viewBox="0 0 350 80" xmlns="http://www.w3.org/2000/svg"><text x="10" y="40" fill="#ff0080" font-family="Arial" font-size="25">BOUTIQUE</text></svg>', 
 'viewed', 'Elegantes Design für Boutique'),
('CRM-003', 'info@restaurant.com', 'Luigi Rossi', 'Restaurant Luna', 
 '<svg viewBox="0 0 300 90" xmlns="http://www.w3.org/2000/svg"><text x="15" y="45" fill="#ffff00" font-family="Arial" font-size="28">LUNA</text></svg>', 
 'approved', 'Italienisches Restaurant Design')
ON CONFLICT (project_id) DO NOTHING;

-- Enable RLS
ALTER TABLE crm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies (drop if exists first)
DROP POLICY IF EXISTS "Allow anonymous read access to crm projects" ON crm_projects;
CREATE POLICY "Allow anonymous read access to crm projects" ON crm_projects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow service role full access to crm projects" ON crm_projects;
CREATE POLICY "Allow service role full access to crm projects" ON crm_projects
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow anonymous read access to interactions" ON client_interactions;
CREATE POLICY "Allow anonymous read access to interactions" ON client_interactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert to interactions" ON client_interactions;
CREATE POLICY "Allow anonymous insert to interactions" ON client_interactions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role full access to interactions" ON client_interactions;
CREATE POLICY "Allow service role full access to interactions" ON client_interactions
  FOR ALL USING (auth.role() = 'service_role');

-- Comment explaining the MockUp fields
COMMENT ON COLUMN crm_projects.mockup_url IS 'URL to the MockUp image from Monday.com';
COMMENT ON COLUMN crm_projects.mockup_content IS 'Base64 or direct content of the MockUp image';
