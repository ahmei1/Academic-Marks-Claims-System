-- Drop existing constraints
ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS "enrollments_courseId_fkey";
ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS "marks_courseId_fkey";
ALTER TABLE public.claims DROP CONSTRAINT IF EXISTS "claims_courseId_fkey";
ALTER TABLE public.claims DROP CONSTRAINT IF EXISTS "claims_markId_fkey";

-- Add constraints with ON DELETE CASCADE
ALTER TABLE public.enrollments
    ADD CONSTRAINT "enrollments_courseId_fkey"
    FOREIGN KEY ("courseId")
    REFERENCES public.courses(id)
    ON DELETE CASCADE;

ALTER TABLE public.marks
    ADD CONSTRAINT "marks_courseId_fkey"
    FOREIGN KEY ("courseId")
    REFERENCES public.courses(id)
    ON DELETE CASCADE;

ALTER TABLE public.claims
    ADD CONSTRAINT "claims_courseId_fkey"
    FOREIGN KEY ("courseId")
    REFERENCES public.courses(id)
    ON DELETE CASCADE;

ALTER TABLE public.claims
    ADD CONSTRAINT "claims_markId_fkey"
    FOREIGN KEY ("markId")
    REFERENCES public.marks(id)
    ON DELETE CASCADE;
