-- Remove webhook_url column from CRM report schedules

ALTER TABLE public.crm_report_schedules
  DROP COLUMN IF EXISTS webhook_url;
