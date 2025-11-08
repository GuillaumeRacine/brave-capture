# Development Guide - Brave Capture Extension

This guide provides comprehensive technical details for developers and LLMs working on the Brave Capture extension.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [File Structure](#file-structure)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Storage Management](#storage-management)
- [Validation System](#validation-system)
- [Historical Comparison](#historical-comparison)
- [Adding New Protocols](#adding-new-protocols)
- [Testing Guidelines](#testing-guidelines)
- [Common Issues](#common-issues)
- [Performance Considerations](#performance-considerations)

## Architecture Overview

Brave Capture is a Chrome extension that captures and tracks DeFi CLM (Concentrated Liquidity Market Maker) positions across multiple protocols. The architecture follows Chrome's extension model with three main components:

```
┌─────────────┐         ┌────────────────┐         ┌─────────────┐
│   Popup     │────────▶│  wait-for-data │────────▶│    Page     │
│  (popup.js) │         │  MutationObserver│       │    DOM      │
└─────────────┘         └────────────────┘         └─────────────┘
       │                        ▼
       │                ┌────────────────┐
       ├───────────────▶│   Content      │
       │                │  (content.js)  │
       │                │  - 7 Protocol  │
       │                │    Parsers     │
       │                └────────────────┘
       │                        │
       ▼                        ▼
┌─────────────┐         ┌────────────────┐         ┌─────────────┐
│  Background │         │   File Storage │         │  Supabase   │
│(background.js)       │(file-storage.js)│       │  Database   │
└─────────────┘         └────────────────┘         └─────────────┘
                                │                        │
                                ▼                        ▼
                        ┌────────────────┐         ┌─────────────┐
                        │  Local JSON    │         │ Dashboard   │
                        │  ~/Downloads/  │         │(dashboard.js)│
                        │  captures/     │         │ Auto-refresh│
                        └────────────────┘         └─────────────┘
```

### Communication Flow
1. **User clicks "Capture"** → popup.js sends message to content.js
2. **content.js parses DOM** → detects protocol and extracts data
3. **Returns structured data** → popup.js validates and compares
4. **Saves to storage** → Chrome local storage (max 1000 captures)

## File Structure

```
brave-capture/
├── manifest.json             # Extension configuration (v3)
├── popup.html                # Extension popup UI
├── popup.js                  # Popup logic, validation, storage orchestration
├── content.js                # DOM parsing, 7 protocol-specific parsers
├── wait-for-data.js          # MutationObserver for dynamic data detection
├── background.js             # Background service worker
├── file-storage.js           # Local file save system
├── supabase-client.js        # Supabase database operations
├── supabase.js               # Supabase client library (CDN copy)
├── config.js                 # Auto-generated from .env.local (gitignored)
├── dashboard.html            # Position dashboard UI
├── dashboard.js              # Dashboard logic with auto-refresh
├── clear-database.js         # Utility to wipe Supabase data
├── icons/                    # Extension icons (16, 48, 128px)
├── .env.local                # Supabase credentials + API keys (gitignored)
├── .env.example              # Template for environment variables
├── package.json              # Node.js dependencies
├── README.md                 # User documentation
├── PROTOCOL_PARSERS.md       # Detailed protocol parsing documentation
├── DEVELOPMENT.md            # This file
└── .gitignore                # Protects sensitive data
```

## Core Components

### 1. manifest.json

Defines extension permissions, scripts, and metadata.

**Key Permissions:**
```json
"permissions": [
  "activeTab",      // Access current tab when clicked
  "storage",        // Chrome storage for captures
  "downloads"       // Export functionality
]
```

**Content Script Injection:**
```json
"content_scripts": [
  {
    "matches": [
      "https://www.orca.so/*",
      "https://raydium.io/*",
      // ... all supported protocols
    ],
    "js": ["content.js"],
    "run_at": "document_idle"
  }
]
```

**Why `document_idle`?** Ensures DOM is fully loaded before content script runs.

### 2. popup.js (Lines 1-485)

**Responsibilities:**
- Manages extension popup UI
- Sends capture messages to content script
- Validates captured data
- Compares with previous captures
- Manages Chrome storage
- Exports data to JSON

**Key Functions:**

#### `captureBtn.addEventListener('click')` (Lines 50-126)
Main capture handler that:
1. Sends `captureData` message to content script
2. Wraps response in capture object with metadata
3. Saves to storage
4. Runs validation
5. Compares with previous capture
6. Displays results to user

```javascript
const response = await chrome.tabs.sendMessage(currentTab.id, {
  action: 'captureData'
});

const capture = {
  url: currentTab.url,
  title: currentTab.title,
  timestamp: new Date().toISOString(),
  data: response.data,
  protocol: response.data.protocol,
  id: generateId()
};
```

#### `validateCapture(capture)` (Lines 357-422)
Performs basic sanity checks:
- Missing critical data (pair, balance)
- Invalid ranges (min > max)
- Negative values (balance, APY)
- In-range logic errors
- Outlier detection (APY > 10000%)

Returns:
```javascript
{
  issues: [],      // Critical problems
  warnings: [],    // Non-critical issues
  passed: boolean
}
```

#### `compareWithPrevious(capture)` (Lines 232-355)
Compares current capture with most recent previous capture from same protocol.

**Detects:**
- Positions going out of range (critical)
- Positions coming back in range
- Large balance changes (>50%)
- Significant APY changes (>20%)
- Price approaching range boundaries (<10% from edge)
- Total portfolio value changes (>20%)
- New positions added
- Positions removed

Returns:
```javascript
{
  previousTimestamp: "2025-10-21T12:00:00.000Z",
  criticalChanges: ["SOL/USDC: Position went OUT OF RANGE"],
  significantChanges: ["Total portfolio value increased by 25.3%"],
  positionsAdded: ["ETH/USDC"],
  positionsRemoved: []
}
```

#### `saveCapture(capture)` (Lines 424-443)
Saves to Chrome storage with FIFO queue:
- Adds new capture to beginning of array
- Keeps max 1000 captures
- Removes oldest if limit exceeded

#### `loadRecentCaptures()` (Lines 445-470)
Displays last 5 captures in popup UI.

### 3. content.js (Lines 1-1622)

**Responsibilities:**
- Listens for capture messages from popup
- Detects protocol from URL
- Routes to appropriate parser
- Returns structured CLM position data

**Message Listener (Lines 1-41):**
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureData') {
    const hostname = window.location.hostname;

    // Protocol detection
    if (hostname.includes('orca.so')) {
      result = captureOrcaCLMPositions();
    } else if (hostname.includes('raydium.io')) {
      result = captureRaydiumCLMPositions();
    }
    // ... etc for all protocols
  }
});
```

**Protocol Detection Logic:**
1. Extract hostname from `window.location.hostname`
2. Use `includes()` to match known protocols
3. Route to protocol-specific parser function
4. Add 2-second delay for JavaScript-heavy pages

**Delayed Pages:**
- Hyperion position details (`/position/`)
- Beefy Finance (all pages)
- PancakeSwap position details (`/liquidity/`)

**Why Delays?** These pages load position data via JavaScript after initial render.

### 4. Parser Functions

Each protocol has dedicated parser(s). See [PROTOCOL_PARSERS.md](./PROTOCOL_PARSERS.md) for detailed documentation.

**Common Parser Pattern:**
```javascript
function captureProtocolCLMPositions() {
  // 1. Find position containers
  const containers = document.querySelectorAll('.position-card');

  // 2. Parse each position
  const positions = [];
  containers.forEach(container => {
    const position = {
      token0: null,
      token1: null,
      pair: null,
      feeTier: null,
      balance: null,
      pendingYield: null,
      apy: null,
      rangeMin: null,
      rangeMax: null,
      currentPrice: null,
      inRange: null
    };

    // 3. Extract data from DOM
    const text = container.innerText || '';

    // 4. Parse with regex
    const pairMatch = text.match(/([A-Z]+)[\/-]([A-Z]+)/);
    if (pairMatch) {
      position.token0 = pairMatch[1];
      position.token1 = pairMatch[2];
      position.pair = `${position.token0}/${position.token1}`;
    }

    // 5. Calculate in-range status
    if (position.currentPrice && position.rangeMin && position.rangeMax) {
      position.inRange = position.currentPrice >= position.rangeMin &&
                         position.currentPrice <= position.rangeMax;
    }

    positions.push(position);
  });

  // 6. Return structured data
  return {
    protocol: 'Protocol Name',
    content: {
      clmPositions: {
        positions,
        summary: { /* ... */ },
        positionCount: positions.length,
        inRangeCount: positions.filter(p => p.inRange).length,
        outOfRangeCount: positions.filter(p => !p.inRange).length
      }
    }
  };
}
```

### 5. wait-for-data.js (NEW in v1.2)

**Purpose:** Dynamically detect when protocol data is fully loaded using MutationObserver instead of fixed delays.

**Key Features:**
- **MutationObserver-based:** Watches DOM changes in real-time
- **Protocol-specific checks:** Each protocol has custom ready-state logic
- **Instant response:** Fires when data appears (2-3ms typical)
- **Timeout fallback:** 5-second maximum wait
- **Smart skipping:** If data already loaded, returns immediately (0ms)

**Architecture:**
```javascript
const DATA_READY_CHECKS = {
  'orca.so': () => {
    const hasTotalValue = !!Array.from(document.querySelectorAll('*')).find(el =>
      el.textContent.trim() === 'Total Value'
    );
    const tableRows = document.querySelectorAll('table tbody tr');
    return hasTotalValue && tableRows.length > 0;
  },
  // ... similar checks for all 7 protocols
};

async function waitForDataReady(maxWaitMs = 5000) {
  const checkFunction = getCheckForProtocol();

  // Immediate check
  if (checkFunction()) return true;

  // Watch for changes
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (checkFunction()) {
        observer.disconnect();
        resolve(true);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(false);
    }, maxWaitMs);
  });
}
```

**Performance Impact:**
- **Before:** 5000ms worst-case (polling every 200ms)
- **After:** 2-3ms typical, 0ms if data already loaded
- **Improvement:** 99.96% faster on subsequent captures

### 6. file-storage.js

**Purpose:** Handle local JSON file saves with organized directory structure.

**Features:**
- **Auto-organization:** `~/Downloads/captures/[protocol]/[YYYY-MM]/`
- **Timestamped filenames:** `[protocol]_[YYYY-MM-DD]_[HH-MM-SS].json`
- **Auto-save:** No "Save As" dialog (uses `saveAs: false`)
- **Conflict handling:** `uniquify` adds (1), (2), etc. if file exists

**Key Function:**
```javascript
async function saveCaptureToFile(capture) {
  const url = window.location.hostname;
  const timestamp = new Date(capture.timestamp);

  // Generate path
  const monthDir = `${year}-${String(month).padStart(2, '0')}`;
  const suggestedPath = `captures/${protocolDir}/${monthDir}/${filename}`;

  // Save via Chrome downloads API
  chrome.downloads.download({
    url: dataUrl,
    filename: suggestedPath,
    saveAs: false,
    conflictAction: 'uniquify'
  });
}
```

### 7. supabase-client.js

**Purpose:** Manage all Supabase database operations with caching.

**Key Functions:**

#### `saveCapture(capture)`
Saves both to `captures` and `positions` tables atomically.
```javascript
// Insert capture
await supabase.from('captures').insert([{
  id: capture.id,
  url: capture.url,
  protocol: capture.protocol,
  data: capture.data  // JSONB column
}]);

// Extract and insert positions
const positions = capture.data.content.clmPositions.positions.map(pos => ({
  capture_id: capture.id,
  protocol: capture.protocol,
  pair: pos.pair,
  balance: pos.balance,
  // ... all position fields
}));

await supabase.from('positions').insert(positions);
```

#### `getLatestPositions()`
Returns most recent position for each unique pair across all protocols.
```javascript
const positions = await getPositions();
const latestMap = new Map();

positions.forEach(pos => {
  const key = `${pos.protocol}-${pos.pair}`;
  const existing = latestMap.get(key);

  if (!existing || new Date(pos.captured_at) > new Date(existing.captured_at)) {
    latestMap.set(key, pos);
  }
});

return Array.from(latestMap.values());
```

**Caching:**
- 30-second TTL for position queries
- Cleared on new captures
- Speeds up dashboard loads

### 8. dashboard.js

**Purpose:** Real-time position monitoring dashboard with auto-refresh.

**Features:**
- **Auto-refresh:** Polls Supabase every 30 seconds
- **Manual refresh:** Button with loading state
- **Smart filtering:** Hides positions < $1,000
- **Business rules:** Beefy positions always marked in-range
- **Weighted APY:** Calculated based on position sizes
- **Protocol filter:** Show/hide by protocol
- **Sortable columns:** Click headers to sort

**Auto-refresh Implementation:**
```javascript
// Auto-refresh every 30 seconds
setInterval(() => {
  if (typeof window.clearCache === 'function') {
    window.clearCache();
  }
  loadCaptures();
}, 30000);
```

**Statistics Calculations:**
```javascript
// Weighted APY
const totalBalance = positions.reduce((sum, p) => sum + p.balance, 0);
const weightedAPY = positions.reduce((sum, p) => {
  return sum + (p.balance * p.apy);
}, 0) / totalBalance;
```

### 9. Token Breakdown Extraction (NEW in v1.2)

**Purpose:** Extract individual token amounts, percentages, and values from position detail panels.

**Helper Functions:**

#### `extractTokenBreakdown(text, token0, token1)`
Searches for patterns like "46.5366441 SOL 37.6%" with nearby USD values.

```javascript
function extractTokenBreakdown(text, token0, token1) {
  const breakdown = {};

  // Try multiple patterns
  const patterns = [
    new RegExp(`([0-9,.]+)\\s+${token0}\\s+([0-9.]+)%`),
    new RegExp(`([0-9,.]+)\\s+${token0}\\s*\\(\\s*([0-9.]+)%\\s*\\)`),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      breakdown.token0Amount = parseFloat(match[1].replace(/,/g, ''));
      breakdown.token0Percentage = parseFloat(match[2]);

      // Find nearby USD value
      const section = text.substring(matchIndex, matchIndex + 150);
      const valueMatch = section.match(/\$([0-9,]+\.?[0-9]*)/);
      if (valueMatch) {
        breakdown.token0Value = parseFloat(valueMatch[1].replace(/,/g, ''));
      }
      break;
    }
  }

  // Same for token1...
  return breakdown;
}
```

#### `calculateTokenBreakdown(position)`
Fallback for when detail panel is unavailable - calculates 50/50 split.

```javascript
function calculateTokenBreakdown(position) {
  if (!position.balance || !position.currentPrice) return;

  // 50/50 value split
  position.token0Value = position.balance * 0.5;
  position.token1Value = position.balance * 0.5;
  position.token0Percentage = 50;
  position.token1Percentage = 50;

  // Calculate amounts
  if (position.currentPrice > 0) {
    position.token1Amount = position.token1Value / position.currentPrice;
    position.token0Amount = position.token0Value;
  }
}
```

**Usage in Parsers:**
```javascript
// After parsing position from table row...

