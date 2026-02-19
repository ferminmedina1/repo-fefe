-- Create inventory_alert_rules table for custom alert configurations
CREATE TABLE IF NOT EXISTS public.inventory_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  
  -- Alert type: 'stock_lte' (<=), 'stock_eq_zero' (==0), 'stock_gte' (>=)
  condition_type TEXT NOT NULL CHECK (condition_type IN ('stock_lte', 'stock_eq_zero', 'stock_gte')),
  
  -- Scope: 'all', 'category', 'product'
  scope TEXT NOT NULL DEFAULT 'all' CHECK (scope IN ('all', 'category', 'product')),
  scope_category TEXT,        -- populated when scope = 'category'
  scope_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,  -- populated when scope = 'product'
  
  -- Threshold value (number of units)
  threshold INTEGER NOT NULL CHECK (threshold >= 0),
  
  -- Notification method
  notify_system BOOLEAN NOT NULL DEFAULT true,
  notify_email BOOLEAN NOT NULL DEFAULT false,
  notify_whatsapp BOOLEAN NOT NULL DEFAULT false,
  
  -- Status
  active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  name TEXT,  -- optional friendly name
  last_triggered_at TIMESTAMPTZ,
  triggered_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast company lookups
CREATE INDEX idx_inventory_alert_rules_company ON public.inventory_alert_rules(company_id);

-- RLS
ALTER TABLE public.inventory_alert_rules ENABLE ROW LEVEL SECURITY;

-- Policy: users can manage alert rules for their company
CREATE POLICY "Users can view own company alert rules"
  ON public.inventory_alert_rules FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own company alert rules"
  ON public.inventory_alert_rules FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own company alert rules"
  ON public.inventory_alert_rules FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete own company alert rules"
  ON public.inventory_alert_rules FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Auto-update updated_at
CREATE TRIGGER update_inventory_alert_rules_updated_at
  BEFORE UPDATE ON public.inventory_alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
