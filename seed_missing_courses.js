import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const coursesToSeed = [
    {
        code: 'CS101',
        name: 'Introduction to Computer Science',
        targetYear: 'Year 1',
        intake: 'Sept 2024',
        cohortYear: '2024',
        startDate: '2024-09-01',
        endDate: '2024-12-15'
    },
    {
        code: 'MATH202',
        name: 'Advanced Mathematics',
        targetYear: 'Year 1',
        intake: 'Sept 2024',
        cohortYear: '2024',
        startDate: '2024-09-01',
        endDate: '2024-12-15'
    },
    {
        code: 'ENG101',
        name: 'Technical English',
        targetYear: 'Year 1',
        intake: 'Sept 2024',
        cohortYear: '2024',
        startDate: '2024-09-01',
        endDate: '2024-12-15'
    }
];

const run = async () => {
    console.log("Seeding missing courses...");

    // We need a lecturer ID to respect FK. Fetch one.
    const { data: users } = await supabase.from('users').select('id').eq('role', 'lecturer').limit(1);
    const lecturerId = users && users.length > 0 ? users[0].id : null;

    if (!lecturerId) {
        console.error("No lecturer found! Cannot create courses.");
        return;
    }

    for (const c of coursesToSeed) {
        // Check if exists
        const { data } = await supabase.from('courses').select('id').eq('code', c.code).maybeSingle();
        if (!data) {
            console.log(`Inserting ${c.code}...`);
            const { error } = await supabase.from('courses').insert([{
                ...c,
                id: Math.floor(Math.random() * 1000000).toString(), // Generate simple string ID
                lecturerId: lecturerId
            }]);
            if (error) console.error(`Failed to insert ${c.code}:`, error.message);
            else console.log(`Inserted ${c.code}`);
        } else {
            console.log(`${c.code} already exists.`);
        }
    }
};

run();
