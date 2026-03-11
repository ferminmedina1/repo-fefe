-- Add image_url field to warehouses table
ALTER TABLE public.warehouses
ADD COLUMN IF NOT EXISTS image_url text;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_warehouses_company_id ON public.warehouses(id);

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES 
  ('product-images', 'product-images', true, now(), now()),
  ('warehouse-images', 'warehouse-images', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for product-images (only if they don't exist)
DO $$ 
BEGIN
  -- Public product images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public product images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Public product images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'product-images');
  END IF;

  -- Authenticated users can upload product images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload product images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can upload product images"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
  END IF;

  -- Users can update their own product images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own product images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can update their own product images"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'product-images');
  END IF;

  -- Public warehouse images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public warehouse images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Public warehouse images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'warehouse-images');
  END IF;

  -- Authenticated users can upload warehouse images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload warehouse images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can upload warehouse images"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'warehouse-images' AND auth.role() = 'authenticated');
  END IF;

  -- Users can update their own warehouse images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own warehouse images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can update their own warehouse images"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'warehouse-images');
  END IF;
END $$;
