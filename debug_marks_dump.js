console.log("Script starting...");
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log("Fetching marks...");
    const { data, error } = await supabase.from('marks').select('*');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Marks Count:", data.length);
        // Find duplicates
        const seen = new Set();
        const duplicates = [];
        data.forEach(m => {
            const key = `${m.studentId}-${m.courseId}`;
            if (seen.has(key)) {
                duplicates.push(m);
            } else {
                seen.add(key);
            }
        });

        console.log("Duplicates found:", duplicates.length);
        if (duplicates.length > 0) {
            console.log("Example Duplicate:", JSON.stringify(duplicates[0], null, 2));
            console.log("All Duplicates:", JSON.stringify(duplicates, null, 2));
        } else {
            console.log("No duplicates found based on studentId-courseId unique constraint.");
            // Maybe check if same student-course appears multiple times?
        }

        // Just dump all marks for inspection if small
        if (data.length < 50) {
            console.log(JSON.stringify(data, null, 2));
        }
    }
}

run();
