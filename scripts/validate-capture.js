#!/usr/bin/env node
/**
 * AI-Powered Capture Validation Script
 *
 * This script validates captured CLM position data using:
 * 1. Basic sanity checks (missing data, invalid ranges, etc.)
 * 2. AI analysis (Claude) for anomaly detection and inference
 *
 * Usage: node scripts/validate-capture.js <path-to-capture.json>
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Basic validation checks
 */
function performSanityChecks(capture) {
  const issues = [];
  const warnings = [];

  if (!capture.data?.content?.clmPositions) {
    issues.push('No CLM positions data found');
    return { issues, warnings, passed: false };
  }

  const { clmPositions } = capture.data.content;
  const { positions, summary } = clmPositions;

  // Check summary data
  if (!summary?.totalValue) {
    issues.push('Missing total portfolio value');
  }

  if (summary?.totalValue && parseFloat(summary.totalValue) < 0) {
    issues.push('Negative total portfolio value');
  }

  // Validate each position
  positions.forEach((pos, index) => {
    const posId = `Position ${index + 1} (${pos.pair || 'unknown'})`;

    // Missing critical data
    if (!pos.pair) issues.push(`${posId}: Missing pair name`);
    if (pos.balance === null || pos.balance === undefined) {
      issues.push(`${posId}: Missing balance`);
    }
    if (!pos.currentPrice) warnings.push(`${posId}: Missing current price`);

    // Range validation
    if (pos.rangeMin !== null && pos.rangeMax !== null) {
      if (pos.rangeMin > pos.rangeMax) {
        issues.push(`${posId}: Range min (${pos.rangeMin}) > range max (${pos.rangeMax})`);
      }

      // In-range logic validation
      if (pos.currentPrice && pos.rangeMin && pos.rangeMax) {
        const shouldBeInRange = pos.currentPrice >= pos.rangeMin && pos.currentPrice <= pos.rangeMax;
        if (shouldBeInRange !== pos.inRange) {
          issues.push(
            `${posId}: In-range logic error. Current: ${pos.currentPrice}, Range: ${pos.rangeMin}-${pos.rangeMax}, inRange: ${pos.inRange}`
          );
        }
      }
    } else {
      warnings.push(`${posId}: Missing range data`);
    }

    // Outlier detection
    if (pos.apy && pos.apy > 10000) {
      warnings.push(`${posId}: Suspiciously high APY: ${pos.apy}%`);
    }

    if (pos.apy && pos.apy < 0) {
      issues.push(`${posId}: Negative APY: ${pos.apy}%`);
    }

    if (pos.balance && pos.balance < 0) {
      issues.push(`${posId}: Negative balance: $${pos.balance}`);
    }

    // Logic checks
    if (pos.inRange && pos.pendingYield === 0 && pos.balance > 100) {
      warnings.push(`${posId}: Position is in-range with balance but has no pending yield`);
    }
  });

  return {
    issues,
    warnings,
    passed: issues.length === 0,
  };
}

/**
 * AI-powered validation using Claude
 */
async function aiValidation(capture) {
  const { clmPositions } = capture.data.content;

  const prompt = `You are a DeFi data validation expert. Analyze this CLM (Concentrated Liquidity) position data and identify:

1. **Data Quality Issues**: Missing values, inconsistencies, or errors
2. **Anomalies**: Unusual patterns, outliers, or suspicious values
3. **Inferences**: Can you infer any missing data from available context?
4. **Risk Flags**: Positions that might need attention (out of range, high IL risk, etc.)

Here's the captured data:

\`\`\`json
${JSON.stringify(clmPositions, null, 2)}
\`\`\`

**Context:**
- Protocol: ${capture.protocol || 'Orca'}
- Captured at: ${capture.timestamp}
- URL: ${capture.data.url}

Provide a structured analysis with:
- Overall data quality score (0-100)
- Specific issues found
- Recommendations
- Any inferred or corrected values

Be concise but thorough.`;

  console.log('\n🤖 Running AI validation...\n');

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: prompt,
    }],
  });

  return message.content[0].text;
}

/**
 * Main validation function
 */
async function validateCapture(filePath) {
  console.log(`\n📊 Validating capture: ${filePath}\n`);
  console.log('═'.repeat(70));

  // Read capture file
  const rawData = readFileSync(filePath, 'utf-8');
  const captures = JSON.parse(rawData);
  const capture = Array.isArray(captures) ? captures[0] : captures;

  // Step 1: Basic sanity checks
  console.log('\n🔍 Step 1: Basic Sanity Checks\n');
  const sanityResult = performSanityChecks(capture);

  if (sanityResult.issues.length > 0) {
    console.log('❌ ISSUES FOUND:');
    sanityResult.issues.forEach(issue => console.log(`  - ${issue}`));
  } else {
    console.log('✅ No critical issues found');
  }

  if (sanityResult.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    sanityResult.warnings.forEach(warning => console.log(`  - ${warning}`));
  }

  // Step 2: AI validation (if API key is available)
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('\n═'.repeat(70));
    console.log('\n🤖 Step 2: AI-Powered Analysis\n');

    try {
      const aiAnalysis = await aiValidation(capture);
      console.log(aiAnalysis);
    } catch (error) {
      console.error('\n❌ AI validation failed:', error.message);
    }
  } else {
    console.log('\n⚠️  Skipping AI validation (ANTHROPIC_API_KEY not set)');
  }

  // Summary
  console.log('\n═'.repeat(70));
  console.log('\n📋 VALIDATION SUMMARY\n');
  console.log(`Total Positions: ${capture.data.content.clmPositions?.positions?.length || 0}`);
  console.log(`In Range: ${capture.data.content.clmPositions?.inRangeCount || 0}`);
  console.log(`Out of Range: ${capture.data.content.clmPositions?.outOfRangeCount || 0}`);
  console.log(`Issues: ${sanityResult.issues.length}`);
  console.log(`Warnings: ${sanityResult.warnings.length}`);
  console.log(`Status: ${sanityResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('\n═'.repeat(70) + '\n');

  return sanityResult.passed;
}

// CLI execution
const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node scripts/validate-capture.js <path-to-capture.json>');
  process.exit(1);
}

validateCapture(filePath)
  .then(passed => process.exit(passed ? 0 : 1))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
