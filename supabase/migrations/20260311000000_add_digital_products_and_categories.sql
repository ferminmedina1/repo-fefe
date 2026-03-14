-- Create product_categories table
CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(company_id, name)
);

-- Add missing fields to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_digital boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS digital_download_url text,
ADD COLUMN IF NOT EXISTS digital_prices jsonb DEFAULT '[]'::jsonb;

-- Enable RLS on product_categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_categories
CREATE POLICY "Users can view product categories in their company"
ON public.product_categories FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.company_users 
    WHERE user_id = auth.uid() AND active = true
  )
);

CREATE POLICY "Users can insert product categories in their company"
ON public.product_categories FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_users 
    WHERE user_id = auth.uid() AND active = true
  )
);

CREATE POLICY "Users can update product categories in their company"
ON public.product_categories FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.company_users 
    WHERE user_id = auth.uid() AND active = true
  )
);

CREATE POLICY "Users can delete product categories in their company"
ON public.product_categories FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.company_users 
    WHERE user_id = auth.uid() AND active = true
  )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_categories_company_id ON public.product_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_digital ON public.products(is_digital);
