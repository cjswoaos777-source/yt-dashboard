import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Fetching categories...");
    const { data: catData, error } = await supabase
        .from('tier0_realtime_ranking')
        .select('category_name')
        .limit(100000);

    if (error) {
        console.error("Supabase error:", error);
        return;
    }

    console.log("catData length:", catData ? catData.length : 'null');

    if (catData) {
        const fromDb = Array.from(
            new Set(catData.map((r) => r.category_name).filter(Boolean))
        ).sort();
        console.log("fromDb:", fromDb);
        console.log("fromDb length:", fromDb.length);
    }
}

test();
