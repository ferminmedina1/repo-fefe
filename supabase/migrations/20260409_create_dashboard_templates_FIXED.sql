-- FILE: 20260409_create_dashboard_templates.sql
-- Tabla para templates prearmados y guardados por usuarios
-- CORRECCIONES:
-- ✅ Función trigger se llama correctamente (update_dashboard_templates_timestamp)
-- ✅ UNIQUE constraint reemplazado con 2 índices separados
-- ✅ Mejor manejo de presets vs custom templates

CREATE TABLE IF NOT EXISTS public.dashboard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Null para templates del sistema, UUID para custom
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Template metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'custom',
  
  -- Serialized widgets layout
  -- Format: { widgets: [{ id, type, size, order }, ...] }
  widgets_data JSONB NOT NULL,
  
  -- System flags
  is_preset BOOLEAN DEFAULT FALSE,          -- TRUE = built-in system template
  is_public BOOLEAN DEFAULT FALSE,          -- Can other users see it
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- Indexes - CORRECCIÓN: 2 índices en lugar de UNIQUE con COALESCE
-- ============================================================================

-- Index 1: Presets (system templates) must have unique names
-- presets have user_id = NULL, so this enforces is_preset names are unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_templates_preset_unique
  ON public.dashboard_templates(name)
  WHERE is_preset = TRUE;

-- Index 2: Custom templates must have unique names per user-company
-- custom templates have user_id not NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_templates_custom_unique
  ON public.dashboard_templates(user_id, company_id, name)
  WHERE is_preset = FALSE AND user_id IS NOT NULL;

-- Index 3: Query presets quickly
CREATE INDEX IF NOT EXISTS idx_dashboard_templates_presets
  ON public.dashboard_templates(is_preset, category)
  WHERE is_preset = TRUE;

-- Index 4: Query user's custom templates
CREATE INDEX IF NOT EXISTS idx_dashboard_templates_user_company
  ON public.dashboard_templates(user_id, company_id);

-- Index 5: Query public templates
CREATE INDEX IF NOT EXISTS idx_dashboard_templates_public
  ON public.dashboard_templates(is_public)
  WHERE is_public = TRUE;

-- Enable Row Level Security
ALTER TABLE public.dashboard_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Anyone can view preset templates
CREATE POLICY "Anyone can view preset templates"
  ON public.dashboard_templates FOR SELECT
  USING (is_preset = TRUE OR auth.uid() = user_id OR is_public = TRUE);

-- Users can create custom templates
CREATE POLICY "Users can create custom templates"
  ON public.dashboard_templates FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND is_preset = FALSE
    AND EXISTS (
      SELECT 1 FROM public.company_users
      WHERE company_users.company_id = dashboard_templates.company_id
        AND company_users.user_id = auth.uid()
    )
  );

-- Users can update their own templates
CREATE POLICY "Users can update their own templates"
  ON public.dashboard_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_preset = FALSE);

-- Users can delete their own templates
CREATE POLICY "Users can delete their own templates"
  ON public.dashboard_templates FOR DELETE
  USING (auth.uid() = user_id AND is_preset = FALSE);

-- ============================================================================
-- Trigger: Auto-update updated_at on changes
-- ============================================================================
-- ✅ CORRECCIÓN: Usar función correcta (update_dashboard_templates_timestamp)
CREATE TRIGGER dashboard_templates_updated_at_trigger
  BEFORE UPDATE ON public.dashboard_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dashboard_templates_timestamp();

-- ============================================================================
-- Insert Default Presets
-- ============================================================================
-- NOTA: Usar NULL para company_id en presets (son templates del sistema, no específicas de empresa)
INSERT INTO public.dashboard_templates 
  (name, description, category, widgets_data, is_preset, company_id)
VALUES 
  (
    'Sales Overview',
    'KPIs principales más gráfico de ventas últimos 7 días',
    'sales',
    jsonb_build_object(
      'widgets', jsonb_build_array(
        jsonb_build_object('type', 'monthly-sales', 'size', 'half', 'order', 0),
        jsonb_build_object('type', 'gross-margin', 'size', 'half', 'order', 1),
        jsonb_build_object('type', 'sales-7days', 'size', 'full', 'order', 2),
        jsonb_build_object('type', 'top-products', 'size', 'full', 'order', 3)
      )
    ),
    TRUE,
    NULL
  ),
  (
    'Finance Dashboard',
    'Margen bruto, cuentas por cobrar y cotizaciones',
    'finance',
    jsonb_build_object(
      'widgets', jsonb_build_array(
        jsonb_build_object('type', 'gross-margin', 'size', 'half', 'order', 0),
        jsonb_build_object('type', 'receivables', 'size', 'half', 'order', 1),
        jsonb_build_object('type', 'rates', 'size', 'full', 'order', 2)
      )
    ),
    TRUE,
    NULL
  ),
  (
    'Operations',
    'Alertas de stock, clientes principales y ventas del día',
    'ops',
    jsonb_build_object(
      'widgets', jsonb_build_array(
        jsonb_build_object('type', 'critical-stock', 'size', 'full', 'order', 0),
        jsonb_build_object('type', 'top-customers', 'size', 'full', 'order', 1),
        jsonb_build_object('type', 'sales-today', 'size', 'half', 'order', 2)
      )
    ),
    TRUE,
    NULL
  ),
  (
    'Executive',
    'Resumen ejecutivo: ventas, margen, cobrar y cotizaciones',
    'sales',
    jsonb_build_object(
      'widgets', jsonb_build_array(
        jsonb_build_object('type', 'monthly-sales', 'size', 'half', 'order', 0),
        jsonb_build_object('type', 'gross-margin', 'size', 'half', 'order', 1),
        jsonb_build_object('type', 'receivables', 'size', 'half', 'order', 2),
        jsonb_build_object('type', 'rates', 'size', 'half', 'order', 3)
      )
    ),
    TRUE,
    NULL
  ),
  (
    'Minimal',
    'Solo ventas y margen',
    'sales',
    jsonb_build_object(
      'widgets', jsonb_build_array(
        jsonb_build_object('type', 'monthly-sales', 'size', 'half', 'order', 0),
        jsonb_build_object('type', 'gross-margin', 'size', 'half', 'order', 1)
      )
    ),
    TRUE,
    NULL
  );
