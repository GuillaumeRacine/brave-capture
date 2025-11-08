# Testing Orca Portfolio Scraping

## ✅ Updates Made

I've added comprehensive logging to help debug the Orca portfolio page scraping. The parser now logs every step:

- 🐋 When it starts parsing
- 💰 When it finds summary values (Total Value, Estimated Yield, Pending Yield)
- 📊 How many rows it found
- ✅ Each position it successfully parses
- ⚠️ Rows it skips and why
- 🎯 Final count of positions

## 🧪 Test Steps

### 1. Reload Extension

```
1. Go to: chrome://extensions/
2. Find "Brave Capture - CLM Position Tracker"
3. Click the refresh icon 🔄
4. Make sure it's enabled
```

### 2. Open Orca Portfolio

```
1. Go to: https://www.orca.so/portfolio
2. Make sure you're logged in with your wallet
3. You should see your 6 positions:
   - WBTC / SOL (0.05%)
   - cbBTC / SOL (0.16%)
   - SOL / USDC (0.04%)
   - SOL / USDT (0.02%)
   - PUMP / SOL (0.16%)
   - Fartcoin / SOL (0.16%)
```

### 3. Open Console

```
1. Press F12 (or right-click → Inspect)
2. Click "Console" tab
3. Look for this message (content script loaded):
   🎯 Brave Capture content script loaded on: https://www.orca.so/portfolio
```

**If you DON'T see this:**
- Reload the page (Cmd+R or F5)
- Check extension is enabled
- Try closing and reopening the tab

### 4. Capture Data

```
1. Click the extension icon in toolbar
2. Click "Capture Page Data"
3. Watch the console!
```

### 5. Expected Console Output

You should see something like:

```
📊 Starting capture for URL: https://www.orca.so/portfolio
Tab ID: 12345
📨 Message received in content script: {action: "captureData"}
🚀 Starting capture process...
📸 performDetailedCapture() called
URL: https://www.orca.so/portfolio
Hostname: www.orca.so
🐋 Parsing Orca positions...
Found Total Value: 110,567.12
Found Estimated Yield Amount: 42,865.54
Found Estimated Yield Percent: 38.769%
Found Pending Yield: 240.69
Found 6 potential position rows
Row 0: 6 cells
✅ Parsed position: WBTC/SOL - $41297.03
Row 1: 6 cells
✅ Parsed position: cbBTC/SOL - $24345.88
Row 2: 6 cells
✅ Parsed position: SOL/USDC - $23493.29
Row 3: 6 cells
✅ Parsed position: SOL/USDT - $20787.61
Row 4: 6 cells
✅ Parsed position: PUMP/SOL - $431.30
Row 5: 6 cells
✅ Parsed position: Fartcoin/SOL - $212.00
🎯 Final result: 6 positions captured
Summary: {totalValue: "110567.12", estimatedYieldAmount: "42865.54", ...}
✅ Saved to file: captures/orca-so/...
```

### 6. What Each Position Should Have

Each position should capture:
- `pair`: "WBTC/SOL"
- `feeTier`: "0.05"
- `balance`: 41297.03
- `pendingYield`: 57.23
- `apy`: 27.113
- `rangeMin`: 470.12
- `rangeMax`: 636.11
- `currentPrice`: 575.02
- `inRange`: true/false
- `rangeMinPercent`: "-18.24%"
- `rangeMaxPercent`: "+10.62%"

## 🐛 Troubleshooting

### Issue: Content Script Not Loading

**Symptom:** Don't see "🎯 Brave Capture content script loaded"

**Fix:**
```bash
# 1. Check manifest
cat manifest.json | grep "orca"
# Should show: "https://www.orca.so/*"

# 2. Reload extension
# 3. Close tab and reopen
# 4. Hard refresh page (Cmd+Shift+R)
```

### Issue: "Found 0 potential position rows"

**Symptom:** Parser runs but finds no rows

**This means:** The table structure is different than expected

**Debug:**
```javascript
// In console, type:
document.querySelectorAll('table tbody tr').length
// How many?

document.querySelectorAll('[role="row"]').length
// How many?

// Try to find the table manually:
document.querySelector('table')
// Does it exist?
```

### Issue: Rows Found But Not Parsed

**Symptom:** "Found 6 rows" but "Final result: 0 positions"

**This means:** Cells aren't being found or data doesn't match expected format

**Debug:**
```javascript
// Check first row:
const row = document.querySelector('table tbody tr');
const cells = row.querySelectorAll('td');
console.log('Cells:', cells.length);
console.log('Cell 0 text:', cells[0]?.textContent);
console.log('Cell 1 text:', cells[1]?.textContent);
```

### Issue: Missing Summary Data

**Symptom:** Positions captured but summary is empty

**Debug:**
```javascript
// Find Total Value:
Array.from(document.querySelectorAll('*')).find(el =>
  el.textContent.trim() === 'Total Value'
)
// Does it find the element?
```

## 📤 Send Me

If it's still not working, please send:

1. **Full console output** (copy/paste or screenshot)
2. **Number of rows found** (from the log)
3. **Any error messages** (red text)
4. **This debug info:**

```javascript
// Run these in console and send results:
console.log('Tables:', document.querySelectorAll('table').length);
console.log('Table rows:', document.querySelectorAll('table tbody tr').length);
console.log('Role rows:', document.querySelectorAll('[role="row"]').length);

// Check first row structure:
const firstRow = document.querySelector('table tbody tr');
if (firstRow) {
  const cells = firstRow.querySelectorAll('td');
  console.log('First row cells:', cells.length);
  cells.forEach((cell, i) => {
    console.log(`Cell ${i}:`, cell.textContent.substring(0, 100));
  });
}
```

## 🎯 Success Criteria

✅ Console shows "6 positions captured"
✅ File downloads to `~/Downloads/captures/orca-so/`
✅ Data appears in Supabase `positions` table
✅ Dashboard shows your positions
✅ All 6 positions have balance, APY, and range data

---

**Let's test it!** Reload the extension and give it a try! 🚀
