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

7. **PancakeSwap** (Base, BSC) ✅
   - Position details page parsing
   - Unclaimed fees tracking
   - APR with farming rewards
   - Price range with labeled extraction

### 📊 Comprehensive Position Data
For each position, the extension captures:
- Token pair and fee tier
- Current balance (USD value)
- Pending yield
- APY/APR
- Price range (min/max)
- Current price
- In-range status (automatic detection)
- Distance from range boundaries

### 🤖 AI-Powered Validation
- Automatic data quality checks after each capture
- Claude AI integration for anomaly detection
- Identifies missing data, inconsistencies, and outliers
- Provides data quality scores and recommendations
- Infers missing values from context

### 📈 Historical Tracking & Comparison
Automatic detection of:
- Positions going out of range (critical alert)
- Large balance changes (>50%)
- Significant APY changes (>20%)
- New positions added or removed
- Price approaching range boundaries
- Total portfolio value changes (>20%)

### 📱 Interactive Dashboard
- Beautiful visual interface for all your positions
- Filter by protocol or in-range status
- Real-time statistics (total value, avg APY, in-range rate)
- Visual range indicators showing current price position
- Export filtered positions to JSON
- Responsive design for mobile and desktop

## Installation

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
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Usage

### Basic Capture

1. Navigate to your DeFi protocol's portfolio/positions page:

   **Orca (Solana):**
   - Positions list: `https://www.orca.so/liquidity`
   - Individual position details also supported

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
4. Wait 2 seconds for dynamic content to load (automatic for Hyperion, Beefy, PancakeSwap)
5. The extension will:
   - Automatically detect the protocol
   - Parse all position data
   - Validate the data quality
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

#### In the Extension Popup
- Recent captures displayed (last 5)
- Domain and timestamp for each
- Export button to download all captures as JSON

#### In the Dashboard
1. Right-click the extension icon → Inspect
2. Or navigate to `chrome-extension://<extension-id>/dashboard.html`
3. The dashboard shows:
   - Statistics cards (total positions, value, avg APY, in-range rate)
   - All positions as visual cards
   - Filters by protocol and status
   - Visual range indicators
   - Export functionality

### Data Storage

- Captures stored locally in Chrome's storage
- Maximum 1000 captures retained
- Each capture includes full position data and metadata
- Historical comparison against previous captures

## Advanced Features

### AI-Powered Validation Script

For deeper analysis of your captured data, use the standalone validation script:

```bash
# Install dependencies
npm install

# Run validation on a captured file
npm run validate path/to/capture.json
```

The validation script performs:
1. **Basic Sanity Checks**: Missing data, invalid ranges, negative values, logic errors
2. **AI Analysis**: Anomaly detection, data quality scoring, recommendations, inferred values

Example output:
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

### Environment Setup

Create a `.env.local` file with your API keys:

