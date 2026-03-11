-- Add image_url field to warehouses table
ALTER TABLE public.warehouses
ADD COLUMN IF NOT EXISTS image_url text;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_warehouses_company_id ON public.warehouses(id);