// Try to extract from detail panel
const detailsPanel = document.querySelector('[role="dialog"]');
if (detailsPanel && position.token0 && position.token1) {
  const detailsText = detailsPanel.innerText;
  const breakdown = extractTokenBreakdown(detailsText, position.token0, position.token1);

  if (breakdown.token0Amount) {
    Object.assign(position, breakdown);
  }
}

// Fallback to calculation
if (!position.token0Amount) {
  calculateTokenBreakdown(position);
}
```

## Data Flow

### Capture Flow

```
User Click
    │
    ▼
popup.js sends message { action: 'captureData' }
    │
    ▼
content.js receives message
    │
    ▼
Detect protocol from URL
    │
    ▼
Call protocol-specific parser
    │
    ▼
Parser extracts DOM data
    │
    ▼
Return structured data { protocol, content: { clmPositions } }
    │
    ▼
popup.js receives response
    │
    ▼
Validate data (sanity checks)
    │
    ▼
Compare with previous capture
    │
    ▼
Save to Chrome storage
    │
    ▼
Display results to user
```

### Data Structure

Every capture follows this structure:

```javascript
{
  id: "capture_1729532108962_abc123def",
  url: "https://www.orca.so/liquidity",
  title: "Orca - Concentrated Liquidity",
  timestamp: "2025-10-21T18:55:08.962Z",
  protocol: "Orca",
  data: {
    protocol: "Orca",
    content: {
      clmPositions: {
        summary: {
          totalValue: "12345.67",           // Total portfolio USD value
          estimatedYieldAmount: "234.56",   // Estimated annual yield
          estimatedYieldPercent: "15.2",    // Weighted avg APY
          pendingYield: "12.34"             // Unclaimed rewards
        },
        positions: [
          {
            token0: "SOL",                  // First token symbol
            token1: "USDC",                 // Second token symbol
            pair: "SOL/USDC",               // Formatted pair
            feeTier: "0.01",                // Fee tier (0.01% = 1bp)
            balance: 5432.10,               // Position value (USD)
            balanceFormatted: "5,432.10",   // Display string
            pendingYield: 8.50,             // Unclaimed fees (USD)
            apy: 45.2,                      // Annual percentage yield
            rangeMin: 470.12,               // Lower price bound
            rangeMax: 636.11,               // Upper price bound
            rangeMinPercent: "-18.42%",     // Distance from current
            rangeMaxPercent: "+10.39%",     // Distance from current
            currentPrice: 577.25,           // Current pool price
            currentPriceFormatted: "577.25",
            inRange: true,                  // Boolean in-range status
            rangeStatus: "in-range",        // Display string
            distanceFromRange: "0%",        // 0% if in range
            capturedAt: "2025-10-21T18:55:08.962Z"
          }
          // ... more positions
        ],
        positionCount: 6,       // Total positions
        inRangeCount: 6,        // Positions in range
        outOfRangeCount: 0      // Positions out of range
      }
    }
  }
}
```

## Storage Management

### Chrome Local Storage

**API:** `chrome.storage.local`

**Limits:**
- Max 1000 captures (enforced in code)
- Chrome quota: 5MB for local storage
- Each capture ~2-10KB depending on position count

**Storage Operations:**

#### Save
```javascript
chrome.storage.local.set({ captures: capturesArray }, callback);
```

#### Load
```javascript
chrome.storage.local.get(['captures'], (result) => {
  const captures = result.captures || [];
});
```

#### Clear All
```javascript
chrome.storage.local.clear();
```

### Data Retention Strategy

FIFO (First In, First Out) queue:
1. New captures added to beginning of array (`unshift`)
2. If array exceeds 1000, oldest captures removed (`splice(1000)`)
3. Most recent captures always preserved

## Validation System

### Two-Level Validation

#### Level 1: Basic Sanity Checks (popup.js:357-422)

Implemented in `validateCapture()`, runs client-side immediately after capture.

**Checks:**
1. Missing critical data (pair, balance)
2. Invalid ranges (min > max)
3. Negative values (balance, APY)
4. In-range logic errors
5. Outlier detection (APY > 10000%)

**Why This Works:**
- Fast (no API calls)
- Catches obvious parsing errors
- Provides immediate feedback

**Example Issue:**
```javascript
// If parser extracts wrong values:
{
  rangeMin: 636.11,
  rangeMax: 470.12  // ❌ min > max!
}

