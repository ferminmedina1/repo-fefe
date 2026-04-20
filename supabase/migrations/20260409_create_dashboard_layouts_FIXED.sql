-- FILE: 20260409_create_dashboard_layouts.sql
-- Tabla base para almacenar layouts de dashboards personalizados
-- CORRECCIONES:
-- ✅ Usa función update_dashboard_layouts_timestamp() (creada en FIX script)
-- ✅ Trigger correcto

CREATE TABLE IF NOT EXISTS public.dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Widgets serialized as JSON array
  -- Format: [{ id, type, size, order }, ...]
  widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Per user per company can have one default layout
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure one default per user-company combination
  CONSTRAINT unique_default_per_user_company UNIQUE (user_id, company_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_company 
  ON public.dashboard_layouts(user_id, company_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_is_default 
  ON public.dashboard_layouts(is_default) 
  WHERE is_default = TRUE;

-- Enable Row Level Security
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Policy: Users can only view their own layouts
CREATE POLICY "Users can view their own dashboard layouts" 
  ON public.dashboard_layouts 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can create layouts for their companies 
-- (validates they have access to company)
CREATE POLICY "Users can create dashboard layouts for their companies" 
  ON public.dashboard_layouts 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_users.company_id = dashboard_layouts.company_id 
        AND company_users.user_id = auth.uid()
    )
  );

-- Policy: Users can update only their own layouts
CREATE POLICY "Users can update their own dashboard layouts" 
  ON public.dashboard_layouts 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own layouts
CREATE POLICY "Users can delete their own dashboard layouts" 
  ON public.dashboard_layouts 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- Trigger: Auto-update updated_at on changes
-- ============================================================================
-- ✅ CORRECCIÓN: Usar la función correcta creada en FIX script
CREATE TRIGGER dashboard_layouts_updated_at_trigger
  BEFORE UPDATE ON public.dashboard_layouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dashboard_layouts_timestamp();
