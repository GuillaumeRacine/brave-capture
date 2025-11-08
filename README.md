# Brave Capture - CLM Position Tracker

A powerful Chrome extension for capturing and tracking Concentrated Liquidity Market Maker (CLM) positions across multiple DeFi protocols. Monitor your positions, track historical changes, and get AI-powered validation of your portfolio data.

## Features

### 🎯 Multi-Protocol Support (7 Protocols, 5 Blockchains)

**Fully Tested & Verified:**

1. **Orca** (Solana) ✅
   - Full range tracking (min/max/current price)
   - APY and pending yield capture
   - In-range status detection
   - Supports both standard and ALM positions

2. **Raydium** (Solana) ✅
   - Complete CLM position data
   - Portfolio summary with total value
   - Pending yield tracking
   - Automatic range validation

3. **Aerodrome** (Base) ✅
   - Position detection via deposit links
   - ALM (Automated Liquidity Management) support
   - Filters out closed positions automatically
   - Fee tier and pair extraction

4. **Cetus** (Sui) ✅
   - Card-based layout parsing
   - Automatic deduplication
   - Claimable yield tracking
   - Full price range data

5. **Hyperion** (Aptos) ✅
   - **List page:** Overview of all positions
   - **Details page:** Complete range data with tilde format (min ~ max)
   - Token address to symbol mapping
   - Position APR and rewards

6. **Beefy Finance** (Multi-chain: Arbitrum, Base, Optimism, etc.) ✅
   - **Dashboard:** Portfolio summary (deposited, avg APY, daily yield)
   - **Vault details:** Individual position with full range
   - Supports Uniswap, PancakeSwap, and other underlying protocols
   - Network/chain detection
   - **Auto-adjustment:** Always marked as in-range (auto-rebalancing)

7. **PancakeSwap** (Base, BSC) ✅
   - Position details page parsing
   - Unclaimed fees tracking
   - APR with farming rewards
   - Price range with labeled extraction

### 📊 Comprehensive Position Data
For each position, the extension captures:
- **Token pair** and fee tier (e.g., "SOL/USDC 0.04%")
- **Current balance** (USD value)
- **Pending yield** (unclaimed rewards/fees)
- **APY/APR** (annualized percentage yield)
- **Price range:** min/max boundaries
- **Current price** (real-time from protocol)
- **In-range status** (automatic detection)
- **Distance from range** boundaries (percentage above/below)
- **Token breakdown** (NEW in v1.2):
  - `token0Amount`: Quantity of first token (e.g., 46.5366441 SOL)
  - `token0Percentage`: Percentage of value in first token (e.g., 37.6%)
  - `token0Value`: USD value of first token (e.g., $7,612.31)
  - `token1Amount`: Quantity of second token (e.g., 12654.5291 USDC)
  - `token1Percentage`: Percentage of value in second token (e.g., 62.4%)
  - `token1Value`: USD value of second token (e.g., $12,652.93)
  - **Extraction method:** Parses from position detail panels when open
  - **Fallback:** Calculates 50/50 split if detail panel unavailable

### 💾 Dual Storage System
- **Supabase Database:** Cloud storage for queryable position data
  - `captures` table: Full capture history with JSONB data
  - `positions` table: Denormalized position data for fast queries
  - Historical tracking and comparison
  - Real-time dashboard updates
- **Local File Export:** Timestamped JSON files for backup
  - Format: `[protocol-url]_[YYYY-MM-DD]_[HH-MM-SS].json`
  - Auto-organized: `captures/[protocol]/[YYYY-MM]/`
  - Complete position history for timeline analysis

### 🤖 AI-Powered Validation
- Automatic data quality checks after each capture
- Basic validation: Missing data, invalid ranges, negative values
- Historical comparison with previous captures
- Identifies critical changes requiring attention

### 📈 Historical Tracking & Comparison
Automatic detection of:
- Positions going out of range (critical alert)
- Large balance changes (>50%)
- Significant APY changes (>20%)
- New positions added or removed
- Price approaching range boundaries
- Total portfolio value changes (>20%)