// Validation catches:
issues.push("SOL/USDC: Range min (636.11) > range max (470.12)");
```

#### Level 2: AI-Powered Analysis (validate.js)

Standalone Node.js script using Claude API.

**Usage:**
```bash
npm run validate path/to/capture.json
```

**Performs:**
1. All basic sanity checks
2. AI anomaly detection
3. Data quality scoring
4. Contextual recommendations
5. Inferred missing values

**Example Output:**
```
📊 Validating capture: brave-capture-2025-10-21.json
═══════════════════════════════════════════════════════════

🔍 Step 1: Basic Sanity Checks

✅ No critical issues found

🤖 Step 2: AI-Powered Analysis

Overall Data Quality: 92/100

Specific Issues:
- Position SOL/USDC (0.01%): Price very close to upper bound
- Position ETH/USDC: APY seems low for current market conditions

Recommendations:
- Monitor SOL/USDC position - may go out of range soon
- Consider adjusting ETH/USDC range for better capital efficiency

═══════════════════════════════════════════════════════════
```

## Historical Comparison

### Implementation (popup.js:232-355)

The `compareWithPrevious()` function detects changes between captures.

**Algorithm:**
1. Load all captures from storage
2. Find most recent previous capture from same protocol
3. Create Maps for O(1) position lookup by pair
4. Detect added/removed positions
5. For existing positions, compare metrics
6. Return categorized changes

**Comparison Logic:**

#### Critical Changes
Require immediate attention:
- Position went out of range
- Balance changed >50%
- Price within 10% of range boundary

#### Significant Changes
Worth monitoring:
- Position came back in range
- APY changed >20%
- Total portfolio value changed >20%

**Example:**
```javascript
// Previous capture
{
  pair: "SOL/USDC",
  inRange: true,
  balance: 5000,
  apy: 45.2,
  currentPrice: 577.25,
  rangeMin: 470.12,
  rangeMax: 636.11
}

