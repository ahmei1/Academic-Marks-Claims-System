-- Migration to add startDate and endDate to courses table

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP WITH TIME ZONE;
