-- Add MockUp fields to existing crm_projects table
ALTER TABLE crm_projects 
ADD COLUMN IF NOT EXISTS mockup_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS mockup_content TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_crm_projects_mockup_url ON crm_projects(mockup_url);

-- Comment explaining the new fields
COMMENT ON COLUMN crm_projects.mockup_url IS 'URL to the MockUp image from Monday.com';
COMMENT ON COLUMN crm_projects.mockup_content IS 'Base64 or direct content of the MockUp image';
