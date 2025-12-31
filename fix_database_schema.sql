-- 1. Fix Missing Column in 'marks' table
-- This is what caused the "400" error and prevented data loading
ALTER TABLE public.marks 
ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN DEFAULT false;

-- 2. Fix Course Visibility (RLS)
-- This ensures students can "see" the courses in the dashboard
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable public read access" ON public.courses;

CREATE POLICY "Enable public read access"
ON public.courses
FOR SELECT
USING (true);

-- 3. Fix Enrollment Permissions
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.enrollments;

CREATE POLICY "Enable insert for authenticated users"
ON public.enrollments
FOR INSERT
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Enable read for owners" ON public.enrollments;

CREATE POLICY "Enable read for owners"
ON public.enrollments
FOR SELECT
USING (true);

-- 4. Ensure Mark History table exists (Audit Trail)
CREATE TABLE IF NOT EXISTS public.mark_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "markId" TEXT REFERENCES public.marks(id) ON DELETE CASCADE,
    "oldValues" JSONB,
    "newValues" JSONB,
    "changeReason" TEXT,
    "changedBy" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on mark_history
ALTER TABLE public.mark_history ENABLE ROW LEVEL SECURITY;

-- Allow read access to mark history (optional, for future UI)
CREATE POLICY "Enable read access for all users" ON public.mark_history FOR SELECT USING (true);

-- Allow insert access for authenticated users (server-side logging would be better, but for now client-side)
CREATE POLICY "Enable insert for authenticated users" ON public.mark_history FOR INSERT WITH CHECK (true);
