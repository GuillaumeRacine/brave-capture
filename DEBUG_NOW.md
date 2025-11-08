# Debug Instructions - Better Error Logging Added ✅

I've added comprehensive error logging. Now let's see what's happening!

## Steps to Debug:

### 1. Reload the Extension

1. Go to: `chrome://extensions/`
2. Find "Brave Capture - CLM Position Tracker"
3. Click the **refresh/reload icon** 🔄
4. Make sure it's **enabled** (toggle is ON/blue)

### 2. Open Orca Portfolio Page

1. Go to: https://www.orca.so/portfolio
2. Make sure you're logged in with your wallet
3. You should see your positions

### 3. Open Browser Console

1. On the Orca page, press **F12** (or right-click → Inspect)
2. Click the **"Console"** tab
3. Look for this message:
   ```
   🎯 Brave Capture content script loaded on: https://www.orca.so/portfolio
   ```
4. **If you DON'T see this message**, the content script isn't loading!

### 4. Try Capturing

1. Click the **extension icon** in your toolbar
2. Click **"Capture Page Data"** button
3. Watch the console for messages

### 5. What to Look For in Console

You should see messages like:
```
📊 Starting capture for URL: https://www.orca.so/portfolio
Tab ID: 12345
📨 Message received in content script: {action: "captureData"}
🚀 Starting capture process...
📸 performDetailedCapture() called
URL: https://www.orca.so/portfolio
Hostname: www.orca.so
```

### 6. Copy the Errors

**If you see any RED error messages:**
1. Right-click on the error → "Copy message"
2. Send me the entire error

**OR take a screenshot** of the console showing the errors

## Common Issues & Fixes

### Issue 1: Content Script Not Loading

**Symptom:** Don't see "🎯 Brave Capture content script loaded" in console

**Causes:**
- Extension not reloaded after changes
- Wrong URL (must be https://www.orca.so/*)
- Extension doesn't have permission

**Fix:**
```bash
# 1. Reload extension at chrome://extensions/
# 2. Refresh the Orca page (Cmd+R or F5)
# 3. Check console again
```

### Issue 2: "Could not establish connection"

**Symptom:** Error says "receiving end does not exist"

**This means:** Content script not injected properly

**Fix:**
1. Reload extension
2. Close and reopen the tab
3. OR try: `https://www.orca.so/liquidity` instead

### Issue 3: "No data received"

**Symptom:** Console shows capture ran but no success response

**This means:** Page parsing failed or no positions found

**Check:**
- Are you on the right page? (portfolio or liquidity)
- Do you have positions visible on the page?
- Any errors in console from performDetailedCapture?

### Issue 4: Orca Portfolio Page Not Supported

**Note:** The extension might work better on:
- `https://www.orca.so/liquidity` (positions page)

**Try this instead!**

## Test on Different Page

If portfolio doesn't work, try the liquidity page:

1. Go to: https://www.orca.so/liquidity
2. Make sure you see your liquidity positions
3. Open console (F12)
4. Try capturing again

## Send Me These Details

Please copy and send:

1. **Console messages** when you load the page (look for 🎯)
2. **Console messages** when you click "Capture Page Data"
3. **Any RED error messages**
4. **Which page you're testing on** (exact URL)

## Quick Test Command

Run this and send output:

```bash
cd /Volumes/Crucial\ X8/Code/Brave-Capture
echo "=== Files Check ==="
ls -la content.js popup.js config.js manifest.json
echo ""
echo "=== Manifest Orca Match ==="
grep -A 3 "orca" manifest.json
```

---

With the new logging, we'll see exactly where it's failing! 🔍
