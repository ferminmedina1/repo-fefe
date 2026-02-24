-- Fix CRM owner lookup to use employee_id and add missing helper

CREATE OR REPLACE FUNCTION public.crm_user_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT employee_id
  FROM public.company_users
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.crm_is_owner_of_opportunity(opportunity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crm_opportunities o
    WHERE o.id = opportunity_id
      AND o.company_id = public.crm_user_company_id()
      AND o.owner_id = public.crm_user_employee_id()
  )
$$;