// Current capture
{
  pair: "SOL/USDC",
  inRange: false,  // ⚠️ Went out of range!
  balance: 4500,   // 10% decrease (not >50%)
  apy: 40.1,       // 5.1% decrease (not >20%)
  currentPrice: 640.50,  // Above max
  rangeMin: 470.12,
  rangeMax: 636.11
}

// Result
{
  criticalChanges: [
    "SOL/USDC: Position went OUT OF RANGE"
  ],
  significantChanges: [],
  positionsAdded: [],
  positionsRemoved: []
}
```

## Adding New Protocols

### Step-by-Step Process

#### 1. Update manifest.json

Add protocol URL to content script matches:

```json
"content_scripts": [
  {
    "matches": [
      "https://www.orca.so/*",
      // ... existing protocols
      "https://newprotocol.com/*"  // ← Add this
    ]
  }
]
```

#### 2. Explore Protocol UI

Visit the protocol's positions page and inspect:

1. **Page Structure:** View page source, inspect elements
2. **Position Containers:** How are positions grouped?
3. **Text Content:** What data is visible?
4. **JavaScript Loading:** Is data loaded dynamically?

Use browser DevTools:
```javascript
// In console, find position elements
document.querySelectorAll('[class*="position"]')
document.querySelectorAll('[class*="liquidity"]')
document.querySelectorAll('a[href*="pool"]')
```

#### 3. Create Parser Function

Add to content.js:

```javascript
function captureNewProtocolCLMPositions() {
  const positions = [];

  // Step 1: Find position containers
  // Try multiple selectors until you find the right one
  const containers = document.querySelectorAll('.position-card');

  if (containers.length === 0) {
    console.warn('NewProtocol: No position containers found');
    return { protocol: 'NewProtocol', content: { clmPositions: { positions: [], summary: {} } } };
  }

  // Step 2: Parse each container
  containers.forEach(container => {
    const text = container.innerText || '';

    const position = {
      token0: null,
      token1: null,
      pair: null,
      feeTier: null,
      balance: null,
      pendingYield: null,
      apy: null,
      rangeMin: null,
      rangeMax: null,
      currentPrice: null,
      inRange: null,
      capturedAt: new Date().toISOString()
    };

    // Step 3: Extract pair
    const pairMatch = text.match(/([A-Z]+)[\/\-]([A-Z]+)/);
    if (pairMatch) {
      position.token0 = pairMatch[1];
      position.token1 = pairMatch[2];
      position.pair = `${position.token0}/${position.token1}`;
    }

    // Step 4: Extract balance (USD value)
    const balanceMatch = text.match(/\$([0-9,]+\.?[0-9]*)/);
    if (balanceMatch) {
      position.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
    }

    // Step 5: Extract APY
    const apyMatch = text.match(/([0-9]+\.?[0-9]*)%\s*APY/i);
    if (apyMatch) {
      position.apy = parseFloat(apyMatch[1]);
    }

    // Step 6: Extract price range
    const rangeMatch = text.match(/([0-9,]+\.?[0-9]*)\s*[-–—]\s*([0-9,]+\.?[0-9]*)/);
    if (rangeMatch) {
      position.rangeMin = parseFloat(rangeMatch[1].replace(/,/g, ''));
      position.rangeMax = parseFloat(rangeMatch[2].replace(/,/g, ''));
    }

    // Step 7: Extract current price
    const priceMatch = text.match(/Current[:\s]+([0-9,]+\.?[0-9]*)/i);
    if (priceMatch) {
      position.currentPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
    }

    // Step 8: Calculate in-range status
    if (position.currentPrice && position.rangeMin && position.rangeMax) {
      position.inRange = position.currentPrice >= position.rangeMin &&
                         position.currentPrice <= position.rangeMax;
    }

    positions.push(position);
  });

  // Step 9: Parse summary (if available)
  const summary = {};
  const summaryElement = document.querySelector('.portfolio-summary');
  if (summaryElement) {
    const summaryText = summaryElement.innerText || '';

    const totalMatch = summaryText.match(/Total[:\s]+\$([0-9,]+\.?[0-9]*)/i);
    if (totalMatch) {
      summary.totalValue = totalMatch[1];
    }
  }

  // Step 10: Return structured data
  return {
    protocol: 'NewProtocol',
    content: {
      clmPositions: {
        positions,
        summary,
        positionCount: positions.length,
        inRangeCount: positions.filter(p => p.inRange).length,
        outOfRangeCount: positions.filter(p => !p.inRange).length
      }
    }
  };
}
```

#### 4. Add Protocol Detection

In content.js message listener (lines 1-41):

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureData') {
    const hostname = window.location.hostname;
    let result;

    // ... existing protocols

    if (hostname.includes('newprotocol.com')) {
      // Add delay if needed for JavaScript loading
      setTimeout(() => {
        result = captureNewProtocolCLMPositions();
        sendResponse({ success: true, data: result });
      }, 2000);
      return true; // Async response
    }

    // ... rest of code
  }
});
```

