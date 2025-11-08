/**
 * Clear all data from Supabase database
 * This will delete all captures and positions
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Supabase credentials must be set in .env.local');
  console.error('Looking for: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function clearDatabase() {
  console.log('🗑️  Starting database cleanup...\n');

  try {
    // Step 1: Count current records
    const { count: positionsCount } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true });

    const { count: capturesCount } = await supabase
      .from('captures')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Current database state:`);
    console.log(`   - Positions: ${positionsCount}`);
    console.log(`   - Captures: ${capturesCount}\n`);

    if (positionsCount === 0 && capturesCount === 0) {
      console.log('✅ Database is already empty!');
      return;
    }

    // Step 2: Delete all positions
    console.log('🗑️  Deleting all positions...');
    const { error: positionsError } = await supabase
      .from('positions')
      .delete()
      .neq('id', 0); // Delete all records (neq 0 matches all)

    if (positionsError) {
      console.error('❌ Error deleting positions:', positionsError);
      throw positionsError;
    }
    console.log(`✅ Deleted ${positionsCount} positions`);

    // Step 3: Delete all captures
    console.log('🗑️  Deleting all captures...');
    const { error: capturesError } = await supabase
      .from('captures')
      .delete()
      .neq('id', ''); // Delete all records

    if (capturesError) {
      console.error('❌ Error deleting captures:', capturesError);
      throw capturesError;
    }
    console.log(`✅ Deleted ${capturesCount} captures`);

    // Step 4: Verify deletion
    const { count: finalPositionsCount } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true });

    const { count: finalCapturesCount } = await supabase
      .from('captures')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Final database state:`);
    console.log(`   - Positions: ${finalPositionsCount}`);
    console.log(`   - Captures: ${finalCapturesCount}\n`);

    if (finalPositionsCount === 0 && finalCapturesCount === 0) {
      console.log('✅ Database successfully cleared!');
      console.log('🎯 Ready for fresh captures of your real positions');
    } else {
      console.warn('⚠️  Warning: Some records may not have been deleted');
    }

  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}

// Run the cleanup
clearDatabase();
