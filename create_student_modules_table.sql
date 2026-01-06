-- Create table for explicitly assigned modules per student
create table if not exists public.student_modules (
  id uuid default gen_random_uuid() primary key,
  "studentId" text references public.users(id) on delete cascade not null,
  "moduleCode" text not null, -- Matches courses.code e.g. 'CS101'
  "academicYear" text,        -- Optional: e.g. 'Year 1'
  "isOptional" boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.student_modules enable row level security;

-- Policies
create policy "Enable read access for owners"
on public.student_modules
for select
using (auth.uid()::text = "studentId");

-- For now, allow public read/write to simplify dev/admin usage
create policy "Enable all access for now"
on public.student_modules
for all
using (true)
with check (true);

-- Seed Data for existing user (assuming 'u1' is the student from previous seeds or we find one)
-- Just inserting based on the user ID usually found in mocks or inferred. 
-- Let's try to link to the first found student if running dynamically, but for SQL specific:
-- (We will run a JS script to seed properly using the actual user ID)