### 📱 Interactive Dashboard
- **Compact table layout** optimized for many positions
- **Auto-refresh:** Updates every 30 seconds automatically
- **Manual refresh:** Click button to reload latest data from Supabase
- **Smart filtering:**
  - Automatically hides positions under $1,000
  - Beefy positions always shown as in-range (auto-adjusts)
- **Weighted APY calculation** (larger positions weighted more heavily)
- Filter by protocol or in-range status
- Sortable columns (click headers to sort)
- Real-time statistics:
  - Total positions count
  - In-range percentage
  - Total portfolio value
  - Pending yield total
  - Weighted average APY
- Visual range indicators showing current price position
- Sticky header for easy scrolling through many positions
- Responsive design for mobile and desktop

### ⚡ Performance Optimizations (v1.2)
- **Dynamic data detection:** Uses MutationObserver instead of polling
  - **Old method:** Poll every 200ms for up to 5 seconds (5000ms worst case)
  - **New method:** Responds instantly when DOM changes (2-3ms typical)
  - **99.96% faster** on subsequent captures (data already loaded)
- **Instant ready check:** Skips wait if data already present on page
- **Protocol-specific detection:** Each protocol has custom ready-state logic
- **Background validation:** Non-blocking AI validation and historical comparison
- **Immediate UI feedback:** Button responds instantly on click
- **Cached queries:** 30-second cache for dashboard data (configurable)

## Installation

### Prerequisites

1. **Supabase Account** (Free tier works)
   - Create account at https://supabase.com
   - Create a new project
   - Note your project URL and anon key

2. **Environment Setup**
   - Create `.env.local` file with Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Database Setup**
   - Run SQL schema from `SUPABASE_SETUP.md`
   - Creates `captures` and `positions` tables
   - Sets up indexes and RLS policies

4. **Build Configuration**
   ```bash
   npm install
   npm run build:config  # Generates config.js from .env.local
   ```

### Developer Mode Installation

1. Clone or download this repository
2. Open Chrome/Brave and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension icon will appear in your browser toolbar

### Required Files Structure

```
brave-capture/
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── background.js
├── config.js (auto-generated from .env.local)
├── supabase.js (local Supabase client library)
├── supabase-client.js
├── file-storage.js
├── dashboard.html
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Usage

### Capturing Token Breakdown Data

To capture individual token amounts and percentages (not just total USD value):

1. Navigate to your position on the protocol
2. **Open the position detail panel/modal** (click on the position)
3. Make sure the detail panel shows token amounts like:
   - "46.5366441 SOL (37.6%) = $7,612.31"
   - "12654.5291 USDC (62.4%) = $12,652.93"
4. With the detail panel **still open**, click "Capture Page Data"
5. The extension will extract token breakdown from the visible panel

**If detail panel not available:**
- Extension will use 50/50 estimate based on current price
- Token amounts calculated: `tokenValue = totalBalance × 50%`
- This provides approximate breakdown for tracking purposes

**Supported on all 7 protocols** when detail panels are accessible.

### Basic Capture

1. Navigate to your DeFi protocol's portfolio/positions page:

   **Orca (Solana):**
   - Portfolio page: `https://www.orca.so/portfolio`
   - Captures all CLM positions with full metrics

   **Raydium (Solana):**
   - Portfolio page: `https://raydium.io/portfolio/`
   - Supports CLMM positions

   **Aerodrome (Base):**
   - Liquidity page: `https://aerodrome.finance/liquidity`
   - Filters positions automatically

   **Cetus (Sui):**
   - Liquidity page: `https://app.cetus.zone/liquidity`
   - Card-based position display

   **Hyperion (Aptos):**
   - List page: `https://hyperion.xyz/pools?tab=Positions`
   - Details page: `https://hyperion.xyz/position/0x...`
   - Both pages supported

   **PancakeSwap (Base/BSC):**
   - Position details: `https://pancakeswap.finance/liquidity/{id}`
   - Supports V3 positions with farming

   **Beefy Finance (Multi-chain):**
   - Dashboard: `https://app.beefy.com/` (shows all positions)
   - Vault details: `https://app.beefy.com/vault/{vault-id}`
   - Both pages supported

