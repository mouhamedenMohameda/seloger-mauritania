#!/usr/bin/env tsx
/**
 * Apply the create_listing_with_location migration directly
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from apps/web/.env.local
const envPath = resolve(__dirname, '../apps/web/.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim();
    }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    console.log('📝 Applying create_listing_with_location function...\n');

    const sql = readFileSync(
        resolve(__dirname, '../supabase/migrations/20240101000010_create_listing_rpc.sql'),
        'utf-8'
    );

    // Execute the SQL directly
    const { error } = await supabase.rpc('exec', { sql });

    if (error) {
        console.error('❌ Error:', error.message);
        console.log('\n📋 Please apply this migration manually in your Supabase SQL Editor:');
        console.log('https://supabase.com/dashboard/project/_/sql/new');
        console.log('\nCopy this SQL:\n');
        console.log(sql);
        process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('\nYou can now create listings without the PostGIS error.');
}

applyMigration().catch(err => {
    console.error('\n❌ Failed to apply migration automatically.');
    console.log('\n📋 Please apply this migration manually:');
    console.log('1. Go to: https://supabase.com/dashboard/project/_/sql/new');
    console.log('2. Copy the contents of: supabase/migrations/20240101000010_create_listing_rpc.sql');
    console.log('3. Paste and run the SQL\n');
    console.error('Error details:', err.message);
    process.exit(1);
});
