# Debug Checklist

## Check These Things:

1. **What page are you on?**
   - Extension only works on specific protocol pages
   - Must be on positions/liquidity page, not homepage

2. **Is the extension loaded?**
   - Go to chrome://extensions/
   - Find "Brave Capture - CLM Position Tracker"
   - Should show "Errors" button if there are issues

3. **Check browser console:**
   - F12 or right-click → Inspect
   - Go to Console tab
   - Look for red error messages

4. **Check extension console:**
   - chrome://extensions/
   - Click "Inspect views: popup.html" (when popup is open)
   - OR click "Errors" button if visible

## Quick Fixes:

### Fix 1: Reload Extension
1. Go to chrome://extensions/
2. Find the extension
3. Click refresh/reload icon
4. Try again

### Fix 2: Check Permissions
- Extension needs permission for the site you're on
- Click extension icon
- If it says "needs access", grant it

### Fix 3: Verify config.js
Run this:
```bash
cat /Volumes/Crucial\ X8/Code/Brave-Capture/config.js | head -10
```
Should show real Supabase URL, not "YOUR_URL_HERE"
