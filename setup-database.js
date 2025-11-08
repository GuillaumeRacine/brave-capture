#!/usr/bin/env node
/**
 * Automatically create Supabase database tables
 *
 * This script reads your .env.local and creates the necessary
 * tables in your Supabase database.
 *
 * Usage: npm run setup:db
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SQL_SCHEMA = `
-- Create captures table
CREATE TABLE IF NOT EXISTS captures (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  protocol TEXT,
  data JSONB NOT NULL,
  user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create positions table (denormalized for easier querying)
CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  capture_id TEXT NOT NULL REFERENCES captures(id) ON DELETE CASCADE,
  protocol TEXT NOT NULL,
  pair TEXT NOT NULL,
  token0 TEXT,
  token1 TEXT,
  fee_tier TEXT,
  balance NUMERIC,
  pending_yield NUMERIC,
  apy NUMERIC,
  range_min NUMERIC,
  range_max NUMERIC,
  current_price NUMERIC,
  in_range BOOLEAN,
  range_status TEXT,
  distance_from_range TEXT,
  network TEXT,
  captured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_captures_timestamp ON captures(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_captures_protocol ON captures(protocol);
CREATE INDEX IF NOT EXISTS idx_positions_capture_id ON positions(capture_id);
CREATE INDEX IF NOT EXISTS idx_positions_protocol ON positions(protocol);
CREATE INDEX IF NOT EXISTS idx_positions_pair ON positions(pair);
CREATE INDEX IF NOT EXISTS idx_positions_in_range ON positions(in_range);
CREATE INDEX IF NOT EXISTS idx_positions_captured_at ON positions(captured_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - you can add auth later)
DROP POLICY IF EXISTS "Enable all access for captures" ON captures;
CREATE POLICY "Enable all access for captures" ON captures
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for positions" ON positions;
CREATE POLICY "Enable all access for positions" ON positions
  FOR ALL USING (true) WITH CHECK (true);
`;

async function setupDatabase() {
  console.log('🚀 Setting up Supabase database...\n');
  console.log('📍 Project:', supabaseUrl);
  console.log('');

  try {
    // Execute the SQL schema
    const { data, error } = await supabase.rpc('exec_sql', { sql: SQL_SCHEMA });

    if (error) {
      console.error('❌ Error creating tables:', error.message);
      console.error('\n⚠️  Note: The anon key may not have permission to create tables.');
      console.error('   Please run the SQL manually in Supabase SQL Editor:');
      console.error('   1. Go to your Supabase project');
      console.error('   2. Click "SQL Editor"');
      console.error('   3. Copy the SQL from SUPABASE_SETUP.md');
      console.error('   4. Paste and click "Run"\n');
      process.exit(1);
    }

    console.log('✅ Database tables created successfully!');
    console.log('');
    console.log('Tables created:');
    console.log('  📊 captures - stores complete capture data');
    console.log('  📊 positions - stores individual positions');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Load the extension in Chrome');
    console.log('  2. Visit a DeFi protocol (Orca, Raydium, etc.)');
    console.log('  3. Click the extension icon → "Capture Page Data"');
    console.log('  4. Check your data in Supabase Table Editor!');
    console.log('');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('\nPlease create tables manually using SUPABASE_SETUP.md');
    process.exit(1);
  }
}

// Verify connection first
async function verifyConnection() {
  const { data, error } = await supabase
    .from('_supabase_tables')
    .select('*')
    .limit(1);

  if (error && error.message.includes('relation "_supabase_tables" does not exist')) {
    // This is expected - just testing the connection
    return true;
  }

  return !error;
}

console.log('🔍 Verifying Supabase connection...\n');

verifyConnection()
  .then(connected => {
    if (!connected) {
      console.error('❌ Could not connect to Supabase.');
      console.error('   Check your credentials in .env.local');
      process.exit(1);
    }
    return setupDatabase();
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    console.error('\n📖 Manual Setup Required:');
    console.error('   1. Go to your Supabase project dashboard');
    console.error('   2. Open SQL Editor');
    console.error('   3. Run the SQL from SUPABASE_SETUP.md');
    process.exit(1);
  });
