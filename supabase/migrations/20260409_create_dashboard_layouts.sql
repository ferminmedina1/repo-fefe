-- Create dashboard_layouts table for storing user custom dashboard layouts
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  widgets JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, company_id, is_default) -- One default layout per user per company
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_company 
  ON dashboard_layouts(user_id, company_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_is_default 
  ON dashboard_layouts(user_id, company_id, is_default);

-- Enable RLS
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own layouts
CREATE POLICY "Users can view their own dashboard layouts" 
  ON dashboard_layouts 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can create layouts for their companies (if they have company access)
CREATE POLICY "Users can create dashboard layouts for their companies" 
  ON dashboard_layouts 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM company_users 
      WHERE company_users.company_id = dashboard_layouts.company_id 
        AND company_users.user_id = auth.uid()
    )
  );

-- Policy: Users can update only their own layouts
CREATE POLICY "Users can update their own dashboard layouts" 
  ON dashboard_layouts 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own layouts
CREATE POLICY "Users can delete their own dashboard layouts" 
  ON dashboard_layouts 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_dashboard_layouts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dashboard_layouts_updated_at_trigger
BEFORE UPDATE ON dashboard_layouts
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_layouts_timestamp();