#### 5. Test Thoroughly

1. Navigate to protocol's positions page
2. Click "Capture Page Data"
3. Check browser console for:
   - Warnings about missing containers
   - Parsing errors
   - Captured data structure
4. Export and validate data
5. Test edge cases:
   - 0 positions
   - Out of range positions
   - Missing data fields
   - Different page layouts

#### 6. Document in PROTOCOL_PARSERS.md

Add comprehensive documentation including:
- Function name and line numbers
- Page structure analysis
- Parsing strategy
- Code snippets
- Key challenges and solutions

## Testing Guidelines

### Manual Testing Checklist

For each protocol:

- [ ] Navigate to positions page
- [ ] Verify URL matches manifest.json
- [ ] Click extension icon
- [ ] Click "Capture Page Data"
- [ ] Check console for errors
- [ ] Verify data structure in console
- [ ] Check validation results
- [ ] Export data
- [ ] Review exported JSON
- [ ] Test with 0 positions
- [ ] Test with out-of-range positions
- [ ] Test on different pages (list vs details)

### Console Debugging

Add console logs to parsers:

```javascript
function captureProtocolCLMPositions() {
  const containers = document.querySelectorAll('.position-card');
  console.log('Protocol: Found', containers.length, 'containers');

  containers.forEach((container, index) => {
    const text = container.innerText || '';
    console.log(`Position ${index + 1} text:`, text.substring(0, 200));

    // ... parsing

    console.log(`Position ${index + 1} parsed:`, position);
  });

  return result;
}
```

