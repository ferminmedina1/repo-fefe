CREATE TABLE IF NOT EXISTS public.crm_opportunity_custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'textarea', 'select', 'checkbox', 'date')),
  options text[] NULL,
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_opp_custom_fields_company_key_unique UNIQUE (company_id, field_key)
);

CREATE INDEX IF NOT EXISTS crm_opp_custom_fields_company_active_idx
  ON public.crm_opportunity_custom_field_definitions (company_id, is_active);

CREATE INDEX IF NOT EXISTS crm_opp_custom_fields_company_sort_idx
  ON public.crm_opportunity_custom_field_definitions (company_id, sort_order, created_at);

DROP TRIGGER IF EXISTS update_crm_opp_custom_fields_updated_at ON public.crm_opportunity_custom_field_definitions;
CREATE TRIGGER update_crm_opp_custom_fields_updated_at
  BEFORE UPDATE ON public.crm_opportunity_custom_field_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.crm_opportunity_custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view CRM opportunity custom fields from their company"
  ON public.crm_opportunity_custom_field_definitions
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_users.company_id
      FROM public.company_users
      WHERE company_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert CRM opportunity custom fields for their company"
  ON public.crm_opportunity_custom_field_definitions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_users.company_id
      FROM public.company_users
      WHERE company_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update CRM opportunity custom fields for their company"
  ON public.crm_opportunity_custom_field_definitions
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_users.company_id
      FROM public.company_users
      WHERE company_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_users.company_id
      FROM public.company_users
      WHERE company_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete CRM opportunity custom fields for their company"
  ON public.crm_opportunity_custom_field_definitions
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_users.company_id
      FROM public.company_users
      WHERE company_users.user_id = auth.uid()
    )
  );