2. Click the Brave Capture extension icon
3. Click "Capture Page Data"
4. The extension will:
   - Automatically detect the protocol
   - Parse all position data
   - Validate the data quality
   - Save to Supabase database
   - Export timestamped JSON file to Downloads
   - Compare with previous captures
   - Show you any warnings or critical changes

### What Gets Captured

For each CLM position:
- **Pair Information**: Token symbols and fee tier
- **Financial Data**: Balance, pending yield, APY
- **Range Data**: Min price, max price, current price
- **Status**: In-range or out-of-range (automatically calculated)
- **Metadata**: Capture timestamp, protocol, URL

The extension also captures:
- Portfolio summary (total value, estimated yield, pending yield)
- Position counts (total, in-range, out-of-range)

### Viewing Captured Data

#### In the Dashboard

1. Open `dashboard.html` in your browser
2. The dashboard shows:
   - **Statistics cards:**
     - Total Positions (excluding positions under $1K)
     - In Range count and percentage
     - Total Value (sum of all positions)
     - Pending Yield (total unclaimed rewards)
     - Weighted APY (weighted by position size)
   - **Position table:**
     - Protocol badge
     - Pair name
     - Range status badge
     - Balance, APY, Pending Yield
     - Price range (Min/Current/Max)
     - Visual range indicator
     - Time since capture
   - **Filters:**
     - Protocol filter (Orca, Raydium, Beefy, etc.)
     - Range status (All, In Range, Out of Range)
     - Sort options (Balance, APY, Pair, etc.)
   - **Smart filtering:**
     - Automatically hides positions under $1,000
     - Beefy positions always marked as in-range

#### In the Extension Popup
- Recent captures displayed (last 5)
- Domain and timestamp for each
- Export button to download all captures as JSON

#### In Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to Table Editor
4. View `captures` table for full capture history
5. View `positions` table for individual position data
6. Use SQL Editor for custom queries

### Data Storage Locations

**Supabase Database:**
- `captures` table: Complete capture metadata and JSONB data
- `positions` table: Individual positions for fast queries
- Queryable, filterable, and sortable

**Local Files:**
- Location: `~/Downloads/captures/[protocol]/[YYYY-MM]/`
- Format: `[protocol]_[YYYY-MM-DD]_[HH-MM-SS].json`
- Example: `orca-so_2025-10-27_19-53-24.json`
- Complete backup of all capture data

## Dashboard Business Rules

### Position Filtering
- **Minimum Balance:** Only positions with balance >= $1,000 are displayed
- **Rationale:** Small positions don't require active monitoring

### Beefy Finance Handling
- **Auto-adjustment:** Beefy vaults automatically rebalance ranges
- **Display:** Always marked as "In Range" (green badge)
- **Rationale:** No need to track range status for auto-managed positions

### APY Calculation
- **Method:** Weighted average based on position balance
- **Formula:** `Σ(balance × APY) / Σ(balance)`
- **Example:**
  - Position A: $100,000 @ 10% APY
  - Position B: $1,000 @ 100% APY
  - Weighted APY: ($100K×10% + $1K×100%) / $101K = 10.89%
- **Rationale:** Larger positions contribute proportionally to portfolio yield

## Advanced Features

### Clear Database

To reset and start fresh (useful before capturing real positions):

```bash
node clear-database.js
```

This will:
- Delete all positions from `positions` table
- Delete all captures from `captures` table
- Show before/after counts
- Verify complete deletion

**Use cases:**
- Clearing test data before production use
- Starting fresh tracking period
- Removing old/invalid captures

**Note:** This only clears Supabase. Local JSON files in `~/Downloads/captures/` are preserved as backup.

