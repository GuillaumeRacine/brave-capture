# Protocol Parsers Documentation

This document provides detailed technical information about how each DeFi protocol is parsed by the Brave Capture extension. This is intended for developers, LLMs, and future maintainers who need to understand or modify the parsing logic.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Orca (Solana)](#1-orca-solana)
3. [Raydium (Solana)](#2-raydium-solana)
4. [Aerodrome (Base)](#3-aerodrome-base)
5. [Cetus (Sui)](#4-cetus-sui)
6. [Hyperion (Aptos)](#5-hyperion-aptos)
7. [Beefy Finance (Multi-chain)](#6-beefy-finance-multi-chain)
8. [PancakeSwap (Base/BSC)](#7-pancakeswap-basebsc)
9. [Adding New Protocols](#adding-new-protocols)

---

## Architecture Overview

### Protocol Detection

All protocols are detected in `content.js` in the `performDetailedCapture()` function by checking `window.location.hostname`:

```javascript
if (window.location.hostname.includes('orca.so')) {
  capture.content.clmPositions = captureOrcaCLMPositions();
  capture.protocol = 'Orca';
}
```

### Async Loading Strategy

Some protocols load content dynamically with JavaScript. For these, a 2-second delay is added before capture:

```javascript
const needsDelay = (window.location.hostname.includes('hyperion') &&
                    window.location.pathname.includes('/position/')) ||
                   (window.location.hostname.includes('beefy')) ||
                   (window.location.hostname.includes('pancakeswap'));
```

**Protocols requiring delay:**
- Hyperion (position details page only)
- Beefy Finance (all pages)
- PancakeSwap (all pages)

### Common Data Structure

All parsers return the same structure:

```javascript
{
  summary: {
    totalValue: "string",
    estimatedYieldAmount: "string",
    pendingYield: "string",
    // ... other summary fields
  },
  positions: [
    {
      token0: "string",
      token1: "string",
      pair: "TOKEN0/TOKEN1",
      feeTier: "number (as string)",
      balance: number,
      balanceFormatted: "string",
      pendingYield: number,
      apy: number,
      rangeMin: number,
      rangeMax: number,
      currentPrice: number,
      inRange: boolean,
      rangeStatus: "in-range" | "out-of-range" | "alm-managed",
      distanceFromRange: "percentage string",
      capturedAt: "ISO timestamp"
    }
  ],
  positionCount: number,
  inRangeCount: number,
  outOfRangeCount: number
}
```

---

## 1. Orca (Solana)

**Function:** `captureOrcaCLMPositions()`
**File:** `content.js` (lines ~470-625)

### Page Structure

Orca displays positions in a table-like structure with distinct sections for each position.

### Parsing Strategy

1. **Container Detection:**
   - Searches for divs containing both "Deposited" and "Range" text
   - Filters containers by text length (200-2000 chars) to avoid nested duplicates
   - Each container represents one position

2. **Pair Extraction:**
   ```javascript
   // Format: "SOL - USDC" or "SOL-USDC"
   const pairMatch = allText.match(/([A-Za-z0-9]+)\s*[-\/]\s*([A-Za-z0-9]+)/);
   ```

3. **Balance Extraction:**
   ```javascript
   // Looks for "Deposited $12,345.67" or "Total Deposited $..."
   const balanceMatch = allText.match(/Deposited[\s\S]*?\$([0-9,]+\.?[0-9]*)/i);
   ```

4. **APY Extraction:**
   ```javascript
   // Format: "APY: 45.2%" or just "45.2%"
   const apyMatch = allText.match(/APY[:\s]*([0-9]+\.?[0-9]*)%/i) ||
                    allText.match(/([0-9]+\.?[0-9]*)%/);
   ```

5. **Range Extraction:**
   ```javascript
   // Looks for "Range $470.12 - $636.11" or similar patterns
   const rangeMatch = allText.match(/Range[\s\S]*?\$?([0-9,]+\.?[0-9]+)\s*[-–]\s*\$?([0-9,]+\.?[0-9]+)/i);
   ```

6. **Current Price:**
   ```javascript
   // Format: "Current $577.25" or "Current Price: $577.25"
   const currentMatch = allText.match(/Current(?:\s+Price)?[\s:]*\$?([0-9,]+\.?[0-9]+)/i);
   ```

7. **Pending Yield:**
   ```javascript
   // Looks for "Pending $8.50" or "Yield $..."
   const yieldMatch = allText.match(/(?:Pending|Yield)[\s\S]*?\$([0-9,]+\.?[0-9]+)/i);
   ```

### In-Range Calculation

```javascript
if (currentPrice >= rangeMin && currentPrice <= rangeMax) {
  position.inRange = true;
  // Calculate distance from nearest boundary
  const rangeSize = rangeMax - rangeMin;
  const distanceToMin = currentPrice - rangeMin;
  const distanceToMax = rangeMax - currentPrice;
  const minDistance = Math.min(distanceToMin, distanceToMax);
  position.distanceFromRange = `${((minDistance / rangeSize) * 100).toFixed(1)}%`;
}
```

### Key Challenges

- **Nested containers:** Multiple divs can contain the same position data. Filter by text length.
- **Various formats:** APY, balance, and range can appear in different formats
- **Fee tier extraction:** Multiple percentages on page; use context to find fee tier

---

## 2. Raydium (Solana)

**Function:** `captureRaydiumCLMPositions()`
**File:** `content.js` (lines ~626-812)

### Page Structure

Raydium uses a card-based layout with position data in structured containers.

### Parsing Strategy

1. **Container Detection:**
   ```javascript
   // Look for divs containing pair, "CLMM", and dollar amounts
   const positionCards = Array.from(allDivs).filter(div => {
     const text = div.innerText || '';
     return /[A-Z]+[\s\-\/][A-Z]+/.test(text) &&
            text.includes('CLMM') &&
            /\$[0-9,]+/.test(text) &&
            text.length > 100 && text.length < 2000;
   });
   ```

2. **Pair Extraction:**
   - Similar to Orca, matches "SOL/USDC" or "SOL - USDC" format

3. **Balance:**
   - First dollar amount in container

4. **APY:**
   - Percentage value labeled with "APY" or "APR"

5. **Range Data:**
   - Looks for two consecutive price values with range indicators
   - Format: "Min: X - Max: Y" or similar

### Portfolio Summary

```javascript
// Extracts from page header/summary section
summary.totalValue = match(/Total\s+Value[\s:]+\$([0-9,]+\.?[0-9]*)/i);
summary.pendingYield = match(/Pending[\s:]+\$([0-9,]+\.?[0-9]*)/i);
```

---

## 3. Aerodrome (Base)

**Function:** `captureAerodromeCLMPositions()`
**File:** `content.js` (lines ~813-926)

### Page Structure

Aerodrome has a unique challenge: position pairs are displayed separately from their data, and closed positions remain visible.

### Parsing Strategy (Deposit Links Approach)

This is the **most complex parser** due to UI structure challenges.

1. **Position Discovery via Deposit Links:**
   ```javascript
   // Each position has a deposit link with token addresses
   const depositLinks = document.querySelectorAll('a[href*="/deposit?token0="]');
   ```

2. **Token Address Mapping:**
   ```javascript
   const tokenMap = {
     '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
     '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': 'cbBTC',
     '0x4200000000000000000000000000000000000006': 'WETH',
     '0x940181a94a35a4569e4529a3cdfb74e38fd98631': 'AERO',
     // ... more Base chain tokens
   };
   ```

3. **Extract Token Addresses from URL:**
   ```javascript
   const href = link.getAttribute('href');
   const token0Match = href.match(/token0=(0x[a-fA-F0-9]+)/);
   const token1Match = href.match(/token1=(0x[a-fA-F0-9]+)/);
   const token0 = tokenMap[token0Addr.toLowerCase()] || `Token${token0Addr.substring(0, 6)}`;
   ```

4. **Find Parent Container:**
   ```javascript
   // Climb up DOM tree to find container with "Deposited" and balance
   let container = link.closest('div');
   while (container && attempts < 10) {
     const text = container.innerText;
     if (text.includes('Deposited') && text.includes('~$')) break;
     container = container.parentElement;
     attempts++;
   }
   ```

5. **Balance Extraction:**
   ```javascript
   const depositMatch = allText.match(/Deposited[\s\S]*?~\$([0-9,]+\.?[0-9]*)/i);
   ```

6. **Filter Closed Positions:**
   ```javascript
   // Skip positions with balance < $0.01
   if (balance < 0.01) return;
   ```

7. **ALM Detection:**
   ```javascript
   if (allText.includes('ALM') || allText.includes('Automated')) {
     position.rangeMin = null;
     position.rangeMax = null;
     position.currentPrice = null;
     position.inRange = true;
     position.rangeStatus = 'alm-managed';
   }
   ```

### Why This Approach?

**Failed approaches:**
- Text-based pair matching: Matched page headers ("Aerodrome/Finance")
- Container-based parsing: Nested containers caused duplicates
- Sequential parsing: Couldn't reliably associate pairs with data

**Successful approach:**
- Deposit links are unique per position
- Token addresses are unambiguous
- Links are direct children of position containers

### Key Challenges

- Token pairs appear separately from position data
- Closed positions remain visible (filter by balance)
- ALM positions have no fixed range
- Multiple nested containers

---

## 4. Cetus (Sui)

**Function:** `captureCetusCLMPositions()`
**File:** `content.js` (lines ~927-1028)

### Page Structure

Cetus uses React-rendered cards with nested containers causing 10x duplication.

### Parsing Strategy

1. **Broad Container Search:**
   ```javascript
   const positionCards = Array.from(allDivs).filter(div => {
     const text = div.innerText || '';
     return /[A-Z]+\s*-\s*[A-Z]+/.test(text) &&
            text.includes('APR') &&
            text.includes('Liquidity') &&
            text.length > 50 && text.length < 2000;
   });
   ```

2. **Data Extraction:**
   - **Pair:** `SUI - USDC` format
   - **Liquidity:** Dollar amount after "Liquidity" label
   - **APR:** Percentage after "APR" label
   - **Claimable Yield:** Dollar amount after "Claimable Yield"

3. **Range Data:**
   ```javascript
   // Format: "Price Range 1.9978 - 4.0069"
   const rangeMatch = allText.match(/Price Range[\s\S]*?([0-9]+\.?[0-9]+)\s*-\s*([0-9]+\.?[0-9]+)/i);
   ```

4. **Deduplication (CRITICAL):**
   ```javascript
   // Nested containers create 10 duplicates per position
   // Keep the one with the SMALLEST balance (most specific container)
   const uniquePositions = [];
   const seen = new Map();
   positions.forEach(pos => {
     const key = pos.pair;
     const existing = seen.get(key);
     if (!existing || pos.balance < existing.balance) {
       seen.set(key, pos);
     }
   });
   seen.forEach(pos => uniquePositions.push(pos));
   ```

### Key Challenge

**Nested containers:** React renders multiple nested divs, each containing the full position text. Solution is to keep the smallest balance value (innermost/most specific container).

---

## 5. Hyperion (Aptos)

**Function:** `captureHyperionCLMPositions()` (router)
**Sub-functions:** `captureHyperionPositionDetails()`
**File:** `content.js` (lines ~1029-1206)

### Page Types

Hyperion has TWO different page types requiring different parsers:

1. **Positions List:** `https://hyperion.xyz/pools?tab=Positions`
2. **Position Details:** `https://hyperion.xyz/position/0x...`

### List Page Parser

```javascript
// Detect table rows with pair, APR, and "Active/Inactive"
const positionRows = Array.from(allElements).filter(el => {
  const text = el.innerText || '';
  return /[A-Z]+\-[A-Z]+/.test(text) &&
         text.includes('%') &&
         (text.includes('Add / Remove') || text.includes('Active')) &&
         text.length > 20 && text.length < 500;
});
```

**Extracted data:**
- Pair: `APT-USDC` format
- Balance: `$16K` (handles K suffix: multiply by 1000)
- APR: First percentage in text
- Rewards: Last dollar amount
- Status: "Active" vs "Inactive"

### Details Page Parser

**Requires 2-second delay** for JavaScript content to load.

1. **Pair from URL:**
   ```javascript
   // More reliable than page text
   const urlParams = new URLSearchParams(window.location.search);
   const currencyA = urlParams.get('currencyA');
   const currencyB = urlParams.get('currencyB');

   // Token mapping for Aptos
   const aptosTokens = {
     '0x000000000000000000000000000000000000000000000000000000000000000a': 'APT',
     '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b': 'USDC',
     // ...
   };
   ```

2. **Range Data with Tilde:**
   ```javascript
   // Format: "Price Range 2.535406 ~ 3.797465"
   const rangeMatch = text.match(/Price\s+Range[:\s]+([0-9]+\.?[0-9]+)\s*~\s*([0-9]+\.?[0-9]+)/i);
   ```

3. **Balance with K Suffix:**
   ```javascript
   const valueMatch = text.match(/Value[:\s]+\$([0-9]+\.?[0-9]*)K/i);
   if (valueMatch) {
     position.balance = parseFloat(valueMatch[1]) * 1000;
   }
   ```

4. **Position APR (Specific):**
   ```javascript
   // More specific than generic APR to avoid wrong match
   const posAprMatch = text.match(/Position\s+APR[^0-9]*([0-9]+\.?[0-9]*)%/i);
   ```

5. **Claimable Rewards:**
   ```javascript
   // Format: "Claimable Rewards ≈ $195.87"
   const claimableMatch = text.match(/Claimable\s+Rewards[\s\S]*?≈\s*\$([0-9]+\.?[0-9]+)/i);
   ```

### Key Challenges

- Two completely different page layouts
- JavaScript loading requires delay
- "K" suffix on values
- Token addresses need mapping
- Multiple APR values on page (need most specific)

---

## 6. Beefy Finance (Multi-chain)

**Function:** `captureBeefyCLMPositions()` (router)
**Sub-functions:** `captureBeefyVaultDetails()`
**File:** `content.js` (lines ~1440-1622)

### Page Types

1. **Dashboard:** `https://app.beefy.com/` (all positions)
2. **Vault Details:** `https://app.beefy.com/vault/{id}`

### Dashboard Parser

**Requires 2-second delay.**

1. **Portfolio Summary:**
   ```javascript
   // Extract from top of page
   const depositedMatch = text.match(/Deposited[:\s]+\$([0-9,]+)/i);
   const avgApyMatch = text.match(/Avg\.?\s+APY[:\s]+([0-9]+\.?[0-9]*)%/i);
   const dailyMatch = text.match(/Daily\s+yield[:\s]+\$([0-9.]+)/i);
   ```

2. **Position Links:**
   ```javascript
   // Positions are clickable vault links
   const allLinks = document.querySelectorAll('a[href*="vault"]');
   const positionLinks = Array.from(allLinks).filter(link => {
     const text = link.innerText || '';
     return /CLM/i.test(text) &&
            /\$[0-9,]+/.test(text) &&
            text.length > 30 && text.length < 1000;
   });
   ```

3. **Pair Extraction (Unicode Dash):**
   ```javascript
   // Beefy uses special Unicode dash character: "cbBTC-​USDC"
   // Must handle lowercase prefixes like "cb"
   const pairMatch = allText.match(/([a-z]*[A-Z][A-Za-z0-9]+)[\u002D\u2013\u2014\u200B\-​]+([a-z]*[A-Z][A-Za-z0-9]+)/);
   ```

4. **Network Detection:**
   ```javascript
   // Network name appears in parent containers
   let parent = container.parentElement;
   while (parent && attempts < 10) {
     const parentText = parent.innerText || '';
     if (parentText.length < 2000 && parentText.includes(position.pair)) {
       networkMatch = parentText.match(/(Arbitrum|Base|Optimism|Polygon|Ethereum|BSC)/i);
       if (networkMatch) break;
     }
     parent = parent.parentElement;
     attempts++;
   }
   ```

5. **Protocol Detection:**
   ```javascript
   const protocolMatch = allText.match(/(Uniswap|PancakeSwap|SushiSwap|Balancer|Curve)/i);
   ```

### Vault Details Parser

**Also requires 2-second delay.**

1. **Pair Heading:**
   ```javascript
   // Format: "WBTC-​WETH" as page heading
   const pairMatch = text.match(/^([A-Z][A-Za-z0-9]+)[\u002D\u2013\u2014\u200B\-​]+([A-Z][A-Za-z0-9]+)$/);
   if (pairMatch && text.length < 30) {
     position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
   }
   ```

2. **Labeled Data:**
   ```javascript
   // Chain
   const chainMatch = text.match(/CHAIN:\s*(Arbitrum|Base|Optimism|...)/i);

   // Platform
   const platformMatch = text.match(/PLATFORM:\s*(Uniswap|PancakeSwap|...)/i);

   // APY
   const apyMatch = text.match(/^APY\s+([0-9]+\.?[0-9]*)%$/i);
   ```

3. **Your Deposit:**
   ```javascript
   const balanceMatch = text.match(/Your Deposit[\s\S]*?\$([0-9,]+\.?[0-9]*)/i);
   ```

4. **Price Range:**
   ```javascript
   // Min/Max/Current Price labeled separately
   const minMatch = text.match(/Min Price\s+([0-9]+\.?[0-9]+)/i);
   const maxMatch = text.match(/Max Price\s+([0-9]+\.?[0-9]+)/i);
   const currentMatch = text.match(/Current Price\s*\(In Range\)\s+([0-9]+\.?[0-9]+)/i);
   ```

5. **In-Range Detection:**
   ```javascript
   // Detected from label: "Current Price (In Range)" vs "(Out of Range)"
   if (text.includes('(In Range)')) {
     position.inRange = true;
   } else if (text.includes('(Out of Range)')) {
     position.inRange = false;
   }
   ```

### Key Challenges

- **Unicode dash:** Special character in token pairs requires specific regex
- **Network detection:** Appears in parent containers, not in link itself
- **Two page types:** Dashboard vs individual vault details
- **JavaScript loading:** Requires delay on all pages
- **Lowercase prefixes:** "cbBTC" must capture "cb" prefix

---

## 7. PancakeSwap (Base/BSC)

**Function:** `capturePancakeSwapCLMPositions()` (router)
**Sub-functions:** `capturePancakeSwapPositionDetails()`
**File:** `content.js` (lines ~1239-1437)

### Page Types

Currently only supports **Position Details** page: `/liquidity/{id}`

### Position Details Parser

**Requires 2-second delay.**

1. **Pair Detection:**
   ```javascript
   // Format: "USDC-ETH" as heading
   const pairMatch = text.match(/^([A-Z][A-Za-z0-9]+)[\-\/]([A-Z][A-Za-z0-9]+)$/);
   if (pairMatch && text.length < 30) {
     position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
   }
   ```

2. **Labeled Data Extraction:**
   ```javascript
   // APR (with farming)
   const apyMatch = text.match(/APR[^0-9]*([0-9]+\.?[0-9]*)%/i);

   // Liquidity
   const balanceMatch = text.match(/(?:Liquidity|Value|Position Value)[:\s]+\$([0-9,]+\.?[0-9]*)/i);

   // Unclaimed Fees
   const unclaimedMatch = text.match(/Unclaimed\s+Fees[:\s]+\$([0-9,]+\.?[0-9]+)/i);
   ```

3. **Price Range with Labels:**
   ```javascript
   // CRITICAL: Must use labeled extraction to avoid wrong values
   const minMatch = text.match(/Min\s+Price[:\s]+([0-9,]+\.?[0-9]+)/i);
   const maxMatch = text.match(/Max\s+Price[:\s]+([0-9,]+\.?[0-9]+)/i);
   const currentMatch = text.match(/Current\s+Price[:\s]+([0-9,]+\.?[0-9]+)/i);

   // Parse with comma handling
   position.rangeMin = parseFloat(minMatch[1].replace(/,/g, ''));
   position.rangeMax = parseFloat(maxMatch[1].replace(/,/g, ''));
   position.currentPrice = parseFloat(currentMatch[1].replace(/,/g, ''));
   ```

### Why Labeled Extraction?

**Problem:** Page contains many numbers (position ID, token amounts, fees, prices).

**Failed approach:** Extracting all numbers and sorting:
- Captured position ID (667968) as max price ❌
- Captured unclaimed fee ($8.42) as current price ❌

**Solution:** Only extract numbers that appear after specific labels:
- "Min Price 3,483.86" ✅
- "Max Price 4,713.47" ✅
- "Current Price 3,829.74" ✅

### Key Challenges

- Many numeric values on page (must use labels)
- Position ID in URL can be mistaken for price
- APR varies (base vs "with farming")
- Commas in large numbers need removal

---

## Adding New Protocols

### Step 1: Protocol Detection

Add to `performDetailedCapture()` in `content.js`:

```javascript
} else if (window.location.hostname.includes('newprotocol.com')) {
  try {
    capture.content.clmPositions = captureNewProtocolCLMPositions();
    capture.protocol = 'NewProtocol';
  } catch (error) {
    console.error('Error parsing CLM positions:', error);
    capture.protocol = 'NewProtocol';
    capture.content.clmPositions = { error: error.message };
  }
}
```

### Step 2: Add Delay if Needed

If the protocol loads content with JavaScript:

```javascript
const needsDelay = (window.location.hostname.includes('hyperion') &&
                    window.location.pathname.includes('/position/')) ||
                   (window.location.hostname.includes('beefy')) ||
                   (window.location.hostname.includes('pancakeswap')) ||
                   (window.location.hostname.includes('newprotocol')); // ADD HERE
```

### Step 3: Create Parser Function

```javascript
function captureNewProtocolCLMPositions() {
  console.log('NewProtocol: Parsing CLM positions');

  const positions = [];
  const portfolioSummary = {};

  // 1. Find position containers
  const positionContainers = document.querySelectorAll('...');

  // 2. Extract data from each container
  positionContainers.forEach((container, index) => {
    try {
      const position = {};
      const allText = container.innerText || '';

      // Extract pair
      const pairMatch = allText.match(/regex-for-pair/);
      if (pairMatch) {
        position.token0 = pairMatch[1];
        position.token1 = pairMatch[2];
        position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
      }

      // Extract balance
      const balanceMatch = allText.match(/\$([0-9,]+\.?[0-9]*)/);
      if (balanceMatch) {
        position.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
      }

      // Extract APY
      const apyMatch = allText.match(/([0-9]+\.?[0-9]*)%/);
      if (apyMatch) {
        position.apy = parseFloat(apyMatch[1]);
      }

      // Extract range data
      // ... (protocol-specific)

      // Calculate in-range status
      if (position.rangeMin && position.rangeMax && position.currentPrice) {
        position.inRange = position.currentPrice >= position.rangeMin &&
                           position.currentPrice <= position.rangeMax;
        position.rangeStatus = position.inRange ? 'in-range' : 'out-of-range';
      }

      position.capturedAt = new Date().toISOString();

      // Only add if we have minimum required data
      if (position.pair && position.balance) {
        positions.push(position);
      }
    } catch (error) {
      console.error(`NewProtocol: Error parsing position ${index}:`, error);
    }
  });

  console.log(`NewProtocol: Parsed ${positions.length} positions`);

  return {
    summary: portfolioSummary,
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}
```

### Step 4: Testing Checklist

- [ ] Protocol detected correctly
- [ ] Token pairs extracted (check special characters)
- [ ] Balances accurate (check for K/M suffixes)
- [ ] APY/APR captured
- [ ] Range data (min/max/current) accurate
- [ ] In-range status calculated correctly
- [ ] Distance from range computed
- [ ] Pending yield/unclaimed fees captured
- [ ] No duplicate positions
- [ ] Closed positions filtered (if applicable)
- [ ] JavaScript content loads (if delayed)
- [ ] Works on multiple positions

### Common Patterns

**Finding containers:**
```javascript
// By class/data attribute
document.querySelectorAll('.position-card, [data-position]');

// By content (text includes keywords)
Array.from(divs).filter(div => {
  const text = div.innerText;
  return text.includes('keyword') && text.length > 100 && text.length < 2000;
});

// By link (positions are clickable)
document.querySelectorAll('a[href*="position"]');
```

**Extracting numbers:**
```javascript
// With commas
parseFloat(match[1].replace(/,/g, ''))

// With K/M suffix
if (text.includes('K')) value *= 1000;
if (text.includes('M')) value *= 1000000;

// Multiple decimals (crypto addresses)
// Filter out: n > 0 && n < 1000000
```

**Handling duplicates:**
```javascript
// Keep smallest balance (most specific container)
const seen = new Map();
positions.forEach(pos => {
  const existing = seen.get(pos.pair);
  if (!existing || pos.balance < existing.balance) {
    seen.set(pos.pair, pos);
  }
});
```

---

## Debugging Tips

### Enable Console Logging

All parsers include `console.log()` statements:

```javascript
console.log(`Protocol: Found ${count} positions`);
console.log(`Protocol: Pair=${pair}, Balance=${balance}, APY=${apy}`);
```

Open browser DevTools (F12) → Console to see debug output.

### Check Captured Text

After capture, inspect the raw data:

```javascript
// In popup.js after capture
console.log('Captured data:', response.data);
```

### Test Regex Patterns

Use browser console to test regex on page:

```javascript
// Get sample text
const sampleText = document.querySelector('.position-card').innerText;

// Test regex
const match = sampleText.match(/your-regex-pattern/);
console.log(match);
```

### Common Issues

1. **0 positions found:** Container selector not matching
2. **Duplicate positions:** Nested containers (add deduplication)
3. **Wrong values:** Regex too broad (add more specific labels)
4. **Missing data:** JavaScript not loaded (add delay)
5. **Incorrect ranges:** Multiple numbers (use labeled extraction)

---

## Performance Considerations

### Container Filtering

Narrow down containers early:

```javascript
// BAD: Checks every div on page
const all = document.querySelectorAll('div');

// GOOD: Specific selector
const containers = document.querySelectorAll('.position-card, [data-position]');

// BETTER: Selector + filter
const filtered = Array.from(containers).filter(c => c.innerText.length < 2000);
```

### Regex Efficiency

```javascript
// BAD: Multiple matches on same text
const match1 = text.match(/pattern1/);
const match2 = text.match(/pattern2/);
const match3 = text.match(/pattern3/);

// GOOD: Single scan with capturing groups
const match = text.match(/section1:(.*?)section2:(.*?)section3:(.*)/);
```

### Early Returns

```javascript
// Skip container early if missing critical data
if (!container.innerText.includes('required-keyword')) return;
```

---

## Version History

**v1.0.0** (2025-10-22)
- Initial release
- 7 protocols supported and tested
- All protocols have full range data capture
- Historical comparison and validation
- AI-powered data quality checks

---

For more information, see:
- [README.md](README.md) - User documentation
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development setup and architecture
