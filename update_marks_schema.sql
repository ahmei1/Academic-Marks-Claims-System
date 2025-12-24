-- Add new mark columns
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS "individualAssignment" INTEGER DEFAULT 0;
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS "groupAssignment" INTEGER DEFAULT 0;
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS "quiz" INTEGER DEFAULT 0;
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS "attendance" INTEGER DEFAULT 0;

-- Rename/Keep existing columns (CAT, FAT already exist)
-- CAT and FAT are already present: "cat", "fat"
-- Assignment is present but now we have specific assignments. 
-- We can keep 'assignment' as legacy or drop/ignore it. 
-- Let's keep it for now to avoid breaking existing queries until code is updated, 
-- but the new code will use the new columns.
