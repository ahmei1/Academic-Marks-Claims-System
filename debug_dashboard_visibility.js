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
    console.log('--- Debugging Dashboard Visibility ---');

    // 1. Get a student
    const { data: students, error: uErr } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .limit(1);

    if (uErr || !students || students.length === 0) {
        console.error('No students found.', uErr);
        return;
    }
    const user = students[0];
    console.log(`Student: ${user.name} (${user.id})`);
    console.log(`- Academic Year: "${user.academicYear}"`);
    console.log(`- Intake: "${user.intake}"`);

    // 2. Get Courses
    const { data: allCourses, error: cErr } = await supabase.from('courses').select('*');
    if (cErr) { console.error('Error fetching courses', cErr); return; }
    console.log(`Total Courses Found: ${allCourses.length}`);

    // 3. Get Student Modules
    let myModuleCodes = [];
    const { data: modules, error: mErr } = await supabase
        .from('student_modules')
        .select('*')
        .eq('studentId', user.id);

    if (mErr) {
        console.error('Error fetching student_modules:', mErr.message);
    } else if (!modules || modules.length === 0) {
        console.log('WARNING: No modules found for this student in "student_modules" table.');
    } else {
        myModuleCodes = modules.map(m => m.moduleCode);
        console.log(`Found ${myModuleCodes.length} assigned modules in sheet:`, myModuleCodes);
    }

    // 4. Get Enrollments
    const { data: enrollments } = await supabase.from('enrollments').select('*').eq('studentId', user.id);
    const enrolledCourseIds = enrollments ? enrollments.map(e => e.courseId) : [];
    console.log(`Enrolled in ${enrolledCourseIds.length} courses: ${enrolledCourseIds}`);

    // 6. Access Filtering Logic
    console.log('\n--- Evaluating Filtering Logic ---');

    allCourses.forEach(c => {
        const isJoined = enrolledCourseIds.includes(c.id);

        // Debug Matching
        const isInSheet = myModuleCodes.includes(c.code);

        // Check for common issues (Case/Trim)
        const codeMatchParams = myModuleCodes.some(code => code.trim().toLowerCase() === c.code.trim().toLowerCase());

        console.log(`Course [${c.code}] (ID: ${c.id}):`);
        console.log(`   - Joined? ${isJoined}`);
        console.log(`   - In Sheet (Exact)? ${isInSheet}`);
        console.log(`   - In Sheet (Loose)? ${codeMatchParams}`);

        if (isInSheet && !isJoined) {
            console.log(`   => SHOULD BE VISIBLE!`);
        } else if (!isInSheet && !isJoined) {
            console.log(`   => Hidden (Not in sheet)`);
        } else if (isJoined) {
            console.log(`   => Hidden (Because already joined)`);
        }
    });
};

run();
