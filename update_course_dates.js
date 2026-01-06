import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const run = async () => {
    console.log("Updating course dates to 2026...");

    const targetCodes = ['CS101', 'MATH202', 'ENG101'];

    // Set dates to be currently active (e.g. Jan 2026 to June 2026)
    // Current date is Jan 6 2026.
    const updates = {
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        cohortYear: '2026' // Might as well update cohort to match
    };

    const { error } = await supabase
        .from('courses')
        .update(updates)
        .in('code', targetCodes);

    if (error) {
        console.error("Failed to update courses:", error);
    } else {
        console.log("Successfully updated course dates for:", targetCodes.join(', '));
    }
};

run();
