// Test script to verify Supabase connection and data
// Run with: node test-supabase-data.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';

async function testSupabase() {
  console.log('🔍 Testing Supabase connection and data...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Test 1: Check captures table
  console.log('📊 Checking captures table...');
  const { data: captures, error: capturesError } = await supabase
    .from('captures')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(5);

  if (capturesError) {
    console.error('❌ Error fetching captures:', capturesError);
  } else {
    console.log(`✅ Found ${captures.length} recent captures`);
    captures.forEach(cap => {
      console.log(`   - ${cap.protocol} | ${new Date(cap.timestamp).toLocaleString()}`);
    });
  }

  // Test 2: Check positions table
  console.log('\n📊 Checking positions table...');
  const { data: positions, error: positionsError } = await supabase
    .from('positions')
    .select('*')
    .order('captured_at', { ascending: false })
    .limit(10);

  if (positionsError) {
    console.error('❌ Error fetching positions:', positionsError);
  } else {
    console.log(`✅ Found ${positions.length} recent positions`);

    // Group by protocol-pair to see latest unique positions
    const latestMap = new Map();
    positions.forEach(pos => {
      const key = `${pos.protocol}-${pos.pair}`;
      if (!latestMap.has(key)) {
        latestMap.set(key, pos);
      }
    });

    console.log(`\n📈 Latest positions (${latestMap.size} unique pairs):`);
    Array.from(latestMap.values()).forEach(pos => {
      const inRange = pos.in_range ? '✅ In Range' : '❌ Out of Range';
      console.log(`   ${pos.protocol.toUpperCase()} | ${pos.pair} | $${parseFloat(pos.balance).toFixed(2)} | ${inRange}`);
    });
  }

  // Test 3: Get statistics
  console.log('\n📊 Position Statistics:');
  if (positions && positions.length > 0) {
    const latestPositions = Array.from(
      positions.reduce((map, pos) => {
        const key = `${pos.protocol}-${pos.pair}`;
        const existing = map.get(key);
        if (!existing || new Date(pos.captured_at) > new Date(existing.captured_at)) {
          map.set(key, pos);
        }
        return map;
      }, new Map()).values()
    );

    const totalValue = latestPositions.reduce((sum, p) => sum + parseFloat(p.balance || 0), 0);
    const inRangeCount = latestPositions.filter(p => p.in_range).length;
    const protocols = [...new Set(latestPositions.map(p => p.protocol))];

    console.log(`   Total Positions: ${latestPositions.length}`);
    console.log(`   Total Value: $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   In Range: ${inRangeCount} / ${latestPositions.length}`);
    console.log(`   Protocols: ${protocols.join(', ')}`);
  }

  console.log('\n✅ Test complete!');
}

testSupabase().catch(console.error);
