# Complete Diagnostic Guide

## Step 1: Test Parser Works (Standalone)

I created a test HTML file. Open it:

```
file:///Volumes/Crucial X8/Code/Brave-Capture/test-orca.html
```

1. Open that file in your browser
2. Click "Test Parser" button
3. You should see JSON output with 6 positions

**If this works:** Parser is fine, issue is with extension loading
**If this fails:** Parser has a bug

## Step 2: Check Extension Installation

Go to `chrome://extensions/`

**Check these:**
- ☐ Extension is listed
- ☐ Extension is ENABLED (toggle is blue/on)
- ☐ No errors shown (no red "Errors" button)
- ☐ Shows correct path: `/Volumes/Crucial X8/Code/Brave-Capture`

**If extension shows errors:**
1. Click "Errors" button
2. Copy the error messages
3. Send them to me

## Step 3: Check Content Script Injection

1. Go to: `https://www.orca.so/portfolio`
2. Open DevTools (F12)
3. Go to "Console" tab
4. Type this and press Enter:

```javascript
typeof performDetailedCapture
```

**Expected:** `"function"`
**If you get:** `"undefined"` → Content script NOT loaded!

### If Content Script Not Loading:

**Check permissions:**
1. Look at the extension icon
2. If it's grayed out or shows a badge, click it
3. Look for "This extension has access to this site" or similar
4. If it says "needs permission", grant it

**Force reload:**
1. Go to `chrome://extensions/`
2. Click reload icon on the extension
3. Close the Orca tab completely
4. Open new tab: `https://www.orca.so/portfolio`
5. Check console again for `performDetailedCapture`

## Step 4: Manual Content Script Injection

If content script still not loading, inject it manually:

1. On Orca portfolio page
2. Open DevTools Console
3. Copy and paste the ENTIRE content.js file

OR use this shortcut:

```javascript
// Load content script manually
fetch('chrome-extension://YOUR_EXTENSION_ID/content.js')
  .then(r => r.text())
  .then(code => eval(code))
  .then(() => console.log('Content script loaded!'));
```

(Replace YOUR_EXTENSION_ID with your actual ID from chrome://extensions/)

## Step 5: Test Capture Manually

Once content script is loaded, test it directly in console:

```javascript
// Test the parser
const result = performDetailedCapture();
console.log('Captured data:', result);
console.log('Positions:', result.content.clmPositions);
```

**This should show:**
- Summary with Total Value, etc.
- 6 positions array
- Each position with pair, balance, etc.

## Step 6: Check Manifest Permissions

Run this:

```bash
cd /Volumes/Crucial\ X8/Code/Brave-Capture
cat manifest.json | jq '.content_scripts[0].matches'
```

Should show:
```json
[
  "https://www.orca.so/*",
  ...
]
```

## Step 7: Nuclear Option - Rebuild Extension

```bash
cd /Volumes/Crucial\ X8/Code/Brave-Capture

# 1. Regenerate config
npm run build:config

# 2. Check all files are present
ls -la *.js *.html manifest.json

# 3. Remove and re-add extension
# - Go to chrome://extensions/
# - Click "Remove" on the extension
# - Click "Load unpacked"
# - Select this folder again
```

## Step 8: Check Browser Console for Errors

When you click "Capture Page Data":

1. Open extension popup
2. Right-click inside popup → "Inspect"
3. This opens DevTools for the POPUP
4. Go to Console tab
5. Click "Capture Page Data"
6. Look for errors

**Common errors:**
- "Could not establish connection" = content script not loaded
- "Receiving end does not exist" = content script not responding
- "Supabase not configured" = config.js issue

## Debugging Checklist

Run these commands and send me the output:

```bash
cd /Volumes/Crucial\ X8/Code/Brave-Capture

echo "=== 1. Files Check ==="
ls -lh popup.js content.js manifest.json config.js supabase-client.js file-storage.js

echo ""
echo "=== 2. Config Check ==="
head -10 config.js

echo ""
echo "=== 3. Manifest Check ==="
grep -A 10 "content_scripts" manifest.json

echo ""
echo "=== 4. Content Script First Line ==="
head -5 content.js

echo ""
echo "=== 5. Popup Script First Line ==="
head -5 popup.js
```

## What to Send Me

Please provide:

1. ☐ Does `test-orca.html` work? (Yes/No)
2. ☐ Is extension showing in chrome://extensions/? (Yes/No)
3. ☐ Result of `typeof performDetailedCapture` in console
4. ☐ Any errors in extension details page
5. ☐ Output of the debugging checklist above
6. ☐ Screenshot of extension popup when you try to capture

With this info, I can pinpoint the exact issue!
