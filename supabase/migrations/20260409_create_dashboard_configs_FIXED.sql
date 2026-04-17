-- FILE: 20260409_create_dashboard_configs.sql
-- Tabla para guardar snapshots/exports de layouts (con versionado)
-- CORRECCIONES:
-- ✅ RLS policies verifican company access correctamente
-- ✅ Usa función correcta en trigger

CREATE TABLE IF NOT EXISTS public.dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  layout_id UUID NOT NULL REFERENCES public.dashboard_layouts(id) ON DELETE CASCADE,
  
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
  
  -- Ensure one name per user-company combo
  CONSTRAINT unique_config_name_per_company UNIQUE (user_id, company_id, name) DEFERRABLE INITIALLY DEFERRED
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user_company 
  ON public.dashboard_configs(user_id, company_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_configs_is_default 
  ON public.dashboard_configs(user_id, company_id, is_default);

CREATE INDEX IF NOT EXISTS idx_dashboard_configs_layout_id
  ON public.dashboard_configs(layout_id);

-- Enable Row Level Security
ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Row Level Security Policies - WITH COMPANY ACCESS VALIDATION
-- ============================================================================

-- Policy: Users can view their own configs
CREATE POLICY "Users can view their own configs" 
  ON public.dashboard_configs 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can create configs for their layouts (with company validation)
-- ✅ CORRECCIÓN: Validar que user tiene acceso a la company
CREATE POLICY "Users can create configs for their layouts" 
  ON public.dashboard_configs 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.company_users
      WHERE company_users.company_id = dashboard_configs.company_id
        AND company_users.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.dashboard_layouts
      WHERE dashboard_layouts.id = layout_id
        AND dashboard_layouts.user_id = auth.uid()
    )
  );

-- Policy: Users can update their own configs
CREATE POLICY "Users can update their own configs" 
  ON public.dashboard_configs 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own configs
CREATE POLICY "Users can delete their own configs" 
  ON public.dashboard_configs 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- Trigger: Auto-update updated_at on changes
-- ============================================================================
-- ✅ CORRECCIÓN: Usar la función correcta
CREATE TRIGGER dashboard_configs_updated_at_trigger
  BEFORE UPDATE ON public.dashboard_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dashboard_configs_timestamp();
