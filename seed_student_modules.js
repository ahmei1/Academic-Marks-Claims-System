import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const run = async () => {
    console.log('--- Applying Schema Migration ---');

    // Read the SQL file
    const sqlPath = path.resolve('create_student_modules_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Supabase JS client doesn't support raw SQL execution directly via public API usually, 
    // unless using RPC or if we just use the table API to "test" existence.
    // BUT we can simulate "Seeding" using the table API if the table existed.
    // Since I cannot run DDL (CREATE TABLE) via supabase-js client directly without RPC,
    // I will assume the USER runs the SQL in their Supabase dashboard OR I will try to use the `users` table
    // to verify connection and warn the user.

    // HOWEVER, for this environment, often the "SQL" files are just for show unless I have a way to run them.
    // Wait, I can try to use a postgres client if available? 
    // Or I'll just use the supabase client to INSERT if the table exists.
    // The user usually runs SQL manually. 
    // I will notify the user to run the SQL.

    // BUT, I can automate the SEEDING part if the table exists.

    console.log('Checking for students...');
    const { data: students, error: uErr } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .limit(1);

    if (uErr) {
        console.error('Error fetching students:', uErr);
        return;
    }

    if (!students || students.length === 0) {
        console.log('No students found to seed modules for.');
        return;
    }

    const student = students[0];
    console.log(`Seeding modules for student: ${student.name} (${student.id})`);

    // Assign CS101 and MATH202 to this student
    const modules = [
        { studentId: student.id, moduleCode: 'CS101', academicYear: 'Year 1' },
        { studentId: student.id, moduleCode: 'MATH202', academicYear: 'Year 1' },
        { studentId: student.id, moduleCode: 'ENG101', academicYear: 'Year 1' } // A failed one logically?
    ];

    // Try sending to 'student_modules'
    const { error: seedErr } = await supabase
        .from('student_modules')
        .insert(modules);

    if (seedErr) {
        console.error('Failed to seed modules. PLEASE RUN "create_student_modules_table.sql" IN SUPABASE SQL EDITOR FIRST.');
        console.error('Error:', seedErr.message);
    } else {
        console.log('Successfully seeded student_modules!');
    }
};

run();