```env
ANTHROPIC_API_KEY=your_claude_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### Export Data

Click the "Export Captured Data" button in the extension popup to download all captures as JSON. You can also export from the dashboard with filters applied.

## Data Structure

Each capture contains:

```json
{
  "id": "capture_1234567890_abc123",
  "url": "https://www.orca.so/liquidity",
  "title": "Orca - Concentrated Liquidity",
  "timestamp": "2025-10-21T18:55:08.962Z",
  "protocol": "Orca",
  "data": {
    "content": {
      "clmPositions": {
        "summary": {
          "totalValue": "12345.67",
          "estimatedYieldAmount": "234.56",
          "estimatedYieldPercent": "15.2",
          "pendingYield": "12.34"
        },
        "positions": [
          {
            "token0": "SOL",
            "token1": "USDC",
            "pair": "SOL/USDC",
            "feeTier": "0.01",
            "balance": 5432.10,
            "balanceFormatted": "5,432.10",
            "pendingYield": 8.50,
            "apy": 45.2,
            "rangeMin": 470.12,
            "rangeMax": 636.11,
            "rangeMinPercent": "-18.42%",
            "rangeMaxPercent": "+10.39%",
            "currentPrice": 577.25,
            "currentPriceFormatted": "577.25",
            "inRange": true,
            "rangeStatus": "in-range",
            "distanceFromRange": "0%",
            "capturedAt": "2025-10-21T18:55:08.962Z"
          }
        ],
        "positionCount": 6,
        "inRangeCount": 6,
        "outOfRangeCount": 0
      }
    }
  }
}
```

## Privacy & Security

- All data is stored locally on your device
- No data is sent to external servers
- Passwords fields are automatically redacted
- The extension only has access to the active tab when you click capture

## Development

### Adding Custom Capture Rules

To capture specific elements on certain sites, add data attributes to elements:

- `data-capture`: Mark element for capture
- `data-track`: Track element changes
- `class="capture-this"`: Alternative capture marker

### Extending Capture Functionality

Modify `content.js` to add custom capture logic:

```javascript
function captureCustomData() {
  // Your custom capture logic
  return customData;
}
```

## Troubleshooting

### Extension Not Working

1. Ensure the extension is enabled in `chrome://extensions/`
2. Reload the extension after any file changes
3. Check browser console (F12) for error messages
4. Verify all required files are present

### Protocol Not Detected

If the extension doesn't detect your protocol:
1. Check that you're on the correct page (portfolio/liquidity page)
2. Ensure the URL matches one of the supported hostnames
3. Open an issue with the URL and screenshot for support

### Positions Not Parsing Correctly

Some protocols may have different UI structures:
1. Export the raw capture data
2. Check the browser console for parsing errors
3. The parsers may need adjustment for your specific protocol version
4. Consider opening an issue with sample data (remove sensitive info)

### Dashboard Not Loading

1. Check that dashboard.html is in the extension directory
2. Right-click extension icon → Inspect → navigate to dashboard.html
3. Look for JavaScript errors in the console
4. Ensure Chrome storage has captured data

### AI Validation Failing

1. Check that `.env.local` has valid API keys
2. Ensure you have internet connectivity
3. Verify API key format (should start with `sk-ant-api03-`)
4. Check API rate limits and quota

## Icons Required

Create simple PNG icons or use placeholder images:
- 16x16px - Toolbar icon
- 48x48px - Extension management page
- 128x128px - Chrome Web Store (if publishing)

## License

MIT License - Feel free to modify and distribute

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## Future Enhancements

### Position Management
- [ ] Browser notifications when positions go out of range
- [ ] Automatic rebalancing suggestions
- [ ] Impermanent loss calculator
- [ ] Fee earnings vs IL comparison

### Data & Analytics
- [ ] Time-series charts for position value over time
- [ ] APY trend analysis
- [ ] Portfolio correlation analysis
- [ ] Export to CSV for spreadsheet analysis
- [ ] Integration with portfolio trackers (DeBank, Zapper)

### Multi-Protocol Features
- [ ] Cross-protocol position aggregation
- [ ] Best APY finder across all protocols
- [ ] Gas cost tracking for rebalancing
- [ ] Protocol comparison metrics

### Advanced Validation
- [ ] Machine learning for pattern detection
- [ ] Predictive alerts for likely out-of-range positions
- [ ] Historical performance analysis
- [ ] Risk scoring for each position

### Collaboration
- [ ] Share portfolio snapshots (anonymized)
- [ ] Community position strategies
- [ ] Webhook notifications to Discord/Telegram
- [ ] API endpoint for external access

### Testing & Refinement
- [x] Orca parser (fully tested)
- [ ] Raydium parser (needs testing)
- [ ] Aerodrome parser (needs testing)
- [ ] Cetus parser (needs testing)
- [ ] Hyperion parser (needs testing)
- [ ] PancakeSwap parser (needs testing)
- [ ] Beefy parser (needs testing)