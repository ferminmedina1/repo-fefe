-- FILE: 20260410_create_custom_metrics_tables.sql
-- Tablas para métricas personalizadas (fórmulas) y valores históricos
-- CORRECCIONES:
-- ✅ Usar company_users para validar acceso
-- ✅ Índices optimizados
-- ✅ CHECK constraint mejorado

CREATE TABLE IF NOT EXISTS public.custom_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Formula string (será evaluada en aplicación)
  -- Ejemplo: "SALES / 30" o "SUM(orders.amount) WHERE created_at > now() - interval '30 days'"
  formula TEXT NOT NULL,
  
  -- Data source table
  data_source VARCHAR(255) NOT NULL,
  
  -- Operation type - define cómo calcular
  operation VARCHAR(50) DEFAULT 'custom'::character varying,
  
  -- Field to aggregate (si operation no es custom)
  field VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- Constraint: operation debe ser válido
  CONSTRAINT valid_operation CHECK (
    operation IN ('sum', 'avg', 'max', 'min', 'count', 'custom')
  )
);

CREATE TABLE IF NOT EXISTS public.metric_values (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_id UUID NOT NULL REFERENCES public.custom_metrics(id) ON DELETE CASCADE,
  
  -- Date of the metric value
  date DATE NOT NULL,
  
  -- Computed value
  value NUMERIC NOT NULL,
  
  -- Timestamp when recorded
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- Ensure one value per metric per date
  CONSTRAINT unique_metric_date UNIQUE (metric_id, date)
);

-- ============================================================================
-- Indexes - Optimizados para queries comunes
-- ============================================================================

-- Query by company
CREATE INDEX IF NOT EXISTS idx_custom_metrics_company_id 
  ON public.custom_metrics(company_id);

-- Query recent metrics
CREATE INDEX IF NOT EXISTS idx_custom_metrics_created_at 
  ON public.custom_metrics(created_at DESC);

-- Query values by metric (most common)
CREATE INDEX IF NOT EXISTS idx_metric_values_metric_id 
  ON public.metric_values(metric_id);

-- Query recent values
CREATE INDEX IF NOT EXISTS idx_metric_values_timestamp 
  ON public.metric_values(timestamp DESC);

-- Query values by date range
CREATE INDEX IF NOT EXISTS idx_metric_values_date 
  ON public.metric_values(date);

-- Composite: metric + date for efficient lookups
CREATE INDEX IF NOT EXISTS idx_metric_values_metric_date
  ON public.metric_values(metric_id, date DESC);

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================

ALTER TABLE public.custom_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_values ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Row Level Security Policies for custom_metrics
-- ============================================================================

-- Users can view metrics of their company
CREATE POLICY "Users can view custom metrics of their company"
  ON public.custom_metrics FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can create metrics for their company
CREATE POLICY "Users can create custom metrics for their company"
  ON public.custom_metrics FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can update metrics of their company
CREATE POLICY "Users can update custom metrics of their company"
  ON public.custom_metrics FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete metrics of their company
CREATE POLICY "Users can delete custom metrics of their company"
  ON public.custom_metrics FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Row Level Security Policies for metric_values
-- ============================================================================

-- Users can view values for metrics of their company
CREATE POLICY "Users can view metric values for their company's metrics"
  ON public.metric_values FOR SELECT
  USING (
    metric_id IN (
      SELECT id FROM public.custom_metrics cm
      WHERE cm.company_id IN (
        SELECT company_id FROM public.company_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can insert values for their company's metrics
CREATE POLICY "Users can insert metric values for their company's metrics"
  ON public.metric_values FOR INSERT
  WITH CHECK (
    metric_id IN (
      SELECT id FROM public.custom_metrics cm
      WHERE cm.company_id IN (
        SELECT company_id FROM public.company_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can update values for their company's metrics (for corrections)
CREATE POLICY "Users can update metric values for their company's metrics"
  ON public.metric_values FOR UPDATE
  USING (
    metric_id IN (
      SELECT id FROM public.custom_metrics cm
      WHERE cm.company_id IN (
        SELECT company_id FROM public.company_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can delete values for their company's metrics
CREATE POLICY "Users can delete metric values for their company's metrics"
  ON public.metric_values FOR DELETE
  USING (
    metric_id IN (
      SELECT id FROM public.custom_metrics cm
      WHERE cm.company_id IN (
        SELECT company_id FROM public.company_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Trigger: Auto-update updated_at for custom_metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_custom_metrics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_metrics_updated_at_trigger
  BEFORE UPDATE ON public.custom_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_custom_metrics_timestamp();
