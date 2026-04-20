-- Dashboard Configs: Exportable layout snapshots with versioning
CREATE TABLE IF NOT EXISTS dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  layout_id UUID NOT NULL REFERENCES dashboard_layouts(id) ON DELETE CASCADE,
  
  -- Config metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version INT DEFAULT 1,
  
  -- Serialized layout: includes widgets + all states
  config_data JSONB NOT NULL,
  
  -- Schema version for migration support
  schema_version VARCHAR(20) DEFAULT '1.0.0',
  
  -- Tracking
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(user_id, company_id, name)
);

CREATE INDEX idx_dashboard_configs_user_company ON dashboard_configs(user_id, company_id);
CREATE INDEX idx_dashboard_configs_is_default ON dashboard_configs(user_id, company_id, is_default);

ALTER TABLE dashboard_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own configs"
  ON dashboard_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create configs for their layouts"
  ON dashboard_configs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM dashboard_layouts
      WHERE dashboard_layouts.id = layout_id
        AND dashboard_layouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own configs"
  ON dashboard_configs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own configs"
  ON dashboard_configs FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_dashboard_configs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dashboard_configs_updated_at_trigger
BEFORE UPDATE ON dashboard_configs
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_configs_timestamp();
