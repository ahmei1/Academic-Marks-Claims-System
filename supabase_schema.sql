-- Enable UUID extension (optional if using UUIDs, but we use text IDs currently)
-- Create users table (mirroring current mock auth)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    "regNumber" TEXT UNIQUE,
    role TEXT CHECK (role IN ('student', 'lecturer')),
    password TEXT NOT NULL, -- Storing plain text as this is a migration of mock auth
    "academicYear" TEXT,
    program TEXT,
    department TEXT,
    intake TEXT,
    "cohortYear" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    "lecturerId" TEXT REFERENCES public.users(id),
    "targetYear" TEXT,
    intake TEXT,
    "cohortYear" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS public.enrollments (
    id TEXT PRIMARY KEY, -- or Composite Key (studentId, courseId)
    "studentId" TEXT REFERENCES public.users(id),
    "courseId" TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    "joinedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE("studentId", "courseId")
);

-- Create marks table
CREATE TABLE IF NOT EXISTS public.marks (
    id TEXT PRIMARY KEY,
    "studentId" TEXT REFERENCES public.users(id),
    "courseId" TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    cat INTEGER DEFAULT 0,
    fat INTEGER DEFAULT 0,
    assignment INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create claims table
CREATE TABLE IF NOT EXISTS public.claims (
    id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    "submittedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "studentId" TEXT REFERENCES public.users(id),
    "courseId" TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    "assessmentType" TEXT,
    explanation TEXT,
    "originalMark" INTEGER,
    "markId" TEXT REFERENCES public.marks(id) ON DELETE CASCADE,
    "lecturerComment" TEXT,
    "resolvedAt" TIMESTAMP WITH TIME ZONE
);

-- Disable RLS for now to allow simple migration and public access (matches json-server behavior)
-- In production, you would enable RLS and set policies.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- create policies for public access (temporarily mimicking json-server)
CREATE POLICY "Public Access Users" ON public.users FOR ALL USING (true);
CREATE POLICY "Public Access Courses" ON public.courses FOR ALL USING (true);
CREATE POLICY "Public Access Enrollments" ON public.enrollments FOR ALL USING (true);
CREATE POLICY "Public Access Marks" ON public.marks FOR ALL USING (true);
CREATE POLICY "Public Access Claims" ON public.claims FOR ALL USING (true);
