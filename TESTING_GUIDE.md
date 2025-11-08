# Testing Guide - Brave Capture Extension

## All Critical Fixes Applied ✅

The following issues have been resolved:

1. **CSP Error** - Removed external CDN, using local supabase.js
2. **Service Worker Error** - Added safety check for chrome.alarms API
3. **Undefined Response Error** - Initialized response variable properly
4. **Manifest Validation** - Confirmed valid JSON structure

## Files Verified

```
✅ manifest.json (valid JSON, no CSP directive)
✅ supabase.js (138K - local copy)
✅ config.js (621B - Supabase credentials)
✅ supabase-client.js (7.6K - wrapper functions)
✅ file-storage.js (6.5K - timestamped file naming)
✅ content.js (67K - enhanced Orca parsing)
✅ popup.js (16K - dual storage implementation)
✅ background.js (12K - fixed alarms check)
```

---

## Step 1: Reload the Extension

1. Open Chrome/Brave browser
2. Navigate to: `chrome://extensions/`
3. Find **"Brave Capture - CLM Position Tracker"**
4. Click the **reload icon** 🔄
5. **VERIFY**: No red error messages appear
6. **VERIFY**: Toggle is ON (blue)

### Expected Result:
- Extension card shows version 1.1.0
- No errors in the card
- Service worker shows "active" or no status

### If You See Errors:
- Click "Errors" button to see details
- Check that all files are present in extension directory
- Try removing and re-adding the extension

---

## Step 2: Test Content Script Loading

1. Go to: `https://www.orca.so/portfolio`
2. Open Developer Console: **F12** or Right-click → Inspect
3. Go to **Console** tab
4. Look for the message:
   ```
   🎯 Brave Capture content script loaded on: https://www.orca.so/portfolio
   ```

### Expected Result:
You should see the emoji message indicating content script loaded successfully.

### If You DON'T See the Message:
1. Refresh the page (Ctrl+R or Cmd+R)
2. Check Console for any errors
3. In Console, type: `typeof performDetailedCapture`
   - Should return: `"function"`
   - If returns `"undefined"`, content script didn't inject

---

## Step 3: Capture Orca Portfolio Data

**With Console still open and on https://www.orca.so/portfolio:**

1. Click the **Brave Capture extension icon** in toolbar
2. Popup should show:
   - Current Page: https://www.orca.so/portfolio
   - "Capture Page Data" button
   - "Export Captured Data" button
3. Click **"Capture Page Data"**
4. Watch the Console for detailed logging

### Expected Console Output:

```
📊 Starting capture for URL: https://www.orca.so/portfolio
Tab ID: [number]
📨 Message received in content script
🚀 Starting capture process...
📸 performDetailedCapture() called
URL: https://www.orca.so/portfolio
Hostname: www.orca.so
🐋 Parsing Orca positions...
Found Total Value: 110,567.12
Found Estimated Yield Amount: 42,865.54
Found Estimated Yield Percent: 38.769
Found Pending Yield: 240.69
Row 0: [number] cells
✅ Parsed position: WBTC/SOL - 41297.03
Row 1: [number] cells
✅ Parsed position: cbBTC/SOL - 22765.93
Row 2: [number] cells
✅ Parsed position: SOL/USDC - 16832.69
Row 3: [number] cells
✅ Parsed position: SOL/USDT - 13457.35
Row 4: [number] cells
✅ Parsed position: PUMP/SOL - 11128.04
Row 5: [number] cells
✅ Parsed position: Fartcoin/SOL - 5086.08
🎯 Final result: 6 positions captured
📦 Response from content script: {success: true, data: {...}}
✅ Saved to file: captures/orca-so/2025-01/orca-so_2025-01-27_[time].json
```

### Expected Popup Result:

The popup should show one of:
- ✅ **"Page data captured successfully!"** (green)
- ⚠️ **"Captured with X warning(s)"** (yellow) - Check console for details

### Expected File Download:

A file should download to your **Downloads folder**:
```
~/Downloads/captures/orca-so/2025-01/orca-so_2025-01-27_14-30-45.json
```

File structure:
```json
{
  "url": "https://www.orca.so/portfolio",
  "title": "Orca | Portfolio",
  "timestamp": "2025-01-27T14:30:45.123Z",
  "protocol": "orca",
  "id": "capture_1234567890_abc123def",
  "data": {
    "protocol": "orca",
    "content": {
      "clmPositions": {
        "positions": [
          {
            "pair": "WBTC/SOL",
            "token0": "WBTC",
            "token1": "SOL",
            "balance": 41297.03,
            "pendingYield": 57.23,
            "apy": 27.113,
            "rangeMin": 470.12,
            "rangeMax": 636.11,
            "currentPrice": 575.02,
            "inRange": true,
            "rangeStatus": "in-range",
            ...
          },
          ... 5 more positions
        ],
        "summary": {
          "totalValue": "110567.12",
          "estimatedYieldAmount": "42865.54",
          "estimatedYieldPercent": "38.769",
          "pendingYield": "240.69"
        }
      }
    }
  }
}
```

---

## Step 4: Verify Supabase Storage

1. Go to: https://supabase.com/dashboard
2. Select your project: `mbshzqwskqvzuiegfmkr`
3. Go to **Table Editor** (left sidebar)
4. Click **captures** table
5. You should see **1 new row** with:
   - id: capture_[timestamp]_[random]
   - url: https://www.orca.so/portfolio
   - protocol: orca
   - timestamp: [your capture time]
   - data: [full JSON object]

