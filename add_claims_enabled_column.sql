-- Add claims_enabled column to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "claimsEnabled" BOOLEAN DEFAULT false;
