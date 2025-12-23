-- Add missing columns to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "targetYear" TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS intake TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "cohortYear" TEXT;
