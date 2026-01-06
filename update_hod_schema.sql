-- Update Users table to allow 'hod' role
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'lecturer', 'hod'));

-- Add timestamp columns if missing (just to be safe)
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Update Courses table to include duration
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP WITH TIME ZONE;

-- Create a demo HoD user
INSERT INTO public.users (id, name, email, "regNumber", role, password)
VALUES ('hod_01', 'Head of Dept', 'hod@school.edu', 'HOD1', 'hod', 'password')
ON CONFLICT ("regNumber") DO NOTHING;
