
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migrate = async () => {
    try {
        const dbPath = path.resolve('db.json');
        const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

        console.log('Starting Migration...');

        // Test connection
        console.log('Testing connection to Supabase...');
        const { error: healthCheckError } = await supabase.from('users').select('id').limit(1);
        if (healthCheckError) {
            console.error('Connection check failed:', healthCheckError);
            // If table doesn't exist, it might error with 404 or something, but we want to see it.
        } else {
            console.log('Connection successful.');
        }

        // 1. Users
        if (dbData.users && dbData.users.length > 0) {
            console.log(`Migrating ${dbData.users.length} users...`);
            const { error } = await supabase.from('users').upsert(dbData.users);
            if (error) console.error('Error migrating users:', error);
            else console.log('Users migrated.');
        }

        // 2. Courses
        if (dbData.courses && dbData.courses.length > 0) {
            console.log(`Migrating ${dbData.courses.length} courses...`);
            const { error } = await supabase.from('courses').upsert(dbData.courses);
            if (error) console.error('Error migrating courses:', error);
            else console.log('Courses migrated.');
        }

        // 3. Enrollments (Need to verify if they exist in db.json, mostly not in top 100 lines but might exist)
        if (dbData.enrollments && dbData.enrollments.length > 0) {
            console.log(`Migrating ${dbData.enrollments.length} enrollments...`);
            const { error } = await supabase.from('enrollments').upsert(dbData.enrollments);
            if (error) console.error('Error migrating enrollments:', error);
            else console.log('Enrollments migrated.');
        }

        // 4. Marks
        if (dbData.marks && dbData.marks.length > 0) {
            console.log(`Migrating ${dbData.marks.length} marks...`);
            const { error } = await supabase.from('marks').upsert(dbData.marks);
            if (error) console.error('Error migrating marks:', error);
            else console.log('Marks migrated.');
        }

        // 5. Claims
        if (dbData.claims && dbData.claims.length > 0) {
            console.log(`Migrating ${dbData.claims.length} claims...`);
            const { error } = await supabase.from('claims').upsert(dbData.claims);
            if (error) console.error('Error migrating claims:', error);
            else console.log('Claims migrated.');
        }

        console.log('Migration Completed!');

    } catch (err) {
        console.error('Migration failed:', err);
    }
};

migrate();
