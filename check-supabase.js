// Check Supabase database for captured data
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCaptures() {
  console.log('🔍 Checking Supabase for captured data...\n');

  // Get all captures
  const { data: captures, error: capturesError } = await supabase
    .from('captures')
    .select('*')
    .order('timestamp', { ascending: false });

  if (capturesError) {
    console.error('❌ Error fetching captures:', capturesError);
    return;
  }

  console.log(`📊 Total Captures: ${captures?.length || 0}\n`);

  if (captures && captures.length > 0) {
    captures.forEach((capture, index) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Capture #${index + 1}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`ID:        ${capture.id}`);
      console.log(`URL:       ${capture.url}`);
      console.log(`Protocol:  ${capture.protocol || 'N/A'}`);
      console.log(`Title:     ${capture.title || 'N/A'}`);
      console.log(`Timestamp: ${new Date(capture.timestamp).toLocaleString()}`);

      // Show summary data if available
      if (capture.data?.content?.clmPositions) {
        const clm = capture.data.content.clmPositions;
        const posCount = clm.positions?.length || 0;

        console.log(`\n💼 Portfolio Summary:`);
        if (clm.summary) {
          console.log(`   Total Value:      $${clm.summary.totalValue || 'N/A'}`);
          console.log(`   Estimated Yield:  $${clm.summary.estimatedYieldAmount || 'N/A'} (${clm.summary.estimatedYieldPercent || 'N/A'}%)`);
          console.log(`   Pending Yield:    $${clm.summary.pendingYield || 'N/A'}`);
        }
        console.log(`   Positions:        ${posCount}`);

        if (clm.positions && clm.positions.length > 0) {
          console.log(`\n📈 Positions:`);
          clm.positions.forEach((pos, idx) => {
            const rangeIcon = pos.inRange ? '✅' : '❌';
            console.log(`   ${idx + 1}. ${rangeIcon} ${pos.pair || 'Unknown'}`);
            console.log(`      Balance:       $${pos.balance?.toLocaleString() || 'N/A'}`);
            console.log(`      APY:           ${pos.apy?.toFixed(2) || 'N/A'}%`);
            console.log(`      Pending Yield: $${pos.pendingYield?.toFixed(2) || 'N/A'}`);
            console.log(`      Range:         ${pos.rangeMin || 'N/A'} - ${pos.rangeMax || 'N/A'}`);
            console.log(`      Current Price: ${pos.currentPrice || 'N/A'}`);
            console.log(`      Status:        ${pos.rangeStatus || 'N/A'}`);
          });
        }
      }
    });

    // Check positions table
    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`POSITIONS TABLE`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const { data: positions, error: positionsError } = await supabase
      .from('positions')
      .select('*')
      .order('captured_at', { ascending: false });

    if (positionsError) {
      console.error('❌ Error fetching positions:', positionsError);
    } else {
      console.log(`📊 Total Positions: ${positions?.length || 0}\n`);

      if (positions && positions.length > 0) {
        // Group by capture_id
        const byCapture = {};
        positions.forEach(pos => {
          if (!byCapture[pos.capture_id]) {
            byCapture[pos.capture_id] = [];
          }
          byCapture[pos.capture_id].push(pos);
        });

        Object.entries(byCapture).forEach(([captureId, posArray]) => {
          console.log(`\nCapture ID: ${captureId}`);
          console.log(`Positions: ${posArray.length}`);

          posArray.forEach(pos => {
            const rangeIcon = pos.in_range ? '✅' : '❌';
            console.log(`  ${rangeIcon} ${pos.pair} | $${pos.balance?.toLocaleString() || 'N/A'} | APY: ${pos.apy?.toFixed(2) || 'N/A'}% | ${pos.range_status}`);
          });
        });
      }
    }

    // Export latest capture to file for inspection
    const latestCapture = captures[0];
    const exportPath = join(__dirname, 'latest-capture-from-db.json');
    fs.writeFileSync(exportPath, JSON.stringify(latestCapture, null, 2));
    console.log(`\n✅ Latest capture exported to: ${exportPath}`);

  } else {
    console.log('⚠️  No captures found in database.');
    console.log('\nTroubleshooting:');
    console.log('1. Make sure you clicked "Capture Page Data" in the extension');
    console.log('2. Check browser console for any errors during capture');
    console.log('3. Verify Supabase credentials in config.js match .env.local');
    console.log('4. Check if data was saved locally (check Downloads folder)');
  }
}

checkCaptures().catch(console.error);