### Export and Validate

1. Click "Export Captured Data"
2. Save JSON file
3. Run AI validation:
   ```bash
   npm run validate brave-capture-2025-10-21.json
   ```
4. Review validation output
5. Fix any issues in parser

## Common Issues

### Issue 1: Parser Returns 0 Positions

**Symptoms:**
- `positionCount: 0`
- Console shows "Found 0 containers"

**Causes:**
1. Wrong CSS selector
2. JavaScript hasn't loaded yet
3. Page structure changed
4. Wrong page (e.g., on list page but parser expects details)

**Solutions:**
1. Inspect page elements to find correct selector
2. Add 2-second delay for JavaScript loading
3. Update parser for new structure
4. Add URL path detection

**Example Fix:**
```javascript
// Before (wrong selector)
const containers = document.querySelectorAll('.position-card');

// After (correct selector found via inspection)
const containers = document.querySelectorAll('[data-testid="position-row"]');
```

### Issue 2: Wrong Values Extracted

**Symptoms:**
- Prices don't match page
- APY is wrong
- Balance shows position ID

**Causes:**
1. Regex matching wrong numbers
2. Multiple numbers in text, capturing wrong one
3. Number format not handled (commas, decimals)

**Solutions:**
1. Use labeled extraction (match text near label)
2. Be more specific in regex
3. Handle commas and decimals

