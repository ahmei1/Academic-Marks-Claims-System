-- Add isPublished column to marks table
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN DEFAULT false;
