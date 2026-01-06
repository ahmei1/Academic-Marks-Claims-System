import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const run = async () => {
    console.log("Checking student_modules...");
    const { data, error } = await supabase.from('student_modules').select('*');
    if (error) console.error("Error:", error);
    else console.log("Rows:", data);
    process.exit(0); // Force exit
};
run();
