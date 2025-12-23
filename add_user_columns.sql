-- Add missing columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS intake TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "cohortYear" TEXT;
