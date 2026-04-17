-- Dashboard Configuration Tables for No-Code Dashboard Builder

-- Dashboard configs - Main dashboard configuration
CREATE TABLE IF NOT EXISTS dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  layout_config JSONB NOT NULL DEFAULT '{}', -- { gridCols: 12, widgets: [] }
  theme_config JSONB NOT NULL DEFAULT '{}', -- { colors, fonts, spacing }
  is_default BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Dashboard widgets - Individual widgets on a dashboard
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboard_configs(id) ON DELETE CASCADE,
  widget_type VARCHAR(50) NOT NULL, -- 'kpi', 'chart', 'table', 'map', 'formula'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  position JSONB NOT NULL, -- { x, y, width, height }
  widget_config JSONB NOT NULL DEFAULT '{}', -- Type-specific config
  data_source_id UUID REFERENCES dashboard_data_sources(id),
  formula_id UUID REFERENCES dashboard_formulas(id),
  refresh_interval INTEGER, -- seconds, NULL = manual
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data source definitions
CREATE TABLE IF NOT EXISTS dashboard_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  source_type VARCHAR(50) NOT NULL, -- 'table', 'query', 'api'
  source_config JSONB NOT NULL DEFAULT '{}', -- { tableName, columns, filters }
  is_cached BOOLEAN DEFAULT TRUE,
  cache_duration INTEGER DEFAULT 300, -- seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Dashboard formulas - Reusable formulas
CREATE TABLE IF NOT EXISTS dashboard_formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  formula_text TEXT NOT NULL,
  description TEXT,
  formula_type VARCHAR(50) NOT NULL, -- 'calculation', 'aggregation', 'conditional'
  parameters JSONB NOT NULL DEFAULT '{}', -- Named parameters
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Dashboard versions - Track changes
CREATE TABLE IF NOT EXISTS dashboard_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboard_configs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  layout_config JSONB NOT NULL,
  theme_config JSONB NOT NULL,
  change_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(dashboard_id, version_number)
);

-- Create indexes for better query performance
CREATE INDEX idx_dashboard_configs_company ON dashboard_configs(company_id);
CREATE INDEX idx_dashboard_configs_user ON dashboard_configs(created_by);
CREATE INDEX idx_dashboard_widgets_dashboard ON dashboard_widgets(dashboard_id);
CREATE INDEX idx_dashboard_widgets_type ON dashboard_widgets(widget_type);
CREATE INDEX idx_dashboard_data_sources_company ON dashboard_data_sources(company_id);
CREATE INDEX idx_dashboard_formulas_company ON dashboard_formulas(company_id);
CREATE INDEX idx_dashboard_versions_dashboard ON dashboard_versions(dashboard_id);

-- Enable RLS (Row Level Security)
ALTER TABLE dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view dashboards of their company"
  ON dashboard_configs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM company_users
    WHERE company_users.company_id = dashboard_configs.company_id
    AND company_users.user_id = auth.uid()
  ));

CREATE POLICY "Users can create dashboards in their company"
  ON dashboard_configs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM company_users
    WHERE company_users.company_id = dashboard_configs.company_id
    AND company_users.user_id = auth.uid()
    AND company_users.role IN ('admin', 'owner')
  ));

CREATE POLICY "Users can update dashboards in their company"
  ON dashboard_configs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM company_users
    WHERE company_users.company_id = dashboard_configs.company_id
    AND company_users.user_id = auth.uid()
    AND company_users.role IN ('admin', 'owner')
  ));

CREATE POLICY "Users can delete dashboards in their company"
  ON dashboard_configs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM company_users
    WHERE company_users.company_id = dashboard_configs.company_id
    AND company_users.user_id = auth.uid()
    AND company_users.role IN ('admin', 'owner')
  ));

-- Similar policies for other tables
CREATE POLICY "View dashboard widgets"
  ON dashboard_widgets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM dashboard_configs
    WHERE dashboard_configs.id = dashboard_widgets.dashboard_id
    AND EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = dashboard_configs.company_id
      AND company_users.user_id = auth.uid()
    )
  ));

CREATE POLICY "Manage dashboard widgets"
  ON dashboard_widgets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM dashboard_configs
    WHERE dashboard_configs.id = dashboard_widgets.dashboard_id
    AND EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = dashboard_configs.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('admin', 'owner')
    )
  ));

CREATE POLICY "View data sources"
  ON dashboard_data_sources FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM company_users
    WHERE company_users.company_id = dashboard_data_sources.company_id
    AND company_users.user_id = auth.uid()
  ));

CREATE POLICY "Manage data sources"
  ON dashboard_data_sources FOR ALL
  USING (EXISTS (
    SELECT 1 FROM company_users
    WHERE company_users.company_id = dashboard_data_sources.company_id
    AND company_users.user_id = auth.uid()
    AND company_users.role IN ('admin', 'owner')
  ));

CREATE POLICY "View formulas"
  ON dashboard_formulas FOR SELECT
  USING (is_shared OR EXISTS (
    SELECT 1 FROM company_users
    WHERE company_users.company_id = dashboard_formulas.company_id
    AND company_users.user_id = auth.uid()
  ));

CREATE POLICY "Manage formulas"
  ON dashboard_formulas FOR ALL
  USING (EXISTS (
    SELECT 1 FROM company_users
    WHERE company_users.company_id = dashboard_formulas.company_id
    AND company_users.user_id = auth.uid()
    AND company_users.role IN ('admin', 'owner')
  ));