**Example Fix:**
```javascript
// Before (captures any number)
const priceMatch = text.match(/([0-9,]+\.?[0-9]*)/);

// After (captures price near "Current Price" label)
const priceMatch = text.match(/Current\s+Price[:\s]+([0-9,]+\.?[0-9]*)/i);
```

### Issue 3: Pair Shows as "undefined/undefined"

**Symptoms:**
- `pair: "undefined/undefined"`
- `token0: null, token1: null`

**Causes:**
1. Pair regex doesn't match format
2. Tokens not visible in text
3. Special characters in pair (Unicode dashes)

**Solutions:**
1. Adjust regex for format
2. Look in different element (heading, link)
3. Handle Unicode dash characters

**Example Fix:**
```javascript
// Before (only handles /)
const pairMatch = text.match(/([A-Z]+)\/([A-Z]+)/);

// After (handles /, -, and Unicode dashes)
const pairMatch = text.match(/([A-Z]+)[\u002D\u2013\u2014\u200B\-​]+([A-Z]+)/);
```

### Issue 4: Duplicates in Positions

**Symptoms:**
- Same position appears multiple times
- `positionCount` higher than actual

**Causes:**
1. Nested containers (position inside position)
2. Multiple selectors matching same element

**Solutions:**
1. Use Set/Map for deduplication
2. Be more specific in selector
3. Filter by unique identifier

**Example Fix:**
```javascript
// Use Map to deduplicate by pair
const positionMap = new Map();

containers.forEach(container => {
  const position = parsePosition(container);

  if (position.pair && !positionMap.has(position.pair)) {
    positionMap.set(position.pair, position);
  }
});

const positions = Array.from(positionMap.values());
```

### Issue 5: JavaScript Loading Issues

**Symptoms:**
- Works on second capture but not first
- Inconsistent results
- Some data missing randomly

**Causes:**
1. Data loads asynchronously
2. Capturing before JavaScript renders content

**Solutions:**
1. Add 2-second delay for specific pages
2. Use `MutationObserver` to wait for elements
3. Add protocol to delay list

**Example Fix:**
```javascript
// In message listener
if (hostname.includes('protocol.com')) {
  setTimeout(() => {
    result = captureProtocolCLMPositions();
    sendResponse({ success: true, data: result });
  }, 2000);  // Wait for JS to load
  return true; // Keep message channel open
}
```

## Dashboard Business Rules

The dashboard (`dashboard.html`) implements specific business logic for displaying and calculating position data.

### Position Filtering Rules

**1. Minimum Balance Filter**
```javascript
// In loadCaptures() function (dashboard.html:497-508)
allPositions = positions
  .filter(pos => {
    const balance = parseFloat(pos.balance) || 0;
    return balance >= 1000; // Only show positions >= $1K
  })
```

**Rationale:** Positions under $1,000 are typically too small to actively manage and don't significantly impact portfolio performance.

**2. Beefy Finance Auto-Adjustment**
```javascript
// In loadCaptures() function (dashboard.html:502-507)
.map(pos => {
  // Beefy auto-adjusts ranges, so always mark as in-range
  if (pos.protocol && pos.protocol.toLowerCase() === 'beefy') {
    return { ...pos, in_range: true };
  }
  return pos;
})
```

**Rationale:** Beefy Finance vaults use automated liquidity management (ALM) that continuously rebalances positions. These positions never go "out of range" because they automatically adjust, so there's no value in tracking their range status.

### APY Calculation Method

**Weighted Average APY**
```javascript
// In updateStats() function (dashboard.html:621-629)
let weightedAPY = 0;
if (totalValue > 0) {
  weightedAPY = filteredPositions.reduce((sum, p) => {
    const balance = parseFloat(p.balance) || 0;
    const apy = parseFloat(p.apy) || 0;
    return sum + (balance * apy);
  }, 0) / totalValue;
}
```

**Formula:** `Σ(balance × APY) / Σ(balance)`

**Example Calculation:**
```javascript
// Position A: $100,000 @ 10% APY
// Position B: $10,000 @ 50% APY
// Position C: $1,000 @ 200% APY

const weightedAPY =
  (100000 * 10 + 10000 * 50 + 1000 * 200) / (100000 + 10000 + 1000)
  = (1000000 + 500000 + 200000) / 111000
  = 1700000 / 111000
  = 15.32%

// Compare to simple average:
const simpleAverage = (10 + 50 + 200) / 3 = 86.67%

// The weighted average accurately reflects that Position A dominates
// the portfolio's actual yield generation
```

**Rationale:** A simple arithmetic mean would give equal weight to all positions regardless of size. This would be misleading - a $100K position at 10% APY generates far more yield ($10K/year) than a $1K position at 200% APY ($2K/year). The weighted average accurately represents the portfolio's actual yield generation capacity.

