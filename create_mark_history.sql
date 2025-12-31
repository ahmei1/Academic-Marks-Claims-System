-- Create mark_history table for Audit Trail
CREATE TABLE IF NOT EXISTS public.mark_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "markId" TEXT REFERENCES public.marks(id) ON DELETE CASCADE,
    "changedBy" TEXT REFERENCES public.users(id), -- Nullable if system change
    "oldValues" JSONB,
    "newValues" JSONB,
    "changeReason" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS (Public access for now as per other tables)
ALTER TABLE public.mark_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Mark History" ON public.mark_history FOR ALL USING (true);
