# Dashboard Features & Business Rules

This document details the dashboard's smart filtering, calculations, and display logic.

## Overview

The dashboard (`dashboard.html`) provides a compact, table-based view of all CLM positions with intelligent filtering and weighted calculations for accurate portfolio metrics.

## Smart Filtering

### 1. Minimum Balance Filter

**Rule:** Only positions with balance >= $1,000 are displayed

**Location:** `dashboard.html:497-501`

```javascript
allPositions = positions.filter(pos => {
  const balance = parseFloat(pos.balance) || 0;
  return balance >= 1000;
})
```

**Rationale:**
- Small positions (< $1K) are typically not worth actively monitoring
- Reduces noise in the dashboard
- Focuses attention on positions that materially impact portfolio

**Impact:**
- If you have 20 positions but only 8 are >= $1K, dashboard shows 8
- Stats are calculated only on the 8 visible positions
- Hidden positions are not counted in any metrics

### 2. Beefy Finance Auto-Adjustment

**Rule:** Beefy positions always marked as "In Range"

**Location:** `dashboard.html:502-507`

```javascript
.map(pos => {
  if (pos.protocol && pos.protocol.toLowerCase() === 'beefy') {
    return { ...pos, in_range: true };
  }
  return pos;
})
```

**Rationale:**
- Beefy Finance uses Automated Liquidity Management (ALM)
- Vaults continuously rebalance to stay in range
- Tracking "out of range" status is meaningless for auto-managed positions
- Always shows green "In Range" badge

**Impact:**
- Beefy positions never trigger "out of range" warnings
- Contributes to higher "In Range" percentage
- Simplified monitoring (no manual rebalancing needed)

## Weighted APY Calculation

### Formula

```
Weighted APY = Σ(balance × APY) / Σ(balance)
```

**Location:** `dashboard.html:621-629`

```javascript
let weightedAPY = 0;
if (totalValue > 0) {
  weightedAPY = filteredPositions.reduce((sum, p) => {
    const balance = parseFloat(p.balance) || 0;
    const apy = parseFloat(p.apy) || 0;
    return sum + (balance * apy);
  }, 0) / totalValue;
}
```

### Why Weighted?

**Problem with Simple Average:**
```javascript
// Position A: $100,000 @ 10% APY → Generates $10,000/year
// Position B: $1,000 @ 200% APY → Generates $2,000/year

// Simple average:
avgAPY = (10 + 200) / 2 = 105% ❌ MISLEADING!

// Weighted average:
weightedAPY = (100000×10 + 1000×200) / 101000
            = (1000000 + 200000) / 101000
            = 11.88% ✅ ACCURATE!
```

**Rationale:**
- Simple average treats all positions equally regardless of size
- A $100K position at 10% generates more yield than $1K at 200%
- Weighted average shows actual portfolio yield capacity
- Larger positions naturally have more influence on portfolio performance

### Real Example

From your actual data:

```javascript
// Your positions (simplified):
WBTC/SOL:   $41,237.80 @ 26.58% = $10,961 yield/year
cbBTC/SOL:  $24,310.10 @ 28.45% = $6,916 yield/year
SOL/USDC:   $23,477.54 @ 55.59% = $13,052 yield/year
SOL/USDT:   $20,777.02 @ 50.80% = $10,555 yield/year
PUMP/SOL:   $428.43 @ 186.84% = $800 yield/year
Fartcoin:   $210.44 @ 60.55% = $127 yield/year

Total: $110,441.33 portfolio → $42,411 yield/year

Weighted APY = $42,411 / $110,441 = 38.4%

// Compare to simple average:
Simple Avg = (26.58 + 28.45 + 55.59 + 50.80 + 186.84 + 60.55) / 6
           = 68.14% ❌ (Overestimates due to small high-APY positions)
```

## Statistics Calculations

All stats calculated from `filteredPositions` (after business rules applied):

### Total Positions
```javascript
const totalPositions = filteredPositions.length;
```
- Simple count of positions >= $1K
- Example: 14 total positions → only 8 meet $1K threshold → shows 8

