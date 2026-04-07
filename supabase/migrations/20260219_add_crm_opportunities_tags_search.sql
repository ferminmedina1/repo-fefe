-- Add tags_search generated column for partial tag matching

ALTER TABLE public.crm_opportunities
  ADD COLUMN IF NOT EXISTS tags_search text;

CREATE OR REPLACE FUNCTION public.crm_opportunities_set_tags_search()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tags_search := lower(array_to_string(coalesce(NEW.tags, '{}'::text[]), ' '));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_opportunities_set_tags_search ON public.crm_opportunities;
CREATE TRIGGER crm_opportunities_set_tags_search
  BEFORE INSERT OR UPDATE OF tags
  ON public.crm_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_opportunities_set_tags_search();

CREATE INDEX IF NOT EXISTS crm_opportunities_tags_search_idx
  ON public.crm_opportunities (tags_search);
