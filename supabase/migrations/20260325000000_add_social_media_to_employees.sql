-- Add social media URLs to employees table
ALTER TABLE IF EXISTS public.employees
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_username TEXT;