### In Range Count & Percentage
```javascript
const inRangeCount = filteredPositions.filter(p => p.in_range).length;
const inRangePercent = (inRangeCount / totalPositions) * 100;
```
- Counts positions where `in_range = true`
- Beefy positions automatically counted as in-range
- Example: 8 positions, 7 in range → "7 (87.5%)"

### Total Value
```javascript
const totalValue = filteredPositions.reduce((sum, p) =>
  sum + (parseFloat(p.balance) || 0), 0
);
```
- Sum of all position balances
- Only includes positions >= $1K
- Formatted as USD with 2 decimals

### Pending Yield
```javascript
const totalPendingYield = filteredPositions.reduce((sum, p) =>
  sum + (parseFloat(p.pending_yield) || 0), 0
);
```
- Sum of unclaimed rewards across all positions
- Shows total rewards ready to claim
- Formatted as USD with 2 decimals

## Table Display

### Compact Layout Benefits

1. **High Density:** See 20+ positions without scrolling
2. **Sortable Columns:** Click any header to sort
3. **Sticky Header:** Header stays visible while scrolling
4. **Visual Indicators:**
   - Protocol badges (colored, uppercase)
   - Status badges (green/red for in-range/out-of-range)
   - Range position bar (shows where current price sits)
5. **Hover Effects:** Row highlights for easy reading

### Column Details

| Column | Content | Alignment | Notes |
|--------|---------|-----------|-------|
| Protocol | Badge | Left | Color-coded by protocol |
| Pair | Token pair | Left | Bold for visibility |
| Status | In Range badge | Center | Green/red color coding |
| Balance | USD value | Right | With $ and commas |
| APY | Percentage | Right | 2 decimal places |
| Pending Yield | USD value | Right | With $ |
| Price Range | Min/Current/Max | Left | Stacked vertically |
| Range Position | Visual bar | Center | Shows price in range |
| Captured | Time ago | Right | Relative time (e.g., "2h ago") |

## Filter Interactions

### Protocol Filter
- Dropdown populated from unique protocols in data
- "All Protocols" shows everything
- Selecting specific protocol filters table

### Range Status Filter
- All: Shows all positions
- In Range: Only positions with `in_range = true`
- Out of Range: Only positions with `in_range = false`

### Sort Options
- Balance (High to Low) - Default
- Balance (Low to High)
- APY (High to Low)
- APY (Low to High)
- Pair (A-Z)

**Note:** Filters and sorts work together. Stats update based on filtered results.

## Edge Cases

### No Positions >= $1K
- Dashboard shows "No positions found"
- Stats show zeros/dashes
- Suggests capturing data or adjusting filters

### All Beefy Positions
- All positions show as in-range
- In-range percentage = 100%
- No out-of-range warnings

### Mixed Protocols
- Positions from all protocols shown together
- Use protocol filter to isolate specific protocols
- Stats calculated across all visible positions

## Technical Details

**Data Source:** `getLatestPositions()` from `supabase-client.js`
- Fetches all positions from Supabase
- Groups by pair
- Returns most recent capture for each unique pair

**Refresh:** Click "↻ Refresh" button to reload from database

**Performance:**
- Table rendering is client-side JavaScript
- Fast sorting (no server round-trip)
- Sticky header uses CSS `position: sticky`

## Customization

To change business rules, edit `dashboard.html`:

**Change minimum balance:**
```javascript
// Line 500: Change 1000 to desired minimum
return balance >= 5000; // Only show positions >= $5K
```

**Disable Beefy auto-adjustment:**
```javascript
// Comment out lines 502-507 to show actual Beefy range status
// .map(pos => {
//   if (pos.protocol && pos.protocol.toLowerCase() === 'beefy') {
//     return { ...pos, in_range: true };
//   }
//   return pos;
// })
```

**Use simple average APY:**
```javascript
// Replace weighted calculation (lines 621-629) with:
const avgAPY = totalPositions > 0
  ? filteredPositions.reduce((sum, p) => sum + (parseFloat(p.apy) || 0), 0) / totalPositions
  : 0;
```
