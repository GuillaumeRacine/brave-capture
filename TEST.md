# Quick Test Steps

## Step 1: Check Extension is Loaded

1. Open Chrome/Brave
2. Go to: `chrome://extensions/`
3. Find "Brave Capture - CLM Position Tracker"
4. Is it enabled? (toggle should be ON/blue)
5. Click "Details"
6. Scroll down - do you see any errors?

## Step 2: Check Supported Pages

The extension ONLY works on these pages:

✅ **Orca**: https://www.orca.so/liquidity (must be logged in with positions)
✅ **Raydium**: https://raydium.io/clmm/ (CLMM tab, with positions)
✅ **Aerodrome**: https://aerodrome.finance/liquidity (with positions)
✅ **Cetus**: https://app.cetus.zone/ (positions page)
✅ **Hyperion**: https://app.hyperion.xyz/ (positions page)
✅ **Beefy**: https://app.beefy.com/ (with CLM vaults)
✅ **PancakeSwap**: https://pancakeswap.finance/liquidity (with positions)

❌ **Will NOT work on:**
- Homepage/landing pages
- Settings pages
- Swap pages
- Pages without your positions

## Step 3: Test on Orca (Easiest)

1. Go to: https://www.orca.so/liquidity
2. Make sure you're connected with your wallet
3. You should see your liquidity positions
4. Click the extension icon
5. Look at "Current Page" - should show the URL
6. Click "Capture Page Data"

## Step 4: Check Console for Errors

### Browser Console:
1. Press F12 (or right-click → Inspect)
2. Click "Console" tab
3. Try capturing again
4. Look for RED error messages
5. Screenshot or copy the errors

### Extension Console:
1. Go to `chrome://extensions/`
2. Click "Inspect views" under the extension
3. Try capturing again
4. Look for errors in the console

## Step 5: Check Content Script

1. On the protocol page (e.g., Orca)
2. Press F12 → Console
3. Type: `typeof performDetailedCapture`
4. Press Enter
5. Should say: `"function"`
6. If it says `"undefined"` → content script not loaded

## Common Issues:

### Issue: "Current Page: Error loading page info"
**Fix:** Reload the extension at chrome://extensions/

### Issue: Content script not loading
**Symptoms:** Console shows `performDetailedCapture is not defined`
**Fix:**
```bash
# Check manifest has correct matches
cat manifest.json | grep -A 10 content_scripts
```

### Issue: Permission error
**Symptoms:** Extension icon is grayed out or shows "needs access"
**Fix:** Click the icon → Grant site access

### Issue: Supabase error
**Symptoms:** Console shows "Supabase not configured" or "Failed to save"
**Fix:**
```bash
npm run build:config
# Then reload extension
```

## Debug Command

Run this and send me the output:

```bash
cd /Volumes/Crucial\ X8/Code/Brave-Capture

echo "=== Extension Files ==="
ls -la *.js *.html manifest.json config.js 2>&1

echo ""
echo "=== Config Check ==="
grep -E "SUPABASE" config.js | head -3

echo ""
echo "=== Manifest Check ==="
grep -A 5 "content_scripts" manifest.json
```

## What to Send Me

Please tell me:
1. ☐ Which protocol page you're testing on (exact URL)
2. ☐ What "Current Page" shows in the popup
3. ☐ Any error messages from console (F12)
4. ☐ Result of typing `typeof performDetailedCapture` in console
5. ☐ Output of the debug command above

Then I can help you fix it! 🔧
