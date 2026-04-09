-- Dashboard Templates: Preset layouts + user-saved templates
CREATE TABLE IF NOT EXISTS dashboard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Template metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'custom', -- 'sales', 'finance', 'ops', 'custom'
  
  -- Serialized widgets layout
  widgets_data JSONB NOT NULL,
  
  -- System flags
  is_preset BOOLEAN DEFAULT FALSE, -- TRUE = built-in system template
  is_public BOOLEAN DEFAULT FALSE, -- Can other users see it
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(COALESCE(user_id, '00000000-0000-0000-0000-000000000000'), is_preset, name)
);

CREATE INDEX idx_dashboard_templates_presets ON dashboard_templates(is_preset) WHERE is_preset = TRUE;
CREATE INDEX idx_dashboard_templates_user_company ON dashboard_templates(user_id, company_id);
CREATE INDEX idx_dashboard_templates_public ON dashboard_templates(is_public) WHERE is_public = TRUE;

ALTER TABLE dashboard_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view preset templates"
  ON dashboard_templates FOR SELECT
  USING (is_preset = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can create templates"
  ON dashboard_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_preset = FALSE);

CREATE POLICY "Users can update their own templates"
  ON dashboard_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_preset = FALSE);

CREATE POLICY "Users can delete their own templates"
  ON dashboard_templates FOR DELETE
  USING (auth.uid() = user_id AND is_preset = FALSE);

CREATE TRIGGER dashboard_templates_updated_at_trigger
BEFORE UPDATE ON dashboard_templates
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_configs_timestamp();

-- Insert preset templates
INSERT INTO dashboard_templates (is_preset, name, description, category, widgets_data, company_id)
VALUES 
  (TRUE, 'Sales Overview', 'KPIs + 7-day trend + top products', 'sales', 
   '{"widgets":[{"type":"monthly-sales","size":"half"},{"type":"gross-margin","size":"half"},{"type":"sales-7days","size":"full"},{"type":"top-products","size":"full"}]}'::jsonb,
   '00000000-0000-0000-0000-000000000000'),
  
  (TRUE, 'Finance Dashboard', 'Margin + Receivables + Currency rates', 'finance',
   '{"widgets":[{"type":"gross-margin","size":"half"},{"type":"receivables","size":"half"},{"type":"rates","size":"full"}]}'::jsonb,
   '00000000-0000-0000-0000-000000000000'),
  
  (TRUE, 'Operations', 'Stock alerts + Top customers + Sales today', 'ops',
   '{"widgets":[{"type":"critical-stock","size":"full"},{"type":"top-customers","size":"full"},{"type":"sales-today","size":"half"}]}'::jsonb,
   '00000000-0000-0000-0000-000000000000'),
  
  (TRUE, 'Executive', 'Monthly sales + Margin + Receivables + Exchange rates', 'sales',
   '{"widgets":[{"type":"monthly-sales","size":"half"},{"type":"gross-margin","size":"half"},{"type":"receivables","size":"half"},{"type":"rates","size":"half"}]}'::jsonb,
   '00000000-0000-0000-0000-000000000000'),
  
  (TRUE, 'Minimal', 'Just sales and margin', 'sales',
   '{"widgets":[{"type":"monthly-sales","size":"half"},{"type":"gross-margin","size":"half"}]}'::jsonb,
   '00000000-0000-0000-0000-000000000000');
