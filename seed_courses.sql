-- Seed Data for Courses
-- Run this in Supabase SQL Editor to populate the courses table

-- 1. Ensure a lecturer exists for foreign key constraints (Must run FIRST)
INSERT INTO public.users (id, name, email, "regNumber", role, password)
VALUES ('u2', 'Dr. Smith', 'lecturer@univ.edu', 'L001', 'lecturer', 'password')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Courses
INSERT INTO public.courses (id, code, name, "lecturerId", intake, "cohortYear", "startDate", "endDate")
VALUES 
('c1', 'CS101', 'Intro to Computer Science', 'u2', 'Sept 2024', '2024', '2024-09-01', '2024-12-31'),
('c2', 'MATH202', 'Advanced Mathematics', 'u2', 'Sept 2024', '2024', '2024-09-01', '2024-12-31'),
('c3', 'ENG101', 'Technical Writing', 'u2', 'Jan 2025', '2025', '2025-01-15', '2025-05-15')
ON CONFLICT (id) DO NOTHING;