### Statistics Calculations

All statistics in the dashboard are calculated from `filteredPositions` (after applying business rules):

```javascript
// In updateStats() function (dashboard.html:615-638)
const totalPositions = filteredPositions.length;
const inRangeCount = filteredPositions.filter(p => p.in_range).length;
const totalValue = filteredPositions.reduce((sum, p) =>
  sum + (parseFloat(p.balance) || 0), 0);
const totalPendingYield = filteredPositions.reduce((sum, p) =>
  sum + (parseFloat(p.pending_yield) || 0), 0);
```

**Display Format:**
- Total Positions: Integer count
- In Range: Count + percentage (e.g., "11 (78.6%)")
- Total Value: USD currency with 2 decimals
- Pending Yield: USD currency with 2 decimals
- Weighted APY: Percentage with 2 decimals

## Performance Considerations

### DOM Traversal Optimization

**Use Specific Selectors:**
```javascript
// Slow - searches entire document
const elements = document.querySelectorAll('div');

// Fast - specific class
const elements = document.querySelectorAll('.position-card');

// Faster - specific data attribute
const elements = document.querySelectorAll('[data-testid="position"]');
```

### Regex Optimization

**Compile Once:**
```javascript
// Slow - recompiles regex each iteration
positions.forEach(p => {
  const match = text.match(/([0-9,]+\.?[0-9]*)/);
});

// Fast - compile once
const numberRegex = /([0-9,]+\.?[0-9]*)/;
positions.forEach(p => {
  const match = text.match(numberRegex);
});
```

### Storage Optimization

**Batch Operations:**
```javascript
// Slow - multiple storage calls
captures.forEach(c => {
  chrome.storage.local.set({ capture: c });
});

// Fast - single storage call
chrome.storage.local.set({ captures: capturesArray });
```

### Memory Management

**Clean Up Event Listeners:**
```javascript
// In content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Always call sendResponse to free memory
  sendResponse({ success: true, data: result });
});
```

### Minimize Data Size

**Remove Unnecessary Fields:**
```javascript
// Don't store large raw text
position.rawText = container.innerText; // ❌ Bloats storage

// Only store parsed values
position.balance = parseFloat(balanceMatch[1]); // ✅ Minimal storage
```

## API Keys and Environment

### Setup

Create `.env.local` in project root:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
```

### Usage in validate.js

```javascript
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### Security

**Never commit API keys:**
- Add `.env.local` to `.gitignore`
- Use environment variables
- Rotate keys if exposed

## Chrome Extension Permissions

### Required Permissions

```json
"permissions": [
  "activeTab",    // Access current tab when extension clicked
  "storage",      // Chrome local storage
  "downloads"     // Export functionality
]
```

### Why These Permissions?

**activeTab:**
- Minimal permission
- Only grants access when user clicks icon
- Cannot access tabs in background
- Safer than "tabs" permission

**storage:**
- Store captures locally
- No server upload required
- Private to user

**downloads:**
- Export JSON files
- Chrome downloads API
- User controls save location

## Future Enhancements

### Planned Features

1. **Browser Notifications**
   - Alert when positions go out of range
   - Requires `notifications` permission

2. **Time-Series Charts**
   - Track position value over time
   - Integrate with charting library

3. **Multi-Protocol Aggregation**
   - Combine positions across protocols
   - Unified dashboard

4. **Webhook Integration**
   - Discord/Telegram notifications
   - Requires `webRequest` permission

5. **Export Formats**
   - CSV export
   - PDF reports
   - Excel integration

### Technical Debt

1. **Parser Consolidation**
   - Extract common parsing logic
   - Reduce code duplication

2. **Error Handling**
   - Better error messages
   - Retry logic for failed captures

3. **Unit Tests**
   - Test parsers with mock DOM
   - Validation logic tests

4. **TypeScript Migration**
   - Type safety for data structures
   - Better IDE support

## Resources

### Chrome Extension Docs
- [Getting Started](https://developer.chrome.com/docs/extensions/mv3/getstarted/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [Message Passing](https://developer.chrome.com/docs/extensions/mv3/messaging/)
- [Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)

### JavaScript / DOM
- [querySelector](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector)
- [Regular Expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
- [Async/Await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)

### DeFi Concepts
- [Concentrated Liquidity](https://docs.uniswap.org/concepts/protocol/concentrated-liquidity)
- [Impermanent Loss](https://academy.binance.com/en/articles/impermanent-loss-explained)
- [APY vs APR](https://www.investopedia.com/articles/personal-finance/050715/annual-percentage-rate-apr-vs-annual-percentage-yield-apy-how-they-differ.asp)

---

**Questions or Issues?** Open an issue on GitHub or consult [PROTOCOL_PARSERS.md](./PROTOCOL_PARSERS.md) for protocol-specific details.