6. Click **positions** table
7. You should see **6 new rows** with:
   - capture_id: [matching the capture id above]
   - protocol: orca
   - pair: WBTC/SOL, cbBTC/SOL, SOL/USDC, etc.
   - balance, apy, range data filled in

---

## Step 5: View Dashboard

1. Open the file: `/Volumes/Crucial X8/Code/Brave-Capture/dashboard.html`
2. Right-click → Open With → Chrome/Brave

### Expected Result:

Dashboard should display:
- **Compact table layout** with all positions in one view
- **Total Positions**: Count (only positions >= $1,000)
- **In Range**: [count] and percentage
- **Total Value**: Sum of all positions
- **Pending Yield**: Total unclaimed rewards
- **Weighted APY**: APY weighted by position size

**Smart Filtering:**
- Only positions with balance >= $1,000 are shown
- Beefy Finance positions always marked as "In Range" (auto-adjusts)

**Table Columns:**
1. Protocol (badge)
2. Pair name
3. Status (In Range/Out of Range badge)
4. Balance (USD)
5. APY percentage
6. Pending Yield (USD)
7. Price Range (Min/Current/Max)
8. Visual range indicator
9. Time since capture

**Features to Test:**
- Click column headers to sort
- Use protocol filter dropdown
- Use range status filter
- Try different sort options
- Scroll to see sticky header stay in place
- Hover rows to see highlight effect

---

## Step 6: Test Timeline Viewer (After Multiple Captures)

1. Capture portfolio data **2-3 more times** (wait a few minutes between captures to see changes)
2. Open: `/Volumes/Crucial X8/Code/Brave-Capture/timeline.html`

### Expected Result:

Timeline showing:
- Chronological list of all captures
- Comparison between consecutive captures showing:
  - New positions added
  - Positions removed
  - Positions going out of range
  - Balance changes
  - APY changes
  - Price movements near boundaries

---

## Troubleshooting

### Issue: "Could not establish connection"

**Cause**: Content script not loaded on the page

**Solutions**:
1. Refresh the Orca portfolio page
2. Reload the extension at chrome://extensions/
3. Check that URL is exactly: https://www.orca.so/portfolio
4. Check Console for content script loaded message

---

### Issue: "Supabase not configured"

**Cause**: config.js missing or invalid credentials

**Solutions**:
1. Check that `config.js` exists in extension directory
2. Run: `npm run build:config` to regenerate from .env.local
3. Verify .env.local has:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://mbshzqwskqvzuiegfmkr.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[your key]
   ```

---

### Issue: Extension won't load

**Cause**: Invalid manifest or missing files

**Solutions**:
1. Check chrome://extensions/ for specific error
2. Verify manifest.json is valid JSON: `node -e "JSON.parse(require('fs').readFileSync('manifest.json'))"`
3. Verify all required files exist:
   - manifest.json
   - background.js
   - content.js
   - popup.html
   - popup.js
   - supabase.js
   - config.js
   - supabase-client.js
   - file-storage.js
   - icons/icon16.png, icon48.png, icon128.png

---

### Issue: No positions captured (0 positions)

**Cause**: DOM structure changed or selectors not matching

**Solutions**:
1. Check Console for "⚠️ Skipped row" messages
2. Inspect the Orca page to verify table structure
3. Check if you're logged in to Orca and positions are visible
4. Try scrolling to make sure all positions are rendered

---

### Issue: File doesn't download

**Cause**: Chrome downloads permissions or path issue

**Solutions**:
1. Check that manifest.json has "downloads" permission
2. Check Chrome download settings allow automatic downloads
3. Check Console for file-storage.js errors
4. Manually check ~/Downloads/captures/ directory

---

## Success Criteria

✅ Extension loads without errors
✅ Content script message appears on Orca portfolio page
✅ Clicking "Capture Page Data" shows success message
✅ Console shows all 6 positions parsed with details
✅ JSON file downloads to ~/Downloads/captures/orca-so/[date]/
✅ Data appears in Supabase captures table
✅ 6 rows appear in Supabase positions table
✅ Dashboard displays all 6 positions with metrics
✅ Timeline shows capture history and comparisons

---

## What Gets Captured

From your Orca portfolio, each position includes:

**Position Data:**
- pair (e.g., "WBTC/SOL")
- token0, token1
- feeTier (e.g., "0.05")
- balance (USD value)
- pendingYield (pending rewards)
- apy (annual percentage yield)
- rangeMin, rangeMax (price range boundaries)
- rangeMinPercent, rangeMaxPercent (% from current price)
- currentPrice
- inRange (true/false)
- rangeStatus (in-range/out-of-range)
- capturedAt (ISO timestamp)

**Portfolio Summary:**
- totalValue (total portfolio USD value)
- estimatedYieldAmount (projected annual yield in USD)
- estimatedYieldPercent (APY %)
- pendingYield (total pending rewards)

---

## Next Steps After Successful Test

1. **Test other protocols**: Raydium, Aerodrome, Cetus, etc.
2. **Set up scheduled captures**: Use background.js alarm functionality
3. **Export data**: Use "Export Captured Data" button for full backup
4. **Monitor changes**: Use timeline to track position evolution
5. **Add alerts**: Extend popup.js to notify when positions go out of range

---

## Getting Help

If you encounter issues not covered here:

1. Check Console (F12) for error messages
2. Check chrome://extensions/ for extension errors
3. Check Service Worker console:
   - chrome://extensions/
   - Click "Inspect views: service worker"
4. Verify all files with: `ls -lh *.js`
5. Verify manifest: `node -e "JSON.parse(require('fs').readFileSync('manifest.json'))"`

Send error logs from Console and Service Worker for debugging.
