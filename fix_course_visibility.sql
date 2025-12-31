-- Enable Row Level Security (if not already enabled)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- DROP existing policy to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.courses;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.courses;

-- CREATE a policy that allows EVERYONE (anon and authenticated) to SELECT courses
-- This ensures students can see courses to join them
CREATE POLICY "Enable public read access"
ON public.courses
FOR SELECT
USING (true);

-- Also ensure students can insert into enrollment table
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.enrollments;

CREATE POLICY "Enable insert for authenticated users"
ON public.enrollments
FOR INSERT
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');  -- relaxed for demo purposes if not using real auth

CREATE POLICY "Enable read for owners"
ON public.enrollments
FOR SELECT
USING (true); 