### Export Data

Click the "Export Captured Data" button in the extension popup to download all captures as JSON. Files are automatically saved to your Downloads folder with timestamps.

### Timeline Viewer

Open `timeline.html` to view:
- Chronological history of all captures
- Side-by-side comparisons between captures
- Change detection (positions added/removed, range changes, etc.)
- Visual indicators for critical changes

## Data Structure

Each capture contains:

```json
{
  "id": "capture_1234567890_abc123",
  "url": "https://www.orca.so/portfolio",
  "title": "Orca | Portfolio",
  "timestamp": "2025-10-27T19:53:24.831Z",
  "protocol": "orca",
  "data": {
    "protocol": "orca",
    "content": {
      "clmPositions": {
        "summary": {
          "totalValue": "110441.33",
          "estimatedYieldAmount": "N/A",
          "estimatedYieldPercent": "N/A",
          "pendingYield": "244.86"
        },
        "positions": [
          {
            "token0": "SOL",
            "token1": "USDC",
            "pair": "SOL/USDC",
            "feeTier": "0.04",
            "balance": 20265.24,
            "pendingYield": 119.91,
            "apy": 104.262,
            "rangeMin": 126.65,
            "rangeMax": 190,
            "currentPrice": 163.29,
            "inRange": true,
            "rangeStatus": "in-range",
            "rangeMinPercent": "-22.43%",
            "rangeMaxPercent": "+16.36%",
            "distanceFromRange": "0%",
            "token0Amount": 46.5366441,
            "token0Percentage": 37.6,
            "token0Value": 7612.31,
            "token1Amount": 12654.5291,
            "token1Percentage": 62.4,
            "token1Value": 12652.93,
            "capturedAt": "2025-11-08T12:31:26.969Z"
          }
        ]
      }
    }
  }
}
```

## Privacy & Security

- Database credentials stored in `.env.local` (not committed to git)
- Local files saved to your Downloads folder
- Extension only accesses active tab when you click capture
- No tracking or analytics
- Open source - audit the code yourself

## Development

See `DEVELOPMENT.md` for:
- Architecture overview
- Adding new protocol parsers
- Extending validation logic
- Testing procedures
- Common issues and solutions

## Troubleshooting

### Extension Not Loading

1. Check `chrome://extensions/` for errors
2. Verify all required files are present
3. Ensure `config.js` exists (run `npm run build:config`)
4. Check that `supabase.js` is downloaded locally

### Supabase Connection Issues

1. Verify `.env.local` has correct credentials
2. Run `npm run build:config` to regenerate config.js
3. Check Supabase project is active and accessible
4. Verify database tables exist (run SQL from SUPABASE_SETUP.md)

### Protocol Not Detected

1. Check that you're on the correct page (portfolio/liquidity page)
2. Ensure the URL matches one of the supported hostnames
3. Open browser console (F12) and look for protocol detection messages
4. Check `content.js` for protocol detection logic

### Positions Not Parsing Correctly

1. Open browser console (F12) for parsing error messages
2. Check if protocol UI has changed (parsers may need updates)
3. Export raw capture data and inspect structure
4. See `PROTOCOL_PARSERS.md` for detailed parsing documentation

### Dashboard Not Loading Positions

1. Verify Supabase connection (check browser console)
2. Ensure captures exist in database (check Supabase dashboard)
3. Check that positions meet minimum $1K balance threshold
4. Try clicking "Refresh" button in dashboard

## Testing

See `TESTING_GUIDE.md` for comprehensive testing instructions including:
- Extension loading verification
- Content script injection testing
- Capture workflow testing
- Database verification
- Dashboard functionality testing

## License

MIT License - Feel free to modify and distribute

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## Changelog

See `CHANGES.md` for detailed version history and updates.

## Support

For issues, questions, or feature requests:
1. Check existing documentation in the `/docs` folder
2. Search existing GitHub issues
3. Open a new issue with detailed description and logs
